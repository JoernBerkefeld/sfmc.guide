/**
 * `convert()` — the single entry point the sfmc.guide page and the browser extension call.
 *
 * Direction `toCode`: SQL → one output per target (code, or the reason the target cannot
 * express the query), clause spans, a clause map and a round-trip check (the code is read
 * back with the reverse parser and compared with the query, minus the clauses the target
 * dropped). Direction `toSql`: lookup code → canonical SQL.
 *
 * Platform `mce` (Marketing Cloud Engagement) reads data extensions with SSJS / AMPscript;
 * `mcn` (Marketing Cloud Next) reads Sales Cloud objects (`dataSource: 'CRM'`) or marketing
 * objects (`'MO'`) with Handlebars / AMPscript, limited to what the live probes proved (see
 * `NEXT_RULES` in emit-mcn.js).
 */

import { collectClauses, locFromOffsets } from './clauses.js';
import { MCE_TARGETS } from './emit-mce.js';
import { MCN_TARGETS } from './emit-mcn.js';
import {
    DE_KEY_ASSUMED,
    ORDER_BY_NEEDS_TOP,
    SELECT_STAR_NEEDS_COLUMNS,
    createMessage,
} from './messages.js';
import { parseAmpscript } from './parse-ampscript.js';
import { parseHandlebars } from './parse-handlebars.js';
import { parseSsjs } from './parse-ssjs.js';
import { normalizeSql, printSql, printSqlWithSpans } from './print-sql.js';
import { parseSql } from './sql-parser.js';

/**
 * @typedef {import('./sql-parser.js').SelectAst} SelectAst
 * @typedef {import('./messages.js').Message} Message
 * @typedef {import('./clauses.js').Span} Span
 */

/**
 * @typedef {object} ConvertOptions
 * @property {'mce'|'mcn'} [platform] target platform (default 'mce')
 * @property {'toCode'|'toSql'} [direction] conversion direction (default 'toCode')
 * @property {string} [deName] data extension name (toSql: used when the code does not carry it)
 * @property {string} [deKey] data extension external key (default: the name)
 * @property {string[]} [columns] the columns `SELECT *` stands for
 * @property {'CRM'|'MO'} [dataSource] Next data source: Sales Cloud object (default) or
 * marketing object
 * @property {{fields: {name: string}[]}} [schema] data extension fields
 * @property {{rowsAsObjects?: boolean, paging?: boolean}} [output] WSProxy output options
 */

/**
 * @typedef {object} Output
 * @property {string} id target id, e.g. `ssjs-wsproxy`
 * @property {'ssjs'|'ampscript'|'handlebars'|'sql'} language output language
 * @property {string} label tab label
 * @property {string} [code] generated code (absent when unavailable)
 * @property {string} [unavailable] plain reason the target cannot express the input
 * @property {Span[]} spans clause spans in `code`
 * @property {Message[]} [messages] messages that apply to this output only
 * @property {string[]} [dropped] clause ids this output leaves out
 * @property {{ok: boolean, sql: string, note?: string}} [roundTrip] round trip of this output
 */

/**
 * @typedef {object} ClauseMapEntry
 * @property {string} outputId output the entry belongs to
 * @property {string} clauseId clause id
 * @property {string} sql SQL text of the clause
 * @property {string} code code text of the clause (span texts joined by a line break)
 * @property {object|null} loc location in the input text
 * @property {boolean} dropped true when the output leaves the clause out
 */

/**
 * @typedef {object} ConvertResult
 * @property {Output[]} outputs one entry per target
 * @property {Message[]} messages messages about the input
 * @property {ClauseMapEntry[]} clauseMap clause ↔ code mapping for every available output
 * @property {{ok: boolean, sql: string, note?: string, skipped?: boolean}} roundTrip round trip
 * of the first available output (toCode) or of the printed SQL (toSql); `skipped` is true when
 * there was nothing to compare (a filter without a data extension name)
 */

/**
 * Reads Next AMPscript back (LookupRows on a marketing object, RetrieveSalesforceObjects).
 *
 * @param {string} code AMPscript code
 * @returns {{ast: SelectAst|null, messages: Message[], meta: object}} parse result
 */
