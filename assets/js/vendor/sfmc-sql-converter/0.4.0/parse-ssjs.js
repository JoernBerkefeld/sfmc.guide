/**
 * Reads Engagement SSJS data extension lookups back into the SQL AST of `parseSql`:
 * WSProxy `retrieve("DataExtensionObject[Key]", …)`, `DataExtension.Init(…).Rows.Retrieve(…)`,
 * `Platform.Function.LookupRows(…)` / `LookupOrderedRows(…)` and bare filter objects.
 *
 * The code is read as text with a small literal parser; it is never executed. Never throws.
 */

import { likeFilterValue } from './clauses.js';
import { SYNTAX_ERROR } from './messages.js';
import {
    ARGUMENT_COUNT,
    FROM_NAME_FROM_KEY,
    FROM_UNKNOWN,
    INVALID_ARGUMENT,
    INVALID_COUNT,
    INVALID_FILTER,
    INVALID_FILTER_VALUE,
    INVALID_LOGICAL_OPERATOR,
    INVALID_OBJECT_TYPE,
    INVALID_ORDER_BY,
    LIKE_MATCHES_ANYWHERE,
    MULTIPLE_LOOKUPS,
    NO_LOOKUP_FOUND,
    UNKNOWN_FILTER_OPERATOR,
    UNSUPPORTED_EXPRESSION,
    UNSUPPORTED_FILTER_OPERATOR,
    VARIABLE_VALUE,
} from './messages.js';
import {
    andChain,
    createContext,
    expressionEnd,
    fail,
    failUnclosedCall,
    findScriptRegions,
    isIdent,
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
 * @typedef {object} Literal
 * @property {'object'|'array'|'string'|'number'|'boolean'|'null'|'ref'} kind literal kind
 * @property {number} start 0-based start offset
 * @property {number} end 0-based exclusive end offset
 * @property {string} [value] string value, number text, boolean text or variable name
 * @property {{key: string, value: Literal}[]} [entries] object entries
 * @property {Literal[]} [items] array items
 */

/**
 * @typedef {object} VariableEntry
 * @property {number} start offset of the assignment
 * @property {'literal'|'deInit'|'other'} kind what the variable is set to
 * @property {Literal} [node] the literal (kind literal) or the Init argument (kind deInit)
 */

const COMPARE_OPERATORS = new Map(
    Object.entries({
        equals: '=',
        notequals: '<>',
        greaterthan: '>',
        greaterthanorequal: '>=',
        lessthan: '<',
        lessthanorequal: '<=',
    }),
);

const REJECTED_OPERATORS = new Map(
    Object.entries({
        existsinstring: "use like with '%value%'",
        existsinstringasaword: "use like with '%value%'",
        notexistsinstring: 'filter the rows in your code',
        beginswith: "use like with 'value%'",
        endswith: "use like with '%value'",
        contains: "use like with '%value%'",
        notcontains: 'filter the rows in your code',
        isanniversary: 'filter the rows in your code',
        isnotanniversary: 'filter the rows in your code',
        greaterthananniversary: 'filter the rows in your code',
        lessthananniversary: 'filter the rows in your code',
    }),
);

const LOGICAL_KEYS = ['leftoperand', 'logicaloperator', 'rightoperand'];
const VALUE_END = new Set([',', ')', ']', '}', ';', ':']);
const MAX_VARIABLE_DEPTH = 32;

// ------------------------------------------------------------------------------------------
// Literal parser
// ------------------------------------------------------------------------------------------

/**
 * Fails with UNSUPPORTED_EXPRESSION for the expression starting at a token index.
 *
 * @param {object} context parse context
 * @param {number} index token index of the expression start
 * @param {string} detail what kind of expression it is
 * @returns {never} always throws ParseStop
 */
function failExpression(context, index, detail) {
    const start = tokenAt(context, index).start;
    fail(
        context,
        UNSUPPORTED_EXPRESSION,
        `${detail} can't be converted. Only fixed values (text in quotes, numbers, arrays and filter objects) and variables set to them can be read; replace it with the value itself.`,
        start,
        Math.max(expressionEnd(context, index), start + 1),
    );
}

/**
 * Parses an object literal starting at "{".
 *
 * @param {object} context parse context
 * @returns {Literal} object literal
 */
function parseObject(context) {
    const open = tokenAt(context, context.pos++);
    const entries = [];
    for (;;) {
        const token = tokenAt(context, context.pos);
        if (isPunct(token, '}')) {
            context.pos++;
            return { kind: 'object', entries, start: open.start, end: token.end };
        }
        if (token.type !== 'ident' && token.type !== 'string' && token.type !== 'number') {
            if (token.type === 'eof') {
                fail(
                    context,
                    SYNTAX_ERROR,
                    'This object is never closed. Add a closing brace }.',
                    open.start,
                    open.end,
                );
            }
            fail(
                context,
                SYNTAX_ERROR,
                'Expected a property name such as Property, SimpleOperator or Value here.',
                token.start,
                token.end,
            );
        }
        context.pos++;
        if (!isPunct(tokenAt(context, context.pos), ':')) {
            const colon = tokenAt(context, context.pos);
            fail(
                context,
                SYNTAX_ERROR,
                `Expected ":" after the property name ${token.value}.`,
                colon.start,
                colon.end,
            );
        }
        context.pos++;
        entries.push({ key: token.value, value: parseLiteral(context) });
        const separator = tokenAt(context, context.pos);
        if (isPunct(separator, ',')) {
            context.pos++;
        } else if (!isPunct(separator, '}')) {
            fail(
                context,
                SYNTAX_ERROR,
                'Separate the properties of an object with commas and close it with }.',
                separator.start,
                separator.end,
            );
        }
    }
}

/**
 * Parses an array literal starting at "[".
 *
 * @param {object} context parse context
 * @returns {Literal} array literal
 */
function parseArray(context) {
    const open = tokenAt(context, context.pos++);
    const items = [];
    for (;;) {
        const token = tokenAt(context, context.pos);
        if (isPunct(token, ']')) {
            context.pos++;
            return { kind: 'array', items, start: open.start, end: token.end };
        }
        if (token.type === 'eof') {
            fail(
                context,
                SYNTAX_ERROR,
                'This array is never closed. Add a closing bracket ].',
                open.start,
                open.end,
            );
        }
        items.push(parseLiteral(context));
        const separator = tokenAt(context, context.pos);
        if (isPunct(separator, ',')) {
            context.pos++;
        } else if (!isPunct(separator, ']')) {
            fail(
                context,
                SYNTAX_ERROR,
                'Separate the array items with commas and close the array with ].',
                separator.start,
                separator.end,
            );
        }
    }
}

/**
 * Parses one literal value (object, array, string, number, boolean, null or a variable name),
 * rejecting calls, operators and other expressions.
 *
 * @param {object} context parse context
 * @returns {Literal} literal
 */
function parseLiteral(context) {
    const startIndex = context.pos;
    const token = tokenAt(context, startIndex);
    let node;
    if (isPunct(token, '{')) {
        node = parseObject(context);
    } else if (isPunct(token, '[')) {
        node = parseArray(context);
    } else if (token.type === 'string') {
        context.pos++;
        node = { kind: 'string', value: token.value, start: token.start, end: token.end };
    } else if (token.type === 'number') {
        context.pos++;
        node = { kind: 'number', value: token.value, start: token.start, end: token.end };
    } else if (isPunct(token, '-') && tokenAt(context, startIndex + 1).type === 'number') {
        const number = tokenAt(context, startIndex + 1);
        context.pos += 2;
        node = { kind: 'number', value: `-${number.value}`, start: token.start, end: number.end };
    } else if (token.type === 'ident') {
        node = parseWord(context, token);
    } else if (token.type === 'eof') {
        return fail(
            context,
            SYNTAX_ERROR,
            'The code ends where a value is expected.',
            token.start,
            token.end,
        );
    } else {
        return fail(
            context,
            SYNTAX_ERROR,
            `Expected a value but found "${token.value}". Write text in quotes, a number, an array or a filter object.`,
            token.start,
            token.end,
        );
    }
    const next = tokenAt(context, context.pos);
    if (next.type === 'punct' && !VALUE_END.has(next.value)) {
        failExpression(context, startIndex, 'This calculated value');
    }
    return node;
}

/**
 * Parses a bare word: true / false / null / undefined or a variable reference.
 *
 * @param {object} context parse context
 * @param {object} token the identifier token
 * @returns {Literal} literal
 */
function parseWord(context, token) {
    const following = tokenAt(context, context.pos + 1);
    if (token.value === 'new') {
        failExpression(context, context.pos, `"new ${following.value ?? ''}"`.trim());
    }
    if (isPunct(following, '(') || isPunct(following, '.')) {
        failExpression(
            context,
            context.pos,
            `The function call or property access starting with ${token.value}`,
        );
    }
    context.pos++;
    if (token.value === 'true' || token.value === 'false') {
        return { kind: 'boolean', value: token.value, start: token.start, end: token.end };
    }
    if (token.value === 'null' || token.value === 'undefined') {
        return { kind: 'null', value: token.value, start: token.start, end: token.end };
    }
    return { kind: 'ref', value: token.value, start: token.start, end: token.end };
}

/**
 * Parses an argument list starting at "(".
 *
 * @param {object} context parse context
 * @returns {{args: Literal[], end: number}} arguments and the end offset of ")"
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
        args.push(parseLiteral(context));
        const separator = tokenAt(context, context.pos);
        if (isPunct(separator, ',')) {
            context.pos++;
        } else if (separator.type === 'eof') {
            failUnclosedCall(context, open);
        } else if (!isPunct(separator, ')')) {
            fail(
                context,
                SYNTAX_ERROR,
                'Separate the arguments with commas and close the call with ).',
                separator.start,
                separator.end,
            );
        }
    }
}

/**
 * Tries to parse a literal at a token index without recording messages.
 *
 * @param {object} context parse context
 * @param {number} index token index
 * @returns {Literal|null} literal or null
 */
function tryLiteral(context, index) {
    const saved = { pos: context.pos, count: context.messages.length };
    context.pos = index;
    try {
        return parseLiteral(context);
    } catch {
        return null;
    } finally {
        context.pos = saved.pos;
        context.messages.length = saved.count;
    }
}

// ------------------------------------------------------------------------------------------
// Variables
// ------------------------------------------------------------------------------------------

/**
 * Checks whether the tokens at an index are `DataExtension.Init(`.
 *
 * @param {object} context parse context
 * @param {number} index token index
 * @returns {boolean} true when they are
 */
function isDataExtensionInit(context, index) {
    return (
        isIdent(tokenAt(context, index), 'DataExtension') &&
        isPunct(tokenAt(context, index + 1), '.') &&
        isIdent(tokenAt(context, index + 2), 'Init') &&
        isPunct(tokenAt(context, index + 3), '(')
    );
}

/**
 * Collects every `name = …` assignment: literals, `DataExtension.Init(…)` and anything else.
 *
 * @param {object} context parse context
 * @returns {Map<string, VariableEntry[]>} assignments per variable name in source order
 */
function collectVariables(context) {
    const variables = new Map();
    const { tokens } = context;
    for (let index = 0; index < tokens.length - 1; index++) {
        const token = tokens[index];
        if (token.type !== 'ident' || !isPunct(tokens[index + 1], '=')) {
            continue;
        }
        if (index > 0 && isPunct(tokens[index - 1], '.')) {
            continue;
        }
        let entry = { start: token.start, kind: 'other' };
        if (isDataExtensionInit(context, index + 2)) {
            const argument = tryLiteral(context, index + 6);
            if (
                argument &&
                isPunct(tokenAt(context, index + 6 + countTokens(context, argument)), ')')
            ) {
                entry = { start: token.start, kind: 'deInit', node: argument };
            }
        } else {
            const node = tryLiteral(context, index + 2);
            if (node) {
                entry = { start: token.start, kind: 'literal', node };
            }
        }
        if (!variables.has(token.value)) {
            variables.set(token.value, []);
        }
        variables.get(token.value).push(entry);
    }
    return variables;
}

/**
 * Counts the tokens a literal spans.
 *
 * @param {object} context parse context
 * @param {Literal} node literal
 * @returns {number} number of tokens
 */
function countTokens(context, node) {
    return context.tokens.filter((token) => token.start >= node.start && token.end <= node.end)
        .length;
}

/**
 * Finds the last assignment of a variable before an offset.
 *
 * @param {Map<string, VariableEntry[]>} variables collected assignments
 * @param {string} name variable name
 * @param {number} offset offset of the use
 * @returns {VariableEntry|undefined} assignment
 */
function lookupVariable(variables, name, offset) {
    const entries = variables.get(name) ?? [];
    return entries.findLast((entry) => entry.start < offset);
}

/**
 * Replaces a variable reference by the literal it is set to.
 *
 * @param {object} state parser state
 * @param {Literal} node literal or reference
 * @returns {Literal} resolved literal (never a reference)
 */
function resolve(state, node) {
    let current = node;
    for (let depth = 0; current.kind === 'ref'; depth++) {
        const entry = lookupVariable(state.variables, current.value, current.start);
        if (!entry || entry.kind !== 'literal' || depth > MAX_VARIABLE_DEPTH) {
            fail(
                state.context,
                VARIABLE_VALUE,
                entry
                    ? `The variable ${current.value} is not set to a fixed value in this code, so its value can't be converted. Replace it with the value itself.`
                    : `The variable ${current.value} is not set anywhere before this point, so its value can't be converted. Replace it with the value itself or paste the line that sets it.`,
                node.start,
                node.end,
            );
        }
        current = entry.node;
    }
    return current;
}

// ------------------------------------------------------------------------------------------
// Filters
// ------------------------------------------------------------------------------------------

/**
 * Converts a scalar literal (string, number, boolean) into an AST Value.
 *
 * @param {object} state parser state
 * @param {Literal} node literal or reference
 * @param {string} column column name for messages
 * @returns {{kind: 'string'|'number', value: string, loc: object}} value
 */
function toValue(state, node, column) {
    const literal = resolve(state, node);
    if (literal.kind === 'string' || literal.kind === 'boolean') {
        return makeValue(state.context, literal.value, literal.start, literal.end);
    }
    if (literal.kind === 'number') {
        return makeValue(state.context, literal.value, literal.start, literal.end, true);
    }
    const hint =
        literal.kind === 'null'
            ? ` To find empty values use SimpleOperator "isNull" (SQL: ${column} IS NULL).`
            : ' Use a single text value or number.';
    return fail(
        state.context,
        INVALID_FILTER_VALUE,
        `This value can't be compared with ${column}.${hint}`,
        node.start,
        node.end,
    );
}

/**
 * Returns the object's entries keyed by lower-case property name.
 *
 * @param {Literal} object object literal
 * @returns {Map<string, Literal>} entries
 */
function entriesByKey(object) {
    const map = new Map();
    for (const entry of object.entries) {
        map.set(entry.key.toLowerCase(), entry.value);
    }
    return map;
}

/**
 * Converts a filter object (SimpleFilterPart / ComplexFilterPart) into an AST expression.
 *
 * @param {object} state parser state
 * @param {Literal} node literal or reference
 * @returns {object} expression node
 */
function toExpr(state, node) {
    const { context } = state;
    const object = resolve(state, node);
    if (object.kind !== 'object') {
        fail(
            context,
            INVALID_FILTER,
            'A filter must be an object such as {Property: "Name", SimpleOperator: "equals", Value: "x"} or {LeftOperand: …, LogicalOperator: "AND", RightOperand: …}.',
            node.start,
            node.end,
        );
    }
    const entries = entriesByKey(object);
    const loc = makeLoc(context, object.start, object.end);
    if (LOGICAL_KEYS.some((key) => entries.has(key))) {
        const missing = ['LeftOperand', 'LogicalOperator', 'RightOperand'].filter(
            (key) => !entries.has(key.toLowerCase()),
        );
        if (missing.length) {
            fail(
                context,
                INVALID_FILTER,
                `This combined filter has no ${missing.join(' and no ')}. Add it.`,
                object.start,
                object.end,
            );
        }
        const operatorNode = entries.get('logicaloperator');
        const operator = resolve(state, operatorNode);
        const type = operator.kind === 'string' ? operator.value.toLowerCase() : '';
        if (type !== 'and' && type !== 'or') {
            fail(
                context,
                INVALID_LOGICAL_OPERATOR,
                'LogicalOperator must be "AND" or "OR".',
                operatorNode.start,
                operatorNode.end,
            );
        }
        return {
            type,
            left: toExpr(state, entries.get('leftoperand')),
            right: toExpr(state, entries.get('rightoperand')),
            loc,
        };
    }
    if (!entries.has('property') || !entries.has('simpleoperator')) {
        fail(
            context,
            INVALID_FILTER,
            'This filter needs Property and SimpleOperator, e.g. {Property: "Name", SimpleOperator: "equals", Value: "x"}.',
            object.start,
            object.end,
        );
    }
    return toCondition(state, entries, loc);
}

/**
 * Converts a SimpleFilterPart into a condition node.
 *
 * @param {object} state parser state
 * @param {Map<string, Literal>} entries filter properties by lower-case key
 * @param {object} loc location of the filter object
 * @returns {object} condition node
 */
function toCondition(state, entries, loc) {
    const { context } = state;
    const propertyNode = entries.get('property');
    const property = resolve(state, propertyNode);
    if (property.kind !== 'string' || !property.value.trim()) {
        fail(
            context,
            INVALID_FILTER,
            'Property must be the column name in quotes.',
            propertyNode.start,
            propertyNode.end,
        );
    }
    const column = property.value;
    const operatorNode = entries.get('simpleoperator');
    const operatorLiteral = resolve(state, operatorNode);
    const operator = operatorLiteral.kind === 'string' ? operatorLiteral.value.toLowerCase() : '';
    if (operator === 'isnull' || operator === 'isnotnull') {
        return { type: 'null', negated: operator === 'isnotnull', column, loc };
    }
    if (REJECTED_OPERATORS.has(operator)) {
        fail(
            context,
            UNSUPPORTED_FILTER_OPERATOR,
            `The operator "${operatorLiteral.value}" is not accepted for data extension rows and has no SQL equivalent here; ${REJECTED_OPERATORS.get(operator)}.`,
            operatorNode.start,
            operatorNode.end,
        );
    }
    if (!COMPARE_OPERATORS.has(operator) && !['like', 'in', 'between'].includes(operator)) {
        fail(
            context,
            UNKNOWN_FILTER_OPERATOR,
            'Unknown SimpleOperator. Use equals, notEquals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, like, IN, between, isNull or isNotNull.',
            operatorNode.start,
            operatorNode.end,
        );
    }
    const valueNode = entries.get('value') ?? entries.get('datevalue');
    if (!valueNode) {
        fail(
            context,
            INVALID_FILTER_VALUE,
            `This filter on ${column} has no Value. Add Value: "…".`,
            loc.start,
            loc.end,
        );
    }
    if (operator === 'in' || operator === 'between') {
        return toListCondition(state, operator, column, valueNode, loc);
    }
    const value = resolve(state, valueNode);
    if (value.kind === 'array' || value.kind === 'object') {
        fail(
            context,
            INVALID_FILTER_VALUE,
            `"${operatorLiteral.value}" needs a single value, not a list.`,
            valueNode.start,
            valueNode.end,
        );
    }
    if (operator === 'like') {
        const raw = toValue(state, valueNode, column);
        const inner = raw.value.replace(/^%+/, '').replace(/%+$/, '');
        // the like filter always matches anywhere: it wraps its value in %…%
        const node = {
            type: 'like',
            column,
            pattern: { ...raw, kind: 'string', value: inner ? `%${inner}%` : '%' },
            loc,
        };
        state.likeFilters.set(node, raw.value);
        return node;
    }
    return {
        type: 'compare',
        op: COMPARE_OPERATORS.get(operator),
        column,
        value: spaceAsEmpty(toValue(state, valueNode, column)),
        loc,
    };
}

/**
 * Maps a filter Value of exactly one space back to '' (the emitters send `= ''` as `" "`,
 * because the filter rejects an empty Value).
 *
 * @param {{kind: string, value: string, loc: object}} value AST value
 * @returns {{kind: string, value: string, loc: object}} value
 */
function spaceAsEmpty(value) {
    return value.value === ' ' ? { ...value, kind: 'string', value: '' } : value;
}

/**
 * Converts an IN or between filter (array Value) into a condition node.
 *
 * @param {object} state parser state
 * @param {'in'|'between'} operator lower-case operator
 * @param {string} column column name
 * @param {Literal} valueNode the Value literal
 * @param {object} loc location of the filter object
 * @returns {object} in or between node
 */
function toListCondition(state, operator, column, valueNode, loc) {
    const list = resolve(state, valueNode);
    const isBetween = operator === 'between';
    if (list.kind !== 'array' || (isBetween ? list.items.length !== 2 : list.items.length === 0)) {
        fail(
            state.context,
            INVALID_FILTER_VALUE,
            isBetween
                ? 'between needs an array with exactly two values: [low, high].'
                : 'IN needs an array with at least one value, e.g. ["a", "b"].',
            valueNode.start,
            valueNode.end,
        );
    }
    const values = list.items.map((item) => toValue(state, item, column));
    if (isBetween) {
        return { type: 'between', column, low: values[0], high: values[1], loc };
    }
    return {
        type: 'in',
        negated: false,
        column,
        values: values.map((value) => spaceAsEmpty(value)),
        loc,
    };
}

/**
 * Returns the conditions of an AND tree in source order.
 *
 * @param {object} expression expression node
 * @returns {object[]} leaf conditions
 */
function andLeaves(expression) {
    return expression.type === 'and'
        ? [...andLeaves(expression.left), ...andLeaves(expression.right)]
        : [expression];
}

/**
 * Folds AND chains of `<>` on one column back into NOT IN (only used when the header marks
 * that the emitter produced them).
 *
 * @param {object|null} expression expression node
 * @returns {object|null} folded expression
 */
function foldNotIn(expression) {
    if (!expression || (expression.type !== 'and' && expression.type !== 'or')) {
        return expression;
    }
    if (expression.type === 'and') {
        const leaves = andLeaves(expression);
        const column = leaves[0].column?.toLowerCase();
        if (
            leaves.every(
                (leaf) =>
                    leaf.type === 'compare' &&
                    leaf.op === '<>' &&
                    leaf.column.toLowerCase() === column,
            )
        ) {
            return {
                type: 'in',
                negated: true,
                column: leaves[0].column,
                values: leaves.map((leaf) => leaf.value),
                loc: expression.loc,
            };
        }
    }
    return { ...expression, left: foldNotIn(expression.left), right: foldNotIn(expression.right) };
}

/**
 * Reads every `sqlLike(row["Col"], "pattern")` call of the code (the exact LIKE check the
 * emitters add after a wider `like` filter).
 *
 * @param {object} context parse context
 * @returns {{column: string, pattern: string}[]} checks in source order
 */
function findLikeChecks(context) {
    const checks = [];
    const { tokens } = context;
    for (let index = 0; index < tokens.length; index++) {
        const at = (offset) => tokenAt(context, index + offset);
        if (
            isIdent(tokens[index], 'sqlLike') &&
            !(index > 0 && isIdent(tokens[index - 1], 'function')) &&
            isPunct(at(1), '(') &&
            at(2).type === 'ident' &&
            isPunct(at(3), '[') &&
            at(4).type === 'string' &&
            isPunct(at(5), ']') &&
            isPunct(at(6), ',') &&
            at(7).type === 'string' &&
            isPunct(at(8), ')')
        ) {
            checks.push({ column: at(4).value, pattern: at(7).value });
        }
    }
    return checks;
}

/**
 * Puts the exact LIKE patterns of the `sqlLike` checks back into the matching like conditions
 * (same column, filter Value equal to the wider value of the pattern). A like condition without
 * a check keeps its `%value%` pattern; when that differs from the filter Value an info message
 * says that the filter matches anywhere.
 *
 * @param {object} state parser state (`likeFilters`: like node → filter Value)
 * @param {object|null} expression expression node
 * @param {{column: string, pattern: string}[]} checks unused checks (consumed when applied)
 * @returns {object|null} expression with the exact patterns
 */
function applyLikeChecks(state, expression, checks) {
    if (!expression) {
        return expression;
    }
    if (expression.type === 'and' || expression.type === 'or') {
        return {
            ...expression,
            left: applyLikeChecks(state, expression.left, checks),
            right: applyLikeChecks(state, expression.right, checks),
        };
    }
    if (expression.type !== 'like') {
        return expression;
    }
    const filterValue = state.likeFilters.get(expression) ?? expression.pattern.value;
    const index = checks.findIndex(
        (check) =>
            check.column.toLowerCase() === expression.column.toLowerCase() &&
            likeFilterValue(check.pattern) === filterValue,
    );
    if (index === -1) {
        if (filterValue !== expression.pattern.value) {
            const { loc } = expression;
            report(
                state.context,
                'info',
                LIKE_MATCHES_ANYWHERE,
                `The like filter of WSProxy and Rows.Retrieve matches the value anywhere in ${expression.column}, so Value "${filterValue}" reads back as LIKE '${expression.pattern.value.replaceAll("'", "''")}'.`,
                loc.start,
                loc.end,
            );
        }
        return expression;
    }
    const [check] = checks.splice(index, 1);
    return { ...expression, pattern: { ...expression.pattern, value: check.pattern } };
}

// ------------------------------------------------------------------------------------------
// Calls
// ------------------------------------------------------------------------------------------

/**
 * Finds the "(" index matching the ")" at a token index, walking backwards.
 *
 * @param {object} context parse context
 * @param {number} closeIndex token index of ")"
 * @returns {number} token index of "(" or -1
 */
function matchingOpen(context, closeIndex) {
    let depth = 0;
    for (let index = closeIndex; index >= 0; index--) {
        const token = context.tokens[index];
        if (isPunct(token, ')')) {
            depth++;
        } else if (isPunct(token, '(')) {
            depth--;
            if (depth === 0) {
                return index;
            }
        }
    }
    return -1;
}

/**
 * Identifies a `.Rows.Retrieve(` call whose `.Retrieve` identifier is at an index.
 *
 * @param {object} context parse context
 * @param {number} index token index of Retrieve
 * @returns {{kind: string, index: number, start: number, owner: object}|null} call candidate
 */
function rowsRetrieveCall(context, index) {
    const ownerEnd = tokenAt(context, index - 4);
    if (index >= 4 && ownerEnd.type === 'ident') {
        return { kind: 'rows', index, start: ownerEnd.start, owner: { variable: ownerEnd } };
    }
    if (isPunct(ownerEnd, ')')) {
        const open = matchingOpen(context, index - 4);
        if (open >= 3 && isDataExtensionInit(context, open - 3)) {
            return {
                kind: 'rows',
                index,
                start: tokenAt(context, open - 3).start,
                owner: { argumentIndex: open + 1 },
            };
        }
    }
    return null;
}

/**
 * Finds every supported lookup call.
 *
 * @param {object} context parse context
 * @returns {{kind: string, index: number, start: number, owner?: object}[]} call candidates in source order
 */
function findCalls(context) {
    const calls = [];
    const { tokens } = context;
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type !== 'ident' || !isPunct(tokenAt(context, index + 1), '(')) {
            continue;
        }
        const hasDot = index > 0 && isPunct(tokens[index - 1], '.');
        const name = token.value.toLowerCase();
        if (name === 'retrieve' && hasDot) {
            if (
                isIdent(tokenAt(context, index - 2), 'Rows') &&
                isPunct(tokenAt(context, index - 3), '.')
            ) {
                const call = rowsRetrieveCall(context, index);
                if (call) {
                    calls.push(call);
                }
            } else if (tokenAt(context, index - 2).type === 'ident') {
                calls.push({ kind: 'wsproxy', index, start: tokenAt(context, index - 2).start });
            }
        } else if (name === 'lookuprows' || name === 'lookuporderedrows') {
            const isPlatform =
                hasDot &&
                isIdent(tokenAt(context, index - 2), 'Function') &&
                isPunct(tokenAt(context, index - 3), '.') &&
                isIdent(tokenAt(context, index - 4), 'Platform');
            if (!hasDot || isPlatform) {
                calls.push({
                    kind: name,
                    index,
                    start: isPlatform ? tokenAt(context, index - 4).start : token.start,
                });
            }
        }
    }
    return calls;
}

