/**
 * Reads Engagement AMPscript data extension lookups back into the SQL AST of `parseSql`:
 * `LookupRows`, `LookupOrderedRows` and `Lookup` (plus the CS variants, with a warning).
 *
 * The code is read as text; it is never executed. Never throws.
 */

import { nextLikeInner, nextLikeWildcardMessage } from './clauses.js';
import { lookupRowsRepeatedFieldMessage, rsoRepeatedFieldMessage } from './emit-mcn.js';
import { SYNTAX_ERROR } from './messages.js';
import {
    ARGUMENT_COUNT,
    CASE_SENSITIVE_LOOKUP,
    INVALID_ARGUMENT,
    INVALID_COUNT,
    INVALID_FILTER,
    INVALID_FILTER_VALUE,
    LIKE_MATCHES_ANYWHERE,
    LOOKUP_FIRST_ROW_ONLY,
    MULTIPLE_LOOKUPS,
    NO_LOOKUP_FOUND,
    UNKNOWN_FILTER_OPERATOR,
    UNSUPPORTED_EXPRESSION,
    VARIABLE_VALUE,
} from './messages.js';
import {
    andChain,
    createContext,
    expressionEnd,
    fail,
    failUnclosedCall,
    findAmpscriptRegions,
    isPunct,
    makeLoc,
    makeValue,
    parseOrderString,
    readHeader,
    rejectEmpty,
    report,
    runParser,
    tokenAt,
    tokenize,
} from './reverse-common.js';

/**
 * @typedef {object} AmpLiteral
 * @property {'string'|'number'} kind literal kind
 * @property {string} value unescaped text or number text
 * @property {number} start 0-based start offset
 * @property {number} end 0-based exclusive end offset
 */

const LOOKUP_FUNCTIONS = new Map(
    Object.entries({
        lookuprows: { target: 'ampscript-lookuprows', caseSensitive: false },
        lookuprowscs: { target: 'ampscript-lookuprows', caseSensitive: true },
        lookuporderedrows: { target: 'ampscript-lookuporderedrows', caseSensitive: false },
        lookuporderedrowscs: { target: 'ampscript-lookuporderedrows', caseSensitive: true },
        lookup: { target: 'ampscript-lookup', caseSensitive: false },
    }),
);

// Marketing Cloud Next: LookupRows on a marketing object and RetrieveSalesforceObjects
const NEXT_FUNCTIONS = new Map(
    Object.entries({
        lookuprows: { target: 'ampscript-lookuprows-mo', caseSensitive: false },
        retrievesalesforceobjects: { target: 'ampscript-rso', caseSensitive: false },
    }),
);

// calls that exist in AMPscript but fail or are unproven in Next
const NEXT_REJECTED = new Map(
    Object.entries({
        lookuporderedrows:
            'LookupOrderedRows fails in Marketing Cloud Next. Use LookupRows and sort in your code.',
        lookuporderedrowscs:
            'LookupOrderedRowsCS fails in Marketing Cloud Next. Use LookupRows and sort in your code.',
        lookuprowscs:
            'LookupRowsCS is not proven in Marketing Cloud Next. Use LookupRows (it ignores case).',
    }),
);

const RSO_OPERATORS = {
    '=': '=',
    '!=': '<>',
    '<>': '<>',
    '<': '<',
    '<=': '<=',
    '>': '>',
    '>=': '>=',
};

/**
 * Parses one argument: a string or number literal. Variables and nested calls are errors.
 *
 * @param {object} context parse context
 * @returns {AmpLiteral} literal
 */
