import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import js from '@eslint/js';

/**
 * Flat ESLint config — deliberately SCOPED to the mcdev Pipeline Builder JS only.
 *
 * The legacy front-end JS (`assets/js/main.js`, `assets/js/search.js`, `sw.js`) and the SCSS
 * predate any linter here and are Prettier-ignored on purpose (see `.prettierignore`), so a
 * global glob would reintroduce the exact hundreds-of-lines reformat churn that ignore file
 * exists to prevent. Every config block below is pinned to the new builder scripts + their
 * Node test via `files:`, and a top-level `ignores` keeps ESLint away from everything else.
 *
 * Plugin stack mirrors `.cursor/rules/new-subproject-setup.mdc`: `@eslint/js` recommended,
 * `eslint-plugin-prettier/recommended`, `eslint-plugin-jsdoc` flat/recommended and
 * `eslint-plugin-unicorn` recommended.
 */

const BUILDER_FILES = ['assets/js/mcdev-pipeline-*.js'];
const TEST_FILES = ['tests/mcdev-pipeline-builders.test.cjs'];
const ALL_FILES = [...BUILDER_FILES, ...TEST_FILES];

export default [
    {
        // Everything except the new builder files + their test is out of scope for ESLint.
        ignores: [
            '**/node_modules/**',
            '**/_site/**',
            '**/.jekyll-cache/**',
            '**/vendor/**',
            'assets/js/main.js',
            'assets/js/search.js',
            'sw.js',
            'scripts/**',
        ],
    },
    { files: ALL_FILES, ...js.configs.recommended },
    { files: ALL_FILES, ...eslintPluginPrettierRecommended },
    { files: ALL_FILES, ...jsdoc.configs['flat/recommended'] },
    { files: ALL_FILES, ...eslintPluginUnicorn.configs['recommended'] },
    {
        files: ALL_FILES,
        settings: {
            jsdoc: {
                mode: 'typescript',
            },
        },
        rules: {
            'unicorn/better-regex': 'off',
            'unicorn/catch-error-name': ['error', { name: 'ex' }],
            'unicorn/explicit-length-check': 'off',
            'unicorn/filename-case': 'off',
            'unicorn/no-array-callback-reference': 'off',
            'unicorn/no-array-reduce': 'off',
            'unicorn/no-null': 'off',
            'unicorn/no-nested-ternary': 'off',
            'unicorn/numeric-separators-style': 'off',
            'unicorn/prefer-add-event-listener': 'off',
            'unicorn/prefer-module': 'off',
            'unicorn/prevent-abbreviations': 'off',
            'arrow-body-style': ['error', 'as-needed'],
            curly: 'error',
            'no-console': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prettier/prettier': 'warn',
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param-type': 'off',
            'jsdoc/tag-lines': ['warn', 'any', { startLines: 1 }],
            'jsdoc/no-undefined-types': 'off',
            'jsdoc/valid-types': 'off',
        },
    },
    {
        // Browser scripts loaded via <script> tags — NOT ES modules.
        files: BUILDER_FILES,
        languageOptions: {
            globals: {
                ...globals.browser,
                module: 'writable',
            },
            ecmaVersion: 2021,
            sourceType: 'script',
        },
    },
    {
        // The Node test `require()`s the two pure builders through their UMD footer.
        files: TEST_FILES,
        languageOptions: {
            globals: {
                ...globals.node,
            },
            ecmaVersion: 2022,
            sourceType: 'commonjs',
        },
    },
];