/**
 * Drops the WSProxy calls that only read the next batch of the first retrieve (paging with
 * `props.ContinueRequest = result.RequestID`): later retrieve calls whose first argument is
 * written the same way as the first call's.
 *
 * @param {object} context parse context
 * @param {{kind: string, index: number}[]} calls call candidates in source order
 * @returns {{kind: string, index: number}[]} calls without the continuation calls
 */
function withoutContinuations(context, calls) {
    const [first] = calls;
    if (first?.kind !== 'wsproxy') {
        return calls;
    }
    const objectType = tokenAt(context, first.index + 2);
    return calls.filter((call, position) => {
        if (position === 0 || call.kind !== 'wsproxy') {
            return true;
        }
        const argument = tokenAt(context, call.index + 2);
        return argument.type !== objectType.type || argument.value !== objectType.value;
    });
}

/**
 * Resolves a literal that must be a non-empty string.
 *
 * @param {object} state parser state
 * @param {Literal} node literal or reference
 * @param {string} what what the argument is, for the message
 * @returns {string} the text
 */
function requireString(state, node, what) {
    const literal = resolve(state, node);
    if (literal.kind !== 'string' || !literal.value.trim()) {
        fail(
            state.context,
            INVALID_ARGUMENT,
            `${what} must be text in quotes.`,
            node.start,
            node.end,
        );
    }
    return literal.value;
}

