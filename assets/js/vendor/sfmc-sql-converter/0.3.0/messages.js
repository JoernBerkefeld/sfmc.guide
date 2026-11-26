/**
 * Message codes and the message factory shared by the parser and (later) the emitters.
 *
 * Every message has the shape
 * `{ severity: 'error'|'warning'|'info', code, message, line, column, endLine, endColumn }`.
 * `line` / `column` are 1-based; `endLine` / `endColumn` point just after the last character
 * (exclusive end), which matches how most editors mark a range.
 */

// --- input / lexer -------------------------------------------------------------------------
export const EMPTY_INPUT = 'EMPTY_INPUT';
export const UNEXPECTED_CHARACTER = 'UNEXPECTED_CHARACTER';
export const UNTERMINATED_STRING = 'UNTERMINATED_STRING';
export const UNTERMINATED_IDENTIFIER = 'UNTERMINATED_IDENTIFIER';
export const UNTERMINATED_COMMENT = 'UNTERMINATED_COMMENT';
export const EMPTY_IDENTIFIER = 'EMPTY_IDENTIFIER';
export const UNSUPPORTED_LINE_SEPARATOR = 'UNSUPPORTED_LINE_SEPARATOR';

// --- syntax -------------------------------------------------------------------------------
export const SYNTAX_ERROR = 'SYNTAX_ERROR';
export const EXPECTED_SELECT = 'EXPECTED_SELECT';
export const EXPECTED_FROM = 'EXPECTED_FROM';
export const EXPECTED_IDENTIFIER = 'EXPECTED_IDENTIFIER';
export const EXPECTED_OPERATOR = 'EXPECTED_OPERATOR';
export const EXPECTED_VALUE = 'EXPECTED_VALUE';
export const EXPECTED_STRING = 'EXPECTED_STRING';
export const MISSING_CLOSING_PAREN = 'MISSING_CLOSING_PAREN';
export const INVALID_TOP = 'INVALID_TOP';
export const LITERAL_ON_LEFT = 'LITERAL_ON_LEFT';
export const NULL_COMPARISON = 'NULL_COMPARISON';
export const NESTING_TOO_DEEP = 'NESTING_TOO_DEEP';
export const INTERNAL_ERROR = 'INTERNAL_ERROR';

// --- unsupported constructs -----------------------------------------------------------------
export const UNSUPPORTED_JOIN = 'UNSUPPORTED_JOIN';
export const UNSUPPORTED_SUBQUERY = 'UNSUPPORTED_SUBQUERY';
export const UNSUPPORTED_GROUP_BY = 'UNSUPPORTED_GROUP_BY';
export const UNSUPPORTED_HAVING = 'UNSUPPORTED_HAVING';
export const UNSUPPORTED_AGGREGATE = 'UNSUPPORTED_AGGREGATE';
export const UNSUPPORTED_DISTINCT = 'UNSUPPORTED_DISTINCT';
export const UNSUPPORTED_FUNCTION = 'UNSUPPORTED_FUNCTION';
export const UNSUPPORTED_COLUMN_COMPARISON = 'UNSUPPORTED_COLUMN_COMPARISON';
export const UNSUPPORTED_ALIAS = 'UNSUPPORTED_ALIAS';
export const UNSUPPORTED_QUALIFIED_NAME = 'UNSUPPORTED_QUALIFIED_NAME';
export const UNSUPPORTED_NOT_LIKE = 'UNSUPPORTED_NOT_LIKE';
export const UNSUPPORTED_NOT_BETWEEN = 'UNSUPPORTED_NOT_BETWEEN';
export const UNSUPPORTED_NOT_CONDITION = 'UNSUPPORTED_NOT_CONDITION';
export const UNSUPPORTED_STAR_WITH_COLUMNS = 'UNSUPPORTED_STAR_WITH_COLUMNS';
export const UNSUPPORTED_UNION = 'UNSUPPORTED_UNION';
export const UNSUPPORTED_MULTIPLE_STATEMENTS = 'UNSUPPORTED_MULTIPLE_STATEMENTS';
export const UNSUPPORTED_OFFSET_FETCH = 'UNSUPPORTED_OFFSET_FETCH';

// --- warnings / info ------------------------------------------------------------------------
export const SYSTEM_DATA_VIEW = 'SYSTEM_DATA_VIEW';
export const TABLE_HINT_IGNORED = 'TABLE_HINT_IGNORED';
export const NULL_FALLBACK_REWRITTEN = 'NULL_FALLBACK_REWRITTEN';

