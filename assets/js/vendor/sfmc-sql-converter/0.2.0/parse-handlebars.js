/**
 * Reads Marketing Cloud Next Handlebars `query` / `queryFirst` calls back into the SQL AST of
 * `parseSql`: `{{#each (query type="CRM" object="X" fields="A,B" where="A = :p1"
 * params=(hash p1="v") sortBy="A ASC" limit=5)}}`, `{{get (queryFirst …) "A"}}` and the
 * marketing object form `(query type="MO" object="X" Key__c="v")`.
 *
 * Only deterministic input converts: every value in `where` must be a `:name` placeholder that
 * `params` defines exactly once (Next fails on literals in `where`). The code is read as text;
 * it is never executed. Never throws.
 */

import { nextLikeInner, nextLikeWildcardMessage } from './clauses.js';
import {
    INVALID_ARGUMENT,
    INVALID_COUNT,
    INVALID_FILTER,
    INVALID_FILTER_VALUE,
    INVALID_ORDER_BY,
    LIKE_MATCHES_ANYWHERE,
    LOOKUP_FIRST_ROW_ONLY,
    MISSING_CLOSING_PAREN,
    MULTIPLE_LOOKUPS,
    NO_LOOKUP_FOUND,
    SYNTAX_ERROR,
    UNKNOWN_FILTER_OPERATOR,
    UNTERMINATED_STRING,
} from './messages.js';
import {
    createContext,
    fail,
    makeLoc,
    parseOrderString,
    rejectEmpty,
    report,
    runParser,
} from './reverse-common.js';

