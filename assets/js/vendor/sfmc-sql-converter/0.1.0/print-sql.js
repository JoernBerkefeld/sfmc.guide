/**
 * SQL printer (AST → canonical query text) and the normalization used to compare two ASTs in
 * a round trip (SQL → code → SQL).
 *
 * Canonical text: keywords in upper case, one clause per line, `[Name]` brackets only when a
 * name needs them, text in single quotes with `''` escaping, numbers unquoted. A text value
 * that is a plain number without leading zeros (e.g. '500', '-2.5') prints unquoted, because
 * the generated code carries every value as a string and the two forms compare as equal.
 */

import { CodeWriter, collectClauses } from './clauses.js';
import { RESERVED_WORDS } from './sql-parser.js';

/**
 * @typedef {import('./sql-parser.js').SelectAst} SelectAst
 * @typedef {import('./sql-parser.js').Value} Value
 * @typedef {import('./clauses.js').Span} Span
 */

const BARE_NAME_PATTERN = /^[\p{L}_][\p{L}\p{N}_]*$/u;
const PLAIN_NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

/**
 * Checks whether a text is a plain number without leading zeros, e.g. `500`, `-2`, `7.25`.
 *
 * @param {string} text value text
 * @returns {boolean} true for a plain number
 */
export function isPlainNumber(text) {
    return PLAIN_NUMBER_PATTERN.test(text);
}

/**
 * Formats a column or data extension name, adding `[ ]` only when needed.
 *
 * @param {string} name the name
 * @returns {string} SQL name
 */
export function formatName(name) {
    if (BARE_NAME_PATTERN.test(name) && !RESERVED_WORDS.has(name.toUpperCase())) {
        return name;
    }
    return `[${name.replaceAll(']', ']]')}]`;
}

/**
 * Formats a literal value.
 *
 * @param {Value} value value node
 * @returns {string} SQL literal
 */
export function formatValue(value) {
    if (value.kind === 'number' || isPlainNumber(value.value)) {
        return value.value;
    }
    return `'${value.value.replaceAll("'", "''")}'`;
}

/**
 * Writes a WHERE expression.
 *
 * @param {CodeWriter} out writer
 * @param {object} expr expression node
 * @param {Map<object, string>} idOf node → clause id
 * @param {'and'|'or'|null} parent type of the enclosing node
 */
function writeExpr(out, expr, idOf, parent) {
    if (expr.type === 'and' || expr.type === 'or') {
        const isNeedsBrackets = expr.type === 'or' && parent === 'and';
        out.write(isNeedsBrackets ? '(' : '');
        writeExpr(out, expr.left, idOf, expr.type);
        out.write(` ${expr.type.toUpperCase()} `);
        writeExpr(out, expr.right, idOf, expr.type);
        out.write(isNeedsBrackets ? ')' : '');
        return;
    }
    out.mark(idOf.get(expr), formatCondition(expr));
}

/**
 * Formats a single condition.
 *
 * @param {object} expr condition node
 * @returns {string} SQL text
 */
function formatCondition(expr) {
    const column = formatName(expr.column);
    switch (expr.type) {
        case 'compare': {
            return `${column} ${expr.op} ${formatValue(expr.value)}`;
        }
        case 'like': {
            return `${column} LIKE '${expr.pattern.value.replaceAll("'", "''")}'`;
        }
        case 'in': {
            const values = expr.values.map((value) => formatValue(value)).join(', ');
            return `${column} ${expr.negated ? 'NOT IN' : 'IN'} (${values})`;
        }
        case 'between': {
            return `${column} BETWEEN ${formatValue(expr.low)} AND ${formatValue(expr.high)}`;
        }
        case 'null': {
            return `${column} IS ${expr.negated ? 'NOT NULL' : 'NULL'}`;
        }
        default: {
            throw new TypeError(`Unknown condition type: ${expr.type}`);
        }
    }
}

/**
 * Prints an AST as canonical SQL and records where each clause is in the text.
 *
 * @param {SelectAst} ast statement
 * @returns {{sql: string, spans: Span[]}} SQL text and clause spans
 */
export function printSqlWithSpans(ast) {
    const { idOf } = collectClauses(ast);
    const out = new CodeWriter();
    out.write('SELECT ');
    if (ast.top !== null && ast.top !== undefined) {
        out.mark('top', `TOP ${ast.top}`).write(' ');
    }
    if (Array.isArray(ast.columns)) {
        for (const [index, column] of ast.columns.entries()) {
            out.write(index ? ', ' : '').mark(idOf.get(column), formatName(column.name));
        }
    } else {
        out.write('*');
    }
    out.write('\nFROM ').mark('from', formatName(ast.from.name));
    if (ast.where) {
        out.write('\nWHERE ');
        writeExpr(out, ast.where, idOf, null);
    }
    if (ast.orderBy?.length) {
        out.write('\nORDER BY ');
        for (const [index, item] of ast.orderBy.entries()) {
            out.write(index ? ', ' : '').mark(
                idOf.get(item),
                `${formatName(item.column)} ${item.direction}`,
            );
        }
    }
    out.spans.sort((a, b) => a.start - b.start);
    return { sql: out.code, spans: out.spans };
}