function parseNextAmpscript(code) {
    return parseAmpscript(code, { platform: 'mcn' });
}

/**
 * Returns the reverse parser of a target.
 *
 * @param {{language: string}} target target
 * @param {'mce'|'mcn'} platform platform
 * @returns {(code: string) => {ast: SelectAst|null, messages: Message[], meta: object}} parser
 */
function reverseParserOf(target, platform) {
    if (target.language === 'handlebars') {
        return parseHandlebars;
    }
    if (target.language === 'ssjs') {
        return parseSsjs;
    }
    return platform === 'mcn' ? parseNextAmpscript : parseAmpscript;
}

/**
 * Builds the list of unavailable outputs for a target list.
 *
 * @param {ReadonlyArray<{id: string, language: string, label: string}>} targets targets
 * @param {string} reason plain reason
 * @returns {Output[]} outputs
 */
function unavailableOutputs(targets, reason) {
    return targets.map((target) => ({
        id: target.id,
        language: target.language,
        label: target.label,
        unavailable: reason,
        spans: [],
    }));
}

/**
 * Returns the column list `*` stands for, if known.
 *
 * @param {ConvertOptions} options options
 * @returns {string[]|undefined} column names
 */
function starColumns(options) {
    if (options.columns?.length) {
        return options.columns;
    }
    if (options.schema?.fields?.length) {
        return options.schema.fields.map((field) => field.name);
    }
    return;
}

/**
 * Collects the code text of a clause from the spans of an output.
 *
 * @param {string} code generated code
 * @param {Span[]} spans spans
 * @param {string} clauseId clause id
 * @returns {string} span texts joined by a line break
 */
function spanText(code, spans, clauseId) {
    return spans
        .filter((span) => span.clauseId === clauseId)
        .map((span) => code.slice(span.start, span.end))
        .join('\n');
}

/**
 * Reads generated code back and compares it with the query.
 *
 * @param {SelectAst} ast parsed query
 * @param {object} target target from `MCE_TARGETS`
 * @param {{code: string, dropped: string[]}} result emitter result
 * @param {ConvertOptions} options options
 * @returns {{ok: boolean, sql: string, note?: string}} round trip
 */
function roundTripOf(ast, target, result, options) {
    const back = reverseParserOf(target, options.platform)(result.code);
    if (!back.ast) {
        const reason = back.messages.find((message) => message.severity === 'error');
        return {
            ok: false,
            sql: '',
            note: `The generated ${target.label} code could not be read back${reason ? `: ${reason.message}` : '.'}`,
        };
    }
    const dropTop = result.dropped.includes('top') || Boolean(target.normalize.dropTop);
    const dropOrderBy = result.dropped.some((clauseId) => clauseId.startsWith('order-'));
    const flags = { ...target.normalize, columns: starColumns(options), dropTop, dropOrderBy };
    const isOk = normalizeSql(ast, flags) === normalizeSql(back.ast, flags);
    const left = [result.dropped.includes('top') && 'TOP', dropOrderBy && 'ORDER BY'].filter(
        Boolean,
    );
    let note;
    if (!isOk) {
        note = `Reading the ${target.label} code back gives a different query.`;
    } else if (left.length) {
        note = `Same query without ${left.join(' and ')}, which ${target.label} leaves out.`;
    }
    const sql = printSql(back.ast, { isTyped: Boolean(target.normalize.isTyped) });
    return note ? { ok: isOk, sql, note } : { ok: isOk, sql };
}

/**
 * SQL → code.
 *
 * @param {string} input SQL text
 * @param {ConvertOptions} options options
 * @returns {ConvertResult} result
 */
