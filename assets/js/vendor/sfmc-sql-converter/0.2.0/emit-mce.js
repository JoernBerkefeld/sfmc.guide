/**
 * Marketing Cloud Engagement emitters: turn a parsed SELECT (see `parseSql`) into SSJS or
 * AMPscript that reads the same rows from a data extension.
 *
 * Every emitter returns either `{ unavailable: '<plain reason>' }` when the target cannot
 * express the query, or `{ code, spans, messages, dropped }`:
 * - `spans` — where each clause (see `collectClauses`) ends up in `code`;
 * - `messages` — warnings / info for this target only (e.g. `ORDER_BY_DROPPED`), located in
 *   the SQL text;
 * - `dropped` — ids of clauses the target leaves out.
 *
 * Emitted values are always strings. Nothing here evaluates or runs code.
 */

import {
    CodeWriter,
    collectClauses,
    conditionsOf,
    isContainsPattern,
    likeFilterValue,
} from './clauses.js';
import {
    EMPTY_STRING_AS_SPACE,
    FIRST_BATCH_ONLY,
    LIKE_CHECKED_IN_SCRIPT,
    LOOKUP_FIRST_ROW_ONLY,
    ORDER_BY_DROPPED,
    TOP_ABOVE_LOOKUP_LIMIT,
    TOP_DROPPED,
    createMessage,
} from './messages.js';
import { formatName } from './print-sql.js';

/**
 * @typedef {import('./sql-parser.js').SelectAst} SelectAst
 * @typedef {import('./clauses.js').Span} Span
 * @typedef {import('./messages.js').Message} Message
 */

/**
 * @typedef {object} EmitOptions
 * @property {string} [deKey] external key of the data extension (defaults to its name)
 * @property {string[]} [columns] column names that `SELECT *` stands for
 * @property {{fields: {name: string}[]}} [schema] data extension fields (used for `*` when
 * `columns` is not given)
 * @property {{rowsAsObjects?: boolean, paging?: boolean}} [output] WSProxy output options:
 * `rowsAsObjects` (default true) adds a helper that turns each result into a plain object;
 * `paging` (default false) adds a loop that reads every batch
 * @property {string} [sourceText] the SQL text the AST came from (locates TOP for messages)
 */

/**
 * @typedef {object} EmitResult
 * @property {string} code generated code
 * @property {Span[]} spans clause spans in `code`
 * @property {Message[]} messages target-specific messages
 * @property {string[]} dropped ids of clauses the target left out
 */

const SSJS_START = '<script runat="server">\nPlatform.Load("core", "1.1.1");\n';
const SSJS_END = '</script>';
const INDENT = ' '.repeat(4);
const LINE_SEPARATOR = String.fromCodePoint(0x20_28);
const PARAGRAPH_SEPARATOR = String.fromCodePoint(0x20_29);
const LINE_BREAKS = new RegExp(`[\r\n${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]+`, 'g');

const COMMENT_ESCAPES = { '~': '~~', '"': '~q', '\\': '~b' };

const SIMPLE_OPERATORS = {
    '=': 'equals',
    '<>': 'notEquals',
    '>': 'greaterThan',
    '>=': 'greaterThanOrEqual',
    '<': 'lessThan',
    '<=': 'lessThanOrEqual',
};

/**
 * SSJS helper (ES3-safe: `var` only, no arrow functions, no regex literals) that checks a value
 * against a SQL LIKE pattern exactly: anchored, case-insensitive, `%` = any text, `_` = one
 * character, `[…]` / `[^…]` = one character of a set (so `[%]` is a literal %). NULL never
 * matches; trailing spaces of the value are ignored like in SQL.
 */
export const SQL_LIKE_HELPER = [
    'function sqlLike(value, pattern) {',
    '    if (value === null || value === undefined) {',
    '        return false;',
    '    }',
    // Case-insensitive by lower-casing both sides: the engine ignores the flags argument of
    // new RegExp(source, "i") (proven live), and the pattern is dynamic, so no regex literal.
    '    var text = String(value).replace(new RegExp(" +$"), "").toLowerCase();',
    '    pattern = String(pattern).toLowerCase();',
    '    var source = "^";',
    '    var i = 0;',
    '    while (i < pattern.length) {',
    '        var c = pattern.charAt(i);',
    '        var close = c === "[" ? pattern.indexOf("]", i + 1) : -1;',
    '        if (close > i + 1) {',
    '            var body = pattern.substring(i + 1, close);',
    '            var negated = body.charAt(0) === "^";',
    '            if (negated) {',
    '                body = body.substring(1);',
    '            }',
    String.raw`            source += "[" + (negated ? "^" : "") + body.replace(new RegExp("[\\\\^]", "g"), "\\$&") + "]";`,
    '            i = close + 1;',
    '            continue;',
    '        }',
    '        if (c === "%") {',
    String.raw`            source += "[\\s\\S]*";`,
    '        } else if (c === "_") {',
    String.raw`            source += "[\\s\\S]";`,
    // Regex specials and the backslash are built from char codes: a string literal ending in an
    // escaped backslash ("\\") makes the CloudPage reject the whole page (HTTP 422, proven live).
    '        } else if (String.fromCharCode(92, 94, 36, 46, 42, 43, 63, 40, 41, 91, 93, 123, 125, 124, 47).indexOf(c) > -1) {',
    '            source += String.fromCharCode(92) + c;',
    '        } else {',
    '            source += c;',
    '        }',
    '        i++;',
    '    }',
    '    return new RegExp(source + "$").test(text);',
    '}',
    '',
].join('\n');

// the six characters backslash, u, 0, 0, 5, C: a backslash written as a unicode escape
export const BACKSLASH_ESCAPE = ['\\', 'u005C'].join('');
const AMPSCRIPT_LOOP_VARIABLES = new Set(['rows', 'row', 'rowcount', 'i']);
// LookupRows / LookupOrderedRows return at most this many rows
const LOOKUP_ROW_LIMIT = 2000;

// ------------------------------------------------------------------------------------------
// Literals and shared helpers
// ------------------------------------------------------------------------------------------

