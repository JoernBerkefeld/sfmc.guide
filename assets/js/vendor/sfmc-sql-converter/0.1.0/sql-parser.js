/**
 * Parser for the Automation Studio / T-SQL style SELECT subset that can be turned into
 * data extension reads.
 *
 * `parseSql(text)` never throws. It returns `{ ast, messages }`; `ast` is `null` whenever at
 * least one message has severity `error`. Parsing stops at the first error.
 */

import {
    EMPTY_IDENTIFIER,
    EMPTY_INPUT,
    EXPECTED_FROM,
    EXPECTED_IDENTIFIER,
    EXPECTED_OPERATOR,
    EXPECTED_SELECT,
    EXPECTED_STRING,
    EXPECTED_VALUE,
    INTERNAL_ERROR,
    INVALID_TOP,
    LITERAL_ON_LEFT,
    MISSING_CLOSING_PAREN,
    NESTING_TOO_DEEP,
    NULL_COMPARISON,
    SYNTAX_ERROR,
    SYSTEM_DATA_VIEW,
    TABLE_HINT_IGNORED,
    UNEXPECTED_CHARACTER,
    UNSUPPORTED_AGGREGATE,
    UNSUPPORTED_ALIAS,
    UNSUPPORTED_COLUMN_COMPARISON,
    UNSUPPORTED_DISTINCT,
    UNSUPPORTED_FUNCTION,
    UNSUPPORTED_GROUP_BY,
    UNSUPPORTED_HAVING,
    UNSUPPORTED_JOIN,
    UNSUPPORTED_LINE_SEPARATOR,
    UNSUPPORTED_MULTIPLE_STATEMENTS,
    UNSUPPORTED_NOT_BETWEEN,
    UNSUPPORTED_NOT_CONDITION,
    UNSUPPORTED_NOT_LIKE,
    UNSUPPORTED_QUALIFIED_NAME,
    UNSUPPORTED_STAR_WITH_COLUMNS,
    UNSUPPORTED_SUBQUERY,
    UNSUPPORTED_UNION,
    UNTERMINATED_COMMENT,
    UNTERMINATED_IDENTIFIER,
    UNTERMINATED_STRING,
    createMessage,
} from './messages.js';

/**
 * @typedef {object} Loc
 * @property {number} start 0-based start offset
 * @property {number} end 0-based exclusive end offset
 * @property {number} line 1-based start line
 * @property {number} column 1-based start column
 * @property {number} endLine 1-based end line
 * @property {number} endColumn 1-based exclusive end column
 */

/**
 * @typedef {object} Value
 * @property {'string'|'number'} kind literal type
 * @property {string} value unescaped text, or the number exactly as written
 * @property {Loc} loc location
 */

/**
 * @typedef {object} Expr
 * @property {'and'|'or'|'compare'|'like'|'in'|'between'|'null'} type node type
 * @property {Loc} loc location
 */

/**
 * @typedef {object} SelectAst
 * @property {'select'} type node type
 * @property {number|null} top TOP n, or null
 * @property {'*'|{name: string, loc: Loc}[]} columns selected columns
 * @property {{name: string, loc: Loc}} from data extension name
 * @property {Expr|null} where filter or null
 * @property {{column: string, direction: 'ASC'|'DESC', loc: Loc}[]} orderBy sort order
 * @property {Loc} loc location of the whole statement
 */

/**
 * @typedef {object} Token
 * @property {'word'|'bracket'|'string'|'number'|'symbol'|'eof'} type token type
 * @property {string} value identifier / literal value (unescaped) or symbol text
 * @property {string} upper upper-cased value (keyword comparison for words)
 * @property {number} start 0-based start offset
 * @property {number} end 0-based exclusive end offset
 */

/**
Words that cannot be used as bare column / data extension names.
 */
const RESERVED = new Set([
    'ALL',
    'AND',
    'ANY',
    'APPLY',
    'AS',
    'ASC',
    'BETWEEN',
    'BY',
    'CASE',
    'CROSS',
    'DESC',
    'DISTINCT',
    'ELSE',
    'END',
    'ESCAPE',
    'EXCEPT',
    'EXISTS',
    'FROM',
    'FULL',
    'GROUP',
    'HAVING',
    'IN',
    'INNER',
    'INTERSECT',
    'INTO',
    'IS',
    'JOIN',
    'LEFT',
    'LIKE',
    'NOT',
    'NULL',
    'OFFSET',
    'ON',
    'OR',
    'ORDER',
    'OUTER',
    'OVER',
    'PERCENT',
    'RIGHT',
    'SELECT',
    'SOME',
    'THEN',
    'TOP',
    'UNION',
    'WHEN',
    'WHERE',
    'WITH',
]);

/**
 * Words that must be wrapped in square brackets when used as a name (read-only view of the
 * parser's reserved word list, used by the SQL printer).
 */
export const RESERVED_WORDS = RESERVED;

const AGGREGATES = new Set([
    'AVG',
    'CHECKSUM_AGG',
    'COUNT',
    'COUNT_BIG',
    'GROUPING',
    'MAX',
    'MIN',
    'STDEV',
    'STDEVP',
    'STRING_AGG',
    'SUM',
    'VAR',
    'VARP',
]);

