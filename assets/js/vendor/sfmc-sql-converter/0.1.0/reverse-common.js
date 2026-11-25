/**
 * Shared helpers for the reverse parsers (SSJS and AMPscript code → SQL AST): source
 * positions, messages, a small tokenizer for both languages, the `// SQL:` header comment and
 * value / ORDER BY conversion. Code is only read as text, never executed.
 */

import {
    EMPTY_INPUT,
    INTERNAL_ERROR,
    MISSING_CLOSING_PAREN,
    NESTING_TOO_DEEP,
    UNTERMINATED_COMMENT,
    UNTERMINATED_STRING,
    createMessage,
} from './messages.js';
import { INVALID_ORDER_BY } from './messages.js';

/**
 * @typedef {object} Token
 * @property {'ident'|'string'|'number'|'punct'|'variable'|'eof'} type token type
 * @property {string} value identifier, unescaped string, number text or punctuation
 * @property {number} start 0-based start offset
 * @property {number} end 0-based exclusive end offset
 */

/**
 * @typedef {object} Comment
 * @property {number} start 0-based start offset (at the comment opener)
 * @property {number} end 0-based exclusive end offset
 */

/**
 * @typedef {object} ReverseContext
 * @property {string} text source text
 * @property {number[]} lineStarts start offset of every line
 * @property {object[]} messages collected messages
 * @property {Token[]} tokens tokens of the code regions
 * @property {Comment[]} comments comments of the code regions
 * @property {number} pos current token index
 */

const PLAIN_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const JS_IDENT = /[\p{L}_$][\p{L}\p{N}_$]*/uy;
const AMP_IDENT = /[\p{L}_][\p{L}\p{N}_]*/uy;
const AMP_VARIABLE = /@[\p{L}\p{N}_]+/uy;
const NUMBER = /\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const WHITESPACE = /\s/;
const MULTI_PUNCT = [
    '===',
    '!==',
    '==',
    '!=',
    '<=',
    '>=',
    '&&',
    '||',
    '++',
    '--',
    '+=',
    '-=',
    '=>',
];
const JS_ESCAPES = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
// what `~x` in a header comment stands for (see decodeCommentText); `~/` and `~%` drop the `~`
const COMMENT_UNESCAPES = { '~': '~', q: '"', b: '\\' };
const SERVER_SCRIPT_OPEN = /<script\b[^>]*\brunat\s*=\s*["']?server["']?[^>]*>/gi;
const SCRIPT_CLOSE = /<\/script\s*>/gi;

/**
 * Internal signal that parsing stopped after an error message was recorded.
 */
export class ParseStop extends Error {
    /**
     * Creates the stop signal.
     */
    constructor() {
        super('parse stopped');
        this.name = 'ParseStop';
    }
}

/**
 * Creates the parse context.
 *
 * @param {string} text source text
 * @returns {ReverseContext} context
 */
export function createContext(text) {
    const lineStarts = [0];
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) {
        lineStarts.push(index + 1);
    }
    return { text, lineStarts, messages: [], tokens: [], comments: [], pos: 0 };
}

/**
 * Converts an offset into a 1-based line / column pair.
 *
 * @param {number[]} lineStarts start offset of every line
 * @param {number} offset 0-based offset
 * @returns {{line: number, column: number}} position
 */
function positionAt(lineStarts, offset) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (lineStarts[middle] <= offset) {
            low = middle;
        } else {
            high = middle - 1;
        }
    }
    return { line: low + 1, column: offset - lineStarts[low] + 1 };
}

/**
 * Builds a location object for an offset range (same shape as the SQL parser's `loc`).
 *
 * @param {ReverseContext} context parse context
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 * @returns {{start: number, end: number, line: number, column: number, endLine: number, endColumn: number}} location
 */
export function makeLoc(context, start, end) {
    const from = positionAt(context.lineStarts, start);
    const to = positionAt(context.lineStarts, end);
    return {
        start,
        end,
        line: from.line,
        column: from.column,
        endLine: to.line,
        endColumn: to.column,
    };
}