// --- emitters / convert() -------------------------------------------------------------------
export const ORDER_BY_DROPPED = 'ORDER_BY_DROPPED';
export const TOP_DROPPED = 'TOP_DROPPED';
export const DE_KEY_ASSUMED = 'DE_KEY_ASSUMED';
export const SELECT_STAR_NEEDS_COLUMNS = 'SELECT_STAR_NEEDS_COLUMNS';
export const LIKE_CHECKED_IN_SCRIPT = 'LIKE_CHECKED_IN_SCRIPT';
export const EMPTY_STRING_AS_SPACE = 'EMPTY_STRING_AS_SPACE';
export const TOP_ABOVE_LOOKUP_LIMIT = 'TOP_ABOVE_LOOKUP_LIMIT';
export const FIRST_BATCH_ONLY = 'FIRST_BATCH_ONLY';
export const ORDER_BY_NEEDS_TOP = 'ORDER_BY_NEEDS_TOP';
export const DATA_GRAPH_SCOPE = 'DATA_GRAPH_SCOPE';

// --- reverse parsers (code to SQL) ------------------------------------------------------
export const NO_LOOKUP_FOUND = 'NO_LOOKUP_FOUND';
export const ARGUMENT_COUNT = 'ARGUMENT_COUNT';
export const INVALID_ARGUMENT = 'INVALID_ARGUMENT';
export const INVALID_OBJECT_TYPE = 'INVALID_OBJECT_TYPE';
export const INVALID_COUNT = 'INVALID_COUNT';
export const INVALID_ORDER_BY = 'INVALID_ORDER_BY';
export const INVALID_FILTER = 'INVALID_FILTER';
export const INVALID_FILTER_VALUE = 'INVALID_FILTER_VALUE';
export const INVALID_LOGICAL_OPERATOR = 'INVALID_LOGICAL_OPERATOR';
export const UNKNOWN_FILTER_OPERATOR = 'UNKNOWN_FILTER_OPERATOR';
export const UNSUPPORTED_FILTER_OPERATOR = 'UNSUPPORTED_FILTER_OPERATOR';
export const UNSUPPORTED_EXPRESSION = 'UNSUPPORTED_EXPRESSION';
export const VARIABLE_VALUE = 'VARIABLE_VALUE';
export const MULTIPLE_LOOKUPS = 'MULTIPLE_LOOKUPS';
export const FROM_UNKNOWN = 'FROM_UNKNOWN';
export const FROM_NAME_FROM_KEY = 'FROM_NAME_FROM_KEY';
export const LOOKUP_FIRST_ROW_ONLY = 'LOOKUP_FIRST_ROW_ONLY';
export const CASE_SENSITIVE_LOOKUP = 'CASE_SENSITIVE_LOOKUP';
export const LIKE_MATCHES_ANYWHERE = 'LIKE_MATCHES_ANYWHERE';
export const MO_ONE_MATCH = 'MO_ONE_MATCH';

/**
 * All message codes, keyed by themselves (handy for iteration and lookups).
 */