function parseArgument(context) {
    const token = tokenAt(context, context.pos);
    if (token.type === 'string' || token.type === 'number') {
        context.pos++;
        return { kind: token.type, value: token.value, start: token.start, end: token.end };
    }
    if (isPunct(token, '-') && tokenAt(context, context.pos + 1).type === 'number') {
        const number = tokenAt(context, context.pos + 1);
        context.pos += 2;
        return { kind: 'number', value: `-${number.value}`, start: token.start, end: number.end };
    }
    if (token.type === 'variable') {
        fail(
            context,
            VARIABLE_VALUE,
            `The variable ${token.value} can't be converted to SQL because its value is only known when the code runs. Replace it with the value itself.`,
            token.start,
            token.end,
        );
    }
    if (token.type === 'ident' && isPunct(tokenAt(context, context.pos + 1), '(')) {
        fail(
            context,
            UNSUPPORTED_EXPRESSION,
            `The function call ${token.value}(…) can't be converted to SQL. Replace it with the value itself.`,
            token.start,
            expressionEnd(context, context.pos),
        );
    }
    if (token.type === 'eof') {
        return fail(
            context,
            SYNTAX_ERROR,
            'The code ends where an argument is expected.',
            token.start,
            token.end,
        );
    }
    return fail(
        context,
        SYNTAX_ERROR,
        `Expected an argument but found "${token.value}". Write text in double quotes or a number.`,
        token.start,
        token.end,
    );
}

/**
 * Parses an argument list starting at "(".
 *
 * @param {object} context parse context
 * @returns {{args: AmpLiteral[], end: number}} arguments and the end offset of ")"
 */
function parseArguments(context) {
    const open = tokenAt(context, context.pos++);
    const args = [];
    for (;;) {
        const token = tokenAt(context, context.pos);
        if (isPunct(token, ')')) {
            context.pos++;
            return { args, end: token.end };
        }
        if (token.type === 'eof') {
            failUnclosedCall(context, open);
        }
        args.push(parseArgument(context));
        const separator = tokenAt(context, context.pos);
        if (isPunct(separator, ',')) {
            context.pos++;
        } else if (separator.type === 'eof') {
            failUnclosedCall(context, open);
        } else if (!isPunct(separator, ')')) {
            fail(
                context,
                UNSUPPORTED_EXPRESSION,
                'Only plain values can be converted here. Separate the arguments with commas and close the call with ).',
                separator.start,
                separator.end,
            );
        }
    }
}

/**
 * Checks that an argument is non-empty text and returns it.
 *
 * @param {object} context parse context
 * @param {AmpLiteral} literal argument
 * @param {string} what what the argument is, for the message
 * @returns {string} the text
 */
function requireString(context, literal, what) {
    if (literal.kind !== 'string' || !literal.value.trim()) {
        fail(
            context,
            INVALID_ARGUMENT,
            `${what} must be text in double quotes.`,
            literal.start,
            literal.end,
        );
    }
    return literal.value;
}

/**
 * Reads the column / value pairs into an AND chain of equals conditions.
 *
 * @param {object} context parse context
 * @param {AmpLiteral[]} pairs alternating column names and values
 * @param {boolean} [isNext] true for Marketing Cloud Next (a repeated field fails)
 * @returns {object} expression node
 */
function readPairs(context, pairs, isNext = false) {
    const conditions = [];
    const seen = new Set();
    for (let index = 0; index < pairs.length; index += 2) {
        const columnLiteral = pairs[index];
        const valueLiteral = pairs[index + 1];
        const column = requireString(context, columnLiteral, 'Each column name');
        if (isNext && seen.has(column.toLowerCase())) {
            fail(
                context,
                INVALID_FILTER,
                `${lookupRowsRepeatedFieldMessage()} (${column}).`,
                columnLiteral.start,
                columnLiteral.end,
            );
        }
        seen.add(column.toLowerCase());
        conditions.push({
            type: 'compare',
            op: '=',
            column,
            value: makeValue(
                context,
                valueLiteral.value,
                valueLiteral.start,
                valueLiteral.end,
                valueLiteral.kind === 'number',
            ),
            loc: makeLoc(context, columnLiteral.start, valueLiteral.end),
        });
    }
    return andChain(context, conditions);
}

/**
 * Checks the argument count of a lookup function.
 *
 * @param {object} context parse context
 * @param {string} kind lower-case function name without CS
 * @param {number} count number of arguments
 * @param {object} callLoc location of the call
 */