/**
 * Records a message.
 *
 * @param {ReverseContext} context parse context
 * @param {'error'|'warning'|'info'} severity severity
 * @param {string} code message code
 * @param {string} message plain-language text
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 */
export function report(context, severity, code, message, start, end) {
    context.messages.push(createMessage(severity, code, message, makeLoc(context, start, end)));
}

/**
 * Records an error and stops parsing.
 *
 * @param {ReverseContext} context parse context
 * @param {string} code message code
 * @param {string} message plain-language text
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 * @returns {never} always throws ParseStop
 */
export function fail(context, code, message, start, end) {
    report(context, 'error', code, message, start, end);
    throw new ParseStop();
}

/**
 * Runs a parser body, turning a stop or an unexpected exception into `null`.
 *
 * @param {ReverseContext} context parse context
 * @param {() => object} body parser body returning the AST
 * @returns {object|null} AST or null after an error
 */
export function runParser(context, body) {
    try {
        return body();
    } catch (ex) {
        if (!(ex instanceof ParseStop)) {
            const isTooDeep = ex instanceof RangeError;
            report(
                context,
                'error',
                isTooDeep ? NESTING_TOO_DEEP : INTERNAL_ERROR,
                isTooDeep
                    ? 'The code is nested too deeply to read. Simplify the filter.'
                    : 'The code could not be read because of an unexpected problem in the parser. Simplify the code and try again.',
                0,
                context.text.length,
            );
        }
        return null;
    }
}

// ------------------------------------------------------------------------------------------
// Code regions
// ------------------------------------------------------------------------------------------

/**
 * Finds the bodies of `<script runat="server">` blocks; the whole text when there are none.
 *
 * @param {string} text source text
 * @returns {number[][]} [start, end) offset pairs
 */
export function findScriptRegions(text) {
    const regions = [];
    SERVER_SCRIPT_OPEN.lastIndex = 0;
    for (let open = SERVER_SCRIPT_OPEN.exec(text); open; open = SERVER_SCRIPT_OPEN.exec(text)) {
        const start = open.index + open[0].length;
        SCRIPT_CLOSE.lastIndex = start;
        const close = SCRIPT_CLOSE.exec(text);
        const end = close ? close.index : text.length;
        regions.push([start, end]);
        SERVER_SCRIPT_OPEN.lastIndex = close ? close.index + close[0].length : text.length;
    }
    return regions.length ? regions : [[0, text.length]];
}

/**
 * Finds the end of an AMPscript block, skipping `"…"` and `'…'` strings (a doubled quote stands
 * for one quote) and `/* … *\/` comments, so a `]%%` inside a string does not end the block.
 *
 * @param {string} text source text
 * @param {number} start offset after the block opener
 * @param {string} closer `]%%` or `=%%`
 * @returns {number} offset of the closer, or -1 when the block never closes
 */
function findBlockEnd(text, start, closer) {
    let index = start;
    while (index < text.length) {
        const character = text[index];
        if (character === '"' || character === "'") {
            let close = text.indexOf(character, index + 1);
            while (close !== -1 && text[close + 1] === character) {
                close = text.indexOf(character, close + 2);
            }
            if (close === -1) {
                // an unclosed string: fall back to the first closer after it
                return text.indexOf(closer, index);
            }
            index = close + 1;
        } else if (text.startsWith('/*', index)) {
            // a quote inside a comment does not start a string
            const close = text.indexOf('*/', index + 2);
            index = close === -1 ? text.length : close + 2;
        } else if (text.startsWith(closer, index)) {
            return index;
        } else {
            index++;
        }
    }
    return -1;
}

/**
 * Finds the bodies of `%%[ … ]%%` and `%%= … =%%` blocks (a closer inside a string does not
 * count); the whole text when there are none.
 *
 * @param {string} text source text
 * @returns {number[][]} [start, end) offset pairs
 */
export function findAmpscriptRegions(text) {
    const regions = [];
    let index = 0;
    for (;;) {
        const block = text.indexOf('%%[', index);
        const inline = text.indexOf('%%=', index);
        if (block === -1 && inline === -1) {
            break;
        }
        const isBlock = inline === -1 || (block !== -1 && block < inline);
        const start = (isBlock ? block : inline) + 3;
        const close = findBlockEnd(text, start, isBlock ? ']%%' : '=%%');
        const end = close === -1 ? text.length : close;
        regions.push([start, end]);
        index = close === -1 ? text.length : close + 3;
    }
    return regions.length ? regions : [[0, text.length]];
}