/**
 * Builds the FROM node and meta data from a data extension external key plus the header.
 *
 * @param {object} state parser state
 * @param {Literal} keyNode literal holding the key
 * @param {string} key external key
 * @returns {{name: string, loc: object}} from node
 */
function fromKey(state, keyNode, key) {
    const { context, header, meta } = state;
    meta.deKey = key;
    if (header.name) {
        meta.deName = header.name;
        return { name: header.name, loc: header.nameLoc };
    }
    report(
        context,
        'info',
        FROM_NAME_FROM_KEY,
        'The code only names the external key of the data extension, so the key is used as the name after FROM. Replace it with the data extension name if they differ.',
        keyNode.start,
        keyNode.end,
    );
    return { name: key, loc: makeLoc(context, keyNode.start, keyNode.end) };
}

/**
 * Reads `proxy.retrieve("DataExtensionObject[Key]", [columns], filter, …)`.
 *
 * @param {object} state parser state
 * @param {Literal[]} args call arguments
 * @param {object} callLoc location of the call
 * @returns {object} partial AST
 */
function readWsproxy(state, args, callLoc) {
    const { context } = state;
    if (args.length < 2 || args.length > 5) {
        fail(
            context,
            ARGUMENT_COUNT,
            'retrieve needs the object type, the column list and optionally a filter: retrieve("DataExtensionObject[Key]", ["Col"], filter).',
            callLoc.start,
            callLoc.end,
        );
    }
    const typeText = requireString(state, args[0], 'The object type');
    const match = /^DataExtensionObject\[(.+)\]$/i.exec(typeText.trim());
    if (!match) {
        fail(
            context,
            INVALID_OBJECT_TYPE,
            'Only data extension rows can be converted. The first argument must be "DataExtensionObject[ExternalKey]".',
            args[0].start,
            args[0].end,
        );
    }
    state.meta.target = 'ssjs-wsproxy';
    const from = fromKey(state, args[0], match[1]);
    const list = resolve(state, args[1]);
    if (list.kind !== 'array' || list.items.length === 0) {
        fail(
            context,
            INVALID_ARGUMENT,
            'The columns must be an array of column names, e.g. ["FirstName", "Email"].',
            args[1].start,
            args[1].end,
        );
    }
    const columns = list.items.map((item) => {
        const name = requireString(state, item, 'Each column name');
        const literal = resolve(state, item);
        return { name, loc: makeLoc(context, literal.start, literal.end) };
    });
    const filter = args[2] && resolve(state, args[2]);
    return {
        // a `// SQL: SELECT` header names the selected columns when cols reads more of them
        columns: state.header.columns ?? columns,
        from,
        where: !filter || filter.kind === 'null' ? null : toExpr(state, args[2]),
        top: null,
        orderBy: [],
    };
}