/**
 * Formats text as a double-quoted SSJS string literal (safe inside a `<script>` block). A
 * backslash is written as the unicode escape of code 5C (see BACKSLASH_ESCAPE), never as two
 * backslashes: a string literal ending in an escaped backslash makes the CloudPage reject the
 * whole page (HTTP 422, proven live).
 *
 * @param {string} text the text
 * @returns {string} string literal
 */
export function jsString(text) {
    // JSON escapes are two-character pairs read left to right, so every double backslash found
    // here is one escaped backslash, and `<` is never the second character of an escape.
    return JSON.stringify(String(text))
        .replaceAll(/\\\\|<\//g, (match) => (match === '</' ? String.raw`<\/` : BACKSLASH_ESCAPE))
        .replaceAll(LINE_SEPARATOR, String.raw`\u2028`)
        .replaceAll(PARAGRAPH_SEPARATOR, String.raw`\u2029`);
}

/**
 * Makes a name safe inside a header comment. A comment must hold no backslash and no double
 * quote (the CloudPage pre-reader treats `"` as a string start even inside a comment) and no
 * sequence that ends the comment, the script block or an AMPscript block. `~` is the escape
 * character: `~` → `~~`, `"` → `~q`, a backslash → `~b`, and a `~` is put into `</`, `*\/`,
 * `]%%`, `=%%`, `%%[` and `%%=` (`<~/`, `*~/`, `]~%%`, `=~%%`, `%~%[`, `%~%=`).
 * `decodeCommentText` in reverse-common.js undoes exactly this.
 *
 * @param {string} text name or comment text
 * @returns {string} safe text on one line
 */
export function commentText(text) {
    return oneLine(String(text))
        .replaceAll(/[~"\\]/g, (character) => COMMENT_ESCAPES[character])
        .replaceAll('</', '<~/')
        .replaceAll('*/', '*~/')
        .replaceAll(']%%', ']~%%')
        .replaceAll('=%%', '=~%%')
        .replaceAll('%%[', '%~%[')
        .replaceAll('%%=', '%~%=');
}

/**
 * Formats text as a double-quoted AMPscript string literal (`"` doubled).
 *
 * @param {string} text the text
 * @returns {string} string literal
 */
export function ampString(text) {
    return `"${String(text).replaceAll('"', '""')}"`;
}

/**
 * Makes text safe for a single-line comment.
 *
 * @param {string} text the text
 * @returns {string} text without line breaks
 */
function oneLine(text) {
    return text.replaceAll(LINE_BREAKS, ' ');
}

/**
 * Collects what every emitter needs: clause ids, names and the column list.
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} options options
 * @returns {{idOf: Map<object, string>, clauses: object[], deName: string, deKey: string,
 * columns: {name: string, clauseId?: string}[]|null}} context; `columns` is null for `*`
 * without a known column list
 */
function prepare(ast, options) {
    const { clauses, idOf } = collectClauses(ast, options.sourceText);
    let columns = null;
    if (Array.isArray(ast.columns)) {
        columns = ast.columns.map((column) => ({
            name: column.name,
            clauseId: idOf.get(column),
        }));
    } else if (options.columns?.length) {
        columns = options.columns.map((name) => ({ name }));
    } else if (options.schema?.fields?.length) {
        columns = options.schema.fields.map((field) => ({ name: field.name }));
    }
    return {
        idOf,
        clauses,
        deName: ast.from.name,
        deKey: options.deKey || ast.from.name,
        columns,
    };
}

/**
 * Builds the location that covers all ORDER BY items.
 *
 * @param {SelectAst} ast statement
 * @returns {object} location
 */
function orderByLoc(ast) {
    const first = ast.orderBy[0].loc;
    const last = ast.orderBy.at(-1).loc;
    return {
        start: first.start,
        end: last.end,
        line: first.line,
        column: first.column,
        endLine: last.endLine,
        endColumn: last.endColumn,
    };
}

/**
 * Records ORDER BY / TOP as dropped, with a warning each.
 *
 * @param {SelectAst} ast statement
 * @param {object[]} clauses clauses from `collectClauses`
 * @param {{orderBy?: boolean, top?: boolean}} drop which clauses the target leaves out
 * @param {string} label target name used in the message
 * @returns {{messages: Message[], dropped: string[]}} warnings and dropped clause ids
 */
function dropClauses(ast, clauses, drop, label) {
    const messages = [];
    const dropped = [];
    if (drop.top && ast.top !== null && ast.top !== undefined) {
        const topClause = clauses.find((clause) => clause.clauseId === 'top');
        messages.push(
            createMessage(
                'warning',
                TOP_DROPPED,
                `${label} cannot limit the number of rows, so TOP ${ast.top} is left out. Stop after ${ast.top} rows in your code, or use LookupOrderedRows.`,
                topClause?.loc ?? ast.loc,
            ),
        );
        dropped.push('top');
    }
    if (drop.orderBy && ast.orderBy?.length) {
        messages.push(
            createMessage(
                'warning',
                ORDER_BY_DROPPED,
                `${label} cannot sort rows, so ORDER BY is left out. Sort the rows in your code, or use LookupOrderedRows.`,
                orderByLoc(ast),
            ),
        );
        for (const clause of clauses) {
            if (clause.kind === 'order') {
                dropped.push(clause.clauseId);
            }
        }
    }
    return { messages, dropped };
}

/**
 * Finishes an emitter result: sorts spans by position.
 *
 * @param {CodeWriter} out writer
 * @param {{messages: Message[], dropped: string[]}} extra messages and dropped clauses
 * @returns {EmitResult} result
 */
function finish(out, extra) {
    out.spans.sort((a, b) => a.start - b.start || a.end - b.end);
    return { code: out.code, spans: out.spans, messages: extra.messages, dropped: extra.dropped };
}

/**
 * Writes `// SQL: SELECT a, b` with each column marked.
 *
 * @param {CodeWriter} out writer
 * @param {{name: string, clauseId?: string}[]} columns selected columns
 * @param {'line'|'block'} [style] `// …` (SSJS) or `/* … *\/` (AMPscript)
 */
function writeSelectComment(out, columns, style = 'line') {
    out.write(style === 'block' ? '/* SQL: SELECT ' : '// SQL: SELECT ');
    for (const [index, column] of columns.entries()) {
        const name = commentText(formatName(column.name));
        out.write(index ? ', ' : '').mark(column.clauseId, name);
    }
    out.write(style === 'block' ? ' */\n' : '\n');
}

/**
 * Writes `// SQL: NOT IN` when the query has a NOT IN condition, so the reverse parser folds
 * the notEquals chain back into NOT IN.
 *
 * @param {CodeWriter} out writer
 * @param {SelectAst} ast statement
 */
function writeNotInMarker(out, ast) {
    if (conditionsOf(ast.where).some((expr) => expr.type === 'in' && expr.negated)) {
        out.write('// SQL: NOT IN\n');
    }
}

/**
 * Writes `// SQL: FROM [Name] (external key Key)`.
 *
 * @param {CodeWriter} out writer
 * @param {string} deName data extension name
 * @param {string} deKey external key
 */
function writeFromComment(out, deName, deKey) {
    out.write('// SQL: FROM ').mark(
        'from',
        commentText(`[${deName.replaceAll(']', ']]')}] (external key ${deKey})`),
    );
    out.write('\n');
}

// ------------------------------------------------------------------------------------------
// SSJS filter objects (WSProxy and Rows.Retrieve share the same shape)
// ------------------------------------------------------------------------------------------

/**
 * Writes one SimpleFilterPart object literal.
 *
 * @param {CodeWriter} out writer
 * @param {string} property column
 * @param {string} operator SimpleOperator value
 * @param {string|string[]} value filter value (array for IN / between)
 * @param {string} indent indentation of the closing brace
 */
function writeSimplePart(out, property, operator, value, indent) {
    const inner = indent + INDENT;
    const valueText = Array.isArray(value)
        ? `[${value.map((item) => jsString(item)).join(', ')}]`
        : jsString(value);
    out.write(
        `{\n${inner}Property: ${jsString(property)},\n${inner}SimpleOperator: ${jsString(operator)},\n${inner}Value: ${valueText}\n${indent}}`,
    );
}

/**
 * Writes a ComplexFilterPart joining two parts.
 *
 * @param {CodeWriter} out writer
 * @param {string} logical "AND" or "OR"
 * @param {(indent: string) => void} writeLeft writes the left operand
 * @param {(indent: string) => void} writeRight writes the right operand
 * @param {string} indent indentation of the closing brace
 */
function writeComplexPart(out, logical, writeLeft, writeRight, indent) {
    const inner = indent + INDENT;
    out.write(`{\n${inner}LeftOperand: `);
    writeLeft(inner);
    out.write(`,\n${inner}LogicalOperator: ${jsString(logical)},\n${inner}RightOperand: `);
    writeRight(inner);
    out.write(`\n${indent}}`);
}

/**
 * Writes `NOT IN (a, b, …)` as an AND chain of notEquals parts.
 *
 * @param {CodeWriter} out writer
 * @param {string} column column
 * @param {string[]} values values
 * @param {string} indent indentation
 */
function writeNotInChain(out, column, values, indent) {
    if (values.length === 1) {
        writeSimplePart(out, column, 'notEquals', values[0], indent);
        return;
    }
    writeComplexPart(
        out,
        'AND',
        (inner) => writeNotInChain(out, column, values.slice(0, -1), inner),
        (inner) => writeSimplePart(out, column, 'notEquals', values.at(-1), inner),
        indent,
    );
}

/**
 * Turns an empty compare value into a single space: the filter rejects an empty Value, and
 * `" "` finds the same rows because trailing spaces are ignored.
 *
 * @param {string} text compare value
 * @returns {string} filter value
 */
function filterText(text) {
    return text === '' ? ' ' : text;
}

/**
 * Writes a single condition as a filter part.
 *
 * @param {CodeWriter} out writer
 * @param {object} expr condition node
 * @param {string} indent indentation
 * @param {Set.<object>} checked LIKE nodes whose pattern is checked in the script
 */
function writeCondition(out, expr, indent, checked) {
    switch (expr.type) {
        case 'compare': {
            writeSimplePart(
                out,
                expr.column,
                SIMPLE_OPERATORS[expr.op],
                filterText(expr.value.value),
                indent,
            );
            break;
        }
        case 'like': {
            const pattern = expr.pattern.value;
            const value = checked.has(expr) ? likeFilterValue(pattern) : pattern;
            writeSimplePart(out, expr.column, 'like', value, indent);
            break;
        }
        case 'in': {
            const values = expr.values.map((value) => filterText(value.value));
            if (expr.negated) {
                writeNotInChain(out, expr.column, values, indent);
            } else {
                writeSimplePart(out, expr.column, 'IN', values, indent);
            }
            break;
        }
        case 'between': {
            writeSimplePart(out, expr.column, 'between', [expr.low.value, expr.high.value], indent);
            break;
        }
        case 'null': {
            writeSimplePart(out, expr.column, expr.negated ? 'isNotNull' : 'isNull', '', indent);
            break;
        }
        default: {
            throw new TypeError(`Unknown condition type: ${expr.type}`);
        }
    }
}

/**
 * Writes a WHERE tree as nested SimpleFilterPart / ComplexFilterPart object literals.
 *
 * @param {CodeWriter} out writer
 * @param {object} expr expression node
 * @param {Map<object, string>} idOf node → clause id
 * @param {string} indent indentation of the closing brace
 * @param {Set.<object>} checked LIKE nodes whose pattern is checked in the script
 */
function writeFilter(out, expr, idOf, indent, checked) {
    if (expr.type === 'and' || expr.type === 'or') {
        writeComplexPart(
            out,
            expr.type.toUpperCase(),
            (inner) => writeFilter(out, expr.left, idOf, inner, checked),
            (inner) => writeFilter(out, expr.right, idOf, inner, checked),
            indent,
        );
        return;
    }
    out.region(idOf.get(expr), () => writeCondition(out, expr, indent, checked));
}

/**
 * Quotes text as a SQL string literal (for messages).
 *
 * @param {string} text text
 * @returns {string} quoted text
 */
function sqlQuote(text) {
    return `'${text.replaceAll("'", "''")}'`;
}

/**
 * Plans the filter of WSProxy / Rows.Retrieve: finds the LIKE conditions the `like` operator
 * cannot express exactly (anything but `'%x%'`), which get an exact check in the script. That
 * check only works when each of them sits on a pure AND path from the WHERE root.
 *
 * @param {SelectAst} ast statement
 * @param {string} label target name used in messages
 * @returns {{unavailable: string}|{checks: object[], messages: Message[]}} reason, or the LIKE
 * nodes to check plus info messages (LIKE checks, empty values sent as a space)
 */
function planFilter(ast, label) {
    const checks = [];
    let problem = null;
    const visit = (expr, isUnderOr) => {
        if (expr.type === 'and' || expr.type === 'or') {
            visit(expr.left, isUnderOr || expr.type === 'or');
            visit(expr.right, isUnderOr || expr.type === 'or');
        } else if (expr.type === 'like' && !isContainsPattern(expr.pattern.value)) {
            if (isUnderOr) {
                problem ??= expr;
            }
            checks.push(expr);
        }
    };
    if (ast.where) {
        visit(ast.where, false);
    }
    if (problem) {
        return {
            unavailable: `The ${label} like filter always matches "contains", so LIKE ${sqlQuote(problem.pattern.value)} has to be checked exactly in the script after the filter, but a LIKE inside OR can't be checked exactly after a ${label} filter. Use a pattern of the form '%text%', or move the LIKE out of the OR.`,
        };
    }
    const messages = checks.map((expr) =>
        createMessage(
            'info',
            LIKE_CHECKED_IN_SCRIPT,
            `The ${label} like filter always matches "contains", so the filter reads the rows containing "${likeFilterValue(expr.pattern.value)}" and the script then keeps only the rows where ${expr.column} matches LIKE ${sqlQuote(expr.pattern.value)} exactly.`,
            expr.loc,
        ),
    );
    for (const expr of conditionsOf(ast.where)) {
        let values = [];
        if (expr.type === 'compare') {
            values = [expr.value];
        } else if (expr.type === 'in') {
            values = expr.values;
        }
        if (values.some((value) => value.value === '')) {
            messages.push(
                createMessage(
                    'info',
                    EMPTY_STRING_AS_SPACE,
                    `The ${label} filter rejects an empty value, so '' is sent as a single space " ". This finds the same rows, because trailing spaces are ignored when text is compared.`,
                    expr.loc,
                ),
            );
        }
    }
    return { checks, messages };
}

/**
 * Writes the exact LIKE check of a row: `if (sqlLike(row["Col"], "pattern") && …) { push }`,
 * with each pattern marked as part of its condition.
 *
 * @param {CodeWriter} out writer
 * @param {object[]} checks LIKE nodes to check
 * @param {Map<object, string>} idOf node → clause id
 * @param {string} indent indentation of the if statement
 * @param {string} push the statement that keeps the row
 */
function writeRowCheck(out, checks, idOf, indent, push) {
    out.write(`${indent}if (`);
    for (const [index, expr] of checks.entries()) {
        out.write(`${index ? ' && ' : ''}sqlLike(row[${jsString(expr.column)}], `)
            .mark(idOf.get(expr), jsString(expr.pattern.value))
            .write(')');
    }
    out.write(`) {\n${indent}${INDENT}${push}\n${indent}}\n`);
}

// ------------------------------------------------------------------------------------------
// SSJS: WSProxy and Rows.Retrieve
// ------------------------------------------------------------------------------------------

/**
 * Lists the LIKE columns missing from the selected columns (case-insensitive, first spelling).
 *
 * @param {{name: string}[]} columns selected columns
 * @param {object[]} checks LIKE nodes checked in the script
 * @returns {string[]} column names to read in addition
 */
function missingCheckColumns(columns, checks) {
    const known = new Set(columns.map((column) => column.name.toLowerCase()));
    const missing = [];
    for (const expr of checks) {
        const key = expr.column.toLowerCase();
        if (!known.has(key)) {
            known.add(key);
            missing.push(expr.column);
        }
    }
    return missing;
}

/**
 * Merges the dropped clauses with the filter messages.
 *
 * @param {{messages: Message[], dropped: string[]}} extra messages and dropped clauses
 * @param {Message[]} messages filter messages
 * @returns {{messages: Message[], dropped: string[]}} merged
 */
function withMessages(extra, messages) {
    return { messages: [...extra.messages, ...messages], dropped: extra.dropped };
}

/**
 * Emits a WSProxy retrieve of `DataExtensionObject[Key]`. ORDER BY and TOP are dropped. LIKE
 * patterns other than `'%x%'` are read with the wider `like` filter and checked exactly with
 * `sqlLike` in the row loop (unavailable when such a LIKE sits under OR). A failed retrieve
 * leaves `rows` empty and its status in `retrieveError`.
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitSsjsWsproxy(ast, options = {}) {
    const context = prepare(ast, options);
    if (!context.columns) {
        return {
            unavailable:
                'WSProxy needs the list of columns to read. Name the columns in the SELECT, or enter the columns that * stands for in the settings.',
        };
    }
    const plan = planFilter(ast, 'WSProxy');
    if (plan.unavailable) {
        return plan;
    }
    const { checks } = plan;
    const rowsAsObjects = options.output?.rowsAsObjects ?? true;
    const isPaging = options.output?.paging ?? false;
    const missing = missingCheckColumns(context.columns, checks);
    const out = new CodeWriter();
    out.write(SSJS_START);
    if (missing.length) {
        // the cols array reads more columns than the SELECT names: keep the SELECT list here
        if (Array.isArray(ast.columns)) {
            writeSelectComment(out, context.columns);
        } else {
            out.write('// SQL: SELECT *\n');
        }
    }
    writeFromComment(out, context.deName, context.deKey);
    writeNotInMarker(out, ast);
    if (checks.length) {
        out.write(SQL_LIKE_HELPER);
    }
    if (rowsAsObjects || checks.length) {
        out.write(
            'function toObject(item) {\n    var obj = {};\n    var props = item.Properties;\n    for (var p = 0; p < props.length; p++) {\n        obj[props[p].Name] = props[p].Value;\n    }\n    return obj;\n}\n',
        );
    }
    out.write('var api = new Script.Util.WSProxy();\nvar objectType = ');
    out.mark('from', jsString(`DataExtensionObject[${context.deKey}]`)).write(';\nvar cols = [');
    for (const [index, column] of context.columns.entries()) {
        out.write(index ? ', ' : '').mark(column.clauseId, jsString(column.name));
    }
    for (const name of missing) {
        out.write(`, ${jsString(name)}`);
    }
    out.write('];\n');
    if (ast.where) {
        out.write('var filter = ');
        writeFilter(out, ast.where, context.idOf, '', new Set(checks));
        out.write(';\n');
    }
    // without WHERE the non-paging call passes a null filter, like the continuation (proven live)
    let call = 'api.retrieve(objectType, cols, filter)';
    if (!ast.where) {
        call = isPaging ? 'api.retrieve(objectType, cols)' : 'api.retrieve(objectType, cols, null)';
    }
    const item = rowsAsObjects ? 'toObject(result.Results[i])' : 'result.Results[i]';
    const writeBody = (indent) => {
        if (checks.length) {
            out.write(`${indent}var row = toObject(result.Results[i]);\n`);
            writeRowCheck(
                out,
                checks,
                context.idOf,
                indent,
                rowsAsObjects ? 'rows.push(row);' : 'rows.push(result.Results[i]);',
            );
        } else {
            out.write(`${indent}rows.push(${item});\n`);
        }
    };
    if (isPaging) {
        // the next batch is read with props.ContinueRequest = RequestID (proven live)
        const nextCall = `api.retrieve(objectType, cols, ${ast.where ? 'filter' : 'null'}, null, props)`;
        out.write(
            `var rows = [];\nvar retrieveError = "";\nvar props = {};\nvar result = ${call};\n`,
        );
        out.write(
            'while (result) {\n    if (result.Status !== "OK" && result.Status !== "MoreDataAvailable") {\n        rows = [];\n        retrieveError = String(result.Status);\n        break;\n    }\n    for (var i = 0; i < result.Results.length; i++) {\n',
        );
        writeBody(INDENT.repeat(2));
        out.write(
            `    }\n    if (result.HasMoreRows) {\n        props.ContinueRequest = result.RequestID;\n        result = ${nextCall};\n    } else {\n        result = null;\n    }\n}\n`,
        );
    } else {
        out.write(
            `var rows = [];\nvar retrieveError = "";\nvar hasMoreRows = false;\nvar result = ${call};\n`,
        );
        out.write(
            'if (result.Status === "OK" || result.Status === "MoreDataAvailable") {\n    for (var i = 0; i < result.Results.length; i++) {\n',
        );
        writeBody(INDENT.repeat(2));
        out.write(
            '    }\n} else {\n    retrieveError = String(result.Status);\n}\nif (result.HasMoreRows) {\n    // only the first batch was read: turn on paging in the settings to read every row\n    hasMoreRows = true;\n}\n',
        );
    }
    out.write(SSJS_END);
    const messages = [...plan.messages];
    if (!isPaging) {
        messages.push(
            createMessage(
                'info',
                FIRST_BATCH_ONLY,
                'Without paging only the first batch of up to 2,500 rows is read; turn on paging for more.',
                ast.from.loc,
            ),
        );
    }
    return finish(
        out,
        withMessages(
            dropClauses(ast, context.clauses, { orderBy: true, top: true }, 'WSProxy retrieve'),
            messages,
        ),
    );
}

/**
 * Emits `DataExtension.Init(key).Rows.Retrieve(filter)`. ORDER BY and TOP are dropped; all
 * columns are returned, so an explicit column list is kept in a header comment. LIKE patterns
 * other than `'%x%'` are read with the wider `like` filter and checked exactly with `sqlLike`
 * in a loop that builds `rows` (unavailable when such a LIKE sits under OR).
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitSsjsRowsRetrieve(ast, options = {}) {
    const plan = planFilter(ast, 'Rows.Retrieve');
    if (plan.unavailable) {
        return plan;
    }
    const { checks } = plan;
    const context = prepare(ast, options);
    const out = new CodeWriter();
    out.write(SSJS_START);
    if (Array.isArray(ast.columns)) {
        writeSelectComment(out, context.columns);
    }
    writeFromComment(out, context.deName, context.deKey);
    writeNotInMarker(out, ast);
    if (checks.length) {
        out.write(SQL_LIKE_HELPER);
    }
    out.write('var de = DataExtension.Init(').mark('from', jsString(context.deKey)).write(');\n');
    if (ast.where) {
        out.write('var filter = ');
        writeFilter(out, ast.where, context.idOf, '', new Set(checks));
        out.write(';\n');
    }
    if (checks.length) {
        out.write(
            'var retrieved = de.Rows.Retrieve(filter);\nvar rows = [];\nfor (var i = 0; i < retrieved.length; i++) {\n    var row = retrieved[i];\n',
        );
        writeRowCheck(out, checks, context.idOf, INDENT, 'rows.push(row);');
        out.write('}\n');
    } else {
        out.write(
            ast.where
                ? 'var rows = de.Rows.Retrieve(filter);\n'
                : 'var rows = de.Rows.Retrieve();\n',
        );
    }
    out.write(SSJS_END);
    return finish(
        out,
        withMessages(
            dropClauses(ast, context.clauses, { orderBy: true, top: true }, 'Rows.Retrieve'),
            plan.messages,
        ),
    );
}

// ------------------------------------------------------------------------------------------
// Lookup family (equals + AND only)
// ------------------------------------------------------------------------------------------

/**
 * Describes the first part of a WHERE tree a lookup function cannot express.
 *
 * @param {object} expr expression node
 * @returns {string|null} plain description, or null when the tree is equals + AND only
 */
function lookupProblem(expr) {
    switch (expr.type) {
        case 'and': {
            return lookupProblem(expr.left) ?? lookupProblem(expr.right);
        }
        case 'or': {
            return 'OR';
        }
        case 'compare': {
            return expr.op === '=' ? null : `the operator ${expr.op}`;
        }
        case 'like': {
            return 'LIKE';
        }
        case 'in': {
            return expr.negated ? 'NOT IN' : 'IN';
        }
        case 'between': {
            return 'BETWEEN';
        }
        case 'null': {
            return expr.negated ? 'IS NOT NULL' : 'IS NULL';
        }
        default: {
            return expr.type;
        }
    }
}

/**
 * Checks that a query fits a lookup function and returns its column / value pairs.
 *
 * @param {SelectAst} ast statement
 * @param {string} functionName name used in the reason
 * @param {string} alternative what to use instead
 * @returns {{unavailable: string}|{pairs: object[]}} reason, or the equality conditions
 */
function lookupPairs(ast, functionName, alternative) {
    if (!ast.where) {
        return {
            unavailable: `${functionName} needs at least one condition such as WHERE Column = 'value'. Use ${alternative} to read rows without a condition.`,
        };
    }
    const problem = lookupProblem(ast.where);
    if (problem) {
        return {
            unavailable: `${functionName} can only match exact values joined with AND (Column = 'value' AND …), but this query uses ${problem}. Use ${alternative} instead.`,
        };
    }
    return { pairs: conditionsOf(ast.where) };
}

/**
 * Checks that LookupOrderedRows can sort by the ORDER BY columns.
 *
 * @param {SelectAst} ast statement
 * @returns {{unavailable: string}|null} reason, or null when the sort order fits
 */
function sortProblem(ast) {
    if (!ast.orderBy?.length) {
        return {
            unavailable:
                'LookupOrderedRows needs a sort order. Add ORDER BY Column ASC (or DESC), or use the LookupRows output.',
        };
    }
    const awkward = ast.orderBy.find((item) => /[\s,]/.test(item.column));
    if (awkward) {
        return {
            unavailable: `LookupOrderedRows cannot sort by "${awkward.column}" because the sort text cannot hold a column name with spaces or commas. Use the LookupRows output and sort in your code.`,
        };
    }
    return null;
}

/**
 * Builds the sort text of LookupOrderedRows (`Col ASC, Col2 DESC`), each item as a piece.
 *
 * @param {SelectAst} ast statement
 * @param {Map<object, string>} idOf node → clause id
 * @returns {{clauseId: string, text: string}[]} sort items
 */
function sortItems(ast, idOf) {
    return ast.orderBy.map((item) => ({
        clauseId: idOf.get(item),
        text: `${item.column} ${item.direction}`,
    }));
}

/**
 * Writes a quoted sort string with each item marked.
 *
 * @param {CodeWriter} out writer
 * @param {{clauseId: string, text: string}[]} items sort items
 * @param {(text: string) => string} quote string literal formatter
 */
function writeSortString(out, items, quote) {
    const unquote = (text) => quote(text).slice(1, -1);
    out.write('"');
    for (const [index, item] of items.entries()) {
        out.write(index ? ', ' : '').mark(item.clauseId, unquote(item.text));
    }
    out.write('"');
}

/**
 * Writes the SSJS field and value arrays of a lookup call.
 *
 * @param {CodeWriter} out writer
 * @param {object[]} pairs equality conditions
 * @param {Map<object, string>} idOf node → clause id
 */
function writeSsjsLookupArrays(out, pairs, idOf) {
    out.write('[');
    for (const [index, pair] of pairs.entries()) {
        out.write(index ? ', ' : '').mark(idOf.get(pair), jsString(pair.column));
    }
    out.write('], [');
    for (const [index, pair] of pairs.entries()) {
        out.write(index ? ', ' : '').mark(idOf.get(pair), jsString(pair.value.value));
    }
    out.write(']');
}

const SSJS_LOOKUP_ALTERNATIVE = 'the WSProxy or Rows.Retrieve output';
const AMPSCRIPT_LOOKUP_ALTERNATIVE = 'the SSJS WSProxy output';

/**
 * Emits `Platform.Function.LookupRows(name, fields, values)`. Equals + AND only; ORDER BY
 * and TOP are dropped; an explicit column list is kept in a header comment.
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitSsjsLookupRows(ast, options = {}) {
    const check = lookupPairs(ast, 'LookupRows', SSJS_LOOKUP_ALTERNATIVE);
    if (check.unavailable) {
        return check;
    }
    const context = prepare(ast, options);
    const out = new CodeWriter();
    out.write(SSJS_START);
    if (Array.isArray(ast.columns)) {
        writeSelectComment(out, context.columns);
    }
    out.write('var rows = Platform.Function.LookupRows(')
        .mark('from', jsString(context.deName))
        .write(', ');
    writeSsjsLookupArrays(out, check.pairs, context.idOf);
    out.write(');\nvar rowCount = rows ? rows.length : 0;\n').write(SSJS_END);
    return finish(
        out,
        withMessages(
            dropClauses(ast, context.clauses, { orderBy: true, top: true }, 'LookupRows'),
            lookupLimitMessages(ast, context.clauses, 'LookupRows'),
        ),
    );
}

/**
 * Emits `Platform.Function.LookupOrderedRows(name, count, sort, fields, values)`. Needs
 * ORDER BY; count comes from TOP (0 = all rows).
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitSsjsLookupOrderedRows(ast, options = {}) {
    const check = lookupPairs(ast, 'LookupOrderedRows', SSJS_LOOKUP_ALTERNATIVE);
    if (check.unavailable) {
        return check;
    }
    const sortCheck = sortProblem(ast);
    if (sortCheck) {
        return sortCheck;
    }
    const context = prepare(ast, options);
    const out = new CodeWriter();
    out.write(SSJS_START);
    if (Array.isArray(ast.columns)) {
        writeSelectComment(out, context.columns);
    }
    out.write('var rows = Platform.Function.LookupOrderedRows(')
        .mark('from', jsString(context.deName))
        .write(', ');
    if (ast.top === null || ast.top === undefined) {
        out.write('0');
    } else {
        out.mark('top', String(ast.top));
    }
    out.write(', ');
    writeSortString(out, sortItems(ast, context.idOf), jsString);
    out.write(', ');
    writeSsjsLookupArrays(out, check.pairs, context.idOf);
    out.write(');\nvar rowCount = rows ? rows.length : 0;\n').write(SSJS_END);
    return finish(out, {
        messages: lookupLimitMessages(ast, context.clauses, 'LookupOrderedRows'),
        dropped: [],
    });
}

// ------------------------------------------------------------------------------------------
// AMPscript
// ------------------------------------------------------------------------------------------

/**
 * Turns column names into AMPscript variable names, one per column in the same order.
 * AMPscript variable names ignore case, so names that only differ in case or in replaced
 * characters get a number (`@a_b`, `@a_b2`, …). They never clash with the loop variables
 * (`@rows`, `@row`, `@rowCount`, `@i`): such a column gets `Value` appended.
 *
 * @param {string[]} names column names
 * @returns {string[]} variable names including `@`
 */
export function ampVariableNames(names) {
    const used = new Set(AMPSCRIPT_LOOP_VARIABLES);
    return names.map((name) => {
        let base = String(name).replaceAll(/[^A-Za-z0-9_]/g, '_');
        if (/^\d/.test(base)) {
            base = `_${base}`;
        }
        if (AMPSCRIPT_LOOP_VARIABLES.has(base.toLowerCase())) {
            base += 'Value';
        }
        let variable = base;
        for (let suffix = 2; used.has(variable.toLowerCase()); suffix++) {
            variable = `${base}${suffix}`;
        }
        used.add(variable.toLowerCase());
        return `@${variable}`;
    });
}

/**
 * Checks that no name or value of the query contains `%%`. Inside an AMPscript block, `]%%`
 * ends the block; whether SFMC accepts it inside a string is not proven, so such queries get
 * no AMPscript output.
 *
 * @param {SelectAst} ast statement
 * @param {{name: string}[]|null} columns selected columns
 * @returns {{unavailable: string}|null} reason, or null when the query is safe
 */
function ampscriptTextProblem(ast, columns) {
    const texts = [ast.from.name, ...(columns ?? []).map((column) => column.name)];
    for (const expr of conditionsOf(ast.where)) {
        const values = [expr.value, expr.pattern, expr.low, expr.high, ...(expr.values ?? [])];
        texts.push(expr.column, ...values.filter(Boolean).map((value) => value.value));
    }
    const orderBy = ast.orderBy ?? [];
    for (const item of orderBy) {
        texts.push(item.column);
    }
    const found = texts.find((text) => text.includes('%%'));
    if (found === undefined) {
        return null;
    }
    return {
        unavailable: `AMPscript can't safely hold "%%" in a name or value ("${found}"), because it can end the AMPscript block. Use the SSJS outputs instead.`,
    };
}

/**
 * Warns when TOP asks for more rows than a lookup function returns (at most 2,000).
 *
 * @param {SelectAst} ast statement
 * @param {object[]} clauses clauses from `collectClauses`
 * @param {string} label function name used in the message
 * @returns {Message[]} the warning, or none
 */
function lookupLimitMessages(ast, clauses, label) {
    if (ast.top === null || ast.top === undefined || ast.top <= LOOKUP_ROW_LIMIT) {
        return [];
    }
    const topClause = clauses.find((clause) => clause.clauseId === 'top');
    return [
        createMessage(
            'warning',
            TOP_ABOVE_LOOKUP_LIMIT,
            `${label} returns at most 2,000 rows, so TOP ${ast.top} can't be reached. Use the SSJS WSProxy output with paging to read more rows.`,
            topClause?.loc ?? ast.loc,
        ),
    ];
}

/**
 * Writes the column / value pairs of an AMPscript lookup call (`, "Col", "v", …`).
 *
 * @param {CodeWriter} out writer
 * @param {object[]} pairs equality conditions
 * @param {Map<object, string>} idOf node → clause id
 */
function writeAmpPairs(out, pairs, idOf) {
    for (const pair of pairs) {
        out.write(', ').region(idOf.get(pair), () => {
            out.write(`${ampString(pair.column)}, ${ampString(pair.value.value)}`);
        });
    }
}

/**
 * Writes the FOR loop that reads the selected columns of every row.
 *
 * @param {CodeWriter} out writer
 * @param {{name: string, clauseId?: string}[]|null} columns selected columns
 */
export function writeAmpLoop(out, columns) {
    out.write(
        'SET @rowCount = RowCount(@rows)\nFOR @i = 1 TO @rowCount DO\n    SET @row = Row(@rows, @i)\n',
    );
    if (columns) {
        const variables = ampVariableNames(columns.map((column) => column.name));
        for (const [index, column] of columns.entries()) {
            out.write(`    SET ${variables[index]} = Field(@row, `)
                .mark(column.clauseId, ampString(column.name))
                .write(')\n');
        }
    } else {
        out.write("    /* add one Field(@row, 'ColumnName') per column you need */\n");
    }
    out.write('NEXT @i\n');
}

/**
 * Emits AMPscript `LookupRows("Name", "Col", "v", …)` plus a FOR loop. Equals + AND only;
 * ORDER BY and TOP are dropped.
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitAmpscriptLookupRows(ast, options = {}) {
    const check = lookupPairs(ast, 'LookupRows', AMPSCRIPT_LOOKUP_ALTERNATIVE);
    if (check.unavailable) {
        return check;
    }
    const context = prepare(ast, options);
    const textProblem = ampscriptTextProblem(ast, context.columns);
    if (textProblem) {
        return textProblem;
    }
    const out = new CodeWriter();
    out.write('%%[\n');
    if (Array.isArray(ast.columns)) {
        writeSelectComment(out, context.columns, 'block');
    }
    out.write('SET @rows = LookupRows(').mark('from', ampString(context.deName));
    writeAmpPairs(out, check.pairs, context.idOf);
    out.write(')\n');
    writeAmpLoop(out, context.columns);
    out.write(']%%');
    return finish(
        out,
        withMessages(
            dropClauses(ast, context.clauses, { orderBy: true, top: true }, 'LookupRows'),
            lookupLimitMessages(ast, context.clauses, 'LookupRows'),
        ),
    );
}

/**
 * Emits AMPscript `LookupOrderedRows("Name", count, "Col ASC", "Col", "v", …)` plus a FOR
 * loop. Needs ORDER BY; count comes from TOP (0 = all rows).
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitAmpscriptLookupOrderedRows(ast, options = {}) {
    const check = lookupPairs(ast, 'LookupOrderedRows', AMPSCRIPT_LOOKUP_ALTERNATIVE);
    if (check.unavailable) {
        return check;
    }
    const sortCheck = sortProblem(ast);
    if (sortCheck) {
        return sortCheck;
    }
    const context = prepare(ast, options);
    const textProblem = ampscriptTextProblem(ast, context.columns);
    if (textProblem) {
        return textProblem;
    }
    const out = new CodeWriter();
    out.write('%%[\n');
    if (Array.isArray(ast.columns)) {
        writeSelectComment(out, context.columns, 'block');
    }
    out.write('SET @rows = LookupOrderedRows(').mark('from', ampString(context.deName));
    out.write(', ');
    if (ast.top === null || ast.top === undefined) {
        out.write('0');
    } else {
        out.mark('top', String(ast.top));
    }
    out.write(', ');
    writeSortString(out, sortItems(ast, context.idOf), ampString);
    writeAmpPairs(out, check.pairs, context.idOf);
    out.write(')\n');
    writeAmpLoop(out, context.columns);
    out.write(']%%');
    return finish(out, {
        messages: lookupLimitMessages(ast, context.clauses, 'LookupOrderedRows'),
        dropped: [],
    });
}

/**
 * Emits AMPscript `SET @Col = Lookup("Name", "Col", "Where", "v", …)`. Needs exactly one
 * selected column and equals + AND; returns the first match only (info message). ORDER BY is
 * dropped, and TOP unless it is 1.
 *
 * @param {SelectAst} ast statement
 * @param {EmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitAmpscriptLookup(ast, options = {}) {
    const context = prepare(ast, options);
    if (context.columns?.length !== 1) {
        return {
            unavailable:
                'Lookup returns the value of a single column. Select exactly one column, or use the LookupRows output.',
        };
    }
    const check = lookupPairs(ast, 'Lookup', AMPSCRIPT_LOOKUP_ALTERNATIVE);
    if (check.unavailable) {
        return check;
    }
    const textProblem = ampscriptTextProblem(ast, context.columns);
    if (textProblem) {
        return textProblem;
    }
    const [column] = context.columns;
    const [variable] = ampVariableNames([column.name]);
    const out = new CodeWriter();
    // TOP 1 is what Lookup does anyway: it maps to the call instead of being dropped.
    out.write(`%%[\nSET ${variable} = `)
        .mark(ast.top === 1 ? 'top' : undefined, 'Lookup')
        .write('(')
        .mark('from', ampString(context.deName))
        .write(', ')
        .mark(column.clauseId, ampString(column.name));
    writeAmpPairs(out, check.pairs, context.idOf);
    out.write(')\n]%%');
    const extra = dropClauses(
        ast,
        context.clauses,
        { orderBy: true, top: ast.top !== 1 },
        'Lookup',
    );
    const location = Array.isArray(ast.columns) ? ast.columns[0].loc : ast.loc;
    extra.messages.push(
        createMessage(
            'info',
            LOOKUP_FIRST_ROW_ONLY,
            `Lookup returns only the ${column.name} value of the first matching row. Use the LookupRows output to read every match.`,
            location,
        ),
    );
    return finish(out, extra);
}

// ------------------------------------------------------------------------------------------
// Registry
// ------------------------------------------------------------------------------------------

/**
 * Engagement targets in display order.
 *
 * @type {ReadonlyArray<{id: string, language: 'ssjs'|'ampscript', label: string,
 * emit: (ast: SelectAst, options?: EmitOptions) => EmitResult|{unavailable: string},
 * normalize: {expandNotIn?: boolean, dropTop?: boolean}}>}
 */
export const MCE_TARGETS = Object.freeze([
    {
        id: 'ssjs-wsproxy',
        language: 'ssjs',
        label: 'WSProxy',
        emit: emitSsjsWsproxy,
        normalize: { expandNotIn: true },
    },
    {
        id: 'ssjs-rows-retrieve',
        language: 'ssjs',
        label: 'Rows.Retrieve',
        emit: emitSsjsRowsRetrieve,
        normalize: { expandNotIn: true },
    },
    {
        id: 'ssjs-lookuprows',
        language: 'ssjs',
        label: 'LookupRows',
        emit: emitSsjsLookupRows,
        normalize: {},
    },
    {
        id: 'ssjs-lookuporderedrows',
        language: 'ssjs',
        label: 'LookupOrderedRows',
        emit: emitSsjsLookupOrderedRows,
        normalize: {},
    },
    {
        id: 'ampscript-lookuprows',
        language: 'ampscript',
        label: 'LookupRows',
        emit: emitAmpscriptLookupRows,
        normalize: {},
    },
    {
        id: 'ampscript-lookuporderedrows',
        language: 'ampscript',
        label: 'LookupOrderedRows',
        emit: emitAmpscriptLookupOrderedRows,
        normalize: {},
    },
    {
        id: 'ampscript-lookup',
        language: 'ampscript',
        label: 'Lookup',
        emit: emitAmpscriptLookup,
        // Lookup always returns one row: TOP 1 is implied by the call itself
        normalize: { dropTop: true },
    },
]);