// ------------------------------------------------------------------------------------------
// Tokenizer
// ------------------------------------------------------------------------------------------

/**
 * Reads a JavaScript string literal (backslash escapes, no line breaks).
 *
 * @param {ReverseContext} context parse context
 * @param {number} start offset of the opening quote
 * @param {number} limit end of the code region
 * @returns {Token} string token
 */
function readJsString(context, start, limit) {
    const { text } = context;
    const quote = text[start];
    let value = '';
    let index = start + 1;
    while (index < limit) {
        const character = text[index];
        if (character === quote) {
            return { type: 'string', value, start, end: index + 1 };
        }
        if (character === '\n') {
            break;
        }
        if (character === '\\') {
            const next = text[index + 1] ?? '';
            if (next === 'u' && /^[\da-f]{4}$/i.test(text.slice(index + 2, index + 6))) {
                value += String.fromCodePoint(
                    Number.parseInt(text.slice(index + 2, index + 6), 16),
                );
                index += 6;
                continue;
            }
            if (next === 'x' && /^[\da-f]{2}$/i.test(text.slice(index + 2, index + 4))) {
                value += String.fromCodePoint(
                    Number.parseInt(text.slice(index + 2, index + 4), 16),
                );
                index += 4;
                continue;
            }
            if (next === '\r' && text[index + 2] === '\n') {
                index += 3;
                continue;
            }
            if (next !== '\n') {
                value += JS_ESCAPES[next] ?? next;
            }
            index += 2;
            continue;
        }
        value += character;
        index++;
    }
    return fail(
        context,
        UNTERMINATED_STRING,
        `This text value is never closed. Add the closing quote (${quote}) at the end of the value on the same line.`,
        start,
        Math.min(index, limit),
    );
}

/**
 * Reads an AMPscript string literal (a doubled quote stands for one quote; may span lines).
 *
 * @param {ReverseContext} context parse context
 * @param {number} start offset of the opening quote
 * @param {number} limit end of the code region
 * @returns {Token} string token
 */
function readAmpString(context, start, limit) {
    const { text } = context;
    const quote = text[start];
    let value = '';
    let index = start + 1;
    while (index < limit) {
        const close = text.indexOf(quote, index);
        if (close === -1 || close >= limit) {
            break;
        }
        value += text.slice(index, close);
        if (text[close + 1] === quote && close + 1 < limit) {
            value += quote;
            index = close + 2;
        } else {
            return { type: 'string', value, start, end: close + 1 };
        }
    }
    return fail(
        context,
        UNTERMINATED_STRING,
        `This text value is never closed. Add the closing quote (${quote}) at the end of the value.`,
        start,
        limit,
    );
}

/**
 * Matches a sticky pattern at an offset.
 *
 * @param {RegExp} pattern sticky pattern
 * @param {string} text source text
 * @param {number} index offset
 * @param {number} limit end of the code region
 * @returns {string|null} matched text or null
 */
function matchAt(pattern, text, index, limit) {
    pattern.lastIndex = index;
    const match = pattern.exec(text);
    if (!match || index + match[0].length > limit) {
        return null;
    }
    return match[0];
}

/**
 * Reads the token (or comment) at an offset inside a region.
 *
 * @param {ReverseContext} context parse context
 * @param {'js'|'ampscript'} dialect language
 * @param {number} index offset
 * @param {number} limit end of the region
 * @returns {Token|Comment&{comment: true}} token or comment
 */