/**
 * Reads `DataExtension.Init("Key").Rows.Retrieve(filter?)` (also via a variable).
 *
 * @param {object} state parser state
 * @param {object} call call candidate
 * @param {Literal[]} args call arguments
 * @param {object} callLoc location of the call
 * @returns {object} partial AST
 */
function readRowsRetrieve(state, call, args, callLoc) {
    const { context } = state;
    let keyNode;
    if (call.owner.variable) {
        const variable = call.owner.variable;
        const entry = lookupVariable(state.variables, variable.value, variable.start);
        if (!entry || entry.kind !== 'deInit') {
            fail(
                context,
                VARIABLE_VALUE,
                `${variable.value} is not set to DataExtension.Init("Key") in this code. Paste the line that sets it, or write DataExtension.Init("Key").Rows.Retrieve(…).`,
                variable.start,
                variable.end,
            );
        }
        keyNode = entry.node;
    } else {
        context.pos = call.owner.argumentIndex;
        keyNode = parseLiteral(context);
    }
    const key = requireString(state, keyNode, 'The data extension external key');
    if (args.length > 1) {
        fail(
            context,
            ARGUMENT_COUNT,
            'Rows.Retrieve takes at most one argument: the filter object.',
            callLoc.start,
            callLoc.end,
        );
    }
    state.meta.target = 'ssjs-rows-retrieve';
    const from = fromKey(state, keyNode, key);
    const filter = args[0] && resolve(state, args[0]);
    return {
        columns: state.header.columns ?? '*',
        from,
        where: !filter || filter.kind === 'null' ? null : toExpr(state, args[0]),
        top: null,
        orderBy: [],
    };
}

