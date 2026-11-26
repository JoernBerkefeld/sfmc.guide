/**
 * SQL LIKE matching as observed in Marketing Cloud Engagement query activities: anchored,
 * case-insensitive, `%` = any text, `_` = one character, `[…]` / `[^…]` = one character of a set
 * (so `[%]` matches a literal %). Used by the parser to evaluate an ISNULL / COALESCE fallback
 * at conversion time, and by the tests.
 */

// one LIKE token: %, _, a character set such as [%] / [^a-c], or any single character
const LIKE_TOKEN = /%|_|\[\^?[^\]]+\]|[\s\S]/g;

/**
 * Converts a LIKE pattern into a regular expression.
 *
 * @param {string} pattern LIKE pattern
 * @returns {RegExp} case-insensitive, anchored expression
 */
export function likeToRegExp(pattern) {
    const source = pattern.replaceAll(LIKE_TOKEN, (token) => {
        if (token === '%') {
            return String.raw`[\s\S]*`;
        }
        if (token === '_') {
            return String.raw`[\s\S]`;
        }
        if (token.length > 2 && token.startsWith('[')) {
            const isNegated = token[1] === '^';
            const body = token.slice(isNegated ? 2 : 1, -1).replaceAll(/[\\^]/g, String.raw`\$&`);
            return `[${isNegated ? '^' : ''}${body}]`;
        }
        return token.replaceAll(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`);
    });
    return new RegExp(`^${source}$`, 'i');
}

/**
 * Checks a value against a LIKE pattern; trailing spaces of the value are ignored, as in SQL.
 *
 * @param {string} value the value
 * @param {string} pattern LIKE pattern
 * @returns {boolean} true when the value matches
 */
export function sqlLike(value, pattern) {
    return likeToRegExp(pattern).test(String(value).replace(/ +$/, ''));
}