function readToken(context, dialect, index, limit) {
    const { text } = context;
    const character = text[index];
    const following = text[index + 1];
    if (character === '/' && following === '/' && dialect === 'js') {
        const newline = text.indexOf('\n', index);
        return {
            comment: true,
            start: index,
            end: newline === -1 || newline > limit ? limit : newline,
        };
    }
    if (character === '/' && following === '*') {
        const close = text.indexOf('*/', index + 2);
        if (close === -1 || close + 2 > limit) {
            fail(
                context,
                UNTERMINATED_COMMENT,
                'This comment is never closed. Add */ where it should end.',
                index,
                limit,
            );
        }
        return { comment: true, start: index, end: close + 2 };
    }
    if (character === '"' || character === "'") {
        return dialect === 'js'
            ? readJsString(context, index, limit)
            : readAmpString(context, index, limit);
    }
    const number = matchAt(NUMBER, text, index, limit);
    if (number) {
        return { type: 'number', value: number, start: index, end: index + number.length };
    }
    if (dialect === 'ampscript' && character === '@') {
        const variable = matchAt(AMP_VARIABLE, text, index, limit);
        if (variable) {
            return {
                type: 'variable',
                value: variable,
                start: index,
                end: index + variable.length,
            };
        }
    }
    const word = matchAt(dialect === 'js' ? JS_IDENT : AMP_IDENT, text, index, limit);
    if (word) {
        return { type: 'ident', value: word, start: index, end: index + word.length };
    }
    const multi = MULTI_PUNCT.find(
        (symbol) => text.startsWith(symbol, index) && index + symbol.length <= limit,
    );
    const symbol = multi ?? String.fromCodePoint(text.codePointAt(index));
    return { type: 'punct', value: symbol, start: index, end: index + symbol.length };
}

/**
 * Reads the token or comment at an offset and stores it on the context.
 *
 * @param {ReverseContext} context parse context
 * @param {'js'|'ampscript'} dialect language
 * @param {number} index offset
 * @param {number} limit end of the region
 * @returns {number} offset after the token
 */
function storeToken(context, dialect, index, limit) {
    const token = readToken(context, dialect, index, limit);
    if (token.comment) {
        context.comments.push({ start: token.start, end: token.end });
    } else {
        context.tokens.push(token);
    }
    return token.end;
}

/**
 * Splits the code regions into tokens and comments (stored on the context).
 *
 * @param {ReverseContext} context parse context
 * @param {'js'|'ampscript'} dialect language
 * @param {number[][]} regions [start, end) offset pairs to read
 */
export function tokenize(context, dialect, regions) {
    for (const [regionStart, limit] of regions) {
        let index = regionStart;
        while (index < limit) {
            index = WHITESPACE.test(context.text[index])
                ? index + 1
                : storeToken(context, dialect, index, limit);
        }
    }
    const length = context.text.length;
    context.tokens.push({ type: 'eof', value: '', start: length, end: length });
}

/**
 * Fails with EMPTY_INPUT when there is no code token at all.
 *
 * @param {ReverseContext} context parse context
 */
export function rejectEmpty(context) {
    if (context.tokens.length === 1) {
        fail(
            context,
            EMPTY_INPUT,
            'There is no code to convert. Paste a lookup call such as LookupRows(...) or a filter object.',
            0,
            context.text.length,
        );
    }
}

/**
 * Returns the token at an absolute index (the eof token when past the end).
 *
 * @param {ReverseContext} context parse context
 * @param {number} index token index
 * @returns {Token} token
 */
export function tokenAt(context, index) {
    const { tokens } = context;
    return tokens[Math.max(0, Math.min(index, tokens.length - 1))];
}

/**
 * Checks whether a token is the given punctuation.
 *
 * @param {Token} token token
 * @param {string} symbol punctuation text
 * @returns {boolean} true when it matches
 */
export function isPunct(token, symbol) {
    return token.type === 'punct' && token.value === symbol;
}

/**
 * Checks whether a token is an identifier with the given name (case-insensitive).
 *
 * @param {Token} token token
 * @param {string} name identifier name
 * @returns {boolean} true when it matches
 */
export function isIdent(token, name) {
    return token.type === 'ident' && token.value.toLowerCase() === name.toLowerCase();
}

/**
 * Finds the end offset of the expression starting at a token index: everything up to the next
 * `,` `)` `]` `}` or `;` outside brackets.
 *
 * @param {ReverseContext} context parse context
 * @param {number} index token index where the expression starts
 * @returns {number} exclusive end offset
 */