function convertToCode(input, options) {
    const { ast, messages } = parseSql(input);
    const targets =
        options.platform === 'mcn'
            ? MCN_TARGETS.filter((target) => target.dataSource === options.dataSource)
            : MCE_TARGETS;
    if (!ast) {
        return {
            outputs: unavailableOutputs(targets, 'Fix the errors in the query first.'),
            messages,
            clauseMap: [],
            roundTrip: { ok: false, sql: '', note: 'The query has errors.' },
        };
    }
    if (options.platform === 'mcn') {
        const emitOptions = { sourceText: input };
        return { messages, ...emitAll(ast, input, targets, emitOptions, options) };
    }
    if (!options.deKey) {
        messages.push(
            createMessage(
                'info',
                DE_KEY_ASSUMED,
                `No external key was given, so the code uses the name "${ast.from.name}" as the key. Enter the data extension's external key in the settings if it differs.`,
                ast.from.loc,
            ),
        );
    }
    if (ast.columns === '*' && !starColumns(options)) {
        const star = input.indexOf('*', ast.loc.start);
        const isFound = star !== -1 && star < ast.from.loc.start;
        messages.push(
            createMessage(
                'warning',
                SELECT_STAR_NEEDS_COLUMNS,
                'WSProxy needs the column names that * stands for. Enter them in the settings, or list the columns in the SELECT.',
                isFound ? locFromOffsets(input, star, star + 1) : ast.loc,
            ),
        );
    }
    const emitOptions = {
        deKey: options.deKey,
        columns: options.columns,
        schema: options.schema,
        output: options.output,
        sourceText: input,
    };
    return { messages, ...emitAll(ast, input, targets, emitOptions, options) };
}

/**
 * Runs every target's emitter and collects outputs, the clause map and the round trip.
 *
 * @param {SelectAst} ast parsed query
 * @param {string} input SQL text
 * @param {ReadonlyArray<object>} targets targets with `emit` and `normalize`
 * @param {object} emitOptions options passed to the emitters
 * @param {ConvertOptions} options convert options
 * @returns {{outputs: Output[], clauseMap: ClauseMapEntry[], roundTrip: object}} result parts
 */
function emitAll(ast, input, targets, emitOptions, options) {
    const { clauses } = collectClauses(ast, input);
    const outputs = [];
    const clauseMap = [];
    for (const target of targets) {
        const result = target.emit(ast, emitOptions);
        const base = { id: target.id, language: target.language, label: target.label };
        if (result.unavailable) {
            outputs.push({ ...base, unavailable: result.unavailable, spans: [] });
            continue;
        }
        outputs.push({
            ...base,
            code: result.code,
            spans: result.spans,
            messages: result.messages,
            dropped: result.dropped,
            roundTrip: roundTripOf(ast, target, result, options),
        });
        for (const clause of clauses) {
            clauseMap.push({
                outputId: target.id,
                clauseId: clause.clauseId,
                sql: clause.loc ? input.slice(clause.loc.start, clause.loc.end) : '',
                code: spanText(result.code, result.spans, clause.clauseId),
                loc: clause.loc,
                dropped: result.dropped.includes(clause.clauseId),
            });
        }
    }
    const first = outputs.find((output) => output.roundTrip);
    return {
        outputs,
        clauseMap,
        roundTrip: first
            ? first.roundTrip
            : { ok: false, sql: '', note: 'No target can express this query.' },
    };
}

/**
 * Reads lookup code with the matching reverse parser (AMPscript when the code looks like
 * AMPscript, else SSJS; the other parser is tried when the first one fails).
 *
 * @param {string} input code
 * @param {'mce'|'mcn'} platform platform (Next reads Handlebars and Next AMPscript)
 * @returns {{ast: SelectAst|null, messages: Message[], meta: object}} parse result
 */
