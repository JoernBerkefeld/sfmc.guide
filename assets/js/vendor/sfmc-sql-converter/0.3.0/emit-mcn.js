/**
 * Marketing Cloud Next emitters: turn a parsed SELECT (see `parseSql`) into Handlebars
 * (`query` / `queryFirst`) or AMPscript (`RetrieveSalesforceObjects`, `LookupRows`) that reads
 * the same records from a Sales Cloud object (`CRM`), a marketing object (`MO`) or a DMO of the
 * email's bound data graph (`DG`).
 *
 * Only what the live probes proved is emitted (see `NEXT_RULES`, which points at the
 * verification DB rows); everything else makes the target unavailable with a plain reason.
 * Emitter results have the same shape as the Engagement emitters (see emit-mce.js).
 */

import { CodeWriter, collectClauses, conditionsOf, isContainsPattern } from './clauses.js';
import { ampString, emitAmpscriptLookupRows, writeAmpLoop } from './emit-mce.js';
import {
    DATA_GRAPH_SCOPE,
    LOOKUP_FIRST_ROW_ONLY,
    MO_ONE_MATCH,
    TOP_DROPPED,
    createMessage,
} from './messages.js';

/**
 * @typedef {import('./sql-parser.js').SelectAst} SelectAst
 * @typedef {import('./emit-mce.js').EmitResult} EmitResult
 */

/**
 * @typedef {object} NextEmitOptions
 * @property {string} [sourceText] the SQL text the AST came from (locates TOP for messages)
 */

const DB = 'entries/mcn/';
const QUERY = `${DB}mcn-handlebars-email-query.json`;
const QUERY_FIRST = `${DB}mcn-handlebars-email-queryfirst.json`;
const RSO = `${DB}mcn-ampscript-email-retrievesalesforceobjects.json`;
const LOOKUP_ROWS = `${DB}mcn-ampscript-email-lookuprows.json`;
const LOOKUP_ORDERED_ROWS = `${DB}mcn-ampscript-email-lookuporderedrows.json`;
const DATA_GRAPH = `${DB}mcn-handlebars-email-datagraph.json`;

/**
 * Builds verification DB references `file#checklist[i]` (0-based, as in the JSON array).
 *
 * @param {string} file DB entry path
 * @param {...number} indexes checklist indexes
 * @returns {string[]} references
 */
function rows(file, ...indexes) {
    return indexes.map((index) => `${file}#checklist[${index}]`);
}

/**
 * What the Next probes proved or disproved, in one place. Each rule has the `value` the
 * emitters use and `db`, the verification DB rows (`.claude/skills/_verification-db/…`) it rests
 * on; `db: []` marks a construct that was not probed and is therefore not emitted.
 */