export function expressionEnd(context, index) {
    let depth = 0;
    let end = tokenAt(context, index).end;
    for (let current = index; current < context.tokens.length; current++) {
        const token = context.tokens[current];
        if (token.type === 'eof') {
            break;
        }
        if (token.type === 'punct') {
            if ('([{'.includes(token.value)) {
                depth++;
            } else if (')]}'.includes(token.value)) {
                if (depth === 0) {
                    break;
                }
                depth--;
            } else if (depth === 0 && (token.value === ',' || token.value === ';')) {
                break;
            }
        }
        end = token.end;
    }
    return end;
}

/**
 * Fails with MISSING_CLOSING_PAREN for a call whose argument list never closes.
 *
 * @param {ReverseContext} context parse context
 * @param {Token} open the "(" token
 * @returns {never} always throws ParseStop
 */
export function failUnclosedCall(context, open) {
    fail(
        context,
        MISSING_CLOSING_PAREN,
        'This argument list is never closed. Add a closing bracket ) after the last argument.',
        open.start,
        open.end,
    );
}

// ------------------------------------------------------------------------------------------
// Header comment
// ------------------------------------------------------------------------------------------

/**
 * Undoes what the emitters do to names in a header comment (`commentText` in emit-mce.js),
 * reading left to right: `~~` → `~`, `~q` → `"`, `~b` → a backslash, and a `~` before `/` or
 * `%` is removed.
 *
 * @param {string} text text read from a header comment
 * @returns {string} the original text
 */
export function decodeCommentText(text) {
    return text.replaceAll(/~([~qb/%])/g, (_match, next) => COMMENT_UNESCAPES[next] ?? next);
}

/**
 * Splits a comma-separated column list, keeping [bracketed] names intact.
 *
 * @param {string} list column list text
 * @param {number} offset absolute offset of the list
 * @returns {{name: string, start: number, end: number}[]} columns
 */
function splitColumns(list, offset) {
    const parts = [];
    let partStart = 0;
    let isInBracket = false;
    for (let index = 0; index <= list.length; index++) {
        const character = list[index];
        if (character === '[') {
            isInBracket = true;
        } else if (character === ']') {
            isInBracket = list[index + 1] === ']' ? (index++, true) : false;
        } else if ((character === ',' && !isInBracket) || index === list.length) {
            const raw = list.slice(partStart, index);
            const lead = raw.length - raw.trimStart().length;
            const trimmed = raw.trim();
            if (trimmed) {
                const isBracketed = trimmed.startsWith('[') && trimmed.endsWith(']');
                parts.push({
                    name: decodeCommentText(
                        isBracketed ? trimmed.slice(1, -1).replaceAll(']]', ']') : trimmed,
                    ),
                    start: offset + partStart + lead,
                    end: offset + partStart + lead + trimmed.length,
                });
            }
            partStart = index + 1;
        }
    }
    return parts;
}

/**
 * Reads the `SQL:` header comment(s): `SQL: FROM [Name] (external key Key)`,
 * `SQL: SELECT a, b` and the `NOT IN` marker.
 *
 * @param {ReverseContext} context parse context
 * @returns {{name?: string, nameLoc?: object, key?: string, columns?: '*'|{name: string, loc: object}[], foldNotIn: boolean}} header data
 */
export function readHeader(context) {
    const header = { foldNotIn: false };
    for (const comment of context.comments) {
        const body = context.text.slice(comment.start, comment.end);
        let lineOffset = 0;
        for (const line of body.split('\n')) {
            const prefix = /^\s*(?:\/\/|\/\*+|\*+)?\s*SQL:\s*/i.exec(line);
            if (prefix) {
                const payload = line
                    .slice(prefix[0].length)
                    .replace(/\*\/\s*$/, '')
                    .trimEnd();
                readHeaderPayload(
                    context,
                    header,
                    payload,
                    comment.start + lineOffset + prefix[0].length,
                );
            }
            lineOffset += line.length + 1;
        }
    }
    return header;
}

/**
 * Reads one `SQL:` payload into the header data.
 *
 * @param {ReverseContext} context parse context
 * @param {object} header header data (mutated)
 * @param {string} payload text after "SQL:"
 * @param {number} offset absolute offset of the payload
 */