/**
 * Prints an AST as canonical SQL.
 *
 * @param {SelectAst} ast statement
 * @returns {string} SQL text
 */
export function printSql(ast) {
    return printSqlWithSpans(ast).sql;
}

// ------------------------------------------------------------------------------------------
// Normalization for round-trip comparison
// ------------------------------------------------------------------------------------------

/**
 * @typedef {object} NormalizeOptions
 * @property {string[]} [columns] column list that `*` stands for (compares `*` with an
 * explicit list)
 * @property {boolean} [expandIn] treat `IN (a, b)` like `= a OR = b`
 * @property {boolean} [expandNotIn] treat `NOT IN (a, b)` like `<> a AND <> b`
 * @property {boolean} [expandBetween] treat `BETWEEN a AND b` like `>= a AND <= b`
 * @property {boolean} [dropTop] ignore TOP (the target dropped it)
 * @property {boolean} [dropOrderBy] ignore ORDER BY (the target dropped it)
 */

/**
 * Normalizes a value: plain numbers compare by numeric value, everything else as text.
 *
 * @param {Value} value value node
 * @returns {string} normalized value
 */
function normalizeValue(value) {
    if (isPlainNumber(value.value)) {
        return `n:${Number(value.value)}`;
    }
    return `s:${value.value}`;
}

/**
 * Builds an n-ary AND / OR node, flattening nested nodes of the same type.
 *
 * @param {'and'|'or'} type node type
 * @param {Array} parts normalized children
 * @returns {Array} normalized node (the only child when there is just one)
 */
function junction(type, parts) {
    const flat = parts.flatMap((part) => (part[0] === type ? part[1] : [part]));
    return flat.length === 1 ? flat[0] : [type, flat];
}

/**
 * Normalizes a WHERE expression into nested arrays.
 *
 * @param {object} expr expression node
 * @param {NormalizeOptions} options flags
 * @returns {Array} normalized expression
 */
function normalizeExpr(expr, options) {
    const column = expr.column?.toLowerCase();
    switch (expr.type) {
        case 'and':
        case 'or': {
            return junction(expr.type, [
                normalizeExpr(expr.left, options),
                normalizeExpr(expr.right, options),
            ]);
        }
        case 'compare': {
            return ['compare', expr.op, column, normalizeValue(expr.value)];
        }
        case 'like': {
            return ['like', column, `s:${expr.pattern.value}`];
        }
        case 'in': {
            const values = expr.values.map((value) => normalizeValue(value));
            if (expr.negated && options.expandNotIn) {
                return junction(
                    'and',
                    values.map((value) => ['compare', '<>', column, value]),
                );
            }
            if (!expr.negated && options.expandIn) {
                return junction(
                    'or',
                    values.map((value) => ['compare', '=', column, value]),
                );
            }
            return ['in', expr.negated, column, values];
        }
        case 'between': {
            const low = normalizeValue(expr.low);
            const high = normalizeValue(expr.high);
            if (options.expandBetween) {
                return junction('and', [
                    ['compare', '>=', column, low],
                    ['compare', '<=', column, high],
                ]);
            }
            return ['between', column, low, high];
        }
        case 'null': {
            return ['null', expr.negated, column];
        }
        default: {
            throw new TypeError(`Unknown expression type: ${expr.type}`);
        }
    }
}

/**
 * Normalizes an AST for round-trip comparison. Two queries are equivalent when their
 * normalized strings are equal. Ignored: keyword case, brackets, whitespace, literal quoting
 * of plain numbers, AND / OR grouping of the same operator, name case. Optional (flags):
 * IN ↔ OR chain, NOT IN ↔ AND chain, BETWEEN ↔ `>= AND <=`, `*` ↔ explicit list, and
 * clauses the target dropped.
 *
 * @param {SelectAst} ast statement
 * @param {NormalizeOptions} [options] flags
 * @returns {string} normalized form
 */
export function normalizeSql(ast, options = {}) {
    let columns = ast.columns;
    if (columns === '*' && options.columns?.length) {
        columns = options.columns.map((name) => ({ name }));
    }
    return JSON.stringify({
        top: options.dropTop ? null : (ast.top ?? null),
        columns: columns === '*' ? '*' : columns.map((column) => column.name.toLowerCase()),
        from: ast.from.name.toLowerCase(),
        where: ast.where ? normalizeExpr(ast.where, options) : null,
        orderBy: options.dropOrderBy
            ? []
            : (ast.orderBy ?? []).map((item) => [item.column.toLowerCase(), item.direction]),
    });
}