/**
 * Reads the column / value pairs of a Platform.Function lookup (single values or arrays).
 *
 * @param {object} state parser state
 * @param {Literal} columnsNode column name or array of names
 * @param {Literal} valuesNode value or array of values
 * @returns {object} AND chain of equals conditions
 */
function readPairs(state, columnsNode, valuesNode) {
    const { context } = state;
    const columns = resolve(state, columnsNode);
    const values = resolve(state, valuesNode);
    const columnItems = columns.kind === 'array' ? columns.items : [columnsNode];
    const valueItems = values.kind === 'array' ? values.items : [valuesNode];
    if (
        columnItems.length === 0 ||
        columnItems.length !== valueItems.length ||
        (columns.kind === 'array') !== (values.kind === 'array')
    ) {
        fail(
            context,
            INVALID_ARGUMENT,
            'The column names and the values must match: either one name and one value, or two arrays of the same length.',
            columnsNode.start,
            valuesNode.end,
        );
    }
    const conditions = columnItems.map((columnNode, index) => {
        const column = requireString(state, columnNode, 'Each column name');
        const value = toValue(state, valueItems[index], column);
        const start = resolve(state, columnNode).start;
        return {
            type: 'compare',
            op: '=',
            column,
            value,
            loc: makeLoc(context, Math.min(start, value.loc.start), Math.max(start, value.loc.end)),
        };
    });
    return andChain(context, conditions);
}