export const NEXT_RULES = Object.freeze({
    // Handlebars query/queryFirst with named parameters saves and publishes
    namedParameters: { value: true, db: [...rows(QUERY, 2), ...rows(QUERY_FIRST, 2)] },
    // CRM where operators (SQL → Next); `<>` is written as `!=` (only `!=` was probed)
    crmOperators: {
        value: Object.freeze({ '=': '=', '<>': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=' }),
        db: rows(QUERY, 5, 6, 7, 8, 9, 10, 11, 12, 13, 64),
    },
    // values only as :name placeholders with params=(hash …); literals in where fail
    paramsOnly: { value: true, db: rows(QUERY, 5, 6, 8, 24, 25, 26) },
    // dates are compared with a "yyyy-MM-dd" string param
    dateParams: { value: true, db: rows(QUERY, 21, 22, 23) },
    // LIKE always matches "contains"; only `%text%` gives the SQL result
    likeContainsOnly: {
        value: true,
        db: [...rows(QUERY, 14, 15, 16, 17, 18, 23), ...rows(RSO, 13, 14, 15)],
    },
    // AND, OR and parentheses in a CRM where
    crmBoolean: { value: true, db: rows(QUERY, 18, 19, 20, 41) },
    // a query without where/params (fields, sortBy, limit only)
    crmNoWhere: { value: true, db: rows(QUERY, 42) },
    // #each body: one {{Field}} per line (CRM and MO)
    eachBody: { value: true, db: rows(QUERY, 41, 49) },
    // Handlebars string escaping: " is written as \", ' and other backslashes stay as they are
    hbEscaping: {
        value: true,
        db: [...rows(QUERY, 43, 44, 45), ...rows(`${DB}mcn-handlebars-email-concat.json`, 1)],
    },
    // number params stay unquoted, also negative and decimal
    numberParams: { value: true, db: rows(QUERY, 5, 46) },
    // IN, NOT IN and NOT (…) fail; BETWEEN was not probed: error with a rewrite hint
    crmInBetween: { value: false, db: rows(QUERY, 69, 70, 71) },
    // IS NULL / IS NOT NULL were not probed on any Next target
    nullTests: { value: false, db: [] },
    // fields= is required: without it every field is empty
    crmFieldsRequired: { value: true, db: rows(QUERY, 30, 31) },
    // sortBy="Field ASC|DESC" (one field) orders the result; queryFirst picks by it
    crmSortBy: {
        value: 'one field',
        db: [...rows(QUERY, 27, 28, 41, 42, 66), ...rows(QUERY_FIRST, 6, 7, 20)],
    },
    // limit=n caps the result after sorting
    crmLimit: { value: true, db: rows(QUERY, 29, 41, 42) },
    // queryFirst: one value read with get; no match renders empty
    queryFirstGet: { value: true, db: rows(QUERY_FIRST, 5, 8, 20) },
    // MO query: inline filters Field=value on any field (key or not, number or text),
    // several combine with AND; where, where + inline, and no filter fail
    moInlineFilters: {
        value: true,
        db: [
            ...rows(QUERY, 3, 4, 32, 33, 34, 49, 50, 51, 52, 53, 54, 55, 57),
            ...rows(QUERY_FIRST, 3, 4, 21, 22),
        ],
    },
    // MO query: limit=n works, sortBy fails
    moLimit: { value: true, db: rows(QUERY, 60) },
    moSortBy: { value: false, db: [...rows(QUERY, 61), ...rows(QUERY_FIRST, 23)] },
    // MO: a filter that matches two records returned only one (Handlebars query and LookupRows)
    moOneMatch: { value: true, db: [...rows(QUERY, 62), ...rows(LOOKUP_ROWS, 15)] },
    // MO LookupRows: the same field in two pairs uses the second pair (no AND)
    lookupRowsDistinctFields: { value: true, db: rows(LOOKUP_ROWS, 16) },
    // RetrieveSalesforceObjects operators; `<>` is written as `!=`
    rsoOperators: {
        value: Object.freeze({
            '=': '=',
            '<>': '!=',
            '<': '<',
            '<=': '<=',
            '>': '>',
            '>=': '>=',
            LIKE: 'LIKE',
        }),
        db: rows(RSO, 6, 7, 8, 11, 15, 16, 17, 18, 21, 23),
    },
    // operators as literal strings; Char()/Concat() fail
    rsoOperatorLiteral: { value: true, db: rows(RSO, 9) },
    // several triplets combine with AND (never OR)
    rsoAndOnly: { value: true, db: rows(RSO, 11, 12, 25, 26) },
    // the same field in two triplets returns no rows: each field at most once
    rsoDistinctFields: { value: true, db: rows(RSO, 22, 24) },
    // the result is tested with RowCount (Empty() gives false); Row/Field read values
    rsoRowCount: { value: true, db: rows(RSO, 2, 3, 4, 21) },
    // LookupRows on a marketing object: equals + AND, key or non-key field
    lookupRowsMo: { value: true, db: rows(LOOKUP_ROWS, 0, 2, 3, 4, 7, 8, 9) },
    // LookupOrderedRows fails in Next: no ORDER BY / TOP for AMPscript
    noOrderedLookup: { value: true, db: rows(LOOKUP_ORDERED_ROWS, 2, 3, 4, 5, 6) },
    // DG: #each over a DMO array directly under the root of the email's bound data graph
    // (Email Builder preview only; the previewEmail API does not load the graph)
    dgEach: { value: true, db: rows(DATA_GRAPH, 3, 19) },
    // DG row check inside the loop: compare (SQL → helper operator), and, or; <, <= and >= are
    // listed by the helper but were not probed one by one
    dgOperators: {
        value: Object.freeze({ '=': '==', '<>': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=' }),
        db: rows(DATA_GRAPH, 4, 5, 6, 7, 10),
    },
    // DG: compare == is case-sensitive (unlike SQL Server)
    dgCaseSensitive: { value: true, db: rows(DATA_GRAPH, 9) },
    // DG ORDER BY: sort arr "Field" "asc"|"desc" "string"
    dgSort: { value: true, db: rows(DATA_GRAPH, 11, 12) },
    // DG TOP: slice arr 0 N, also around sort
    dgSlice: { value: true, db: rows(DATA_GRAPH, 13, 14) },
    // DG: the filter helper breaks the preview (5 arguments) or the save (4 arguments)
    dgFilterHelper: { value: false, db: rows(DATA_GRAPH, 17, 18) },
});

// Salesforce API names: letters, digits and underscores, starting with a letter
const API_NAME = /^[A-Za-z]\w*$/;
const INDENT = ' '.repeat(4);
const HANDLEBARS_ALTERNATIVE = 'the Handlebars query output';

/**
 * Formats text as a double-quoted Handlebars string: `"` is written as `\"`.
 *
 * @param {string} text the text (must not end with a backslash)
 * @returns {string} string literal
 */
export function hbString(text) {
    return `"${String(text).replaceAll('"', String.raw`\"`)}"`;
}

/**
 * Formats a value for a Handlebars hash: numbers stay numbers, text becomes a string.
 *
 * @param {{kind: string, value: string}} value value node
 * @returns {string} Handlebars literal
 */
function hbValue(value) {
    return value.kind === 'number' ? value.value : hbString(value.value);
}

/**
 * Lists every value of the WHERE tree.
 *
 * @param {SelectAst} ast statement
 * @returns {{value: string}[]} value nodes
 */
function valuesOf(ast) {
    return conditionsOf(ast.where).flatMap((expr) =>
        [expr.value, expr.pattern, expr.low, expr.high, ...(expr.values ?? [])].filter(Boolean),
    );
}

/**
 * Checks names (object, columns, filter and sort fields) against the Salesforce API name rule.
 *
 * @param {SelectAst} ast statement
 * @returns {string|null} reason, or null when every name fits
 */
function nameProblem(ast) {
    const names = [
        ast.from.name,
        ...(Array.isArray(ast.columns) ? ast.columns.map((column) => column.name) : []),
        ...conditionsOf(ast.where).map((expr) => expr.column),
        ...(ast.orderBy ?? []).map((item) => item.column),
    ];
    const bad = names.find((name) => !API_NAME.test(name));
    return bad === undefined
        ? null
        : `"${bad}" is not a Salesforce API name. Next reads objects and fields by their API name, which has only letters, digits and underscores (e.g. LastName or Score__c).`;
}

/**
 * Describes the first part of a WHERE tree a Next target cannot express.
 *
 * @param {object} expr expression node
 * @param {{label: string, or: boolean, orHint?: string, ops: Readonly<Record<string, string>>,
 * like: boolean}} caps what the target supports
 * @returns {string|null} reason, or null when the tree fits
 */
function whereProblem(expr, caps) {
    switch (expr.type) {
        case 'and': {
            return whereProblem(expr.left, caps) ?? whereProblem(expr.right, caps);
        }
        case 'or': {
            if (!caps.or) {
                return `${caps.label} can only combine conditions with AND, but this query uses OR.${caps.orHint ?? ''}`;
            }
            return whereProblem(expr.left, caps) ?? whereProblem(expr.right, caps);
        }
        case 'compare': {
            return Object.hasOwn(caps.ops, expr.op)
                ? null
                : `${caps.label} can only match exact values (=) joined with AND, but this query uses ${expr.op}.`;
        }
        case 'like': {
            if (!caps.like) {
                return `${caps.label} can't use LIKE.`;
            }
            return likeProblem(expr.pattern.value);
        }
        case 'in': {
            return expr.negated
                ? `NOT IN is not supported in Next. Write it as conditions joined with AND: ${expr.column} <> 'a' AND ${expr.column} <> 'b'.`
                : `IN is not supported in Next. Write it as conditions joined with OR: ${expr.column} = 'a' OR ${expr.column} = 'b'.`;
        }
        case 'between': {
            return `BETWEEN is not supported in Next. Write it as two conditions: ${expr.column} >= low AND ${expr.column} <= high.`;
        }
        case 'null': {
            return `Next has no proven way to test for empty values (${expr.column} IS ${expr.negated ? 'NOT ' : ''}NULL), so this query can't be converted.`;
        }
        default: {
            return expr.type;
        }
    }
}

/**
 * Checks that a LIKE pattern means "contains" (`%text%` without `_` or `[`), the only LIKE
 * Next gives the SQL result for.
 *
 * @param {string} pattern LIKE pattern
 * @returns {string|null} reason, or null for a contains pattern
 */
function likeProblem(pattern) {
    const inner = pattern.slice(1, -1);
    if (isContainsPattern(pattern) && !/[%_[]/.test(inner)) {
        return null;
    }
    return `Next matches LIKE as "contains" and ignores the wildcards, so '${pattern}' would also return values that only contain the text somewhere (e.g. 'Ro%' also returns Brown). Only '%text%' patterns without _ or [ ] convert.`;
}

/**
 * Checks the values for what a Handlebars string can't hold.
 *
 * @param {SelectAst} ast statement
 * @returns {string|null} reason, or null when every value fits
 */
function hbValueProblem(ast) {
    const bad = valuesOf(ast).find((value) => value.value.endsWith('\\'));
    return bad
        ? `The value "${bad.value}" ends with a backslash, which a Handlebars string can't hold. Remove the backslash.`
        : null;
}

/**
 * Checks the values for "%%", which can end an AMPscript block.
 *
 * @param {SelectAst} ast statement
 * @returns {string|null} reason, or null when every value fits
 */
function ampValueProblem(ast) {
    const bad = valuesOf(ast).find((value) => value.value.includes('%%'));
    return bad
        ? `AMPscript can't safely hold "%%" in a value ("${bad.value}"), because it can end the AMPscript block. Use ${HANDLEBARS_ALTERNATIVE} instead.`
        : null;
}

/**
 * Checks that the query lists its columns (Next reads only the listed fields).
 *
 * @param {SelectAst} ast statement
 * @param {string} label target name
 * @returns {string|null} reason, or null for an explicit column list
 */
function starProblem(ast, label) {
    return ast.columns === '*'
        ? `${label} needs the field names: list the columns in the SELECT instead of *.`
        : null;
}

/**
 * Checks that the query neither sorts nor limits.
 *
 * @param {SelectAst} ast statement
 * @param {string} label target name
 * @returns {string|null} reason, or null without TOP and ORDER BY
 */
function sortLimitProblem(ast, label) {
    const parts = [
        ast.top !== null && ast.top !== undefined && 'TOP',
        ast.orderBy?.length && 'ORDER BY',
    ].filter(Boolean);
    return parts.length
        ? `${label} can't sort or limit rows in Next, so ${parts.join(' and ')} can't be converted. Remove it and sort or count in your code.`
        : null;
}

/**
 * Returns the first problem of a list of checks.
 *
 * @param {...(string|null)} problems reasons or null
 * @returns {{unavailable: string}|null} the first reason, or null
 */
function firstProblem(...problems) {
    const reason = problems.find(Boolean);
    return reason ? { unavailable: reason } : null;
}

/**
 * Finishes an emitter result: sorts spans by position.
 *
 * @param {CodeWriter} out writer
 * @param {object[]} messages messages
 * @param {string[]} dropped dropped clause ids
 * @returns {EmitResult} result
 */
function finish(out, messages = [], dropped = []) {
    out.spans.sort((a, b) => a.start - b.start || a.end - b.end);
    return { code: out.code, spans: out.spans, messages, dropped };
}

// ------------------------------------------------------------------------------------------
// Handlebars CRM: query / queryFirst
// ------------------------------------------------------------------------------------------

const CRM_CAPS = {
    label: 'Handlebars query',
    or: true,
    ops: NEXT_RULES.crmOperators.value,
    like: true,
};

/**
 * Writes a CRM where string with :pN placeholders, brackets around OR inside AND.
 *
 * @param {CodeWriter} out writer
 * @param {object} expr expression node
 * @param {Map<object, {clauseId: string, param: string}>} paramOf condition → parameter
 * @param {'and'|'or'|null} parent type of the enclosing node
 */
function writeWhere(out, expr, paramOf, parent) {
    if (expr.type === 'and' || expr.type === 'or') {
        const isNeedsBrackets = expr.type === 'or' && parent === 'and';
        out.write(isNeedsBrackets ? '(' : '');
        writeWhere(out, expr.left, paramOf, expr.type);
        out.write(` ${expr.type.toUpperCase()} `);
        writeWhere(out, expr.right, paramOf, expr.type);
        out.write(isNeedsBrackets ? ')' : '');
        return;
    }
    const { clauseId, param } = paramOf.get(expr);
    const op = expr.type === 'like' ? 'LIKE' : NEXT_RULES.crmOperators.value[expr.op];
    out.mark(clauseId, `${expr.column} ${op} :${param}`);
}

/**
 * Writes the named parameters of a CRM call: `type`, `object`, `fields`, `where`, `params`,
 * `sortBy` and `limit`.
 *
 * @param {CodeWriter} out writer
 * @param {SelectAst} ast statement
 * @param {Map<object, string>} idOf node → clause id
 * @param {{limit: boolean}} parts which optional parts to write
 */
function writeCrmArguments(out, ast, idOf, parts) {
    out.write('type="CRM" object=').mark('from', hbString(ast.from.name));
    out.write(' fields="');
    for (const [index, column] of ast.columns.entries()) {
        out.write(index ? ',' : '').mark(idOf.get(column), column.name);
    }
    out.write('"');
    if (ast.where) {
        const conditions = conditionsOf(ast.where);
        const paramOf = new Map(
            conditions.map((node, index) => [
                node,
                { clauseId: idOf.get(node), param: `p${index + 1}` },
            ]),
        );
        out.write(' where="');
        writeWhere(out, ast.where, paramOf, null);
        out.write('" params=(hash');
        for (const node of conditions) {
            const { clauseId, param } = paramOf.get(node);
            out.write(' ').mark(
                clauseId,
                `${param}=${hbValue(node.type === 'like' ? node.pattern : node.value)}`,
            );
        }
        out.write(')');
    }
    if (ast.orderBy?.length) {
        const [item] = ast.orderBy;
        out.write(' sortBy="').mark(idOf.get(item), `${item.column} ${item.direction}`).write('"');
    }
    if (parts.limit && ast.top !== null && ast.top !== undefined) {
        out.write(' ').mark('top', `limit=${ast.top}`);
    }
}

/**
 * Shared checks of the CRM Handlebars targets.
 *
 * @param {SelectAst} ast statement
 * @param {string} label target name
 * @returns {{unavailable: string}|null} reason, or null when the query fits
 */
function crmProblem(ast, label) {
    return firstProblem(
        starProblem(ast, label),
        nameProblem(ast),
        ast.where && whereProblem(ast.where, { ...CRM_CAPS, label }),
        ast.orderBy?.length > 1 &&
            'Next sorts by one field only (sortBy="Field ASC"). Sort by one column, or sort the rows in your code.',
        hbValueProblem(ast),
    );
}

/**
 * Emits `{{#each (query type="CRM" …)}}` with one `{{Field}}` line per column. Values become
 * `:pN` placeholders with `params=(hash …)`, ORDER BY becomes `sortBy`, TOP `limit`.
 *
 * @param {SelectAst} ast statement
 * @param {NextEmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitHandlebarsQuery(ast, options = {}) {
    const problem = crmProblem(ast, 'Handlebars query');
    if (problem) {
        return problem;
    }
    const { idOf } = collectClauses(ast, options.sourceText);
    const out = new CodeWriter();
    out.write('{{#each (query ');
    writeCrmArguments(out, ast, idOf, { limit: true });
    out.write(')}}\n');
    for (const column of ast.columns) {
        out.write(`${INDENT}{{${column.name}}}\n`);
    }
    out.write('{{/each}}');
    return finish(out);
}

/**
 * Emits `{{get (queryFirst type="CRM" …) "Field"}}` for a query with exactly one column. TOP
 * 1 maps to queryFirst itself; another TOP is dropped.
 *
 * @param {SelectAst} ast statement
 * @param {NextEmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitHandlebarsQueryFirst(ast, options = {}) {
    const problem =
        crmProblem(ast, 'Handlebars queryFirst') ??
        firstProblem(
            ast.columns.length !== 1 &&
                'queryFirst reads the value of a single field. Select exactly one column, or use the Handlebars query output with TOP 1.',
        );
    if (problem) {
        return problem;
    }
    const { clauses, idOf } = collectClauses(ast, options.sourceText);
    const out = new CodeWriter();
    out.write('{{get (')
        .mark(ast.top === 1 ? 'top' : undefined, 'queryFirst')
        .write(' ');
    writeCrmArguments(out, ast, idOf, { limit: false });
    const [column] = ast.columns;
    out.write(') ').mark(idOf.get(column), hbString(column.name)).write('}}');
    const messages = [];
    const dropped = [];
    if (ast.top !== null && ast.top !== undefined && ast.top !== 1) {
        const topClause = clauses.find((clause) => clause.clauseId === 'top');
        messages.push(
            createMessage(
                'warning',
                TOP_DROPPED,
                `queryFirst returns one row, so TOP ${ast.top} is left out. Use the Handlebars query output to read ${ast.top} rows.`,
                topClause?.loc ?? ast.loc,
            ),
        );
        dropped.push('top');
    }
    messages.push(
        createMessage(
            'info',
            LOOKUP_FIRST_ROW_ONLY,
            `queryFirst returns only the ${column.name} value of the first matching record${ast.orderBy?.length ? ' in the sortBy order' : ''}. Use the Handlebars query output to read every match.`,
            column.loc,
        ),
    );
    return finish(out, messages, dropped);
}

// ------------------------------------------------------------------------------------------
// Handlebars MO: query with inline filters
// ------------------------------------------------------------------------------------------

const MO_QUERY_CAPS = {
    label: 'A Handlebars query on a marketing object',
    or: false,
    ops: Object.freeze({ '=': '=' }),
    like: false,
};

/**
 * Warns that Next returned one record when a marketing object filter matched two
 * (NEXT_RULES.moOneMatch).
 *
 * @param {SelectAst} ast statement
 * @returns {import('./messages.js').Message} warning
 */
function moOneMatchMessage(ast) {
    return createMessage(
        'warning',
        MO_ONE_MATCH,
        'In our Next test, a marketing object filter that matched two records returned only one of them. Filter on the key field when every match matters.',
        ast.where?.loc ?? ast.loc,
    );
}

/**
 * Checks that no field is used in two conditions of a marketing object filter.
 *
 * @param {SelectAst} ast statement
 * @param {string} reason message for the repeated field
 * @returns {string|null} reason, or null when every field appears once
 */
function moRepeatedFieldProblem(ast, reason) {
    const seen = new Set();
    for (const { column } of conditionsOf(ast.where)) {
        if (seen.has(column.toLowerCase())) {
            return `${reason} (${column}).`;
        }
        seen.add(column.toLowerCase());
    }
    return null;
}

/**
 * Emits `{{#each (query type="MO" object="X" Field="v" …)}}` with one `{{Field}}` line per
 * column: inline filters on any fields (AND), `limit` for TOP; no sorting (NEXT_RULES.moSortBy).
 *
 * @param {SelectAst} ast statement
 * @param {NextEmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitHandlebarsQueryMo(ast, options = {}) {
    const label = 'Handlebars query on a marketing object';
    const problem = firstProblem(
        starProblem(ast, label),
        nameProblem(ast),
        !ast.where &&
            "A marketing object query needs at least one filter such as WHERE Field = 'value'; Next fails without one.",
        ast.where && whereProblem(ast.where, MO_QUERY_CAPS),
        ast.where &&
            moRepeatedFieldProblem(
                ast,
                'A marketing object query can name each field once, so one field cannot have two conditions',
            ),
        ast.orderBy?.length &&
            `${label} can't sort in Next (sortBy fails), so ORDER BY can't be converted. Remove it and sort in your code.`,
        hbValueProblem(ast),
    );
    if (problem) {
        return problem;
    }
    const { idOf } = collectClauses(ast, options.sourceText);
    const out = new CodeWriter();
    out.write('{{#each (query type="MO" object=').mark('from', hbString(ast.from.name));
    for (const node of conditionsOf(ast.where)) {
        out.write(' ').mark(idOf.get(node), `${node.column}=${hbValue(node.value)}`);
    }
    if (ast.top !== null && ast.top !== undefined) {
        out.write(' ').mark('top', `limit=${ast.top}`);
    }
    out.write(')}}\n');
    for (const column of ast.columns) {
        out.write(INDENT).mark(idOf.get(column), `{{${column.name}}}`).write('\n');
    }
    out.write('{{/each}}');
    return finish(out, [moOneMatchMessage(ast)]);
}

// ------------------------------------------------------------------------------------------
// Handlebars DG: a DMO array of the email's bound data graph
// ------------------------------------------------------------------------------------------

const DG_LABEL = 'The data graph output';

/**
 * Explains a WHERE part the data graph output can't express (IN and NOT IN become `or` /
 * `and` chains of `compare`).
 *
 * @param {object} expr expression node
 * @returns {string|null} reason, or null when the tree fits
 */
function dgWhereProblem(expr) {
    switch (expr.type) {
        case 'and':
        case 'or': {
            return dgWhereProblem(expr.left) ?? dgWhereProblem(expr.right);
        }
        case 'in': {
            return null;
        }
        case 'like': {
            return `${DG_LABEL} has no proven way to match a pattern, so LIKE can't be converted. Compare whole values with = instead.`;
        }
        default: {
            return whereProblem(expr, {
                label: DG_LABEL,
                or: true,
                ops: NEXT_RULES.dgOperators.value,
                like: false,
            });
        }
    }
}

/**
 * Inside the loop a field is written bare (`{{Field}}`, `(compare Field …)`), so a name like
 * `this`, `length` or `sort` would read the row or call a helper instead of the field. DMO
 * field API names always contain `__` (ssot__FirstName__c, KQ_Id__c) and no helper name does,
 * so a selected or filtered field without `__` is refused. The sort field is a quoted string
 * and the FROM name too, so they need no check.
 *
 * @param {SelectAst} ast statement
 * @returns {string|null} reason, or null when every bare field fits
 */
function dgFieldProblem(ast) {
    const names = [
        ...(Array.isArray(ast.columns) ? ast.columns.map((column) => column.name) : []),
        ...conditionsOf(ast.where).map((expr) => expr.column),
    ];
    const bad = names.find((name) => !name.includes('__'));
    return bad === undefined
        ? null
        : `${DG_LABEL} needs DMO field API names, which contain __ (e.g. ssot__FirstName__c). "${bad}" could read the whole row or call a Handlebars helper of that name instead of the field.`;
}

/**
 * Formats `(compare Field "op" value)`.
 *
 * @param {string} column field
 * @param {string} op SQL operator
 * @param {{kind: string, value: string}} value value node
 * @returns {string} sub-expression
 */
function dgCompare(column, op, value) {
    return `(compare ${column} ${hbString(NEXT_RULES.dgOperators.value[op])} ${hbValue(value)})`;
}

/**
 * Writes a WHERE tree as nested `and` / `or` / `compare` sub-expressions. IN becomes an `or`
 * chain of `==`, NOT IN an `and` chain of `!=`.
 *
 * @param {CodeWriter} out writer
 * @param {object} expr expression node
 * @param {Map<object, string>} idOf node → clause id
 */
function writeDgCondition(out, expr, idOf) {
    if (expr.type === 'and' || expr.type === 'or') {
        out.write(`(${expr.type} `);
        writeDgCondition(out, expr.left, idOf);
        out.write(' ');
        writeDgCondition(out, expr.right, idOf);
        out.write(')');
        return;
    }
    if (expr.type !== 'in') {
        out.mark(idOf.get(expr), dgCompare(expr.column, expr.op, expr.value));
        return;
    }
    const [junction, op] = expr.negated ? ['and', '<>'] : ['or', '='];
    // left fold: (or (or a b) c), the way the SQL parser builds an OR chain
    const text = expr.values
        .map((value) => dgCompare(expr.column, op, value))
        .reduce((left, right) => `(${junction} ${left} ${right})`);
    out.mark(idOf.get(expr), text);
}

/**
 * Emits `{{#each (get (get @root "$dataGraph") "Dmo__dlm")}}` over a DMO array directly under
 * the root of the email's bound data graph: WHERE as `{{#if}}` with `compare` / `and` / `or`,
 * ORDER BY (one column) as `sort … "string"`, TOP as `slice … 0 N` (only without WHERE: slice
 * runs before the row check).
 *
 * @param {SelectAst} ast statement
 * @param {NextEmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitHandlebarsDataGraph(ast, options = {}) {
    const problem = firstProblem(
        starProblem(ast, DG_LABEL),
        nameProblem(ast),
        ast.where && dgWhereProblem(ast.where),
        ast.orderBy?.length > 1 &&
            `${DG_LABEL} sorts by one field only. Sort by one column, or sort the rows in your code.`,
        dgFieldProblem(ast),
        hbValueProblem(ast),
    );
    if (problem) {
        return problem;
    }
    const { clauses, idOf } = collectClauses(ast, options.sourceText);
    const hasTop = ast.top !== null && ast.top !== undefined;
    const isSliced = hasTop && !ast.where;
    const [order] = ast.orderBy ?? [];
    const out = new CodeWriter();
    out.write('{{#each ');
    out.write(isSliced ? '(slice ' : '');
    out.write(order ? '(sort ' : '');
    out.write('(get (get @root "$dataGraph") ').mark('from', hbString(ast.from.name)).write(')');
    if (order) {
        out.write(' ')
            .mark(
                idOf.get(order),
                `${hbString(order.column)} ${hbString(order.direction.toLowerCase())}`,
            )
            .write(' "string")');
    }
    if (isSliced) {
        out.write(' ').mark('top', `0 ${ast.top}`).write(')');
    }
    out.write('}}\n');
    let indent = INDENT;
    if (ast.where) {
        out.write(`${INDENT}{{#if `);
        writeDgCondition(out, ast.where, idOf);
        out.write('}}\n');
        indent += INDENT;
    }
    out.write(indent);
    for (const [index, column] of ast.columns.entries()) {
        out.write(index ? ' ' : '').mark(idOf.get(column), `{{${column.name}}}`);
    }
    out.write('\n');
    out.write(ast.where ? `${INDENT}{{/if}}\n` : '');
    out.write('{{/each}}');
    const messages = [];
    const dropped = [];
    if (hasTop && !isSliced) {
        const topClause = clauses.find((clause) => clause.clauseId === 'top');
        messages.push(
            createMessage(
                'warning',
                TOP_DROPPED,
                `slice would cut the rows before the {{#if}} check runs, so TOP ${ast.top} is left out. Count the matching rows in your code if you need ${ast.top} of them.`,
                topClause?.loc ?? ast.loc,
            ),
        );
        dropped.push('top');
    }
    messages.push(
        createMessage(
            'info',
            DATA_GRAPH_SCOPE,
            `The rows are the recipient's own ${ast.from.name} rows from the data graph the email is bound to; ${ast.from.name} must be a DMO directly under the graph's root. This was proven in the Email Builder preview only: the preview API does not load the data graph, and a real send is untested. Text comparisons are case-sensitive, and values that look like numbers compare as numbers${order ? `. sort compares the values as text, and a sort field the graph does not hold makes the whole email fail in the preview, so check that ${order.column} is part of the graph` : ''}.`,
            ast.from.loc,
        ),
    );
    return finish(out, messages, dropped);
}

// ------------------------------------------------------------------------------------------
// AMPscript: RetrieveSalesforceObjects (CRM), LookupRows (MO)
// ------------------------------------------------------------------------------------------

const RSO_CAPS = {
    label: 'RetrieveSalesforceObjects',
    or: false,
    orHint: ` Use ${HANDLEBARS_ALTERNATIVE} instead.`,
    ops: NEXT_RULES.rsoOperators.value,
    like: true,
};

/**
 * Emits AMPscript `RetrieveSalesforceObjects("Object", "F1,F2", "Field", "op", "v", …)` plus
 * a FOR loop with `RowCount` / `Row` / `Field`. AND only; values and operators are strings.
 *
 * @param {SelectAst} ast statement
 * @param {NextEmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitAmpscriptRso(ast, options = {}) {
    const label = 'RetrieveSalesforceObjects';
    const problem = firstProblem(
        starProblem(ast, label),
        nameProblem(ast),
        !ast.where &&
            `${label} needs at least one condition such as WHERE Field = 'value'. Use ${HANDLEBARS_ALTERNATIVE} to read records without a condition.`,
        ast.where && whereProblem(ast.where, RSO_CAPS),
        ast.where && repeatedFieldProblem(ast),
        sortLimitProblem(ast, label),
        ampValueProblem(ast),
    );
    if (problem) {
        return problem;
    }
    const { idOf } = collectClauses(ast, options.sourceText);
    const out = new CodeWriter();
    out.write('%%[\nSET @rows = RetrieveSalesforceObjects(')
        .mark('from', ampString(ast.from.name))
        .write(', "');
    for (const [index, column] of ast.columns.entries()) {
        out.write(index ? ',' : '').mark(idOf.get(column), column.name);
    }
    out.write('"');
    for (const node of conditionsOf(ast.where)) {
        const op = node.type === 'like' ? 'LIKE' : NEXT_RULES.rsoOperators.value[node.op];
        const value = node.type === 'like' ? node.pattern : node.value;
        out.write(', ').region(idOf.get(node), () => {
            out.write(`${ampString(node.column)}, ${ampString(op)}, ${ampString(value.value)}`);
        });
    }
    out.write(')\n');
    writeAmpLoop(
        out,
        ast.columns.map((column) => ({ name: column.name })),
    );
    out.write(']%%');
    return finish(out);
}

/**
 * Checks that no field is used in two conditions: RetrieveSalesforceObjects returns no rows
 * then (NEXT_RULES.rsoDistinctFields).
 *
 * @param {SelectAst} ast statement
 * @returns {string|null} reason, or null when every field appears once
 */
function repeatedFieldProblem(ast) {
    const seen = new Set();
    for (const { column } of conditionsOf(ast.where)) {
        const name = column.toLowerCase();
        if (seen.has(name)) {
            return rsoRepeatedFieldMessage(column);
        }
        seen.add(name);
    }
    return null;
}

/**
 * Explains why RetrieveSalesforceObjects can't use one field in two conditions (shared with
 * the reverse parser).
 *
 * @param {string} column the repeated field
 * @returns {string} message
 */
export function rsoRepeatedFieldMessage(column) {
    return `RetrieveSalesforceObjects returns no rows in Next when the same field is used in two conditions (${column}). Use ${HANDLEBARS_ALTERNATIVE} instead.`;
}

/**
 * Explains why LookupRows can't use one field in two pairs in Next (shared with the reverse
 * parser; NEXT_RULES.lookupRowsDistinctFields).
 *
 * @returns {string} message without the field and the final full stop
 */
export function lookupRowsRepeatedFieldMessage() {
    return 'LookupRows in Next uses only the last pair when the same field appears in two pairs, so the conditions are not combined';
}

const LOOKUP_ROWS_CAPS = {
    label: 'LookupRows',
    or: false,
    ops: Object.freeze({ '=': '=' }),
    like: false,
};

/**
 * Emits AMPscript `LookupRows("Object", "Field", "v", …)` on a marketing object (same code as
 * the Engagement output). Equals + AND only; no TOP / ORDER BY (LookupOrderedRows fails in
 * Next).
 *
 * @param {SelectAst} ast statement
 * @param {NextEmitOptions} [options] options
 * @returns {EmitResult|{unavailable: string}} code or the reason it cannot be generated
 */
export function emitAmpscriptLookupRowsMo(ast, options = {}) {
    const problem = firstProblem(
        nameProblem(ast),
        !ast.where && "LookupRows needs at least one condition such as WHERE Field = 'value'.",
        ast.where && whereProblem(ast.where, LOOKUP_ROWS_CAPS),
        ast.where && moRepeatedFieldProblem(ast, lookupRowsRepeatedFieldMessage()),
        sortLimitProblem(ast, 'LookupRows'),
        ampValueProblem(ast),
    );
    if (problem) {
        return problem;
    }
    const result = emitAmpscriptLookupRows(ast, {
        deKey: ast.from.name,
        sourceText: options.sourceText,
    });
    return { ...result, messages: [...(result.messages ?? []), moOneMatchMessage(ast)] };
}

// ------------------------------------------------------------------------------------------
// Registry
// ------------------------------------------------------------------------------------------

/**
 * Marketing Cloud Next targets in display order. `dataSource` is the data source the target
 * reads (`CRM` = Sales Cloud object, `MO` = marketing object, `DG` = DMO of the email's bound
 * data graph); `normalize` holds the round-trip
 * flags (see `normalizeSql`). Handlebars keeps the value type (`p1="5"` is text, `p1=5` a
 * number), so its targets compare typed; AMPscript writes every value as a string.
 *
 * @type {ReadonlyArray<{id: string, language: 'handlebars'|'ampscript', label: string,
 * dataSource: 'CRM'|'MO'|'DG', emit: (ast: SelectAst, options?: NextEmitOptions) =>
 * EmitResult|{unavailable: string}, normalize: {dropTop?: boolean, isTyped?: boolean,
 * expandIn?: boolean, expandNotIn?: boolean}}>}
 */
export const MCN_TARGETS = Object.freeze([
    {
        id: 'handlebars-query',
        language: 'handlebars',
        label: 'query',
        dataSource: 'CRM',
        emit: emitHandlebarsQuery,
        normalize: { isTyped: true },
    },
    {
        id: 'handlebars-queryfirst',
        language: 'handlebars',
        label: 'queryFirst',
        dataSource: 'CRM',
        emit: emitHandlebarsQueryFirst,
        // queryFirst always returns one row: TOP 1 is implied by the call itself
        normalize: { dropTop: true, isTyped: true },
    },
    {
        id: 'ampscript-rso',
        language: 'ampscript',
        label: 'RetrieveSalesforceObjects',
        dataSource: 'CRM',
        emit: emitAmpscriptRso,
        normalize: {},
    },
    {
        id: 'handlebars-query-mo',
        language: 'handlebars',
        label: 'query',
        dataSource: 'MO',
        emit: emitHandlebarsQueryMo,
        normalize: { isTyped: true },
    },
    {
        id: 'ampscript-lookuprows-mo',
        language: 'ampscript',
        label: 'LookupRows',
        dataSource: 'MO',
        emit: emitAmpscriptLookupRowsMo,
        normalize: {},
    },
    {
        id: 'handlebars-datagraph',
        language: 'handlebars',
        label: '$dataGraph',
        dataSource: 'DG',
        emit: emitHandlebarsDataGraph,
        // IN / NOT IN are written as or / and chains of compare
        normalize: { isTyped: true, expandIn: true, expandNotIn: true },
    },
]);