export const MESSAGE_CODES = Object.freeze({
    EMPTY_INPUT,
    UNEXPECTED_CHARACTER,
    UNTERMINATED_STRING,
    UNTERMINATED_IDENTIFIER,
    UNTERMINATED_COMMENT,
    EMPTY_IDENTIFIER,
    UNSUPPORTED_LINE_SEPARATOR,
    SYNTAX_ERROR,
    EXPECTED_SELECT,
    EXPECTED_FROM,
    EXPECTED_IDENTIFIER,
    EXPECTED_OPERATOR,
    EXPECTED_VALUE,
    EXPECTED_STRING,
    MISSING_CLOSING_PAREN,
    INVALID_TOP,
    LITERAL_ON_LEFT,
    NULL_COMPARISON,
    NESTING_TOO_DEEP,
    INTERNAL_ERROR,
    UNSUPPORTED_JOIN,
    UNSUPPORTED_SUBQUERY,
    UNSUPPORTED_GROUP_BY,
    UNSUPPORTED_HAVING,
    UNSUPPORTED_AGGREGATE,
    UNSUPPORTED_DISTINCT,
    UNSUPPORTED_FUNCTION,
    UNSUPPORTED_COLUMN_COMPARISON,
    UNSUPPORTED_ALIAS,
    UNSUPPORTED_QUALIFIED_NAME,
    UNSUPPORTED_NOT_LIKE,
    UNSUPPORTED_NOT_BETWEEN,
    UNSUPPORTED_NOT_CONDITION,
    UNSUPPORTED_STAR_WITH_COLUMNS,
    UNSUPPORTED_UNION,
    UNSUPPORTED_MULTIPLE_STATEMENTS,
    UNSUPPORTED_OFFSET_FETCH,
    SYSTEM_DATA_VIEW,
    TABLE_HINT_IGNORED,
    NULL_FALLBACK_REWRITTEN,
    ORDER_BY_DROPPED,
    TOP_DROPPED,
    DE_KEY_ASSUMED,
    SELECT_STAR_NEEDS_COLUMNS,
    LIKE_CHECKED_IN_SCRIPT,
    EMPTY_STRING_AS_SPACE,
    TOP_ABOVE_LOOKUP_LIMIT,
    FIRST_BATCH_ONLY,
    ORDER_BY_NEEDS_TOP,
    DATA_GRAPH_SCOPE,
    NO_LOOKUP_FOUND,
    ARGUMENT_COUNT,
    INVALID_ARGUMENT,
    INVALID_OBJECT_TYPE,
    INVALID_COUNT,
    INVALID_ORDER_BY,
    INVALID_FILTER,
    INVALID_FILTER_VALUE,
    INVALID_LOGICAL_OPERATOR,
    UNKNOWN_FILTER_OPERATOR,
    UNSUPPORTED_FILTER_OPERATOR,
    UNSUPPORTED_EXPRESSION,
    VARIABLE_VALUE,
    MULTIPLE_LOOKUPS,
    FROM_UNKNOWN,
    FROM_NAME_FROM_KEY,
    LOOKUP_FIRST_ROW_ONLY,
    CASE_SENSITIVE_LOOKUP,
    LIKE_MATCHES_ANYWHERE,
    MO_ONE_MATCH,
});

/**
 * The message codes used only by the reverse parsers (`parseSsjs`, `parseAmpscript`), keyed by
 * themselves.
 */
export const REVERSE_MESSAGE_CODES = Object.freeze({
    NO_LOOKUP_FOUND,
    ARGUMENT_COUNT,
    INVALID_ARGUMENT,
    INVALID_OBJECT_TYPE,
    INVALID_COUNT,
    INVALID_ORDER_BY,
    INVALID_FILTER,
    INVALID_FILTER_VALUE,
    INVALID_LOGICAL_OPERATOR,
    UNKNOWN_FILTER_OPERATOR,
    UNSUPPORTED_FILTER_OPERATOR,
    UNSUPPORTED_EXPRESSION,
    VARIABLE_VALUE,
    MULTIPLE_LOOKUPS,
    FROM_UNKNOWN,
    FROM_NAME_FROM_KEY,
    LOOKUP_FIRST_ROW_ONLY,
    CASE_SENSITIVE_LOOKUP,
    LIKE_MATCHES_ANYWHERE,
    MO_ONE_MATCH,
});

/**
 * @typedef {'error'|'warning'|'info'} Severity
 */

/**
 * @typedef {object} Location
 * @property {number} line 1-based line of the first character
 * @property {number} column 1-based column of the first character
 * @property {number} endLine 1-based line of the exclusive end
 * @property {number} endColumn 1-based column of the exclusive end
 */

/**
 * @typedef {object} Message
 * @property {Severity} severity how serious the finding is
 * @property {string} code one of the exported code constants
 * @property {string} message plain-language text: what is wrong and how to fix it
 * @property {number} line 1-based start line
 * @property {number} column 1-based start column
 * @property {number} endLine 1-based end line
 * @property {number} endColumn 1-based exclusive end column
 */

/**
 * Builds a message object.
 *
 * @param {Severity} severity 'error', 'warning' or 'info'
 * @param {string} code one of the exported code constants
 * @param {string} message plain-language text: what is wrong and how to fix it
 * @param {Location} location where the problem is (any object with line/column/endLine/endColumn, e.g. an AST `loc`)
 * @returns {Message} the message
 */
export function createMessage(severity, code, message, location) {
    return {
        severity,
        code,
        message,
        line: location.line,
        column: location.column,
        endLine: location.endLine,
        endColumn: location.endColumn,
    };
}