function checkArgumentCount(context, kind, count, callLoc) {
    const fixed = { lookuprows: 1, lookuporderedrows: 3, lookup: 2 }[kind];
    if (count < fixed + 2 || (count - fixed) % 2 !== 0) {
        const usage = {
            lookuprows: 'LookupRows("DE name", "Column", "value"[, "Column2", "value2" …])',
            lookuporderedrows:
                'LookupOrderedRows("DE name", count, "Column ASC", "Column", "value"[, …])',
            lookup: 'Lookup("DE name", "ReturnColumn", "Column", "value"[, …])',
        }[kind];
        fail(
            context,
            ARGUMENT_COUNT,
            `Wrong number of arguments. Write it as ${usage}: every column name needs a value.`,
            callLoc.start,
            callLoc.end,
        );
    }
}

/**
 * Reads the row count of LookupOrderedRows (0 or -1 = all rows → no TOP).
 *
 * @param {object} context parse context
 * @param {AmpLiteral} literal count argument
 * @returns {number|null} TOP value
 */
function readCount(context, literal) {
    const text = literal.value.trim();
    if (!/^-?\d+$/.test(text)) {
        fail(
            context,
            INVALID_COUNT,
            'The row count must be a whole number (0 or -1 for all rows).',
            literal.start,
            literal.end,
        );
    }
    const count = Number(text);
    return count > 0 ? count : null;
}

/**
 * Finds every lookup call.
 *
 * @param {object} context parse context
 * @param {Map<string, object>} functions lookup functions by lower-case name
 * @returns {{index: number, name: string}[]} calls in source order
 */
function findCalls(context, functions) {
    const calls = [];
    for (const [index, token] of context.tokens.entries()) {
        const name = token.type === 'ident' ? token.value.toLowerCase() : '';
        if (functions.has(name) && isPunct(tokenAt(context, index + 1), '(')) {
            calls.push({ index, name });
        }
    }
    return calls;
}

/**
 * Fails when the code uses a call that fails or is unproven in Next.
 *
 * @param {object} context parse context
 */
function rejectNextCalls(context) {
    for (const [index, token] of context.tokens.entries()) {
        const reason = token.type === 'ident' && NEXT_REJECTED.get(token.value.toLowerCase());
        if (reason && isPunct(tokenAt(context, index + 1), '(')) {
            fail(context, UNSUPPORTED_EXPRESSION, reason, token.start, token.end);
        }
    }
}

/**
 * Reads the field list of RetrieveSalesforceObjects ("A,B") into column nodes.
 *
 * @param {object} context parse context
 * @param {AmpLiteral} literal field list argument
 * @returns {{name: string, loc: object}[]} columns
 */
function readRsoFields(context, literal) {
    const text = requireString(context, literal, 'The field list');
    const isExact = context.text.slice(literal.start + 1, literal.end - 1) === text;
    const columns = [];
    let offset = 0;
    for (const part of text.split(',')) {
        const name = part.trim();
        if (!name) {
            fail(
                context,
                INVALID_ARGUMENT,
                'The field list has an empty entry. Separate the field names with single commas.',
                literal.start,
                literal.end,
            );
        }
        const start = isExact ? literal.start + 1 + offset + part.indexOf(name) : literal.start;
        columns.push({
            name,
            loc: makeLoc(context, start, isExact ? start + name.length : literal.end),
        });
        offset += part.length + 1;
    }
    return columns;
}

/**
 * Reads the field / operator / value triplets of RetrieveSalesforceObjects into an AND chain.
 * Next matches LIKE as "contains", so plain text such as `Ro%` becomes `%Ro%` with a warning;
 * `_`, `[` or `%` inside the text fail. A field used twice fails (no rows in Next).
 *
 * @param {object} context parse context
 * @param {AmpLiteral[]} triplets alternating field, operator and value
 * @returns {object} expression node
 */