function readHeaderPayload(context, header, payload, offset) {
    if (/\bNOT\s+IN\b/i.test(payload)) {
        header.foldNotIn = true;
    }
    const from =
        /\bFROM\s+(\[(?:[^\]]|\]\])+\]|[^\s()]+)(?:\s*\(\s*external\s+key\s+([^)]*?)\s*\))?/i.exec(
            payload,
        );
    if (from) {
        const rawName = from[1];
        const nameStart = offset + from.index + from[0].indexOf(rawName);
        header.name = decodeCommentText(
            rawName.startsWith('[') ? rawName.slice(1, -1).replaceAll(']]', ']') : rawName,
        );
        header.nameLoc = makeLoc(context, nameStart, nameStart + rawName.length);
        if (from[2]) {
            header.key = decodeCommentText(from[2]);
        }
    }
    const select = /\bSELECT\s+(?:TOP\s+\(?\d+\)?\s+)?(.*?)(?=\s+FROM\b|$)/i.exec(payload);
    if (select && select[1].trim()) {
        const listStart = offset + select.index + select[0].length - select[1].length;
        header.columns =
            select[1].trim() === '*'
                ? '*'
                : splitColumns(select[1], listStart).map((column) => ({
                      name: column.name,
                      loc: makeLoc(context, column.start, column.end),
                  }));
    }
}

// ------------------------------------------------------------------------------------------
// Values and ORDER BY
// ------------------------------------------------------------------------------------------

/**
 * Builds an AST Value from text: plain numbers without leading zeros become numbers.
 *
 * @param {ReverseContext} context parse context
 * @param {string} text the value text
 * @param {number} start 0-based start offset of the literal
 * @param {number} end 0-based exclusive end offset of the literal
 * @param {boolean} [isNumberLiteral] true when the code wrote a number literal (no quotes)
 * @returns {{kind: 'string'|'number', value: string, loc: object}} value
 */
export function makeValue(context, text, start, end, isNumberLiteral = false) {
    return {
        kind: isNumberLiteral || PLAIN_NUMBER.test(text) ? 'number' : 'string',
        value: text,
        loc: makeLoc(context, start, end),
    };
}

/**
 * Parses a LookupOrderedRows sort string such as "LastName ASC, Age DESC".
 *
 * @param {ReverseContext} context parse context
 * @param {{value: string, start: number, end: number}} literal the string literal
 * @returns {{column: string, direction: 'ASC'|'DESC', loc: object}[]} sort order
 */
export function parseOrderString(context, literal) {
    const inner = context.text.slice(literal.start + 1, literal.end - 1);
    const hasExactOffsets = inner === literal.value;
    const items = [];
    let partStart = 0;
    for (const part of literal.value.split(',')) {
        const lead = part.length - part.trimStart().length;
        const match = /^(\[(?:[^\]]|\]\])+\]|[^\s[\]]+)(?:\s+(ASC|DESC))?$/i.exec(part.trim());
        if (!match) {
            fail(
                context,
                INVALID_ORDER_BY,
                'The sort order could not be read. Write column names with an optional ASC or DESC, separated by commas, e.g. "LastName ASC, Age DESC".',
                literal.start,
                literal.end,
            );
        }
        const raw = match[1];
        const start = hasExactOffsets ? literal.start + 1 + partStart + lead : literal.start;
        const end = hasExactOffsets ? start + match[0].length : literal.end;
        items.push({
            column: raw.startsWith('[') ? raw.slice(1, -1).replaceAll(']]', ']') : raw,
            direction: match[2] ? match[2].toUpperCase() : 'ASC',
            loc: makeLoc(context, start, end),
        });
        partStart += part.length + 1;
    }
    return items;
}

/**
 * Joins conditions into a left-nested AND chain, as the SQL parser builds `a AND b AND c`.
 *
 * @param {ReverseContext} context parse context
 * @param {object[]} conditions condition nodes in source order
 * @returns {object} expression node
 */
export function andChain(context, conditions) {
    let expression = conditions[0];
    for (const condition of conditions.slice(1)) {
        expression = {
            type: 'and',
            left: expression,
            right: condition,
            loc: makeLoc(context, expression.loc.start, condition.loc.end),
        };
    }
    return expression;
}
