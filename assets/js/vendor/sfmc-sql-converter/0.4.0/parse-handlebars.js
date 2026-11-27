/**
 * Reads Marketing Cloud Next Handlebars `query` / `queryFirst` calls back into the SQL AST of
 * `parseSql`: `{{#each (query type="CRM" object="X" fields="A,B" where="A = :p1"
 * params=(hash p1="v") sortBy="A ASC" limit=5)}}`, `{{get (queryFirst …) "A"}}` and the
 * marketing object form `(query type="MO" object="X" Key__c="v")`, plus the data graph loop
 * `{{#each (slice (sort (get (get @root "$dataGraph") "Dmo__dlm") "A" "asc" "string") 0 5)}}` with
 * an optional `{{#if (and (compare A "==" "v") …)}}` row check.
 *
 * Only deterministic input converts: every value in `where` must be a `:name` placeholder that
 * `params` defines exactly once (Next fails on literals in `where`). The code is read as text;
 * it is never executed. Never throws.
 */

import { nextLikeInner, nextLikeWildcardMessage } from './clauses.js';
import {
    ARGUMENT_COUNT,
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
const DATA_GRAPH = /["']\$dataGraph["']/;
// compare operators of the data graph output → SQL
const GRAPH_OPERATORS = { '==': '=', '!=': '<>', '<': '<', '<=': '<=', '>': '>', '>=': '>=' };

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

// ------------------------------------------------------------------------------------------
// $dataGraph: {{#each (slice (sort (get (get @root "$dataGraph") "Dmo__dlm") "F" "asc" "string")
// 0 N)}} {{#if (and (compare F "==" "v") …)}} {{F}} {{/if}} {{/each}}
// ------------------------------------------------------------------------------------------

/**
 * Groups the tokens of an expression into sub-expressions: `( … )` becomes a list node and
 * `@root` one identifier.
 *
 * @param {object} context parse context
 * @param {HbToken[]} tokens tokens
 * @param {number} from offset where the expression starts (for an empty one)
 * @returns {object} the single expression
 */
function readExpression(context, tokens, from) {
    let index = 0;
    const readItem = () => {
        const token = tokens[index++];
        if (token.type === 'punct' && token.value === '(') {
            const items = [];
            while (
                index < tokens.length &&
                !(tokens[index].type === 'punct' && tokens[index].value === ')')
            ) {
                items.push(readItem());
            }
            if (index >= tokens.length) {
                fail(
                    context,
                    MISSING_CLOSING_PAREN,
                    'This bracket is never closed. Add a closing bracket ).',
                    token.start,
                    token.end,
                );
            }
            const close = tokens[index++];
            return { type: 'list', items, start: token.start, end: close.end };
        }
        const next = tokens[index];
        if (token.value === '@' && next?.type === 'ident' && next.start === token.end) {
            index++;
            return { type: 'ident', value: `@${next.value}`, start: token.start, end: next.end };
        }
        if (token.type === 'punct') {
            fail(context, SYNTAX_ERROR, `Unexpected "${token.value}".`, token.start, token.end);
        }
        return token;
    };
    if (tokens.length === 0) {
        fail(context, SYNTAX_ERROR, 'The block has no expression.', from, from);
    }
    const expression = readItem();
    if (index < tokens.length) {
        fail(
            context,
            SYNTAX_ERROR,
            `Unexpected "${tokens[index].value}" after the expression.`,
            tokens[index].start,
            tokens[index].end,
        );
    }
    return expression;
}

/**
 * Checks whether a node is the sub-expression `(name …)`.
 *
 * @param {object} node expression node
 * @param {string} name helper name
 * @returns {boolean} true when it is
 */
function isCall(node, name) {
    return node.type === 'list' && node.items[0]?.type === 'ident' && node.items[0].value === name;
}

/**
 * Fails unless a sub-expression has the given number of parts (helper name included).
 *
 * @param {object} context parse context
 * @param {object} node list node
 * @param {number} count expected number of parts
 * @param {string} hint the form to write
 */
function requireParts(context, node, count, hint) {
    if (node.items.length !== count) {
        fail(context, ARGUMENT_COUNT, `Write this as ${hint}.`, node.start, node.end);
    }
}

/**
 * Returns a string argument or fails.
 *
 * @param {object} context parse context
 * @param {object} node argument
 * @param {string} hint what it must be
 * @returns {HbToken} string token
 */
function requireStringArgument(context, node, hint) {
    if (node.type !== 'string' || !node.value.trim()) {
        fail(context, INVALID_ARGUMENT, `Expected ${hint} in double quotes.`, node.start, node.end);
    }
    return node;
}

/**
 * Reads the loop source: optional `slice … 0 N`, optional `sort … "F" "asc"|"desc" "string"`
 * and `(get (get @root "$dataGraph") "Dmo__dlm")`.
 *
 * @param {object} context parse context
 * @param {object} node expression after #each
 * @returns {{from: HbToken, orderBy: object[], top: number|null, slice: object|null}} parts
 */
function readGraphSource(context, node) {
    let current = node;
    let top = null;
    let slice = null;
    if (isCall(current, 'slice')) {
        requireParts(context, current, 4, '(slice (…) 0 10)');
        const [, inner, first, count] = current.items;
        if (first.type !== 'number' || first.value !== '0') {
            fail(
                context,
                INVALID_COUNT,
                'slice must start at 0 to stand for TOP: (slice (…) 0 10).',
                first.start,
                first.end,
            );
        }
        if (count.type !== 'number' || !/^[1-9]\d*$/.test(count.value)) {
            fail(
                context,
                INVALID_COUNT,
                'The end of slice must be a whole number of rows, e.g. 10.',
                count.start,
                count.end,
            );
        }
        top = Number(count.value);
        slice = current;
        current = inner;
    }
    const orderBy = [];
    if (isCall(current, 'sort')) {
        requireParts(context, current, 5, '(sort (…) "Field" "asc" "string")');
        const [, inner, field, direction, sortType] = current.items;
        const column = requireStringArgument(context, field, 'the field to sort by');
        const order = requireStringArgument(context, direction, '"asc" or "desc"');
        if (!['asc', 'desc'].includes(order.value.toLowerCase())) {
            fail(
                context,
                INVALID_ORDER_BY,
                'The sort direction must be "asc" or "desc".',
                order.start,
                order.end,
            );
        }
        if (sortType.type !== 'string' || sortType.value !== 'string') {
            fail(
                context,
                INVALID_ORDER_BY,
                'Only sort by "string" was tested on a data graph; write "string" as the last argument.',
                sortType.start,
                sortType.end,
            );
        }
        orderBy.push({
            column: column.value,
            direction: order.value.toUpperCase(),
            loc: makeLoc(context, column.start, order.end),
        });
        current = inner;
    }
    const graphHint = '(get (get @root "$dataGraph") "Dmo__dlm")';
    const isGraph =
        isCall(current, 'get') &&
        current.items.length === 3 &&
        isCall(current.items[1], 'get') &&
        current.items[1].items.length === 3 &&
        current.items[1].items[1].value === '@root' &&
        current.items[1].items[2].type === 'string' &&
        current.items[1].items[2].value === '$dataGraph';
    if (!isGraph) {
        fail(
            context,
            INVALID_ARGUMENT,
            `Expected a DMO of the bound data graph: ${graphHint}.`,
            current.start,
            current.end,
        );
    }
    const from = requireStringArgument(context, current.items[2], 'the DMO name');
    return { from, orderBy, top, slice };
}

/**
 * Reads a row check: `(compare F "op" value)`, `(and …)` and `(or …)` with two or more
 * operands.
 *
 * @param {object} context parse context
 * @param {object} node expression
 * @returns {object} WHERE expression
 */
function readGraphCondition(context, node) {
    if (isCall(node, 'and') || isCall(node, 'or')) {
        const type = node.items[0].value;
        if (node.items.length < 3) {
            fail(
                context,
                ARGUMENT_COUNT,
                `${type} needs at least two conditions.`,
                node.start,
                node.end,
            );
        }
        return node.items
            .slice(1)
            .map((item) => readGraphCondition(context, item))
            .reduce((left, right) => ({
                type,
                left,
                right,
                loc: makeLoc(context, left.loc.start, right.loc.end),
            }));
    }
    if (!isCall(node, 'compare')) {
        fail(
            context,
            INVALID_FILTER,
            'Only (compare Field "op" value), (and …) and (or …) read back as a WHERE.',
            node.start,
            node.end,
        );
    }
    requireParts(context, node, 4, '(compare Field "==" "value")');
    const [, field, operator, value] = node.items;
    if (field.type !== 'ident' || !/^[A-Za-z]\w*$/.test(field.value)) {
        fail(
            context,
            INVALID_FILTER,
            'The first argument of compare must be a field name, e.g. (compare LastName "==" "x").',
            field.start,
            field.end,
        );
    }
    if (operator.type !== 'string' || !Object.hasOwn(GRAPH_OPERATORS, operator.value)) {
        fail(
            context,
            UNKNOWN_FILTER_OPERATOR,
            'The operator must be "==", "!=", "<", "<=", ">" or ">=" in double quotes.',
            operator.start,
            operator.end,
        );
    }
    if (value.type !== 'string' && value.type !== 'number') {
        fail(
            context,
            INVALID_FILTER_VALUE,
            'The value must be text in double quotes or a number.',
            value.start,
            value.end,
        );
    }
    return {
        type: 'compare',
        op: GRAPH_OPERATORS[operator.value],
        column: field.value,
        value: {
            kind: value.type,
            value: value.value,
            loc: makeLoc(context, value.start, value.end),
        },
        loc: makeLoc(context, node.start, node.end),
    };
}

/**
 * Reads the `{{Field}}` reads of the loop body; any other tag fails.
 *
 * @param {object} context parse context
 * @param {number} from start offset
 * @param {number} to end offset
 * @returns {{name: string, loc: object}[]} columns
 */
function graphFields(context, from, to) {
    const columns = [];
    const tag = /\{\{[\s\S]*?\}\}/g;
    const body = context.text.slice(from, to);
    for (let match = tag.exec(body); match; match = tag.exec(body)) {
        const start = from + match.index;
        const field = /^\{\{\s*([A-Za-z]\w*)\s*\}\}$/.exec(match[0]);
        if (!field || field[1] === 'else' || field[1] === 'this') {
            fail(
                context,
                SYNTAX_ERROR,
                'Inside the loop only plain field reads such as {{LastName}} read back as columns.',
                start,
                start + match[0].length,
            );
        }
        const nameStart = start + match[0].indexOf(field[1]);
        columns.push({
            name: field[1],
            loc: makeLoc(context, nameStart, nameStart + field[1].length),
        });
    }
    if (columns.length === 0) {
        fail(
            context,
            SYNTAX_ERROR,
            'The loop reads no field. Add the fields to show, e.g. {{LastName}}.',
            from,
            to,
        );
    }
    return columns;
}

/**
 * Finds a closing tag or fails.
 *
 * @param {object} context parse context
 * @param {RegExp} pattern closing tag pattern (global)
 * @param {number} from offset to search from
 * @param {{start: number, end: number, name: string}} opener the open tag
 * @returns {{start: number, end: number}} the closing tag
 */
function closingTag(context, pattern, from, opener) {
    pattern.lastIndex = from;
    const match = pattern.exec(context.text);
    if (!match) {
        fail(
            context,
            MISSING_CLOSING_PAREN,
            `This {{#${opener.name}}} block is never closed. Add {{/${opener.name}}}.`,
            opener.start,
            opener.end,
        );
    }
    return { start: match.index, end: match.index + match[0].length };
}

/**
 * Reads the `$dataGraph` loop the data graph output writes.
 *
 * @param {object} context parse context
 * @param {object} meta meta data (mutated)
 * @returns {object} SELECT AST
 */
function parseDataGraph(context, meta) {
    const { text } = context;
    const each = /\{\{#each(?=\s)/.exec(text);
    if (!each) {
        fail(
            context,
            NO_LOOKUP_FOUND,
            'No data graph loop was found. Paste a {{#each (get (get @root "$dataGraph") "Dmo__dlm")}} block.',
            0,
            text.length,
        );
    }
    const eachEnd = each.index + each[0].length;
    const head = tokenizeCall(context, eachEnd, false);
    const source = readGraphSource(context, readExpression(context, head.tokens, eachEnd));
    const close = closingTag(context, /\{\{\/each\s*\}\}/g, head.end, {
        name: 'each',
        start: each.index,
        end: head.end,
    });
    const ifTag = /^\s*\{\{#if(?=\s)/.exec(text.slice(head.end, close.start));
    let where = null;
    let columns;
    if (ifTag) {
        const ifStart = head.end + ifTag[0].indexOf('{{');
        const ifNameEnd = head.end + ifTag[0].length;
        const condition = tokenizeCall(context, ifNameEnd, false);
        if (source.slice) {
            fail(
                context,
                INVALID_COUNT,
                'slice cuts the rows before the {{#if}} check runs, so the loop has no SQL equivalent (SQL applies TOP after WHERE). Remove slice or the check.',
                source.slice.start,
                source.slice.end,
            );
        }
        where = readGraphCondition(context, readExpression(context, condition.tokens, ifNameEnd));
        const endIf = closingTag(context, /\{\{\/if\s*\}\}/g, condition.end, {
            name: 'if',
            start: ifStart,
            end: condition.end,
        });
        if (endIf.start > close.start || text.slice(endIf.end, close.start).trim()) {
            fail(
                context,
                SYNTAX_ERROR,
                'Write the {{#if}} block as the whole loop body: {{#each …}} {{#if …}} fields {{/if}} {{/each}}.',
                ifStart,
                condition.end,
            );
        }
        columns = graphFields(context, condition.end, endIf.start);
    } else {
        columns = graphFields(context, head.end, close.start);
    }
    meta.target = 'handlebars-datagraph';
    meta.dataSource = 'DG';
    meta.deName = source.from.value;
    return {
        type: 'select',
        top: source.top,
        columns,
        from: {
            name: source.from.value,
            loc: makeLoc(context, source.from.start, source.from.end),
        },
        where,
        orderBy: source.orderBy,
        loc: makeLoc(context, each.index, close.end),
    };
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
    if (calls.length === 0 && DATA_GRAPH.test(context.text)) {
        return parseDataGraph(context, meta);
    }
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
 * @returns {{ast: object|null, messages: import('./messages.js').Message[], meta: {target: string|null, dataSource?: 'CRM'|'MO'|'DG', deName?: string}}} AST (null on error), messages and meta data
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