function readTriplets(context, triplets) {
    const conditions = [];
    const seen = new Set();
    for (let index = 0; index < triplets.length; index += 3) {
        const [columnLiteral, operatorLiteral, valueLiteral] = triplets.slice(index, index + 3);
        const column = requireString(context, columnLiteral, 'Each field name');
        if (seen.has(column.toLowerCase())) {
            fail(
                context,
                INVALID_FILTER,
                rsoRepeatedFieldMessage(column),
                columnLiteral.start,
                columnLiteral.end,
            );
        }
        seen.add(column.toLowerCase());
        const operator = requireString(context, operatorLiteral, 'Each operator').trim();
        const value = makeValue(
            context,
            valueLiteral.value,
            valueLiteral.start,
            valueLiteral.end,
            valueLiteral.kind === 'number',
        );
        const loc = makeLoc(context, columnLiteral.start, valueLiteral.end);
        if (operator.toUpperCase() === 'LIKE') {
            const parts = nextLikeInner(value.value);
            if (!parts) {
                fail(
                    context,
                    INVALID_FILTER_VALUE,
                    nextLikeWildcardMessage(value.value),
                    valueLiteral.start,
                    valueLiteral.end,
                );
            }
            const { inner } = parts;
            if (!parts.isContains) {
                report(
                    context,
                    'warning',
                    LIKE_MATCHES_ANYWHERE,
                    `Next matches LIKE as "contains" and ignores wildcards, so "${value.value}" is converted as '%${inner}%'.`,
                    valueLiteral.start,
                    valueLiteral.end,
                );
            }
            const pattern = { ...value, kind: 'string', value: `%${inner}%` };
            conditions.push({ type: 'like', column, pattern, loc });
            continue;
        }
        const op = RSO_OPERATORS[operator];
        if (!op) {
            fail(
                context,
                UNKNOWN_FILTER_OPERATOR,
                `"${operator}" is not an operator of RetrieveSalesforceObjects. Use =, !=, <, <=, >, >= or LIKE.`,
                operatorLiteral.start,
                operatorLiteral.end,
            );
        }
        conditions.push({ type: 'compare', op, column, value, loc });
    }
    return andChain(context, conditions);
}

/**
 * Builds the AST of a RetrieveSalesforceObjects call.
 *
 * @param {object} context parse context
 * @param {AmpLiteral[]} args arguments
 * @param {object} callLoc location of the call
 * @returns {object} SELECT AST
 */
function rsoAst(context, args, callLoc) {
    if (args.length < 5 || (args.length - 2) % 3 !== 0) {
        fail(
            context,
            ARGUMENT_COUNT,
            'Wrong number of arguments. Write it as RetrieveSalesforceObjects("Object", "Field1,Field2", "Field", "=", "value"[, …]): every condition needs a field, an operator and a value.',
            callLoc.start,
            callLoc.end,
        );
    }
    const name = requireString(context, args[0], 'The object name');
    return {
        type: 'select',
        top: null,
        columns: readRsoFields(context, args[1]),
        from: { name, loc: makeLoc(context, args[0].start, args[0].end) },
        where: readTriplets(context, args.slice(2)),
        orderBy: [],
        loc: callLoc,
    };
}

/**
 * Parses the first lookup call and builds the AST.
 *
 * @param {object} context parse context
 * @param {object} meta meta data (mutated)
 * @param {boolean} isNext true for Marketing Cloud Next
 * @returns {object} SELECT AST
 */
