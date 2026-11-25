/**
 * Reads Engagement AMPscript data extension lookups back into the SQL AST of `parseSql`:
 * `LookupRows`, `LookupOrderedRows` and `Lookup` (plus the CS variants, with a warning).
 *
 * The code is read as text; it is never executed. Never throws.
 */

import { SYNTAX_ERROR } from './messages.js';
import {
    ARGUMENT_COUNT,
    CASE_SENSITIVE_LOOKUP,
    INVALID_ARGUMENT,
    INVALID_COUNT,
    LOOKUP_FIRST_ROW_ONLY,
    MULTIPLE_LOOKUPS,
    NO_LOOKUP_FOUND,
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
 * @returns {object} expression node
 */
function readPairs(context, pairs) {
    const conditions = [];
    for (let index = 0; index < pairs.length; index += 2) {
        const columnLiteral = pairs[index];
        const valueLiteral = pairs[index + 1];
        const column = requireString(context, columnLiteral, 'Each column name');
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
 * @returns {{index: number, name: string}[]} calls in source order
 */
function findCalls(context) {
    const calls = [];
    for (const [index, token] of context.tokens.entries()) {
        const name = token.type === 'ident' ? token.value.toLowerCase() : '';
        if (LOOKUP_FUNCTIONS.has(name) && isPunct(tokenAt(context, index + 1), '(')) {
            calls.push({ index, name });
        }
    }
    return calls;
}

/**
 * Parses the first lookup call and builds the AST.
 *
 * @param {object} context parse context
 * @param {object} meta meta data (mutated)
 * @returns {object} SELECT AST
 */
function parseProgram(context, meta) {
    const header = readHeader(context);
    const calls = findCalls(context);
    if (calls.length === 0) {
        fail(
            context,
            NO_LOOKUP_FOUND,
            'No supported lookup was found. Paste a LookupRows, LookupOrderedRows or Lookup call.',
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
    const definition = LOOKUP_FUNCTIONS.get(call.name);
    const kind = call.name.replace(/cs$/, '');
    meta.target = definition.target;
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
        where: readPairs(context, pairs),
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
 * @param {string} text AMPscript code
 * @returns {{ast: object|null, messages: import('./messages.js').Message[], meta: {target: string|null, deName?: string, deKey?: string}}} AST (null on error), messages and meta data
 */
export function parseAmpscript(text) {
    const source = typeof text === 'string' ? text : '';
    const context = createContext(source);
    const meta = { target: null };
    const ast = runParser(context, () => {
        tokenize(context, 'ampscript', findAmpscriptRegions(source));
        rejectEmpty(context);
        return parseProgram(context, meta);
    });
    return { ast, messages: context.messages, meta };
}