/**
 * Reads `Platform.Function.LookupRows(name, cols, values)` and
 * `LookupOrderedRows(name, count, order, cols, values)`.
 *
 * @param {object} state parser state
 * @param {boolean} isOrdered true for LookupOrderedRows
 * @param {Literal[]} args call arguments
 * @param {object} callLoc location of the call
 * @returns {object} partial AST
 */
function readLookupRows(state, isOrdered, args, callLoc) {
    const { context } = state;
    const expected = isOrdered ? 5 : 3;
    if (args.length !== expected) {
        fail(
            context,
            ARGUMENT_COUNT,
            isOrdered
                ? 'LookupOrderedRows needs 5 arguments: (data extension name, count, "Col ASC", column(s), value(s)).'
                : 'LookupRows needs 3 arguments: (data extension name, column(s), value(s)).',
            callLoc.start,
            callLoc.end,
        );
    }
    const name = requireString(state, args[0], 'The data extension name');
    const nameLiteral = resolve(state, args[0]);
    state.meta.target = isOrdered ? 'ssjs-lookuporderedrows' : 'ssjs-lookuprows';
    state.meta.deName = name;
    let top = null;
    let orderBy = [];
    if (isOrdered) {
        top = readCount(state, args[1]);
        requireString(state, args[2], 'The sort order');
        orderBy = parseOrderString(context, resolve(state, args[2]));
    }
    return {
        columns: state.header.columns ?? '*',
        from: { name, loc: makeLoc(context, nameLiteral.start, nameLiteral.end) },
        where: readPairs(state, args[expected - 2], args[expected - 1]),
        top,
        orderBy,
    };
}

