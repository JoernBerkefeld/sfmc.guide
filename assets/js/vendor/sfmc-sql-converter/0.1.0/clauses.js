/**
 * Clause bookkeeping shared by the emitters, the SQL printer and convert(): stable clause ids
 * for every part of a query, and a small code writer that records where each clause ends up
 * in generated text.
 *
 * Clause ids: `column-N` (explicit SELECT columns), `top`, `from`, `where-N` (each single
 * condition, numbered left to right; AND / OR nodes and brackets get no id) and `order-N`
 * (each ORDER BY item).
 */

/**
 * @typedef {import('./sql-parser.js').SelectAst} SelectAst
 * @typedef {import('./sql-parser.js').Loc} Loc
 */

/**
 * @typedef {object} Clause
 * @property {string} clauseId stable id, e.g. `where-0`
 * @property {'column'|'top'|'from'|'condition'|'order'} kind clause kind
 * @property {object|null} node the AST node (null for `top`)
 * @property {Loc|null} loc where the clause is in the source text (null when unknown)
 */

/**
 * @typedef {object} Span
 * @property {string} clauseId clause id
 * @property {number} start 0-based start offset in the generated text
 * @property {number} end 0-based exclusive end offset in the generated text
 */

const TOP_PATTERN = /^SELECT\s+TOP\s*(?:\(\s*\d+\s*\)|\d+)/i;

/**
 * Converts 0-based offsets of a text into a `Loc`.
 *
 * @param {string} text source text
 * @param {number} start 0-based start offset
 * @param {number} end 0-based exclusive end offset
 * @returns {Loc} location
 */
export function locFromOffsets(text, start, end) {
    const position = (offset) => {
        let line = 1;
        let lineStart = 0;
        for (let index = 0; index < offset; index++) {
            if (text[index] !== '\n') {
                continue;
            }

            line++;
            lineStart = index + 1;
        }
        return { line, column: offset - lineStart + 1 };
    };
    const from = position(start);
    const to = position(end);
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
 * Lists the condition nodes (compare / like / in / between / null) of a WHERE tree from left
 * to right.
 *
 * @param {object|null} expr WHERE expression
 * @returns {object[]} condition nodes
 */
export function conditionsOf(expr) {
    if (!expr) {
        return [];
    }
    if (expr.type === 'and' || expr.type === 'or') {
        return [...conditionsOf(expr.left), ...conditionsOf(expr.right)];
    }
    return [expr];
}

/**
 * Checks whether a LIKE pattern means "contains": `%x%` where x neither starts nor ends with
 * `%`. Only such patterns behave the same as the WSProxy / Rows.Retrieve `like` operator,
 * which always wraps its value in `%…%`.
 *
 * @param {string} pattern LIKE pattern
 * @returns {boolean} true for a contains pattern
 */
export function isContainsPattern(pattern) {
    if (pattern.length < 2 || !pattern.startsWith('%') || !pattern.endsWith('%')) {
        return false;
    }
    const inner = pattern.slice(1, -1);
    return !inner.startsWith('%') && !inner.endsWith('%');
}

/**
 * Returns the filter Value used for an anchored LIKE pattern: the pattern without leading and
 * trailing `%` (the `like` operator adds them again), or `%` when nothing is left, because an
 * empty filter Value is rejected.
 *
 * @param {string} pattern LIKE pattern
 * @returns {string} wider filter value
 */
export function likeFilterValue(pattern) {
    return pattern.replace(/^%+/, '').replace(/%+$/, '') || '%';
}

/**
 * Finds the location of `TOP n` in the source text, falling back to the SELECT keyword.
 *
 * @param {SelectAst} ast statement
 * @param {string} [text] source text the AST was parsed from
 * @returns {Loc|null} location or null when no text is known
 */
function findTopLoc(ast, text) {
    if (typeof text !== 'string' || !ast.loc) {
        return null;
    }
    const match = TOP_PATTERN.exec(text.slice(ast.loc.start));
    const length = match ? match[0].length : Math.min(6, text.length - ast.loc.start);
    return locFromOffsets(text, ast.loc.start, ast.loc.start + length);
}

/**
 * Lists every clause of a query with its stable id.
 *
 * @param {SelectAst} ast statement
 * @param {string} [text] source text (only used to locate TOP, which has no node)
 * @returns {{clauses: Clause[], idOf: Map<object, string>}} the clauses in source order and
 * a node → clause id lookup
 */
export function collectClauses(ast, text) {
    /**
    @type {Clause[]}
     */
    const clauses = [];
    const idOf = new Map();
    const add = (clauseId, kind, node, loc) => {
        clauses.push({ clauseId, kind, node, loc: loc ?? null });
        if (node) {
            idOf.set(node, clauseId);
        }
    };
    if (ast.top !== null && ast.top !== undefined) {
        add('top', 'top', null, findTopLoc(ast, text));
    }
    if (Array.isArray(ast.columns)) {
        for (const [index, column] of ast.columns.entries()) {
            add(`column-${index}`, 'column', column, column.loc);
        }
    }
    add('from', 'from', ast.from, ast.from.loc);
    for (const [index, condition] of conditionsOf(ast.where).entries()) {
        add(`where-${index}`, 'condition', condition, condition.loc);
    }
    const orderBy = ast.orderBy ?? [];
    for (const [index, item] of orderBy.entries()) {
        add(`order-${index}`, 'order', item, item.loc);
    }
    return { clauses, idOf };
}

/**
 * Accumulates generated text and records the spans of clauses inside it.
 */
export class CodeWriter {
    /**
    generated text so far
     */
    code = '';

    /**
    @type {Span[]} clause spans in `code`
     */
    spans = [];

    /**
     * Appends text.
     *
     * @param {string} text text to append
     * @returns {CodeWriter} this writer
     */
    write(text) {
        this.code += text;
        return this;
    }

    /**
     * Appends text and records it as (part of) a clause.
     *
     * @param {string|undefined} clauseId clause id; when empty the text is written unmarked
     * @param {string} text text to append
     * @returns {CodeWriter} this writer
     */
    mark(clauseId, text) {
        if (!clauseId) {
            return this.write(text);
        }
        const start = this.code.length;
        this.code += text;
        this.spans.push({ clauseId, start, end: this.code.length });
        return this;
    }

    /**
     * Runs a callback and records everything it writes as one clause span.
     *
     * @param {string|undefined} clauseId clause id; when empty nothing is recorded
     * @param {() => void} callback writes the clause text
     * @returns {CodeWriter} this writer
     */
    region(clauseId, callback) {
        const start = this.code.length;
        callback();
        if (clauseId) {
            this.spans.push({ clauseId, start, end: this.code.length });
        }
        return this;
    }
}