const JOIN_WORDS = new Set(['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'OUTER']);
const SET_OPERATORS = new Set(['UNION', 'EXCEPT', 'INTERSECT']);
const COMPARISON_OPERATORS = new Set(['=', '<>', '!=', '>', '>=', '<', '<=']);
const NON_SELECT_STATEMENTS = new Set([
    'ALTER',
    'CREATE',
    'DECLARE',
    'DELETE',
    'DROP',
    'EXEC',
    'EXECUTE',
    'INSERT',
    'MERGE',
    'SET',
    'TRUNCATE',
    'UPDATE',
    'WITH',
]);
const TWO_CHAR_SYMBOLS = new Set(['<>', '<=', '>=', '!=']);
const ONE_CHAR_SYMBOLS = new Set(['(', ')', ',', '*', ';', '.', '=', '<', '>', '-', '+', '/', '%']);

// a name with U+2028 / U+2029 cannot be kept on one comment line in the generated code
const LINE_SEPARATORS = /[\u{2028}\u{2029}]/u;
const WORD_PATTERN = /[\p{L}_#][\p{L}\p{N}_#$]*/uy;
const NUMBER_PATTERN = /\d+(?:\.\d+)?/y;
const WHITESPACE_PATTERN = /\s/;
const INTEGER_PATTERN = /^\d+$/;

/**
 * Internal signal that parsing stopped after an error message was recorded.
 */
class ParseStop extends Error {
    /**
     * Creates the stop signal.
     */
    constructor() {
        super('parse stopped');
        this.name = 'ParseStop';
    }
}

/**
 * Builds the offsets at which each line starts.
 *
 * @param {string} text source text
 * @returns {number[]} start offset of every line
 */
function computeLineStarts(text) {
    const starts = [0];
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) {
        starts.push(index + 1);
    }
    return starts;
}

/**
 * Converts an offset into a 1-based line / column pair.
 *
 * @param {number[]} lineStarts result of computeLineStarts
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
 * Creates the parse context shared by the lexer and the parser.
 *
 * @param {string} text source text
 * @returns {{text: string, lineStarts: number[], messages: object[], tokens: Token[], pos: number}} context
 */
function createContext(text) {
    return { text, lineStarts: computeLineStarts(text), messages: [], tokens: [], pos: 0 };
}

/**
 * Builds a location object for an offset range.
 *
 * @param {object} context parse context
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 * @returns {Loc} location
 */
function makeLoc(context, start, end) {
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
 * @param {object} context parse context
 * @param {'error'|'warning'|'info'} severity severity
 * @param {string} code message code
 * @param {string} message plain-language text
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 */
function report(context, severity, code, message, start, end) {
    context.messages.push(createMessage(severity, code, message, makeLoc(context, start, end)));
}

/**
 * Records an error and stops parsing.
 *
 * @param {object} context parse context
 * @param {string} code message code
 * @param {string} message plain-language text
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 * @returns {never} always throws ParseStop
 */
function fail(context, code, message, start, end) {
    report(context, 'error', code, message, start, end);
    throw new ParseStop();
}

// ------------------------------------------------------------------------------------------
// Lexer
// ------------------------------------------------------------------------------------------

/**
 * Reads a single-quoted string literal starting at the opening quote.
 *
 * @param {object} context parse context
 * @param {number} start offset of the token (the N prefix or the quote)
 * @param {number} quote offset of the opening quote
 * @returns {Token} string token
 */
function readString(context, start, quote) {
    const { text } = context;
    let value = '';
    let index = quote + 1;
    for (;;) {
        const close = text.indexOf("'", index);
        if (close === -1) {
            fail(
                context,
                UNTERMINATED_STRING,
                "This text value is never closed. Add a closing single quote (') at the end of the value.",
                start,
                text.length,
            );
        }
        value += text.slice(index, close);
        if (text[close + 1] === "'") {
            value += "'";
            index = close + 2;
        } else {
            return { type: 'string', value, upper: value, start, end: close + 1 };
        }
    }
}

/**
 * Reads a [bracketed] identifier starting at the opening bracket.
 *
 * @param {object} context parse context
 * @param {number} start offset of the opening bracket
 * @returns {Token} bracket token
 */
function readBracket(context, start) {
    const { text } = context;
    let value = '';
    let index = start + 1;
    for (;;) {
        const close = text.indexOf(']', index);
        if (close === -1) {
            fail(
                context,
                UNTERMINATED_IDENTIFIER,
                'This [name] is never closed. Add a closing square bracket (]) after the name.',
                start,
                text.length,
            );
        }
        value += text.slice(index, close);
        if (text[close + 1] === ']') {
            value += ']';
            index = close + 2;
        } else {
            if (value.trim() === '') {
                fail(
                    context,
                    EMPTY_IDENTIFIER,
                    'The square brackets are empty. Put the column or data extension name between [ and ].',
                    start,
                    close + 1,
                );
            }
            const separator = text.slice(start, close).search(LINE_SEPARATORS);
            if (separator !== -1) {
                fail(
                    context,
                    UNSUPPORTED_LINE_SEPARATOR,
                    'This name contains a line separator character (U+2028 or U+2029). Remove it from the name.',
                    start + separator,
                    start + separator + 1,
                );
            }
            return { type: 'bracket', value, upper: value.toUpperCase(), start, end: close + 1 };
        }
    }
}

/**
 * Builds the message for a character the lexer does not understand.
 *
 * @param {string} character the character
 * @returns {string} plain-language message
 */
function unexpectedCharacterMessage(character) {
    if (character === '"') {
        return "Double quotes are not supported. Put text values in single quotes ('text') and wrap names with spaces in square brackets ([My Name]).";
    }
    if (character === '@') {
        return 'Variables (@name) are not supported. Write the value directly into the query instead.';
    }
    return `The character "${character}" is not allowed here. Remove it or put it inside a text value in single quotes.`;
}

/**
 * Splits the text into tokens, skipping whitespace and comments.
 *
 * @param {object} context parse context; tokens are stored on it
 */
function tokenize(context) {
    const { text } = context;
    const tokens = context.tokens;
    let index = 0;
    while (index < text.length) {
        const character = text[index];
        const following = text[index + 1];
        if (WHITESPACE_PATTERN.test(character)) {
            index++;
            continue;
        }
        if (character === '-' && following === '-') {
            const newline = text.indexOf('\n', index);
            index = newline === -1 ? text.length : newline + 1;
            continue;
        }
        if (character === '/' && following === '*') {
            const close = text.indexOf('*/', index + 2);
            if (close === -1) {
                fail(
                    context,
                    UNTERMINATED_COMMENT,
                    'This comment is never closed. Add */ where the comment should end.',
                    index,
                    text.length,
                );
            }
            index = close + 2;
            continue;
        }
        let token;
        if (character === "'") {
            token = readString(context, index, index);
        } else if (following === "'" && (character === 'N' || character === 'n')) {
            token = readString(context, index, index + 1);
        } else if (character === '[') {
            token = readBracket(context, index);
        } else {
            token = readSimpleToken(context, index);
        }
        tokens.push(token);
        index = token.end;
    }
    tokens.push({ type: 'eof', value: '', upper: '', start: text.length, end: text.length });
}

/**
 * Reads a number, word or symbol token.
 *
 * @param {object} context parse context
 * @param {number} index offset to read from
 * @returns {Token} token
 */
function readSimpleToken(context, index) {
    const { text } = context;
    NUMBER_PATTERN.lastIndex = index;
    const number = NUMBER_PATTERN.exec(text);
    if (number) {
        return {
            type: 'number',
            value: number[0],
            upper: number[0],
            start: index,
            end: index + number[0].length,
        };
    }
    WORD_PATTERN.lastIndex = index;
    const word = WORD_PATTERN.exec(text);
    if (word) {
        return {
            type: 'word',
            value: word[0],
            upper: word[0].toUpperCase(),
            start: index,
            end: index + word[0].length,
        };
    }
    const pair = text.slice(index, index + 2);
    if (TWO_CHAR_SYMBOLS.has(pair)) {
        return { type: 'symbol', value: pair, upper: pair, start: index, end: index + 2 };
    }
    const character = String.fromCodePoint(text.codePointAt(index));
    if (ONE_CHAR_SYMBOLS.has(character)) {
        return { type: 'symbol', value: character, upper: character, start: index, end: index + 1 };
    }
    return fail(
        context,
        UNEXPECTED_CHARACTER,
        unexpectedCharacterMessage(character),
        index,
        index + character.length,
    );
}

// ------------------------------------------------------------------------------------------
// Token helpers
// ------------------------------------------------------------------------------------------

/**
 * Returns the token at the current position plus an offset.
 *
 * @param {object} context parse context
 * @param {number} [ahead] how many tokens to look ahead
 * @returns {Token} token (the eof token when past the end)
 */
function peek(context, ahead = 0) {
    const { tokens } = context;
    return tokens[Math.min(context.pos + ahead, tokens.length - 1)];
}

/**
 * Consumes and returns the current token.
 *
 * @param {object} context parse context
 * @returns {Token} consumed token
 */
function advance(context) {
    const token = peek(context);
    if (token.type !== 'eof') {
        context.pos++;
    }
    return token;
}

/**
 * Checks whether a token is the given keyword (bare word, case-insensitive).
 *
 * @param {Token} token token to check
 * @param {string} keyword upper-case keyword
 * @returns {boolean} true when it matches
 */
function isKeyword(token, keyword) {
    return token.type === 'word' && token.upper === keyword;
}

/**
 * Checks whether a token is the given symbol.
 *
 * @param {Token} token token to check
 * @param {string} symbol symbol text
 * @returns {boolean} true when it matches
 */
function isSymbol(token, symbol) {
    return token.type === 'symbol' && token.value === symbol;
}

/**
 * Checks whether a token can be used as a name (bracketed or non-reserved bare word).
 *
 * @param {Token} token token to check
 * @returns {boolean} true for a usable name
 */
function isName(token) {
    return token.type === 'bracket' || (token.type === 'word' && !RESERVED.has(token.upper));
}

/**
 * Returns the source text of a token for use in messages.
 *
 * @param {object} context parse context
 * @param {Token} token token to describe
 * @returns {string} quoted source text, or a phrase for the end of the query
 */
function describe(context, token) {
    if (token.type === 'eof') {
        return 'the end of the query';
    }
    return `"${context.text.slice(token.start, token.end)}"`;
}

/**
 * Finds the end offset of the parenthesis group that opens at the given token index.
 *
 * @param {object} context parse context
 * @param {number} openIndex token index of the "("
 * @returns {number} end offset of the matching ")" or of the last token when unclosed
 */
function groupEnd(context, openIndex) {
    const { tokens } = context;
    let depth = 0;
    let end = tokens[openIndex].end;
    for (let index = openIndex; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type === 'eof') {
            break;
        }
        end = token.end;
        if (isSymbol(token, '(')) {
            depth++;
        } else if (isSymbol(token, ')')) {
            depth--;
            if (depth === 0) {
                break;
            }
        }
    }
    return end;
}

// ------------------------------------------------------------------------------------------
// Shared rejections
// ------------------------------------------------------------------------------------------

/**
 * Fails with UNSUPPORTED_SUBQUERY when the current token opens a subquery "(SELECT".
 *
 * @param {object} context parse context
 */
function rejectSubquery(context) {
    if (isSymbol(peek(context), '(') && isKeyword(peek(context, 1), 'SELECT')) {
        fail(
            context,
            UNSUPPORTED_SUBQUERY,
            'Queries inside a query (subqueries) are not supported. Run the inner query on its own and use its result values directly.',
            peek(context).start,
            groupEnd(context, context.pos),
        );
    }
}

/**
 * Fails with UNSUPPORTED_FUNCTION / UNSUPPORTED_AGGREGATE when the current token starts a
 * function call or a CASE expression.
 *
 * @param {object} context parse context
 */
function rejectFunction(context) {
    const token = peek(context);
    if (isKeyword(token, 'CASE')) {
        fail(
            context,
            UNSUPPORTED_FUNCTION,
            'CASE expressions are not supported. Select or compare the plain column instead and handle the different cases in your code.',
            token.start,
            token.end,
        );
    }
    if (token.type !== 'word' || !isSymbol(peek(context, 1), '(')) {
        return;
    }
    const end = groupEnd(context, context.pos + 1);
    if (AGGREGATES.has(token.upper)) {
        fail(
            context,
            UNSUPPORTED_AGGREGATE,
            `${token.value}() combines several rows into one value, which is not supported. Select the plain rows and calculate the result in your code.`,
            token.start,
            end,
        );
    }
    fail(
        context,
        UNSUPPORTED_FUNCTION,
        `The function ${token.value}() is not supported. Use the plain column name or a fixed value (for dates, write the date in single quotes, e.g. '2026-01-31').`,
        token.start,
        end,
    );
}

/**
 * Reads a column or data extension name, rejecting functions and prefixed names.
 *
 * @param {object} context parse context
 * @param {string} label what kind of name is expected ("column" or "data extension")
 * @returns {{name: string, start: number, end: number}} the name and its offsets
 */
function readName(context, label) {
    rejectFunction(context);
    const token = peek(context);
    if (!isName(token)) {
        let message;
        if (token.type === 'eof') {
            message = `The query ends where a ${label} name is expected. Add the ${label} name.`;
        } else if (token.type === 'word') {
            message = `${describe(context, token)} is a reserved SQL word. If it is the ${label} name, wrap it in square brackets: [${token.value}].`;
        } else {
            message = `Expected a ${label} name but found ${describe(context, token)}. Write the ${label} name here; use [square brackets] for names with spaces.`;
        }
        fail(context, EXPECTED_IDENTIFIER, message, token.start, token.end);
    }
    advance(context);
    if (isSymbol(peek(context), '.')) {
        let end = peek(context).end;
        while (isSymbol(peek(context), '.')) {
            advance(context);
            end = advance(context).end;
        }
        fail(
            context,
            UNSUPPORTED_QUALIFIED_NAME,
            `Names with a prefix (such as ENT. or a table name before the dot) are not supported. Write only the ${label} name, without the part before the dot.`,
            token.start,
            end,
        );
    }
    return { name: token.value, start: token.start, end: token.end };
}

/**
 * Fails with UNSUPPORTED_ALIAS when the current token starts an alias (AS x, or a bare name).
 *
 * @param {object} context parse context
 * @param {number} nameStart start offset of the name the alias belongs to
 */
function rejectAlias(context, nameStart) {
    const token = peek(context);
    let end;
    if (isKeyword(token, 'AS')) {
        const aliasToken = peek(context, 1);
        end = aliasToken.type === 'eof' ? token.end : aliasToken.end;
    } else if (isName(token) || token.type === 'string') {
        end = token.end;
    } else {
        return;
    }
    fail(
        context,
        UNSUPPORTED_ALIAS,
        'Renaming with AS (aliases) is not supported. Remove the new name and use the original name.',
        nameStart,
        end,
    );
}

/**
 * Fails with a generic syntax error for an unexpected token.
 *
 * @param {object} context parse context
 * @param {string} hint what the user should do instead
 * @returns {never} always throws ParseStop
 */
function unexpected(context, hint) {
    const token = peek(context);
    fail(
        context,
        SYNTAX_ERROR,
        `Unexpected ${describe(context, token)}. ${hint}`,
        token.start,
        token.end,
    );
}

// ------------------------------------------------------------------------------------------
// Values and conditions
// ------------------------------------------------------------------------------------------

/**
 * Reads a literal value (text in single quotes or a number, optionally negative).
 *
 * @param {object} context parse context
 * @param {{name: string, start: number}} column the column the value is compared with
 * @returns {Value} value node
 */
function parseValue(context, column) {
    const token = peek(context);
    if (token.type === 'string' || token.type === 'number') {
        advance(context);
        return {
            kind: token.type,
            value: token.value,
            loc: makeLoc(context, token.start, token.end),
        };
    }
    const following = peek(context, 1);
    if (isSymbol(token, '-') && following.type === 'number' && following.start === token.end) {
        advance(context);
        advance(context);
        return {
            kind: 'number',
            value: `-${following.value}`,
            loc: makeLoc(context, token.start, following.end),
        };
    }
    if (isKeyword(token, 'NULL')) {
        fail(
            context,
            NULL_COMPARISON,
            `NULL cannot be used as a value here. To find empty values write "${column.name} IS NULL"; for non-empty values write "${column.name} IS NOT NULL".`,
            token.start,
            token.end,
        );
    }
    rejectFunction(context);
    rejectSubquery(context);
    if (isName(token)) {
        fail(
            context,
            UNSUPPORTED_COLUMN_COMPARISON,
            `Comparing two columns (${column.name} and ${token.value}) is not supported. Compare the column with a fixed value instead. If ${token.value} is meant as text, wrap it in single quotes: '${token.value}'.`,
            column.start,
            token.end,
        );
    }
    return fail(
        context,
        EXPECTED_VALUE,
        `Expected a value but found ${describe(context, token)}. Write text in single quotes ('text') or a plain number.`,
        token.start,
        token.end,
    );
}

/**
 * Reads the value list of an IN condition, starting at "(".
 *
 * @param {object} context parse context
 * @param {{name: string, start: number}} column the column being tested
 * @param {boolean} negated true for NOT IN
 * @returns {Expr} in node
 */
function parseIn(context, column, negated) {
    const open = peek(context);
    if (!isSymbol(open, '(')) {
        unexpected(context, "IN needs a list of values in round brackets, e.g. IN ('a', 'b').");
    }
    rejectSubquery(context);
    advance(context);
    const values = [];
    for (;;) {
        values.push(parseValue(context, column));
        const token = peek(context);
        if (isSymbol(token, ',')) {
            advance(context);
        } else if (isSymbol(token, ')')) {
            advance(context);
            return {
                type: 'in',
                negated,
                column: column.name,
                values,
                loc: makeLoc(context, column.start, token.end),
            };
        } else if (token.type === 'eof') {
            fail(
                context,
                MISSING_CLOSING_PAREN,
                'This value list is never closed. Add a closing bracket ) after the last value.',
                open.start,
                open.end,
            );
        } else {
            unexpected(context, 'Separate the values with commas and close the list with ).');
        }
    }
}

/**
 * Parses a single condition such as `Age > 5`, `Name LIKE 'a%'` or `Email IS NULL`.
 *
 * @param {object} context parse context
 * @returns {Expr} condition node
 */
function parsePredicate(context) {
    const first = peek(context);
    if (first.type === 'string' || first.type === 'number' || isSymbol(first, '-')) {
        fail(
            context,
            LITERAL_ON_LEFT,
            `Put the column name first, then the value, e.g. "Age > 5" instead of "5 < Age".`,
            first.start,
            first.end,
        );
    }
    const name = readName(context, 'column');
    const column = { name: name.name, start: name.start };
    const operator = peek(context);
    if (operator.type === 'symbol' && COMPARISON_OPERATORS.has(operator.value)) {
        advance(context);
        const value = parseValue(context, column);
        return {
            type: 'compare',
            op: operator.value === '!=' ? '<>' : operator.value,
            column: column.name,
            value,
            loc: makeLoc(context, column.start, value.loc.end),
        };
    }
    if (isKeyword(operator, 'LIKE')) {
        advance(context);
        const pattern = parseValue(context, column);
        if (pattern.kind !== 'string') {
            fail(
                context,
                EXPECTED_STRING,
                `LIKE needs a text pattern in single quotes, e.g. LIKE '%${pattern.value}%'.`,
                pattern.loc.start,
                pattern.loc.end,
            );
        }
        return {
            type: 'like',
            column: column.name,
            pattern,
            loc: makeLoc(context, column.start, pattern.loc.end),
        };
    }
    if (isKeyword(operator, 'IN')) {
        advance(context);
        return parseIn(context, column, false);
    }
    if (isKeyword(operator, 'BETWEEN')) {
        return parseBetween(context, column);
    }
    if (isKeyword(operator, 'NOT')) {
        return parseNotOperator(context, column);
    }
    if (isKeyword(operator, 'IS')) {
        advance(context);
        let isNegated = false;
        if (isKeyword(peek(context), 'NOT')) {
            advance(context);
            isNegated = true;
        }
        const nullToken = peek(context);
        if (!isKeyword(nullToken, 'NULL')) {
            unexpected(
                context,
                `IS can only be followed by NULL or NOT NULL, e.g. "${column.name} IS NULL".`,
            );
        }
        advance(context);
        return {
            type: 'null',
            negated: isNegated,
            column: column.name,
            loc: makeLoc(context, column.start, nullToken.end),
        };
    }
    return fail(
        context,
        EXPECTED_OPERATOR,
        `Expected a comparison after ${column.name} (=, <>, <, <=, >, >=, LIKE, IN, BETWEEN or IS NULL) but found ${describe(context, operator)}.`,
        operator.start,
        operator.end,
    );
}

/**
 * Parses `column BETWEEN low AND high`, starting at BETWEEN.
 *
 * @param {object} context parse context
 * @param {{name: string, start: number}} column the column being tested
 * @returns {Expr} between node
 */
function parseBetween(context, column) {
    advance(context);
    const low = parseValue(context, column);
    if (!isKeyword(peek(context), 'AND')) {
        unexpected(
            context,
            `BETWEEN needs two values joined by AND, e.g. "${column.name} BETWEEN 1 AND 10".`,
        );
    }
    advance(context);
    const high = parseValue(context, column);
    return {
        type: 'between',
        column: column.name,
        low,
        high,
        loc: makeLoc(context, column.start, high.loc.end),
    };
}

/**
 * Parses the part after `column NOT`: only NOT IN is supported.
 *
 * @param {object} context parse context
 * @param {{name: string, start: number}} column the column being tested
 * @returns {Expr} in node with negated = true
 */
function parseNotOperator(context, column) {
    const notToken = advance(context);
    const token = peek(context);
    if (isKeyword(token, 'IN')) {
        advance(context);
        return parseIn(context, column, true);
    }
    if (isKeyword(token, 'LIKE')) {
        fail(
            context,
            UNSUPPORTED_NOT_LIKE,
            'NOT LIKE is not supported. Use LIKE with the opposite pattern, or filter the unwanted rows out in your code.',
            notToken.start,
            token.end,
        );
    }
    if (isKeyword(token, 'BETWEEN')) {
        fail(
            context,
            UNSUPPORTED_NOT_BETWEEN,
            `NOT BETWEEN is not supported. Write it as two conditions instead: "(${column.name} < low OR ${column.name} > high)".`,
            notToken.start,
            token.end,
        );
    }
    return unexpected(context, "After NOT only IN is supported here, e.g. \"NOT IN ('a', 'b')\".");
}

/**
 * Parses a bracketed group or a single condition.
 *
 * @param {object} context parse context
 * @returns {Expr} expression node
 */
function parsePrimary(context) {
    const token = peek(context);
    if (isKeyword(token, 'NOT')) {
        const following = peek(context, 1);
        const end = isSymbol(following, '(')
            ? groupEnd(context, context.pos + 1)
            : following.type === 'eof'
              ? token.end
              : following.end;
        fail(
            context,
            UNSUPPORTED_NOT_CONDITION,
            'NOT in front of a condition is not supported. Write the opposite condition instead, e.g. use <> instead of =, > instead of <=, or NOT IN instead of NOT (... OR ...).',
            token.start,
            end,
        );
    }
    if (isKeyword(token, 'EXISTS')) {
        fail(
            context,
            UNSUPPORTED_SUBQUERY,
            'EXISTS needs a query inside a query (subquery), which is not supported. Run that query on its own and filter with its result values directly.',
            token.start,
            isSymbol(peek(context, 1), '(') ? groupEnd(context, context.pos + 1) : token.end,
        );
    }
    if (isSymbol(token, '(')) {
        rejectSubquery(context);
        advance(context);
        const expression = parseOr(context);
        const close = peek(context);
        if (isSymbol(close, ')')) {
            advance(context);
            return expression;
        }
        if (close.type === 'eof') {
            fail(
                context,
                MISSING_CLOSING_PAREN,
                'This bracket is never closed. Add a closing bracket ) at the end of the group.',
                token.start,
                token.end,
            );
        }
        return unexpected(
            context,
            'Close the bracket with ) or join the conditions with AND or OR.',
        );
    }
    return parsePredicate(context);
}

/**
 * Parses conditions joined by AND (binds tighter than OR).
 *
 * @param {object} context parse context
 * @returns {Expr} expression node
 */
function parseAnd(context) {
    let left = parsePrimary(context);
    while (isKeyword(peek(context), 'AND')) {
        advance(context);
        const right = parsePrimary(context);
        left = { type: 'and', left, right, loc: makeLoc(context, left.loc.start, right.loc.end) };
    }
    return left;
}

/**
 * Parses conditions joined by OR.
 *
 * @param {object} context parse context
 * @returns {Expr} expression node
 */
function parseOr(context) {
    let left = parseAnd(context);
    while (isKeyword(peek(context), 'OR')) {
        advance(context);
        const right = parseAnd(context);
        left = { type: 'or', left, right, loc: makeLoc(context, left.loc.start, right.loc.end) };
    }
    return left;
}

// ------------------------------------------------------------------------------------------
// Statement
// ------------------------------------------------------------------------------------------

/**
 * Parses the optional TOP clause.
 *
 * @param {object} context parse context
 * @returns {number|null} the row limit or null
 */
function parseTop(context) {
    if (!isKeyword(peek(context), 'TOP')) {
        return null;
    }
    const topToken = advance(context);
    const isParenthesized = isSymbol(peek(context), '(');
    if (isParenthesized) {
        advance(context);
    }
    const token = peek(context);
    if (token.type !== 'number' || !INTEGER_PATTERN.test(token.value)) {
        fail(
            context,
            INVALID_TOP,
            'TOP needs a whole number of rows, e.g. "SELECT TOP 10 ...".',
            topToken.start,
            token.type === 'eof' ? topToken.end : token.end,
        );
    }
    if (Number(token.value) === 0) {
        fail(
            context,
            INVALID_TOP,
            'TOP 0 returns no rows. Remove TOP 0, or ask for at least one row, e.g. "SELECT TOP 10 ...".',
            topToken.start,
            token.end,
        );
    }
    advance(context);
    if (isParenthesized) {
        if (!isSymbol(peek(context), ')')) {
            unexpected(context, 'Close the bracket after the number, e.g. TOP (10).');
        }
        advance(context);
    }
    const after = peek(context);
    if (isKeyword(after, 'PERCENT') || isKeyword(after, 'WITH')) {
        fail(
            context,
            INVALID_TOP,
            `TOP ... ${after.value.toUpperCase()} is not supported. Use a plain number of rows, e.g. "SELECT TOP 10 ...".`,
            topToken.start,
            isKeyword(after, 'WITH') ? peek(context, 1).end : after.end,
        );
    }
    return Number(token.value);
}

/**
 * Parses the column list.
 *
 * @param {object} context parse context
 * @returns {'*'|{name: string, loc: Loc}[]} columns
 */
function parseColumns(context) {
    const first = peek(context);
    if (isKeyword(first, 'DISTINCT')) {
        fail(
            context,
            UNSUPPORTED_DISTINCT,
            'DISTINCT is not supported. Select the rows without DISTINCT and remove duplicates in your code.',
            first.start,
            first.end,
        );
    }
    if (isSymbol(first, '*')) {
        advance(context);
        if (isSymbol(peek(context), ',')) {
            fail(
                context,
                UNSUPPORTED_STAR_WITH_COLUMNS,
                'Use either * (all columns) or a list of column names, not both. Remove the * or the extra columns.',
                first.start,
                peek(context, 1).type === 'eof' ? peek(context).end : peek(context, 1).end,
            );
        }
        rejectAlias(context, first.start);
        return '*';
    }
    const columns = [];
    for (;;) {
        const token = peek(context);
        if (isSymbol(token, '*')) {
            fail(
                context,
                UNSUPPORTED_STAR_WITH_COLUMNS,
                'Use either * (all columns) or a list of column names, not both. Remove the * or the extra columns.',
                token.start,
                token.end,
            );
        }
        rejectSubquery(context);
        const name = readName(context, 'column');
        rejectAlias(context, name.start);
        columns.push({ name: name.name, loc: makeLoc(context, name.start, name.end) });
        if (!isSymbol(peek(context), ',')) {
            return columns;
        }
        advance(context);
    }
}

/**
 * Parses the FROM clause including the checks for joins, aliases and table hints.
 *
 * @param {object} context parse context
 * @returns {{name: string, loc: Loc}} data extension reference
 */
function parseFrom(context) {
    const fromToken = peek(context);
    if (!isKeyword(fromToken, 'FROM')) {
        if (fromToken.type === 'eof') {
            fail(
                context,
                EXPECTED_FROM,
                'The query has no FROM. Add "FROM" followed by the data extension name after the column list.',
                fromToken.start,
                fromToken.end,
            );
        }
        unexpected(
            context,
            'Separate columns with commas and continue with FROM and the data extension name.',
        );
    }
    advance(context);
    const token = peek(context);
    if (isSymbol(token, '(')) {
        fail(
            context,
            UNSUPPORTED_SUBQUERY,
            'Reading from a query inside a query (subquery) is not supported. Put the data extension name directly after FROM.',
            token.start,
            groupEnd(context, context.pos),
        );
    }
    const name = readName(context, 'data extension');
    const from = { name: name.name, loc: makeLoc(context, name.start, name.end) };
    if (name.name.startsWith('_')) {
        report(
            context,
            'warning',
            SYSTEM_DATA_VIEW,
            `${name.name} looks like a system data view. System data views can only be read in Automation Studio queries, not as a data extension. Copy the data into a data extension with a query activity first and read that one.`,
            name.start,
            name.end,
        );
    }
    skipTableHint(context);
    rejectAlias(context, name.start);
    rejectJoin(context);
    return from;
}

/**
 * Skips `WITH (NOLOCK)` style table hints, which make no difference for data extension reads.
 *
 * @param {object} context parse context
 */
function skipTableHint(context) {
    const withToken = peek(context);
    if (!isKeyword(withToken, 'WITH') || !isSymbol(peek(context, 1), '(')) {
        return;
    }
    advance(context);
    const open = advance(context);
    let depth = 1;
    while (depth > 0) {
        const token = advance(context);
        if (token.type === 'eof') {
            fail(
                context,
                MISSING_CLOSING_PAREN,
                'This bracket is never closed. Add a closing bracket ) after the table hint.',
                open.start,
                open.end,
            );
        }
        if (isSymbol(token, '(')) {
            depth++;
        } else if (isSymbol(token, ')')) {
            depth--;
        }
    }
    const end = context.tokens[context.pos - 1].end;
    report(
        context,
        'info',
        TABLE_HINT_IGNORED,
        'Table hints such as WITH (NOLOCK) have no effect here and are ignored.',
        withToken.start,
        end,
    );
}

/**
 * Fails with UNSUPPORTED_JOIN when the current token starts a join or a comma-separated table.
 *
 * @param {object} context parse context
 */
function rejectJoin(context) {
    const token = peek(context);
    let end;
    if (isSymbol(token, ',')) {
        end = peek(context, 1).type === 'eof' ? token.end : peek(context, 1).end;
    } else if (token.type === 'word' && (JOIN_WORDS.has(token.upper) || token.upper === 'APPLY')) {
        end = token.end;
        for (let ahead = 0; ahead < context.tokens.length; ahead++) {
            const candidate = peek(context, ahead);
            if (candidate.type !== 'word' || !JOIN_WORDS.has(candidate.upper)) {
                if (isKeyword(candidate, 'APPLY')) {
                    end = candidate.end;
                }
                break;
            }
            end = candidate.end;
        }
    } else {
        return;
    }
    fail(
        context,
        UNSUPPORTED_JOIN,
        'Combining several data extensions (JOIN) is not supported. Read one data extension per query and combine the results in your code.',
        token.start,
        end,
    );
}

/**
 * Fails when the current token is GROUP BY or HAVING.
 *
 * @param {object} context parse context
 */
function rejectGrouping(context) {
    const token = peek(context);
    if (isKeyword(token, 'GROUP')) {
        const by = peek(context, 1);
        fail(
            context,
            UNSUPPORTED_GROUP_BY,
            'GROUP BY is not supported. Select the plain rows and group them in your code.',
            token.start,
            isKeyword(by, 'BY') ? by.end : token.end,
        );
    }
    if (isKeyword(token, 'HAVING')) {
        fail(
            context,
            UNSUPPORTED_HAVING,
            'HAVING is not supported. Filter rows with WHERE, or filter grouped results in your code.',
            token.start,
            token.end,
        );
    }
}

/**
 * Fails when the current token is UNION, EXCEPT or INTERSECT.
 *
 * @param {object} context parse context
 */
function rejectSetOperator(context) {
    const token = peek(context);
    if (token.type === 'word' && SET_OPERATORS.has(token.upper)) {
        const following = peek(context, 1);
        fail(
            context,
            UNSUPPORTED_UNION,
            `${token.upper} (combining the results of several queries) is not supported. Run each query on its own and combine the results in your code.`,
            token.start,
            isKeyword(following, 'ALL') ? following.end : token.end,
        );
    }
}

/**
 * Parses the ORDER BY list, starting at ORDER.
 *
 * @param {object} context parse context
 * @returns {{column: string, direction: 'ASC'|'DESC', loc: Loc}[]} sort order
 */
function parseOrderBy(context) {
    advance(context);
    if (!isKeyword(peek(context), 'BY')) {
        unexpected(context, 'ORDER must be followed by BY, e.g. "ORDER BY LastName".');
    }
    advance(context);
    const items = [];
    for (;;) {
        const token = peek(context);
        if (token.type === 'number') {
            fail(
                context,
                EXPECTED_IDENTIFIER,
                'Sorting by column position (ORDER BY 1) is not supported. Write the column name instead.',
                token.start,
                token.end,
            );
        }
        const name = readName(context, 'column');
        let direction = 'ASC';
        let end = name.end;
        const directionToken = peek(context);
        if (isKeyword(directionToken, 'ASC') || isKeyword(directionToken, 'DESC')) {
            advance(context);
            direction = directionToken.upper;
            end = directionToken.end;
        }
        items.push({ column: name.name, direction, loc: makeLoc(context, name.start, end) });
        if (!isSymbol(peek(context), ',')) {
            return items;
        }
        advance(context);
    }
}

/**
 * Parses one SELECT statement and checks that nothing but an optional ";" follows.
 *
 * @param {object} context parse context
 * @returns {SelectAst} statement node
 */
function parseStatement(context) {
    const selectToken = peek(context);
    if (!isKeyword(selectToken, 'SELECT')) {
        const message =
            selectToken.type === 'word' && NON_SELECT_STATEMENTS.has(selectToken.upper)
                ? `Only SELECT queries can be converted, but this query starts with ${selectToken.upper}. Rewrite it as "SELECT ... FROM ...".`
                : `A query must start with SELECT, but this one starts with ${describe(context, selectToken)}. Write it as "SELECT ... FROM ...".`;
        fail(context, EXPECTED_SELECT, message, selectToken.start, selectToken.end);
    }
    advance(context);
    const top = parseTop(context);
    const columns = parseColumns(context);
    const from = parseFrom(context);
    rejectGrouping(context);
    let where = null;
    if (isKeyword(peek(context), 'WHERE')) {
        advance(context);
        where = parseOr(context);
    }
    rejectGrouping(context);
    rejectSetOperator(context);
    const orderBy = isKeyword(peek(context), 'ORDER') ? parseOrderBy(context) : [];
    rejectSetOperator(context);
    const end = context.tokens[context.pos - 1].end;
    if (isSymbol(peek(context), ';')) {
        advance(context);
    }
    const rest = peek(context);
    if (rest.type !== 'eof') {
        if (isSymbol(context.tokens[context.pos - 1], ';')) {
            fail(
                context,
                UNSUPPORTED_MULTIPLE_STATEMENTS,
                'Only one query at a time is supported. Remove everything after the first query or convert each query separately.',
                rest.start,
                context.text.length,
            );
        }
        unexpected(
            context,
            where
                ? 'Join conditions with AND or OR, and put ORDER BY at the end of the query.'
                : 'Continue with WHERE or ORDER BY, or end the query here.',
        );
    }
    return {
        type: 'select',
        top,
        columns,
        from,
        where,
        orderBy,
        loc: makeLoc(context, selectToken.start, end),
    };
}

/**
 * Parses an Automation Studio / T-SQL style SELECT query. Never throws.
 *
 * @param {string} text the SQL query
 * @returns {{ast: SelectAst|null, messages: import('./messages.js').Message[]}} the AST (null
 * when there is an error) and all messages
 */
export function parseSql(text) {
    const source = typeof text === 'string' ? text : '';
    const context = createContext(source);
    try {
        tokenize(context);
        if (peek(context).type === 'eof') {
            fail(
                context,
                EMPTY_INPUT,
                'The query is empty. Write a query such as "SELECT * FROM MyDataExtension".',
                0,
                source.length,
            );
        }
        const ast = parseStatement(context);
        return { ast, messages: context.messages };
    } catch (ex) {
        if (!(ex instanceof ParseStop)) {
            const isTooDeep = ex instanceof RangeError;
            report(
                context,
                'error',
                isTooDeep ? NESTING_TOO_DEEP : INTERNAL_ERROR,
                isTooDeep
                    ? 'The query has too many nested brackets to read. Remove brackets that are not needed.'
                    : 'The query could not be read because of an unexpected problem in the parser. Simplify the query and try again.',
                0,
                source.length,
            );
        }
        return { ast: null, messages: context.messages };
    }
}