/**
 * Reads the row count of LookupOrderedRows (0 or -1 = all rows → no TOP).
 *
 * @param {object} state parser state
 * @param {Literal} node count literal
 * @returns {number|null} TOP value
 */
function readCount(state, node) {
    const literal = resolve(state, node);
    const text = literal.kind === 'number' || literal.kind === 'string' ? literal.value.trim() : '';
    if (!/^-?\d+$/.test(text)) {
        fail(
            state.context,
            INVALID_COUNT,
            'The row count must be a whole number (0 or -1 for all rows).',
            node.start,
            node.end,
        );
    }
    const count = Number(text);
    return count > 0 ? count : null;
}

/**
 * Reads a bare filter object (no call): the whole input is `{…}`, or the last variable set to
 * a filter object.
 *
 * @param {object} state parser state
 * @returns {object|null} partial AST, or null when there is no filter object
 */
function readBareFilter(state) {
    const { context } = state;
    let node = null;
    if (
        isPunct(tokenAt(context, 0), '{') ||
        (isPunct(tokenAt(context, 0), '(') && isPunct(tokenAt(context, 1), '{'))
    ) {
        context.pos = isPunct(tokenAt(context, 0), '(') ? 1 : 0;
        node = parseLiteral(context);
    } else {
        for (const entries of state.variables.values()) {
            for (const entry of entries) {
                if (
                    entry.kind === 'literal' &&
                    isFilterObject(entry.node) &&
                    (!node || entry.start > node.assignedAt)
                ) {
                    node = { ...entry.node, assignedAt: entry.start };
                }
            }
        }
    }
    if (!node) {
        return null;
    }
    state.meta.target = 'ssjs-filter';
    const { header } = state;
    let from;
    if (header.name) {
        state.meta.deName = header.name;
        from = { name: header.name, loc: header.nameLoc };
    } else {
        report(
            context,
            'warning',
            FROM_UNKNOWN,
            'This filter does not say which data extension it reads, so the name after FROM is left empty. Enter the data extension name in the settings.',
            node.start,
            node.end,
        );
        from = { name: '', loc: makeLoc(context, node.start, node.start) };
    }
    if (header.key) {
        state.meta.deKey = header.key;
    }
    return {
        columns: header.columns ?? '*',
        from,
        where: toExpr(state, node),
        top: null,
        orderBy: [],
        start: node.start,
        end: node.end,
    };
}

/**
 * Checks whether a literal looks like a WSProxy filter object.
 *
 * @param {Literal} node literal
 * @returns {boolean} true for an object with Property or LeftOperand
 */
function isFilterObject(node) {
    return (
        node.kind === 'object' &&
        node.entries.some((entry) => ['property', 'leftoperand'].includes(entry.key.toLowerCase()))
    );
}