const CALL_PATTERN = /(\{\{#?|\()\s*(queryFirst|query)(?=\s)/g;
const GET_BEFORE = /\{\{\s*get\s*\($/;
const HB_IDENT = /[A-Za-z_][\w.]*/y;
const HB_NUMBER = /-?\d+(?:\.\d+)?/y;
const WHERE_TOKEN =
    /\s+|(:[A-Za-z_]\w*)|(!=|<>|<=|>=|=|<|>)|([()])|('(?:[^']|'')*'|"[^"]*"|-?\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(.)/gy;
const BODY_FIELD = /\{\{\s*([A-Za-z_]\w*)\s*\}\}/g;
const OPERATORS = { '=': '=', '!=': '<>', '<>': '<>', '<': '<', '<=': '<=', '>': '>', '>=': '>=' };
const CRM_KEYS = new Set(['type', 'object', 'fields', 'where', 'params', 'sortBy', 'limit']);
const MO_FORBIDDEN = new Set(['fields', 'where', 'params', 'sortBy', 'limit']);

/**
 * @typedef {object} HbToken
 * @property {'string'|'number'|'ident'|'punct'|'end'} type token type
 * @property {string} value unescaped string, number text, identifier or punctuation
 * @property {number} start 0-based start offset
 * @property {number} end 0-based exclusive end offset
 */

/**
 * Reads a Handlebars string literal: `\"` (or `\'`) stands for the quote.
 *
 * @param {object} context parse context
 * @param {number} start offset of the opening quote
 * @returns {HbToken} string token
 */
function readString(context, start) {
    const { text } = context;
    const quote = text[start];
    let value = '';
    for (let index = start + 1; index < text.length; index++) {
        const character = text[index];
        if (character === '\\' && text[index + 1] === quote) {
            value += quote;
            index++;
        } else if (character === quote) {
            return { type: 'string', value, start, end: index + 1 };
        } else {
            value += character;
        }
    }
    return fail(
        context,
        UNTERMINATED_STRING,
        `This text value is never closed. Add the closing quote (${quote}).`,
        start,
        text.length,
    );
}

/**
 * Reads the next token of a Handlebars expression.
 *
 * @param {object} context parse context
 * @param {number} index offset
 * @returns {HbToken} token
 */
function readToken(context, index) {
    const { text } = context;
    const character = text[index];
    if (character === '"' || character === "'") {
        return readString(context, index);
    }
    if (text.startsWith('}}', index)) {
        return { type: 'end', value: '}}', start: index, end: index + 2 };
    }
    for (const [pattern, type] of [
        [HB_NUMBER, 'number'],
        [HB_IDENT, 'ident'],
    ]) {
        pattern.lastIndex = index;
        const match = pattern.exec(text);
        if (match) {
            return { type, value: match[0], start: index, end: index + match[0].length };
        }
    }
    return { type: 'punct', value: character, start: index, end: index + 1 };
}

/**
 * Tokenizes from an offset up to the `)` that closes the call (depth 0) or the next `}}`.
 *
 * @param {object} context parse context
 * @param {number} from offset after the helper name
 * @param {boolean} isInBrackets true when the call is a `( … )` sub-expression
 * @returns {{tokens: HbToken[], end: number}} tokens of the arguments and the end offset
 */
function tokenizeCall(context, from, isInBrackets) {
    const { text } = context;
    const tokens = [];
    let depth = 0;
    let index = from;
    while (index < text.length) {
        if (/\s/.test(text[index])) {
            index++;
            continue;
        }
        const token = readToken(context, index);
        index = token.end;
        if (!isInBrackets && token.type === 'end') {
            return { tokens, end: token.end };
        }
        if (token.type === 'punct' && token.value === '(') {
            depth++;
        } else if (token.type === 'punct' && token.value === ')') {
            if (depth === 0 && isInBrackets) {
                return { tokens, end: token.end };
            }
            depth--;
        }
        tokens.push(token);
    }
    return fail(
        context,
        MISSING_CLOSING_PAREN,
        isInBrackets
            ? 'This call is never closed. Add a closing bracket ) after the last parameter.'
            : 'This call is never closed. Add }} after the last parameter.',
        from,
        text.length,
    );
}

/**
 * Reads named parameters `key=value`; a value is a string, a number, an identifier or a
 * `(hash …)` sub-expression.
 *
 * @param {object} context parse context
 * @param {HbToken[]} tokens tokens
 * @param {number} position index to start at
 * @param {number} stop index to stop at
 * @returns {Map<string, {key: HbToken, value: HbToken|Map}>} parameters in source order
 */
function readHash(context, tokens, position, stop) {
    const hash = new Map();
    let index = position;
    while (index < stop) {
        const key = tokens[index];
        const equals = tokens[index + 1];
        if (key.type !== 'ident' || equals?.value !== '=') {
            fail(
                context,
                INVALID_ARGUMENT,
                `Expected a named parameter such as object="Contact" but found "${key.value}". Write every parameter as name=value.`,
                key.start,
                key.end,
            );
        }
        if (hash.has(key.value)) {
            fail(
                context,
                INVALID_ARGUMENT,
                `The parameter ${key.value} is given twice. Keep one.`,
                key.start,
                key.end,
            );
        }
        const value = tokens[index + 2];
        if (!value) {
            fail(
                context,
                SYNTAX_ERROR,
                `The parameter ${key.value} has no value.`,
                key.start,
                equals.end,
            );
        }
        if (value.type === 'punct' && value.value === '(') {
            const close = matchingClose(tokens, index + 2);
            const head = tokens[index + 3];
            if (head?.type !== 'ident' || head.value !== 'hash') {
                fail(
                    context,
                    INVALID_ARGUMENT,
                    `${key.value} must be a plain value or (hash name=value …).`,
                    value.start,
                    tokens[close].end,
                );
            }
            hash.set(key.value, {
                key,
                value: readHash(context, tokens, index + 4, close),
                end: tokens[close].end,
            });
            index = close + 1;
            continue;
        }
        if (value.type === 'punct') {
            fail(
                context,
                SYNTAX_ERROR,
                `Unexpected "${value.value}" after ${key.value}=.`,
                value.start,
                value.end,
            );
        }
        hash.set(key.value, { key, value, end: value.end });
        index += 3;
    }
    return hash;
}

/**
 * Finds the `)` that closes the `(` at an index.
 *
 * @param {HbToken[]} tokens tokens
 * @param {number} open index of the "("
 * @returns {number} index of the matching ")"
 */
function matchingClose(tokens, open) {
    let depth = 0;
    for (let index = open; index < tokens.length; index++) {
        if (tokens[index].value === '(' && tokens[index].type === 'punct') {
            depth++;
        } else if (tokens[index].value === ')' && tokens[index].type === 'punct') {
            depth--;
            if (depth === 0) {
                return index;
            }
        }
    }
    return tokens.length - 1;
}

/**
 * Returns a string parameter or fails.
 *
 * @param {object} context parse context
 * @param {Map} hash parameters
 * @param {string} key parameter name
 * @param {string} hint how to write it
 * @param {number} callStart start offset of the call (for a missing parameter)
 * @returns {HbToken} string token
 */
function requireString(context, hash, key, hint, callStart) {
    const entry = hash.get(key);
    if (!entry) {
        fail(
            context,
            INVALID_ARGUMENT,
            `The call has no ${key}. Add ${hint}.`,
            callStart,
            callStart,
        );
    }
    if (
        !(entry.value instanceof Map) &&
        entry.value.type === 'string' &&
        entry.value.value.trim()
    ) {
        return entry.value;
    }
    return fail(
        context,
        INVALID_ARGUMENT,
        `${key} must be text in double quotes, e.g. ${hint}.`,
        entry.key.start,
        entry.end,
    );
}

/**
 * Splits a comma-separated field list into column nodes.
 *
 * @param {object} context parse context
 * @param {HbToken} token string token
 * @returns {{name: string, loc: object}[]} columns
 */
function readFields(context, token) {
    const isExact = context.text.slice(token.start + 1, token.end - 1) === token.value;
    const columns = [];
    let offset = 0;
    for (const part of token.value.split(',')) {
        const name = part.trim();
        const start = isExact ? token.start + 1 + offset + part.indexOf(name) : token.start;
        const end = isExact ? start + name.length : token.end;
        if (!name) {
            fail(
                context,
                INVALID_ARGUMENT,
                'The field list has an empty entry. Separate the field names with single commas.',
                token.start,
                token.end,
            );
        }
        columns.push({ name, loc: makeLoc(context, start, end) });
        offset += part.length + 1;
    }
    return columns;
}

/**
 * Builds the value of a condition from a parameter. The token type alone sets the kind: Next
 * keeps the type, so p1="5" is text and p1=5 a number.
 *
 * @param {object} context parse context
 * @param {{key: HbToken, value: HbToken}} entry parameter
 * @returns {object} AST value
 */
function paramValue(context, entry) {
    const { value } = entry;
    if (value instanceof Map || (value.type !== 'string' && value.type !== 'number')) {
        fail(
            context,
            INVALID_FILTER_VALUE,
            `The parameter ${entry.key.value} must be text in double quotes or a number.`,
            entry.key.start,
            entry.end,
        );
    }
    return {
        kind: value.type === 'number' ? 'number' : 'string',
        value: value.value,
        loc: makeLoc(context, value.start, value.end),
    };
}

/**
 * Tokenizes a where string.
 *
 * @param {object} context parse context
 * @param {HbToken} token where string token
 * @returns {{type: string, value: string, start: number, end: number}[]} tokens (offsets in
 * the source text when the string has no escapes, else the whole string)
 */
function whereTokens(context, token) {
    const isExact = context.text.slice(token.start + 1, token.end - 1) === token.value;
    const base = token.start + 1;
    const types = ['param', 'op', 'bracket', 'literal', 'word', 'other'];
    const tokens = [];
    WHERE_TOKEN.lastIndex = 0;
    for (let match = WHERE_TOKEN.exec(token.value); match; match = WHERE_TOKEN.exec(token.value)) {
        const group = match.slice(1).findIndex((part) => part !== undefined);
        if (group === -1) {
            continue;
        }
        tokens.push({
            type: types[group],
            value: match[0],
            start: isExact ? base + match.index : token.start,
            end: isExact ? base + match.index + match[0].length : token.end,
        });
    }
    tokens.push({ type: 'eof', value: '', start: token.end - 1, end: token.end - 1 });
    return tokens;
}

/**
 * Checks whether a where token is the given keyword.
 *
 * @param {{type: string, value: string}} item where token
 * @param {string} word upper-case keyword
 * @returns {boolean} true when it matches
 */
function isWord(item, word) {
    return item.type === 'word' && item.value.toUpperCase() === word;
}

/**
 * Parses a where string into conditions; each `:name` must be defined once in params.
 *
 * @param {object} context parse context
 * @param {HbToken} token where string token
 * @param {Map} params parameters from `(hash …)`
 * @returns {object} expression node
 */
function parseWhere(context, token, params) {
    const tokens = whereTokens(context, token);
    const used = new Set();
    let position = 0;
    const peek = () => tokens[position];

    const parseCondition = () => {
        const column = peek();
        if (column.type === 'bracket' && column.value === '(') {
            position++;
            const inner = parseOr();
            const close = peek();
            if (close.value !== ')') {
                fail(
                    context,
                    MISSING_CLOSING_PAREN,
                    'A bracket in where is never closed.',
                    column.start,
                    column.end,
                );
            }
            position++;
            return inner;
        }
        if (column.type !== 'word' || ['AND', 'OR', 'LIKE'].includes(column.value.toUpperCase())) {
            fail(
                context,
                INVALID_FILTER,
                `Expected a field name in where but found "${column.value || 'the end'}".`,
                column.start,
                column.end,
            );
        }
        position++;
        const operator = peek();
        const isLike = isWord(operator, 'LIKE');
        if (!isLike && operator.type !== 'op') {
            fail(
                context,
                UNKNOWN_FILTER_OPERATOR,
                `Expected an operator (=, !=, <, <=, >, >= or LIKE) after ${column.value} in where.`,
                operator.start,
                operator.end,
            );
        }
        position++;
        const placeholder = peek();
        if (placeholder.type === 'literal') {
            fail(
                context,
                INVALID_FILTER_VALUE,
                `The value ${placeholder.value} is written into where. Next fails on values in where: use a placeholder such as :p1 and add it to params=(hash p1=…).`,
                placeholder.start,
                placeholder.end,
            );
        }
        if (placeholder.type !== 'param') {
            fail(
                context,
                INVALID_FILTER_VALUE,
                `Expected a placeholder such as :p1 after ${column.value} ${operator.value}.`,
                placeholder.start,
                placeholder.end,
            );
        }
        position++;
        const name = placeholder.value.slice(1);
        if (used.has(name)) {
            fail(
                context,
                INVALID_FILTER,
                `The placeholder :${name} is used twice. Give every condition its own placeholder, so the query reads back the same way.`,
                placeholder.start,
                placeholder.end,
            );
        }
        used.add(name);
        const entry = params.get(name);
        if (!entry) {
            fail(
                context,
                INVALID_FILTER,
                `The placeholder :${name} has no value. Add ${name}=… to params=(hash …).`,
                placeholder.start,
                placeholder.end,
            );
        }
        const value = paramValue(context, entry);
        const loc = makeLoc(context, column.start, Math.max(placeholder.end, column.end));
        if (!isLike) {
            return {
                type: 'compare',
                op: OPERATORS[operator.value],
                column: column.value,
                value,
                loc,
            };
        }
        if (value.kind === 'number') {
            fail(
                context,
                INVALID_FILTER_VALUE,
                `LIKE needs a text value; write ${name}="%…%".`,
                entry.key.start,
                entry.end,
            );
        }
        return { type: 'like', column: column.value, pattern: likePattern(context, value), loc };
    };

    const parseAnd = () => {
        let left = parseCondition();
        while (isWord(peek(), 'AND')) {
            position++;
            const right = parseCondition();
            left = {
                type: 'and',
                left,
                right,
                loc: makeLoc(context, left.loc.start, right.loc.end),
            };
        }
        return left;
    };

    const parseOr = () => {
        let left = parseAnd();
        while (isWord(peek(), 'OR')) {
            position++;
            const right = parseAnd();
            left = {
                type: 'or',
                left,
                right,
                loc: makeLoc(context, left.loc.start, right.loc.end),
            };
        }
        return left;
    };

    const expression = parseOr();
    if (peek().type !== 'eof') {
        fail(
            context,
            INVALID_FILTER,
            `Unexpected "${peek().value}" in where. Join conditions with AND or OR.`,
            peek().start,
            peek().end,
        );
    }
    for (const [name, entry] of params) {
        if (!used.has(name)) {
            fail(
                context,
                INVALID_FILTER,
                `params defines ${name}, but where does not use :${name}. Remove it or use it in where.`,
                entry.key.start,
                entry.end,
            );
        }
    }
    return expression;
}

/**
 * Turns a LIKE parameter into the SQL pattern: Next matches "contains", so plain text such as
 * `Ro%` becomes `%Ro%` with a warning; `_`, `[` or `%` inside the text fail (no SQL equivalent).
 *
 * @param {object} context parse context
 * @param {object} value AST value
 * @returns {object} AST value holding the SQL pattern
 */
function likePattern(context, value) {
    const parts = nextLikeInner(value.value);
    if (!parts) {
        fail(
            context,
            INVALID_FILTER_VALUE,
            nextLikeWildcardMessage(value.value),
            value.loc.start,
            value.loc.end,
        );
    }
    const { inner } = parts;
    if (parts.isContains) {
        return { ...value, kind: 'string' };
    }
    report(
        context,
        'warning',
        LIKE_MATCHES_ANYWHERE,
        `Next matches LIKE as "contains" and ignores wildcards, so "${value.value}" is converted as '%${inner}%'.`,
        value.loc.start,
        value.loc.end,
    );
    return { ...value, kind: 'string', value: `%${inner}%` };
}

/**
 * Reads the fields of a marketing object query from the block body (`{{Field}}` lines).
 *
 * @param {object} context parse context
 * @param {number} from offset after the opening block
 * @returns {'*'|{name: string, loc: object}[]} columns
 */
function bodyFields(context, from) {
    const close = context.text.indexOf('{{/each', from);
    const body = context.text.slice(from, close === -1 ? context.text.length : close);
    const columns = [];
    BODY_FIELD.lastIndex = 0;
    for (let match = BODY_FIELD.exec(body); match; match = BODY_FIELD.exec(body)) {
        if (match[1] === 'else' || match[1] === 'this') {
            continue;
        }
        const start = from + match.index + match[0].indexOf(match[1]);
        columns.push({ name: match[1], loc: makeLoc(context, start, start + match[1].length) });
    }
    return columns.length ? columns : '*';
}

/**
 * Reads the field after `(queryFirst …)` in `{{get (queryFirst …) "Field"}}`. With a field list
 * the field must be in it (case ignored): Next renders an unlisted field as empty (DB
 * `mcn-handlebars-email-query.json#checklist[30]`).
 *
 * @param {object} context parse context
 * @param {number} from offset after the closing ")"
 * @param {'*'|{name: string}[]} listed fields of the call (`*` when it has no list)
 * @returns {{name: string, loc: object}} column
 */
function getField(context, from, listed) {
    let index = from;
    while (/\s/.test(context.text[index] ?? '')) {
        index++;
    }
    const token = readToken(context, index);
    if (token.type !== 'string' || !token.value.trim()) {
        fail(
            context,
            INVALID_ARGUMENT,
            'Write the field to read after the call: {{get (queryFirst …) "Field"}}.',
            token.start,
            token.end,
        );
    }
    const name = token.value.toLowerCase();
    if (Array.isArray(listed) && listed.every((column) => column.name.toLowerCase() !== name)) {
        fail(
            context,
            INVALID_ARGUMENT,
            `"${token.value}" is not in the fields of the call, so Next renders it empty. Add it to fields="…" or read a listed field.`,
            token.start,
            token.end,
        );
    }
    return { name: token.value, loc: makeLoc(context, token.start, token.end) };
}

/**
 * Reads the parameters of a CRM call into the parts of the AST.
 *
 * @param {object} context parse context
 * @param {Map} hash parameters
 * @param {{isFirst: boolean, callStart: number}} call call details
 * @returns {{columns: object[], where: object|null, orderBy: object[], top: number|null}} parts
 */
function readCrm(context, hash, call) {
    for (const [key, entry] of hash) {
        if (!CRM_KEYS.has(key)) {
            fail(
                context,
                INVALID_ARGUMENT,
                `${key} is not a parameter of a Sales Cloud query. Use fields, where, params, sortBy and limit.`,
                entry.key.start,
                entry.end,
            );
        }
    }
    const fields = requireString(
        context,
        hash,
        'fields',
        'fields="LastName,FirstName"',
        call.callStart,
    );
    const columns = readFields(context, fields);
    let where = null;
    const params = hash.get('params');
    if (hash.has('where')) {
        const token = requireString(
            context,
            hash,
            'where',
            'where="LastName = :p1"',
            call.callStart,
        );
        if (params && !(params.value instanceof Map)) {
            fail(
                context,
                INVALID_FILTER,
                'params must be (hash p1=… p2=…) with a value for every placeholder.',
                params.key.start,
                params.end,
            );
        }
        where = parseWhere(context, token, params?.value ?? new Map());
    } else if (params) {
        fail(
            context,
            INVALID_FILTER,
            'params is given without where. Add where="Field = :p1" or remove params.',
            params.key.start,
            params.end,
        );
    }
    let orderBy = [];
    if (hash.has('sortBy')) {
        const sortBy = requireString(
            context,
            hash,
            'sortBy',
            'sortBy="LastName ASC"',
            call.callStart,
        );
        orderBy = parseOrderString(context, sortBy);
        if (orderBy.length > 1) {
            fail(
                context,
                INVALID_ORDER_BY,
                'Next sorts by one field only (sortBy="Field ASC"). Keep one field, or sort the rows in your code.',
                sortBy.start,
                sortBy.end,
            );
        }
    }
    let top = call.isFirst ? 1 : null;
    const limit = hash.get('limit');
    if (limit) {
        if (call.isFirst) {
            fail(
                context,
                INVALID_ARGUMENT,
                'queryFirst returns one record; remove limit.',
                limit.key.start,
                limit.end,
            );
        }
        if (limit.value instanceof Map || !/^[1-9]\d*$/.test(limit.value.value)) {
            fail(
                context,
                INVALID_COUNT,
                'limit must be a whole number of records, e.g. limit=10.',
                limit.key.start,
                limit.end,
            );
        }
        top = Number(limit.value.value);
    }
    return { columns, where, orderBy, top };
}

/**
 * Reads the parameters of a marketing object call: inline filters `Field=value` (AND) and an
 * optional `limit` (not on queryFirst).
 *
 * @param {object} context parse context
 * @param {Map} hash parameters
 * @param {{isFirst: boolean, start: number}} call call details
 * @returns {{where: object, top: number|null}} WHERE expression and row limit
 */
function readMoFilter(context, hash, call) {
    const conditions = [];
    let top = call.isFirst ? 1 : null;
    for (const [key, entry] of hash) {
        if (key === 'type' || key === 'object') {
            continue;
        }
        if (key === 'limit' && !call.isFirst) {
            if (entry.value instanceof Map || !/^[1-9]\d*$/.test(entry.value.value)) {
                fail(
                    context,
                    INVALID_COUNT,
                    'limit must be a whole number of records, e.g. limit=10.',
                    entry.key.start,
                    entry.end,
                );
            }
            top = Number(entry.value.value);
            continue;
        }
        if (MO_FORBIDDEN.has(key)) {
            fail(
                context,
                INVALID_ARGUMENT,
                `${key} is not supported on a marketing object in Next. Filter with inline conditions, e.g. Key__c="value".`,
                entry.key.start,
                entry.end,
            );
        }
        conditions.push({
            type: 'compare',
            op: '=',
            column: entry.key.value,
            value: paramValue(context, entry),
            loc: makeLoc(context, entry.key.start, entry.end),
        });
    }
    if (conditions.length === 0) {
        fail(
            context,
            INVALID_FILTER,
            'A marketing object query needs at least one inline filter, e.g. Key__c="value"; Next fails without one.',
            call.start,
            call.start,
        );
    }
    let where = conditions[0];
    for (const condition of conditions.slice(1)) {
        where = {
            type: 'and',
            left: where,
            right: condition,
            loc: makeLoc(context, where.loc.start, condition.loc.end),
        };
    }
    return { where, top };
}

/**
 * Finds the query / queryFirst calls.
 *
 * @param {string} text source text
 * @returns {{start: number, nameEnd: number, isFirst: boolean, isInBrackets: boolean}[]} calls
 */
function findCalls(text) {
    const calls = [];
    CALL_PATTERN.lastIndex = 0;
    for (let match = CALL_PATTERN.exec(text); match; match = CALL_PATTERN.exec(text)) {
        const nameStart = match.index + match[0].length - match[2].length;
        calls.push({
            start: match[1] === '(' ? match.index : nameStart,
            nameStart,
            nameEnd: nameStart + match[2].length,
            isFirst: match[2] === 'queryFirst',
            isInBrackets: match[1] === '(',
        });
    }
    return calls;
}

/**
 * Parses the first call and builds the AST.
 *
 * @param {object} context parse context
 * @param {object} meta meta data (mutated)
 * @returns {object} SELECT AST
 */
function parseProgram(context, meta) {
    const calls = findCalls(context.text);
    if (calls.length === 0) {
        fail(
            context,
            NO_LOOKUP_FOUND,
            'No Handlebars query was found. Paste a {{#each (query …)}} or {{get (queryFirst …) "Field"}} call.',
            0,
            context.text.length,
        );
    }
    const [call] = calls;
    if (calls.length > 1) {
        report(
            context,
            'warning',
            MULTIPLE_LOOKUPS,
            'The code contains more than one query; only the first one is converted.',
            calls[1].nameStart,
            calls[1].nameEnd,
        );
    }
    const { tokens, end } = tokenizeCall(context, call.nameEnd, call.isInBrackets);
    const hash = readHash(context, tokens, 0, tokens.length);
    const callLoc = makeLoc(context, call.start, end);
    const type = requireString(context, hash, 'type', 'type="CRM"', call.start);
    const dataSource = type.value.toUpperCase();
    if (dataSource !== 'CRM' && dataSource !== 'MO') {
        fail(
            context,
            INVALID_ARGUMENT,
            'type must be "CRM" (Sales Cloud object) or "MO" (marketing object).',
            type.start,
            type.end,
        );
    }
    const object = requireString(context, hash, 'object', 'object="Contact"', call.start);
    const isGet =
        call.isFirst && call.isInBrackets && GET_BEFORE.test(context.text.slice(0, call.start + 1));
    meta.dataSource = dataSource;
    meta.deName = object.value;
    let parts;
    if (dataSource === 'CRM') {
        meta.target = call.isFirst ? 'handlebars-queryfirst' : 'handlebars-query';
        parts = readCrm(context, hash, { isFirst: call.isFirst, callStart: call.start });
    } else {
        meta.target = 'handlebars-query-mo';
        parts = {
            columns: call.isFirst ? '*' : bodyFields(context, end),
            ...readMoFilter(context, hash, call),
            orderBy: [],
        };
    }
    if (isGet) {
        parts.columns = [getField(context, end, parts.columns)];
    }
    if (call.isFirst) {
        report(
            context,
            'info',
            LOOKUP_FIRST_ROW_ONLY,
            'queryFirst returns the first matching record only, which TOP 1 stands for in SQL.',
            call.nameStart,
            call.nameEnd,
        );
    }
    return {
        type: 'select',
        top: parts.top,
        columns: parts.columns,
        from: { name: object.value, loc: makeLoc(context, object.start, object.end) },
        where: parts.where,
        orderBy: parts.orderBy,
        loc: callLoc,
    };
}

/**
 * Reads a Marketing Cloud Next Handlebars query back into the SQL AST. Never throws.
 *
 * @param {string} text Handlebars code
 * @returns {{ast: object|null, messages: import('./messages.js').Message[], meta: {target: string|null, dataSource?: 'CRM'|'MO', deName?: string}}} AST (null on error), messages and meta data
 */
export function parseHandlebars(text) {
    const source = typeof text === 'string' ? text : '';
    const context = createContext(source);
    const meta = { target: null };
    const ast = runParser(context, () => {
        if (!source.trim()) {
            context.tokens.push({ type: 'eof' });
            rejectEmpty(context);
        }
        return parseProgram(context, meta);
    });
    return { ast, messages: context.messages, meta };
}