function parseProgram(context, meta, isNext) {
    const header = readHeader(context);
    if (isNext) {
        rejectNextCalls(context);
    }
    const functions = isNext ? NEXT_FUNCTIONS : LOOKUP_FUNCTIONS;
    const calls = findCalls(context, functions);
    if (calls.length === 0) {
        fail(
            context,
            NO_LOOKUP_FOUND,
            isNext
                ? 'No supported lookup was found. Paste a LookupRows or RetrieveSalesforceObjects call.'
                : 'No supported lookup was found. Paste a LookupRows, LookupOrderedRows or Lookup call.',
            0,
            context.text.length,
        );
    }
    const call = calls[0];
    const callToken = tokenAt(context, call.index);
    if (calls.length > 1) {
        const second = tokenAt(context, calls[1].index);
        report(
            context,
            'warning',
            MULTIPLE_LOOKUPS,
            'The code contains more than one lookup; only the first one is converted.',
            second.start,
            second.end,
        );
    }
    context.pos = call.index + 1;
    const { args, end } = parseArguments(context);
    const callLoc = makeLoc(context, callToken.start, end);
    const definition = functions.get(call.name);
    const kind = call.name.replace(/cs$/, '');
    meta.target = definition.target;
    if (kind === 'retrievesalesforceobjects') {
        const ast = rsoAst(context, args, callLoc);
        meta.deName = ast.from.name;
        return ast;
    }
    if (definition.caseSensitive) {
        report(
            context,
            'warning',
            CASE_SENSITIVE_LOOKUP,
            `${callToken.value} compares the values case-sensitively; SQL in Marketing Cloud compares text without regard to case, so the result can contain more rows.`,
            callToken.start,
            callToken.end,
        );
    }
    checkArgumentCount(context, kind, args.length, callLoc);
    const name = requireString(context, args[0], 'The data extension name');
    meta.deName = name;
    if (header.key) {
        meta.deKey = header.key;
    }
    let columns = header.columns ?? '*';
    let top = null;
    let orderBy = [];
    let pairs = args.slice(1);
    if (kind === 'lookuporderedrows') {
        top = readCount(context, args[1]);
        requireString(context, args[2], 'The sort order');
        orderBy = parseOrderString(context, args[2]);
        pairs = args.slice(3);
    } else if (kind === 'lookup') {
        const column = requireString(context, args[1], 'The column to return');
        columns = [{ name: column, loc: makeLoc(context, args[1].start, args[1].end) }];
        pairs = args.slice(2);
        report(
            context,
            'info',
            LOOKUP_FIRST_ROW_ONLY,
            'Lookup returns the value of the first matching row only; the SQL query returns every matching row.',
            callLoc.start,
            callLoc.end,
        );
    }
    return {
        type: 'select',
        top,
        columns,
        from: { name, loc: makeLoc(context, args[0].start, args[0].end) },
        where: readPairs(context, pairs, isNext),
        orderBy,
        loc: callLoc,
    };
}

/**
 * Reads an AMPscript data extension lookup back into the SQL AST. Never throws.
 *
 * Accepted: `%%[ … ]%%` / `%%= … =%%` blocks or bare statements containing
 * `LookupRows("Name", "Col", "v"[, …])`, `LookupOrderedRows("Name", count, "Col ASC", "Col", "v"[, …])`
 * or `Lookup("Name", "ReturnCol", "Col", "v"[, …])` (also the CS variants). The first lookup is
 * converted; loops and output code around it are ignored. A `/* SQL: SELECT a, b *\/` comment
 * supplies the column list LookupRows cannot carry.
 *
 * With `{ platform: 'mcn' }` the Marketing Cloud Next calls are read instead: `LookupRows` on a
 * marketing object and `RetrieveSalesforceObjects("Object", "F1,F2", "Field", "op", "v"[, …])`;
 * LookupOrderedRows and the CS variants are errors there.
 *
 * @param {string} text AMPscript code
 * @param {{platform?: 'mce'|'mcn'}} [options] platform (default 'mce')
 * @returns {{ast: object|null, messages: import('./messages.js').Message[], meta: {target: string|null, deName?: string, deKey?: string}}} AST (null on error), messages and meta data
 */
export function parseAmpscript(text, options = {}) {
    const source = typeof text === 'string' ? text : '';
    const context = createContext(source);
    const meta = { target: null };
    const ast = runParser(context, () => {
        tokenize(context, 'ampscript', findAmpscriptRegions(source));
        rejectEmpty(context);
        return parseProgram(context, meta, options.platform === 'mcn');
    });
    return { ast, messages: context.messages, meta };
}