function parseCode(input, platform) {
    const isLooksLikeAmpscript = /%%\[|%%=|\bSET\s+@/i.test(input);
    let parsers;
    if (platform === 'mcn') {
        parsers = /\{\{/.test(input)
            ? [parseHandlebars, parseNextAmpscript]
            : [parseNextAmpscript, parseHandlebars];
    } else {
        parsers = isLooksLikeAmpscript ? [parseAmpscript, parseSsjs] : [parseSsjs, parseAmpscript];
    }
    const primary = parsers[0](input);
    if (primary.ast) {
        return primary;
    }
    const secondary = parsers[1](input);
    return secondary.ast ? secondary : primary;
}

/**
 * A query activity rejects ORDER BY without TOP (live check 2026-11-26, DB
 * `entries/mce/mce-sql-query-activity-where-semantics.json`): tell the reader when the printed
 * SQL sorts every row.
 *
 * @param {SelectAst} ast statement read from the code
 * @param {'mce'|'mcn'} platform platform
 * @returns {Message[]} the info message, or none
 */
function orderByNeedsTop(ast, platform) {
    if (platform !== 'mce' || !ast.orderBy?.length || (ast.top !== null && ast.top !== undefined)) {
        return [];
    }
    return [
        createMessage(
            'info',
            ORDER_BY_NEEDS_TOP,
            'The SQL sorts without TOP. A query activity in Automation Studio rejects ORDER BY without TOP, so add TOP with the number of rows you need before running it there.',
            ast.orderBy[0].loc ?? ast.loc,
        ),
    ];
}

/**
 * Code → SQL.
 *
 * @param {string} input lookup code
 * @param {ConvertOptions} options options
 * @returns {ConvertResult} result
 */
function convertToSql(input, options) {
    const base = { id: 'sql', language: 'sql', label: 'SQL' };
    const back = parseCode(typeof input === 'string' ? input : '', options.platform);
    if (!back.ast) {
        return {
            outputs: [{ ...base, unavailable: 'Fix the errors in the code first.', spans: [] }],
            messages: back.messages,
            clauseMap: [],
            roundTrip: { ok: false, sql: '', note: 'The code has errors.' },
        };
    }
    const ast = back.ast;
    // a bare filter object (or a key-only WSProxy call) does not carry the name
    if (options.deName && (!back.meta?.deName || !ast.from.name)) {
        ast.from = { ...ast.from, name: options.deName };
    }
    // Handlebars keeps the value type: p1="5" is text and must not print as 5
    const typed = { isTyped: back.meta?.target?.startsWith('handlebars') ?? false };
    const { sql, spans } = printSqlWithSpans(ast, typed);
    const clauseMap = collectClauses(ast).clauses.map((clause) => ({
        outputId: 'sql',
        clauseId: clause.clauseId,
        sql: spanText(sql, spans, clause.clauseId),
        code: clause.loc ? input.slice(clause.loc.start, clause.loc.end) : '',
        loc: clause.loc,
        dropped: false,
    }));
    if (!ast.from.name) {
        // a bare filter without a FROM header and without options.deName: nothing to compare
        return {
            outputs: [{ ...base, code: sql, spans }],
            messages: back.messages,
            clauseMap,
            roundTrip: {
                ok: true,
                skipped: true,
                sql,
                note: 'The round trip is skipped because the filter does not name its data extension. Enter the data extension name in the settings.',
            },
        };
    }
    const again = parseSql(sql);
    const isOk = Boolean(again.ast) && normalizeSql(again.ast, typed) === normalizeSql(ast, typed);
    return {
        outputs: [{ ...base, code: sql, spans }],
        messages: [...back.messages, ...orderByNeedsTop(ast, options.platform)],
        clauseMap,
        roundTrip: isOk
            ? { ok: isOk, sql }
            : { ok: isOk, sql, note: 'The printed SQL does not read back as the same query.' },
    };
}

/**
 * Converts SQL to Marketing Cloud lookup code, or lookup code back to SQL.
 *
 * @param {string} input SQL (toCode) or SSJS / AMPscript (toSql)
 * @param {ConvertOptions} [options] options
 * @returns {ConvertResult} outputs, messages, clause map and round trip
 */
export function convert(input, options = {}) {
    const platform = options.platform ?? 'mce';
    if (platform !== 'mce' && platform !== 'mcn') {
        throw new TypeError(`Unknown platform "${platform}". Use "mce" or "mcn".`);
    }
    const direction = options.direction ?? 'toCode';
    if (direction !== 'toCode' && direction !== 'toSql') {
        throw new TypeError(`Unknown direction "${direction}". Use "toCode" or "toSql".`);
    }
    const dataSource = options.dataSource ?? 'CRM';
    if (dataSource !== 'CRM' && dataSource !== 'MO') {
        throw new TypeError(`Unknown data source "${dataSource}". Use "CRM" or "MO".`);
    }
    const resolved = { ...options, platform, dataSource };
    return direction === 'toSql' ? convertToSql(input, resolved) : convertToCode(input, resolved);
}