/**
 * Reads the first `orderRows(rows, [["Col", "ASC"|"DESC"], …], count)` call (the sort and TOP
 * the SSJS emitters add after reading rows). The helper's own `function orderRows(` is skipped.
 *
 * @param {object} state parser state
 * @returns {{orderBy: object[], top: number|null}|null} sort order and TOP, or null without a call
 */
function readOrderRows(state) {
    const { context } = state;
    const { tokens } = context;
    const index = tokens.findIndex(
        (token, position) =>
            isIdent(token, 'orderRows') &&
            !(position > 0 && isIdent(tokens[position - 1], 'function')) &&
            isPunct(tokenAt(context, position + 1), '('),
    );
    if (index === -1) {
        return null;
    }
    context.pos = index + 1;
    const { args, end } = parseArguments(context);
    const invalid = (start, stop) =>
        fail(
            context,
            INVALID_ORDER_BY,
            'orderRows needs the rows, a sort list such as [["Points", "DESC"], ["Email", "ASC"]] and a row count (0 for all rows).',
            start,
            stop,
        );
    if (args.length !== 3) {
        invalid(tokens[index].start, end);
    }
    const list = resolve(state, args[1]);
    if (list.kind !== 'array') {
        invalid(args[1].start, args[1].end);
    }
    const orderBy = list.items.map((pairNode) => {
        const pair = resolve(state, pairNode);
        const [columnNode, directionNode] = pair.items ?? [];
        const direction = directionNode && resolve(state, directionNode);
        if (
            pair.kind !== 'array' ||
            pair.items.length !== 2 ||
            direction.kind !== 'string' ||
            !/^(?:ASC|DESC)$/i.test(direction.value)
        ) {
            invalid(pairNode.start, pairNode.end);
        }
        return {
            column: requireString(state, columnNode, 'Each sort column'),
            direction: direction.value.toUpperCase(),
            loc: makeLoc(context, pair.start, pair.end),
        };
    });
    return { orderBy, top: readCount(state, args[2]) };
}

/**
 * Parses the lookup call (or bare filter) and builds the AST.
 *
 * @param {object} state parser state
 * @returns {object} SELECT AST
 */
function parseProgram(state) {
    const { context } = state;
    const calls = withoutContinuations(context, findCalls(context));
    let partial;
    let start;
    let end;
    if (calls.length === 0) {
        partial = readBareFilter(state);
        if (!partial) {
            fail(
                context,
                NO_LOOKUP_FOUND,
                'No supported lookup was found. Paste a WSProxy retrieve call, DataExtension.Init(…).Rows.Retrieve(…), Platform.Function.LookupRows / LookupOrderedRows, or a filter object.',
                0,
                context.text.length,
            );
        }
        ({ start, end } = partial);
        delete partial.start;
        delete partial.end;
    } else {
        const call = calls[0];
        if (calls.length > 1) {
            const second = calls[1];
            report(
                context,
                'warning',
                MULTIPLE_LOOKUPS,
                'The code contains more than one lookup; only the first one is converted.',
                second.start,
                tokenAt(context, second.index).end,
            );
        }
        context.pos = call.index + 1;
        const { args, end: callEnd } = parseArguments(context);
        start = call.start;
        end = callEnd;
        const callLoc = makeLoc(context, start, end);
        if (call.kind === 'wsproxy') {
            partial = readWsproxy(state, args, callLoc);
        } else if (call.kind === 'rows') {
            partial = readRowsRetrieve(state, call, args, callLoc);
        } else {
            partial = readLookupRows(state, call.kind === 'lookuporderedrows', args, callLoc);
        }
        if (call.kind !== 'lookuporderedrows') {
            const order = readOrderRows(state);
            if (order) {
                partial.orderBy = order.orderBy;
                partial.top = order.top;
            }
        }
    }
    if (state.header.foldNotIn) {
        state.meta.foldNotIn = true;
        partial.where = foldNotIn(partial.where);
    }
    partial.where = applyLikeChecks(state, partial.where, findLikeChecks(context));
    return {
        type: 'select',
        top: partial.top,
        columns: partial.columns,
        from: partial.from,
        where: partial.where,
        orderBy: partial.orderBy,
        loc: makeLoc(context, start, end),
    };
}

/**
 * Reads an SSJS data extension lookup back into the SQL AST. Never throws.
 *
 * Accepted: `proxy.retrieve("DataExtensionObject[Key]", [cols], filter[, opts[, props]])`,
 * `DataExtension.Init("Key").Rows.Retrieve(filter?)` (also via a variable),
 * `[Platform.Function.]LookupRows(name, col|[cols], value|[values])`,
 * `[Platform.Function.]LookupOrderedRows(name, count, "Col ASC", col|[cols], value|[values])`
 * and a bare filter object. Filters and arguments may be variables set to literals.
 * A `// SQL: FROM [Name] (external key Key)` / `// SQL: SELECT a, b` header comment supplies
 * what the code cannot carry (for WSProxy the SELECT header wins over the cols array); a
 * `NOT IN` in the header folds `<>` chains back into NOT IN. `sqlLike(row["Col"], "pattern")`
 * checks restore the exact LIKE pattern of the wider `like` filter, and a filter Value of
 * exactly one space reads back as ''.
 *
 * @param {string} text SSJS code
 * @returns {{ast: object|null, messages: import('./messages.js').Message[], meta: {target: string|null, deName?: string, deKey?: string, foldNotIn?: boolean}}} AST (null on error), messages and meta data
 */
export function parseSsjs(text) {
    const source = typeof text === 'string' ? text : '';
    const context = createContext(source);
    const meta = { target: null };
    const ast = runParser(context, () => {
        tokenize(context, 'js', findScriptRegions(source));
        rejectEmpty(context);
        const state = {
            context,
            meta,
            header: readHeader(context),
            variables: collectVariables(context),
            likeFilters: new Map(),
        };
        return parseProgram(state);
    });
    return { ast, messages: context.messages, meta };
}
