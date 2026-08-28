/* eslint-disable unicorn/name-replacements -- the `mcdev-pipeline-step-market-vars.js` filename is fixed by the script-order invariant (referenced verbatim in index.md, the test require-list, and the hardcoded lock array); `varName` mirrors the `marketVariables[buRef][varName]` state shape used across the feature. */
/**
 * mcdev Pipeline Builder — market variables wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `market-vars` step on
 * `mpbController`. Shown after `prod-confirm`.
 *
 * Per pipeline (grouped by lineage root via `pipelinesByRoot()`) it renders one `<table>`:
 * variables run down the rows (a `suffix` row first, then every other variable alphabetically),
 * one input column per BU, grouped under environment column-group headers. Each variable value is
 * read/written on `wizardState.marketVariables[buRef][varName]` verbatim; the `suffix` row shares
 * `wizardState.suffixes` (auto-trimmed on store). Non-`suffix` rows can be renamed inline and
 * deleted from an actions column; a trailing ghost add-row creates new variables. Empty inputs get
 * a yellow warning border; non-`suffix` surrounding whitespace shows an advisory line; empty/
 * duplicate `suffix` is a hard error (red per-field text) enforced identically to the Suffixes step
 * via the shared `C.suffixFieldErrors()` validator.
 *
 * The four state helpers `variableNameError`, `renameVariable`, `addVariable` and
 * `filledBUCountFor` are PURE (no DOM, no `render()`, no `confirm()`) and are published on
 * `global.mpbController` at the end of the IIFE so they can be unit-tested; the DOM handlers are
 * thin wrappers over them.
 *
 * @typedef {import('./mcdev-pipeline-config-builder.js').WizardState} WizardState
 */

/**
 * @param {Window} global host window object
 */
(function (global) {
    'use strict';

    const C = global.mpbController;
    if (!C) {
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-market-vars.js');
    }

    const state = C.state;
    const setText = C.setText;
    const makeElement = C.makeEl;
    const childBUReferences = C.childBUReferences;
    const suffixOf = C.suffixOf;
    const suffixFieldErrors = C.suffixFieldErrors;
    const pipelinesByRoot = C.pipelinesByRoot;
    const environmentNames = C.environmentNames;
    const assignedBUReferences = C.assignedBUReferences;
    const suffixSlug = C.suffixSlug;
    const bareBUName = C.bareBUName;
    const updateNavGate = C.updateNavGate;
    const scheduleAutosave = C.scheduleAutosave;
    const render = C.render;

    /**
     * The current market-adoption map off wizard state, always a well-formed object (never null), so
     * callers can read `byBU`/`marketOf`/`needsSuffixKey`/`suffixKeyCandidates` without guarding. Read
     * straight from persisted state (via `mpb_pipeline`) — never reconstructed here.
     *
     * @returns {{byBU: object, marketOf: object, needsSuffixKey: boolean, suffixKeyCandidates: string[]}}
     *   the adoption map with defaulted fields
     */
    function marketAdoptionState() {
        const adoption = state.wizardState.marketAdoption;
        const safe = adoption && typeof adoption === 'object' ? adoption : {};
        return {
            byBU: safe.byBU && typeof safe.byBU === 'object' ? safe.byBU : {},
            marketOf: safe.marketOf && typeof safe.marketOf === 'object' ? safe.marketOf : {},
            needsSuffixKey: safe.needsSuffixKey === true,
            suffixKeyCandidates: Array.isArray(safe.suffixKeyCandidates) ? safe.suffixKeyCandidates : [],
        };
    }

    /**
     * The sorted non-reserved variable-KEY set of an adopted market, read from `marketOf[name].keys`.
     * Returns `null` when the market is unknown so callers can distinguish "absent" from "empty set".
     *
     * @param {object} marketOf the adoption `marketOf` map
     * @param {string} marketName the market name
     * @returns {?string[]} the sorted keys, or `null` when the market is absent
     */
    function marketKeySet(marketOf, marketName) {
        const entry = marketName && Object.hasOwn(marketOf, marketName) ? marketOf[marketName] : null;
        if (!entry) {
            return null;
        }
        return Array.isArray(entry.keys) ? [...entry.keys].toSorted((a, b) => a.localeCompare(b)) : [];
    }

    /**
     * Whether two variable-KEY sets are equal as unordered sets (same length + same members).
     *
     * @param {?string[]} a the first key set (or null)
     * @param {?string[]} b the second key set (or null)
     * @returns {boolean} true when both are non-null and hold exactly the same keys
     */
    function keySetsEqual(a, b) {
        if (!a || !b || a.length !== b.length) {
            return false;
        }
        const set = new Set(a);
        return b.every((key) => set.has(key));
    }

    /**
     * The BU refs of a pipeline that would NOT be filled by adopting `sourceMarketName`, using the
     * SAME key-set-equality + source-skip + parent-exclusion logic as `matchMarketsForPipeline`: a ref
     * mapped to the source market is skipped (never self-filled); every other ref is "unmatched" when
     * it has no adopted market or its key set differs from the source's. PURE (no state / DOM); shared
     * by the matcher's `unmatched` accumulation and the picker's read-only inline preview so the two
     * cannot drift. Parent BUs are excluded implicitly — they never appear in `pipelineReferences`.
     *
     * @param {string[]} pipelineReferences the pipeline's child buRefs
     * @param {string} sourceMarketName the chosen source market name
     * @param {{byBU: object, marketOf: object}} adoption the adoption map (byBU + marketOf)
     * @returns {string[]} the unmatched buRefs (input order preserved)
     */
    function unmatchedFor(pipelineReferences, sourceMarketName, adoption) {
        const safe = adoption && typeof adoption === 'object' ? adoption : {};
        const byBU = safe.byBU && typeof safe.byBU === 'object' ? safe.byBU : {};
        const marketOf = safe.marketOf && typeof safe.marketOf === 'object' ? safe.marketOf : {};
        const sourceKeys = marketKeySet(marketOf, sourceMarketName);
        const unmatched = [];
        for (const reference of pipelineReferences) {
            // The source BU(s) — those mapped to the chosen source market — are not self-filled.
            if (byBU[reference] === sourceMarketName) {
                continue;
            }
            const marketName = Object.hasOwn(byBU, reference) ? byBU[reference] : null;
            const entry = marketName && Object.hasOwn(marketOf, marketName) ? marketOf[marketName] : null;
            const otherKeys = marketKeySet(marketOf, marketName);
            if (!entry || !keySetsEqual(sourceKeys, otherKeys)) {
                unmatched.push(reference);
            }
        }
        return unmatched;
    }

    /**
     * The stored variable value for a BU/var, or `''` when unset. `suffix` is NOT stored in
     * `marketVariables` — the `suffix` row reads `wizardState.suffixes` directly.
     *
     * @param {string} reference the buRef
     * @param {string} varName the variable name
     * @returns {string} the stored value or `''`
     */
    function variableValueOf(reference, varName) {
        const all = state.wizardState.marketVariables || {};
        const forBU = all[reference];
        return forBU && typeof forBU[varName] === 'string' ? forBU[varName] : '';
    }

    /**
     * Write a variable value verbatim (no trim) into `wizardState.marketVariables[reference][varName]`,
     * cloning the maps so the stored objects are never mutated in place.
     *
     * @param {string} reference the buRef
     * @param {string} varName the variable name
     * @param {string} value the raw value to store
     * @returns {void}
     */
    function setVariableValue(reference, varName, value) {
        const all = { ...state.wizardState.marketVariables };
        const forBU = { ...all[reference] , [varName]: value,};
        all[reference] = forBU;
        state.wizardState.marketVariables = all;
    }

    /**
     * The ordered variable-name list for a pipeline: `suffix` always first, then the union of every
     * non-`suffix` variable name defined on any BU in the pipeline, sorted case-insensitively (stable).
     *
     * @param {string[]} references the pipeline's buRefs
     * @returns {string[]} ordered variable names, `suffix` first
     */
    function variableNamesFor(references) {
        const names = new Set();
        const all = state.wizardState.marketVariables || {};
        for (const reference of references) {
            const forBU = all[reference];
            if (forBU && typeof forBU === 'object') {
                for (const name of Object.keys(forBU)) {
                    if (name !== 'suffix') {
                        names.add(name);
                    }
                }
            }
        }
        const sorted = [...names].toSorted((a, b) =>
            a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0
        );
        return ['suffix', ...sorted];
    }

    /**
     * The environments (in env order) that hold at least one BU of the given pipeline, paired with
     * that pipeline's BUs assigned to each — so a pipeline renders one column-group per environment
     * it touches, listing only its own BUs.
     *
     * @param {string[]} references the pipeline's buRefs (a Set-like array)
     * @returns {{environment: string, references: string[]}[]} per-env column descriptors
     */
    function pipelineColumns(references) {
        const wanted = new Set(references);
        const columns = [];
        for (const environment of environmentNames()) {
            const inColumn = assignedBUReferences(environment).filter((reference) => wanted.has(reference));
            if (inColumn.length > 0) {
                columns.push({ environment: environment, references: inColumn });
            }
        }
        return columns;
    }

    /**
     * Whether a raw input value counts as "empty" for the yellow border rule: blank or whitespace-only.
     *
     * @param {string} value the raw input value
     * @returns {boolean} true when empty/whitespace-only
     */
    function isEmptyValue(value) {
        return value.trim() === '';
    }

    // ── Pure state helpers (published on the controller; no DOM / render / confirm) ──

    /**
     * Validate a candidate variable name (shared by the add-row and inline-rename inputs). Names are
     * ALWAYS trimmed — leading/trailing spaces are never stored (this differs from values, which are
     * stored verbatim). Returns `''` when the name is acceptable, otherwise a human-readable red-error
     * message describing the first violation.
     *
     * Rules: non-empty; identifier charset `^[A-Za-z_][A-Za-z0-9_]*$` (also excludes the curly braces
     * mcdev would interpret as `{{mustache}}` tokens); not the reserved `suffix`/`description`/
     * `__proto__`; and not already present on the pipeline (excluding `selfName`, so rename-to-self is
     * not a collision).
     *
     * @param {string} candidate the raw name the user typed
     * @param {string[]} pipelineReferences the pipeline's buRefs (scopes the duplicate check)
     * @param {?string} selfName the row's own current name (rename), or `null` for a fresh add
     * @returns {string} `''` when valid, otherwise the error message
     */
    function variableNameError(candidate, pipelineReferences, selfName) {
        const name = String(candidate ?? '').trim();
        if (!name) {
            return 'Enter a variable name.';
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
            // Curly brackets are among the rejected characters here: mcdev interpolates market keys as
            // `{{key}}` mustache tokens, so a brace in a name would break templating. If this charset is
            // ever loosened, keep an explicit `/[{}]/` rejection with a curly-brace-specific message.
            return 'Use letters, digits and underscore; must not start with a digit (no spaces or punctuation).';
        }
        if (['suffix', 'description', '__proto__'].includes(name)) {
            return 'That name is reserved.';
        }
        for (const existing of variableNamesFor(pipelineReferences)) {
            if (existing === name && existing !== selfName) {
                return 'A variable named "' + name + '" already exists in this pipeline.';
            }
        }
        return '';
    }

    /**
     * Rename a variable across every BU of a pipeline (pure client-side rekey). No-op when `newName`
     * fails `variableNameError` (empty/charset/reserved/duplicate) or equals `oldName` unchanged;
     * otherwise clones `marketVariables` and moves each BU's value verbatim from `oldName` to the
     * trimmed `newName`, deleting the old key. The caller does `scheduleAutosave(); render()` after.
     *
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @param {string} oldName the current variable name
     * @param {string} newName the desired new name (trimmed here)
     * @returns {boolean} true when a rename was applied, false on a guarded no-op
     */
    function renameVariable(pipelineReferences, oldName, newName) {
        const next = String(newName ?? '').trim();
        if (next === oldName) {
            return false;
        }
        if (variableNameError(next, pipelineReferences, oldName) !== '') {
            return false;
        }
        const all = { ...state.wizardState.marketVariables };
        for (const reference of pipelineReferences) {
            const forBU = all[reference];
            if (!forBU || !Object.hasOwn(forBU, oldName)) {
                continue;
            }
            const nextForBU = { ...forBU };
            nextForBU[next] = nextForBU[oldName];
            delete nextForBU[oldName];
            all[reference] = nextForBU;
        }
        state.wizardState.marketVariables = all;
        return true;
    }

    /**
     * Add a new variable to a pipeline, seeding an empty `''` value on EVERY BU (clone-not-mutate).
     * No-op when the trimmed name fails `variableNameError` (empty/charset/reserved/duplicate). The
     * caller does `scheduleAutosave(); render()` after.
     *
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @param {string} name the desired variable name (trimmed here)
     * @returns {boolean} true when the variable was added, false on a guarded no-op
     */
    function addVariable(pipelineReferences, name) {
        const clean = String(name ?? '').trim();
        if (variableNameError(clean, pipelineReferences, null) !== '') {
            return false;
        }
        const all = { ...state.wizardState.marketVariables };
        for (const reference of pipelineReferences) {
            const forBU = { ...all[reference] };
            if (!Object.hasOwn(forBU, clean)) {
                forBU[clean] = '';
            }
            all[reference] = forBU;
        }
        state.wizardState.marketVariables = all;
        return true;
    }

    /**
     * How many of a pipeline's BUs hold a non-empty (non-whitespace) stored value for a variable.
     * Backs the delete-confirmation message ("values in N of M BUs").
     *
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @param {string} name the variable name
     * @returns {number} the count of BUs with a non-empty stored value
     */
    function filledBUCountFor(pipelineReferences, name) {
        return pipelineReferences.filter((reference) => variableValueOf(reference, name).trim() !== '').length;
    }

    /**
     * Auto-fill sibling market variables + suffixes for a pipeline from a chosen SOURCE market
     * (the source-market picker's action). PURE state transform (no DOM / render) so it can be
     * unit-tested headlessly via `controller.matchMarketsForPipeline(...)`.
     *
     * Semantics (per plan §10): compute the source market's non-reserved variable-KEY set
     * (`marketOf[sourceMarketName].keys`, excluding `suffix`/`description`). For every OTHER BU ref in
     * the pipeline that has a `byBU[buRef]` market whose key set EQUALS the source set, OVERWRITE
     * `state.wizardState.marketVariables[buRef]` with that BU market's `{key:value}` vars and
     * `state.wizardState.suffixes[buRef]` with that market's effective suffix (the detector's
     * pre-computed `marketOf[...].suffix`, normalised to be separator-prefixed exactly once to match
     * the wizard's storage convention). BUs with no `byBU` market
     * or a mismatched key set are left untouched and collected for the caller's inline "unmatched"
     * note. Parent BUs are implicitly excluded — they never appear in `childBUReferences()` /
     * `pipelineReferences`, and their key sets differ regardless.
     *
     * When `sourceMarketName` is unknown (no `marketOf` entry), nothing is written and every non-source
     * BU is reported as unmatched.
     *
     * @param {string[]} pipelineReferences the pipeline's child buRefs
     * @param {string} sourceMarketName the chosen source market name
     * @param {{byBU: object, marketOf: object}} marketAdoption the adoption map (byBU + marketOf)
     * @returns {{matched: string[], unmatched: string[]}} the BUs filled vs. left untouched
     */
    function matchMarketsForPipeline(pipelineReferences, sourceMarketName, marketAdoption) {
        const adoption = marketAdoption && typeof marketAdoption === 'object' ? marketAdoption : {};
        const byBU = adoption.byBU && typeof adoption.byBU === 'object' ? adoption.byBU : {};
        const marketOf = adoption.marketOf && typeof adoption.marketOf === 'object' ? adoption.marketOf : {};

        const separator = state.wizardState.separator || '_';
        const nextVariables = { ...state.wizardState.marketVariables };
        const nextSuffixes = { ...state.wizardState.suffixes };
        const matched = [];
        // Single source of truth for the mismatch/absent set (shared with the picker's inline preview
        // via `unmatchedFor`) so the two can never drift.
        const unmatched = unmatchedFor(pipelineReferences, sourceMarketName, adoption);
        const unmatchedSet = new Set(unmatched);

        for (const reference of pipelineReferences) {
            // Skip the source BU(s) (never self-filled) and anything `unmatchedFor` left out.
            if (byBU[reference] === sourceMarketName || unmatchedSet.has(reference)) {
                continue;
            }
            const marketName = byBU[reference];
            const entry = Object.hasOwn(marketOf, marketName) ? marketOf[marketName] : null;
            // Key sets match: overwrite this BU's variables (values as-is) and its effective suffix.
            const vars = entry.vars && typeof entry.vars === 'object' ? entry.vars : {};
            nextVariables[reference] = { ...vars };
            // Use the detector's pre-computed effective suffix (`entry.suffix`); `vars` never carries
            // `suffix` (stripped by the detector), so recomputing from it would drop real `.suffix`
            // values. Normalise so both sources land separator-prefixed exactly once.
            const body = typeof entry.suffix === 'string' ? entry.suffix : '';
            nextSuffixes[reference] = body === '' ? '' : body.startsWith(separator) ? body : separator + body;
            matched.push(reference);
        }

        state.wizardState.marketVariables = nextVariables;
        state.wizardState.suffixes = nextSuffixes;
        return { matched: matched, unmatched: unmatched };
    }

    /**
     * Delete a variable from every BU of a pipeline (clone-not-mutate). Pure state transform used by
     * the DOM delete handler after `global.confirm()`; the caller does `scheduleAutosave(); render()`.
     *
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @param {string} name the variable name to delete
     * @returns {void}
     */
    function deleteVariable(pipelineReferences, name) {
        const all = { ...state.wizardState.marketVariables };
        for (const reference of pipelineReferences) {
            const forBU = all[reference];
            if (!forBU || !Object.hasOwn(forBU, name)) {
                continue;
            }
            const nextForBU = { ...forBU };
            delete nextForBU[name];
            all[reference] = nextForBU;
        }
        state.wizardState.marketVariables = all;
    }

    /**
     * Build one variable input cell for a single BU. Returns the cell element plus the handles a
     * caller needs for in-place warning/border refreshes. Typing (or paste/cut/undo — all `input`
     * events) updates state and refreshes the warnings/border in place, never rebuilding the input.
     *
     * Only the `suffix` cell keeps the `.mpb-suffix-input` composite (separator prefix + borderless
     * body); non-`suffix` cells render a plain `.mpb-mv-input` so the single-class warn/error styles
     * win cleanly and the padding is not inherited from the suffix body.
     *
     * @param {string} environment the owning environment (for id uniqueness)
     * @param {string} reference the buRef
     * @param {string} varName the variable name (`suffix` is special: see below)
     * @param {() => void} refreshAll repaint every row's warnings/border after a state edit
     * @returns {{cell: HTMLElement, input: HTMLInputElement, warnings: HTMLElement, reference: string, varName: string}}
     *   the built cell and its in-place-refresh handles
     */
    function variableCell(environment, reference, varName, refreshAll) {
        const cell = makeElement('div', { class: 'mpb-env-node-control' });
        const inputId =
            'mpb-mv-' + suffixSlug(environment) + '-' + suffixSlug(reference) + '-' + suffixSlug(varName);

        const isSuffix = varName === 'suffix';
        const separator = state.wizardState.separator || '_';
        const ariaLabel = varName + ' for ' + reference;

        let input;
        if (isSuffix) {
            // The suffix row shares wizardState.suffixes and shows the fixed separator prefix inside the
            // rounded `.mpb-suffix-input` composite (separator span + borderless body).
            const group = makeElement('div', { class: 'mpb-suffix-input' });
            group.append(makeElement('span', { class: 'mpb-suffix-sep', text: separator }));
            const stored = suffixOf(reference);
            const initialValue = stored.startsWith(separator) ? stored.slice(separator.length) : stored;
            input = makeElement('input', {
                type: 'text',
                id: inputId,
                value: initialValue,
                attrs: { autocomplete: 'off', spellcheck: 'false', 'aria-label': ariaLabel },
            });
            group.append(input);
            cell.append(group);
        } else {
            // Non-suffix values render a plain input (no `.mpb-suffix-input` wrapper).
            const initialValue = variableValueOf(reference, varName);
            input = makeElement('input', {
                type: 'text',
                id: inputId,
                class: 'mpb-mv-input',
                value: initialValue,
                attrs: { autocomplete: 'off', spellcheck: 'false', 'aria-label': ariaLabel },
            });
            cell.append(input);
        }

        input.addEventListener('input', () => {
            if (isSuffix) {
                // Auto-trim on store (identical to the Suffixes step) — the shared suffixes map never
                // retains surrounding spaces. The visible value is left as typed so the caret is safe.
                const activeSeparator = state.wizardState.separator || '_';
                const trimmedBody = input.value.trim();
                state.wizardState.suffixes = {
                    ...state.wizardState.suffixes,
                    [reference]: activeSeparator + trimmedBody,
                };
            } else {
                // Non-suffix values are stored EXACTLY as entered so intentional spaces round-trip.
                setVariableValue(reference, varName, input.value);
            }
            refreshAll();
            updateNavGate();
            scheduleAutosave();
        });

        // Per-cell warnings slot (painted/cleared in place).
        const warnings = makeElement('div', { class: 'mpb-suffix-warnings' });
        cell.append(warnings);

        return { cell: cell, input: input, warnings: warnings, reference: reference, varName: varName };
    }

    /**
     * Locate the tbody row keyed by `data-var` in the freshly-rebuilt panel and briefly flash it, so
     * the eye catches where an added/renamed row landed after the alphabetical re-sort. Iterates rows
     * comparing `getAttribute('data-var')` (avoids CSS-selector injection from unusual names). The
     * whole row flashes twice (~1.2s total); every cell tints via the `.mpb-mv-flash > td` rule. The
     * one-shot class is removed on `animationend` (with a `setTimeout` fallback matching the
     * 2-iteration duration) so a subsequent flash can re-trigger. `animationend` bubbles up from each
     * per-cell `<td>` animation to the row and fires once per cell — `{ once: true }` clears on the
     * first. No-op in the headless test harness (no `querySelectorAll`).
     *
     * @param {string} varName the variable name (data-var key) to flash
     * @returns {void}
     */
    function flashRow(varName) {
        const host = C.dom && C.dom.stepHost;
        if (!host || typeof host.querySelectorAll !== 'function') {
            return;
        }
        const rows = host.querySelectorAll('tr[data-var]');
        for (const row of rows) {
            if (row.dataset.var !== varName) {
                continue;
            }
            row.classList.add('mpb-mv-flash');
            const clear = () => {
                row.classList.remove('mpb-mv-flash');
            };
            row.addEventListener('animationend', clear, { once: true });
            // Fallback matches the 2× 600ms animation (+ a small margin) so the class is cleared even
            // if no `animationend` fires (e.g. reduced-motion `animation: none`).
            global.setTimeout(clear, 1400);
            return;
        }
    }

    /**
     * Whether the user has asked the OS to reduce motion. Guards the headless test harness (no
     * `matchMedia`) by returning `false` there, so a test-driven delete still runs `then` immediately
     * via the no-flash branch below.
     *
     * @returns {boolean} true when reduced motion is preferred
     */
    function prefersReducedMotion() {
        return typeof global.matchMedia === 'function'
            ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false;
    }

    /**
     * Flash a row's background RED twice (~1.2s) on the CURRENT DOM, then run `then` on animation end.
     * Used by the confirmed-delete handler: because the shared `render()` wipes the step host, the
     * red pulse must play on the live row FIRST and the delete+re-render must run only after it ends.
     *
     * The row is found via the delete button's `closest('tr')`. Under `prefers-reduced-motion` — or in
     * the headless harness where the button has no `closest` — `then` runs immediately with no flash.
     * Otherwise the `.mpb-mv-flash-delete` class is added and `then` fires on the first `animationend`
     * (with a `setTimeout` fallback matching the duration, so `then` always runs exactly once).
     *
     * @param {HTMLElement} deleteButton the clicked delete button (to locate its row)
     * @param {() => void} then the delete+render callback to run once the flash completes
     * @returns {void}
     */
    function flashRowDeleteThen(deleteButton, then) {
        const row = typeof deleteButton.closest === 'function' ? deleteButton.closest('tr') : null;
        if (!row || prefersReducedMotion()) {
            then();
            return;
        }
        let hasRun = false;
        const runOnce = () => {
            if (hasRun) {
                return;
            }
            hasRun = true;
            then();
        };
        row.classList.add('mpb-mv-flash-delete');
        row.addEventListener('animationend', runOnce, { once: true });
        // Fallback matches the 2× 600ms animation (+ a small margin) so the delete still runs if no
        // `animationend` fires.
        global.setTimeout(runOnce, 1400);
    }

    /**
     * Build the name-column cell for a variable row. The `suffix` row is a static span; other rows get
     * a seamless inline rename input (`.mpb-mv-name-input`) with a `.mpb-field-error` slot beneath.
     * Live-validates on every `input` (keystroke/paste/cut) via `variableNameError`; commits only on
     * Enter or blur (revert to the original name on invalid/unchanged); Escape reverts. A `committed`
     * flag guards the Enter→blur double-commit (Enter's `render()` detaches the input, then a trailing
     * blur fires on the dead node).
     *
     * @param {string} varName the variable name for this row
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @returns {{cell: HTMLElement, nameInput: ?HTMLInputElement}} the name cell + its input (null for suffix)
     */
    function nameCell(varName, pipelineReferences) {
        const cell = makeElement('td', { class: 'mpb-mv-name-cell' });
        if (varName === 'suffix') {
            cell.append(makeElement('span', { class: 'mpb-mv-name-static', text: 'suffix' }));
            return { cell: cell, nameInput: null };
        }

        const nameInput = makeElement('input', {
            type: 'text',
            class: 'mpb-mv-name-input',
            value: varName,
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': 'Rename variable ' + varName,
            },
        });
        const error = makeElement('div', { class: 'mpb-field-error-slot' });
        cell.append(nameInput, error);

        let isCommitted = false;

        /**
         * Paint/clear the live-validation error for the current input value.
         *
         * @returns {string} the current error message ('' when valid)
         */
        function paintError() {
            const message = variableNameError(nameInput.value, pipelineReferences, varName);
            setText(error, '');
            const isInvalid = message !== '';
            nameInput.classList.toggle('mpb-input-warn', isInvalid);
            nameInput.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
            if (isInvalid) {
                error.append(makeElement('p', { class: 'mpb-field-error', text: message }));
            }
            return message;
        }

        /**
         * Commit the rename (Enter/blur). Reverts the input to the original name on invalid/unchanged;
         * on a valid change, applies the pure rekey then re-renders and flashes the landed row.
         *
         * @returns {void}
         */
        function commit() {
            if (isCommitted) {
                return;
            }
            const next = nameInput.value.trim();
            if (next === varName || variableNameError(next, pipelineReferences, varName) !== '') {
                // Invalid or unchanged: never persist — revert the field to the stored name.
                nameInput.value = varName;
                setText(error, '');
                nameInput.classList.remove('mpb-input-warn');
                nameInput.setAttribute('aria-invalid', 'false');
                return;
            }
            isCommitted = true;
            renameVariable(pipelineReferences, varName, next);
            scheduleAutosave();
            render();
            flashRow(next);
        }

        nameInput.addEventListener('input', paintError);
        nameInput.addEventListener('blur', commit);
        nameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                nameInput.value = varName;
                paintError();
                nameInput.blur();
            }
        });

        return { cell: cell, nameInput: nameInput };
    }

    /**
     * Build the actions-column cell for a variable row: empty for `suffix`; otherwise a compact edit
     * (focus+select the rename input) and delete (confirm-then-delete) button pair.
     *
     * @param {string} varName the variable name for this row
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @param {?HTMLInputElement} nameInput the row's rename input (for the edit button), or null
     * @returns {HTMLElement} the actions `<td>`
     */
    function actionsCell(varName, pipelineReferences, nameInput) {
        const cell = makeElement('td', { class: 'mpb-mv-actions-cell' });
        if (varName === 'suffix') {
            return cell;
        }

        const actions = makeElement('div', { class: 'mpb-mv-actions' });

        const editButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary mpb-mv-action-btn',
            text: '✎',
            attrs: { 'aria-label': 'Rename variable ' + varName, title: 'Rename' },
        });
        editButton.addEventListener('click', () => {
            if (!(nameInput && typeof nameInput.focus === 'function')) {
                return;
            }

            nameInput.focus();
            if (typeof nameInput.select === 'function') {
                nameInput.select();
            }
        });

        const deleteButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--danger mpb-mv-action-btn',
            text: '🗑',
            attrs: { 'aria-label': 'Delete variable ' + varName, title: 'Delete' },
        });
        deleteButton.addEventListener('click', () => {
            const filled = filledBUCountFor(pipelineReferences, varName);
            const total = pipelineReferences.length;
            const message =
                filled > 0
                    ? 'Delete variable "' +
                      varName +
                      '"? It has values in ' +
                      filled +
                      ' of ' +
                      total +
                      ' business unit(s) that will be permanently deleted. This cannot be undone.'
                    : 'Delete variable "' + varName + '"?';
            if (!global.confirm(message)) {
                return;
            }
            /**
             * The actual delete: pure state transform + autosave + full re-render (which wipes the
             * step host, so it must run AFTER any on-DOM flash completes).
             *
             * @returns {void}
             */
            const performDelete = () => {
                deleteVariable(pipelineReferences, varName);
                scheduleAutosave();
                render();
            };
            flashRowDeleteThen(deleteButton, performDelete);
        });

        actions.append(editButton, deleteButton);
        cell.append(actions);
        return cell;
    }

    /**
     * Build the trailing ghost add-row for a pipeline table: an inline name input + confirm button in
     * the name column, with a `.mpb-field-error` slot beneath. Live-validates on every `input` and
     * disables the confirm button (and blocks Enter) while the (non-empty) name is invalid. On a valid
     * confirm it adds the variable (seeds `''` on every BU), re-renders, and flashes the new row.
     *
     * @param {string[]} pipelineReferences the pipeline's buRefs
     * @param {number} columnCount the number of BU columns (for the empty trailing cells)
     * @returns {HTMLElement} the `<tr class="mpb-mv-add-row">`
     */
    function addRow(pipelineReferences, columnCount) {
        const row = makeElement('tr', { class: 'mpb-mv-add-row' });

        const nameTd = makeElement('td', { class: 'mpb-mv-name-cell' });
        const controls = makeElement('div', { class: 'mpb-mv-add-controls' });
        const input = makeElement('input', {
            type: 'text',
            class: 'mpb-mv-name-input mpb-mv-add-input',
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                placeholder: '+ Add variable',
                'aria-label': 'New variable name',
            },
        });
        const confirmButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary mpb-mv-add-confirm',
            text: 'Add',
        });
        confirmButton.disabled = true;
        const error = makeElement('div', { class: 'mpb-field-error-slot' });
        controls.append(input, confirmButton);
        nameTd.append(controls, error);
        row.append(nameTd);

        // Actions cell + one empty cell per BU keep the add-row aligned without implying a per-BU value.
        row.append(makeElement('td', { class: 'mpb-mv-actions-cell' }));
        for (let index = 0; index < columnCount; index += 1) {
            row.append(makeElement('td', {}));
        }

        /**
         * Re-evaluate the live error + confirm-button disabled state for the current input value.
         *
         * @returns {string} the current error message ('' when valid, and '' also when simply empty)
         */
        function refresh() {
            const raw = input.value;
            const message = variableNameError(raw, pipelineReferences, null);
            setText(error, '');
            const isEmpty = raw.trim() === '';
            // Empty simply keeps the button disabled with no error shout.
            const isInvalid = message !== '';
            input.classList.toggle('mpb-input-warn', isInvalid && !isEmpty);
            input.setAttribute('aria-invalid', isInvalid && !isEmpty ? 'true' : 'false');
            if (isInvalid && !isEmpty) {
                error.append(makeElement('p', { class: 'mpb-field-error', text: message }));
            }
            confirmButton.disabled = isInvalid;
            return message;
        }

        /**
         * Add the variable if valid, then clear the field, re-render, and flash the new row.
         *
         * @returns {void}
         */
        function submit() {
            const name = input.value.trim();
            if (variableNameError(name, pipelineReferences, null) !== '') {
                return;
            }
            if (!addVariable(pipelineReferences, name)) {
                return;
            }
            input.value = '';
            scheduleAutosave();
            render();
            flashRow(name);
        }

        input.addEventListener('input', refresh);
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return;
            }

            event.preventDefault();
            submit();
        });
        confirmButton.addEventListener('click', submit);

        return row;
    }

    /**
     * Build the suffix-key selector block, shown at the top of the step when the adopted configuration
     * carries no real `suffix` field (`marketAdoption.needsSuffixKey`) OR a `suffixKey` is already
     * chosen (so it can be changed). Lets the user designate which market-variable KEY acts as the
     * suffix source; on change it sets `state.wizardState.suffixKey` and re-renders so effective
     * suffixes derive from that key. The selection persists via `mpb_pipeline` (no separate path).
     * Returns `null` when neither condition holds (nothing to show).
     *
     * @returns {?HTMLElement} the selector block, or `null` when not applicable
     */
    function suffixKeySelector() {
        const adoption = marketAdoptionState();
        const chosenKey = state.wizardState.suffixKey || null;
        const candidates = adoption.suffixKeyCandidates;
        // Show when the config needs a key, or when one is set (so it can be changed). Never with no
        // candidates to offer.
        if (candidates.length === 0 || (!chosenKey && !adoption.needsSuffixKey)) {
            return null;
        }

        const block = makeElement('div', { class: 'mpb-mv-suffix-key' });
        block.append(
            makeElement('p', {
                class: 'mpb-mv-suffix-key-note',
                text: chosenKey
                    ? 'No suffix field was found in the adopted configuration. The selected market variable below is used as each market\u{2019}s suffix; change it if a different variable holds the suffix.'
                    : 'No suffix field was found in the adopted configuration. Pick which market variable acts as the suffix source so per-BU suffixes can be derived.',
            })
        );

        const selectId = 'mpb-mv-suffix-key-select';
        const label = makeElement('label', {
            class: 'mpb-mv-suffix-key-label',
            text: 'Suffix source variable',
            attrs: { for: selectId },
        });
        const select = makeElement('select', { id: selectId, class: 'mpb-mv-suffix-key-input' });
        const placeholder = makeElement('option', {
            text: 'Select which variable is the suffix',
            value: '',
        });
        placeholder.disabled = true;
        if (!chosenKey) {
            placeholder.selected = true;
        }
        select.append(placeholder);
        for (const key of candidates) {
            const option = makeElement('option', { text: key, value: key });
            if (key === chosenKey) {
                option.selected = true;
            }
            select.append(option);
        }
        select.addEventListener('change', () => {
            const value = select.value;
            if (!value) {
                return;
            }
            state.wizardState.suffixKey = value;
            scheduleAutosave();
            render();
        });

        block.append(label, select);
        return block;
    }

    /**
     * Build the per-pipeline source-market picker control, or `null` when the pipeline is not covered
     * by adoption data. Eligibility (per plan §10): the pipeline's SOURCE-env BU(s) —
     * `pipelineColumns(pipelineReferences)[0].references`, the FIRST env column — must include at least
     * one BU with a `byBU` market, AND at least one OTHER BU in the pipeline must also have one.
     *
     * The picker offers the distinct markets mapped (via `byBU`) to the source-env BUs. With exactly
     * one candidate market the `<select>` is hidden and just an "Apply market variables" button (plus a
     * label naming the market) is shown. On Apply it calls `matchMarketsForPipeline(...)`, autosaves,
     * and re-renders; the inline "unmatched" note is rebuilt from the fresh match on the next render.
     *
     * @param {string[]} pipelineReferences the pipeline's child buRefs
     * @param {number} pipelineNumber the 1-based render-order pipeline number (for id uniqueness)
     * @returns {?HTMLElement} the picker control, or `null` when the pipeline is not eligible
     */
    function sourceMarketPicker(pipelineReferences, pipelineNumber) {
        const adoption = marketAdoptionState();
        const byBU = adoption.byBU;
        const columns = pipelineColumns(pipelineReferences);
        const sourceReferences = columns.length > 0 ? columns[0].references : [];

        // Source-env markets: distinct markets mapped to the FIRST env column's BUs.
        const sourceMarkets = [];
        const seenMarkets = new Set();
        let hasSourceMarket = false;
        for (const reference of sourceReferences) {
            const marketName = Object.hasOwn(byBU, reference) ? byBU[reference] : null;
            if (!marketName) {
                continue;
            }
            hasSourceMarket = true;
            if (!seenMarkets.has(marketName)) {
                seenMarkets.add(marketName);
                sourceMarkets.push(marketName);
            }
        }

        // Eligibility: a source-env BU has a market AND >=1 OTHER pipeline BU also has one.
        const sourceSet = new Set(sourceReferences);
        const hasOtherMarket = pipelineReferences.some((reference) => {
            const marketName = Object.hasOwn(byBU, reference) ? byBU[reference] : null;
            return !sourceSet.has(reference) && Boolean(marketName);
        });
        if (!hasSourceMarket || !hasOtherMarket || sourceMarkets.length === 0) {
            return null;
        }

        const control = makeElement('div', { class: 'mpb-mv-adopt' });
        control.append(
            makeElement('p', {
                class: 'mpb-mv-adopt-note',
                text: 'Detected per-BU market lists for this pipeline. Pick the source market to auto-fill matching business units\u{2019} variables and suffixes.',
            })
        );

        const isSingle = sourceMarkets.length === 1;
        const selectId = 'mpb-mv-adopt-select-' + pipelineNumber;
        let getChosenMarket;

        if (isSingle) {
            // Single candidate: hide the <select>, name the market, show just the Apply button.
            const only = sourceMarkets[0];
            control.append(
                makeElement('span', {
                    class: 'mpb-mv-adopt-market',
                    text: 'Source market: ' + only,
                })
            );
            getChosenMarket = () => only;
        } else {
            const label = makeElement('label', {
                class: 'mpb-mv-adopt-label',
                text: 'Source market',
                attrs: { for: selectId },
            });
            const select = makeElement('select', { id: selectId, class: 'mpb-mv-adopt-input' });
            for (const marketName of sourceMarkets) {
                select.append(makeElement('option', { text: marketName, value: marketName }));
            }
            control.append(label, select);
            getChosenMarket = () => select.value;
        }

        const applyButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary mpb-mv-adopt-apply',
            text: 'Apply market variables',
        });
        applyButton.addEventListener('click', () => {
            const chosen = getChosenMarket();
            if (!chosen) {
                return;
            }
            matchMarketsForPipeline(pipelineReferences, chosen, marketAdoptionState());
            scheduleAutosave();
            render();
        });
        control.append(applyButton);

        // Inline unmatched note: read-only preview of which pipeline BUs the matcher would leave
        // unchanged, so the user sees ahead of applying which BUs need manual attention. Uses the
        // shared `unmatchedFor` helper — the SAME source-skip + key-set-equality the matcher applies —
        // so this note can never drift from `matchMarketsForPipeline`'s actual `unmatched` result.
        const preview = getChosenMarket();
        const unmatched = unmatchedFor(pipelineReferences, preview, adoption);
        if (unmatched.length > 0) {
            control.append(
                makeElement('p', {
                    class: 'mpb-mv-adopt-unmatched',
                    text:
                        'These business units have no matching market and will be left unchanged: ' +
                        unmatched.map((reference) => bareBUName(reference) || reference).join(', ') +
                        '.',
                })
            );
        }

        return control;
    }

    /**
     * The `market-vars` step render. Builds one `<table>` per pipeline (grouped by lineage root):
     * variables down the rows (`suffix` first, then alpha), one input column per BU under environment
     * column-group headers, a name column (static for suffix, inline-rename input otherwise), and an
     * actions column (edit/delete for non-suffix rows). A trailing ghost add-row creates new
     * variables. Empty inputs flag yellow; non-`suffix` surrounding whitespace warns inline; empty/
     * duplicate `suffix` errors red.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderMarketVariablesStep(panel) {
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Define extra market variables per pipeline. Each variable is a row; each business unit is a column — like the suffix row. The suffix is always shown first and is shared with the Suffixes step.',
            })
        );

        const references = childBUReferences();
        if (references.length === 0) {
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }

        // Suffix-key selector (top of step): shown when the adopted config has no real `suffix` field
        // (needsSuffixKey) or a key is already chosen. Feeds effective suffixes for the picker/matcher.
        const suffixKeyBlock = suffixKeySelector();
        if (suffixKeyBlock) {
            panel.append(suffixKeyBlock);
        }

        // Every value cell across every pipeline, so a value edit can refresh all borders/warnings and
        // the shared legend in one pass (cross-BU suffix duplicates included).
        const cells = [];

        // The advisory legend is only shown when at least one NON-suffix input is empty. It is created
        // up front and toggled on each refresh so it can appear/disappear without a full re-render.
        const legend = makeElement('p', {
            class: 'mpb-market-legend',
            text: 'Yellow-bordered fields are empty. Non-suffix values may be left empty at your own risk, but setting a value for every BU is recommended so metadata templating / bi-directional replacement across BUs works — an empty value means a sibling BU cannot find the anchor it needs to replace.',
        });
        legend.hidden = true;
        panel.append(legend);

        /**
         * Repaint every value cell's border + warnings in place, and toggle the advisory legend. Empty
         * → yellow border (`mpb-input-warn`); non-`suffix` value with surrounding whitespace → inline
         * `.mpb-warn`; `suffix` empty/duplicate → red `.mpb-field-error` from the shared validator.
         *
         * @returns {void}
         */
        function refreshAll() {
            const suffixErrors = suffixFieldErrors();
            let isAnyNonSuffixEmpty = false;
            for (const entry of cells) {
                const value = entry.input.value;
                const isEmpty = isEmptyValue(value);
                entry.input.classList.toggle('mpb-input-warn', isEmpty);
                setText(entry.warnings, '');
                if (entry.varName === 'suffix') {
                    // Suffix: red errors from the shared validator (empty + duplicate).
                    const messages = suffixErrors.get(entry.reference) || [];
                    if (messages.some((message) => message.startsWith('Enter a suffix for every BU.'))) {
                        entry.warnings.append(
                            makeElement('p', {
                                class: 'mpb-field-error',
                                text: 'A suffix is required for every BU.',
                            })
                        );
                    }
                    if (messages.some((message) => message.startsWith('BU suffixes must be unique:'))) {
                        entry.warnings.append(
                            makeElement('p', {
                                class: 'mpb-field-error',
                                text: 'Duplicate suffix — each child BU needs a distinct suffix.',
                            })
                        );
                    }
                } else {
                    if (isEmpty) {
                        isAnyNonSuffixEmpty = true;
                    }
                    // Non-suffix: advisory surrounding-whitespace line (non-empty value only).
                    if (!isEmpty && value !== value.trim()) {
                        entry.warnings.append(
                            makeElement('p', {
                                class: 'mpb-warn',
                                text: 'This value has leading or trailing spaces — remove them unless intentional.',
                            })
                        );
                    }
                }
            }
            legend.hidden = !isAnyNonSuffixEmpty;
        }

        const pipelines = pipelinesByRoot();
        let pipelineNumber = 0;
        for (const [, pipelineReferences] of pipelines) {
            // Presentational, step-only label: pipelines are numbered 1..N in top-down render order.
            // This never touches stored keys/references/config — only the visible caption text.
            pipelineNumber += 1;
            const pipelineLabel = 'Pipeline #' + pipelineNumber;
            const columns = pipelineColumns(pipelineReferences);
            const variableNames = variableNamesFor(pipelineReferences);
            const buColumnCount = columns.reduce((sum, column) => sum + column.references.length, 0);

            // Per-pipeline source-market picker (only when this pipeline is covered by adoption data).
            const picker = sourceMarketPicker(pipelineReferences, pipelineNumber);
            if (picker) {
                panel.append(picker);
            }

            const scroll = makeElement('div', { class: 'mpb-mv-scroll' });
            const table = makeElement('table', { class: 'mpb-mv-table' });
            table.append(makeElement('caption', { class: 'mpb-mv-caption', text: pipelineLabel }));

            // ── thead: two rows. Row 1 = empty over name+actions, then one env colgroup header per
            // environment. Row 2 = Variable | Actions | one th per BU.
            const thead = makeElement('thead', {});
            const groupRow = makeElement('tr', {});
            groupRow.append(makeElement('td', {}));
            groupRow.append(makeElement('td', {}));
            for (const column of columns) {
                groupRow.append(
                    makeElement('th', {
                        class: 'mpb-mv-env-group',
                        text: column.environment || '(unnamed environment)',
                        attrs: { scope: 'colgroup', colspan: String(column.references.length) },
                    })
                );
            }
            thead.append(groupRow);

            const buRow = makeElement('tr', {});
            buRow.append(makeElement('th', { class: 'mpb-mv-col-name', text: 'Variable', attrs: { scope: 'col' } }));
            buRow.append(makeElement('th', { class: 'mpb-mv-col-actions', text: 'Actions', attrs: { scope: 'col' } }));
            for (const column of columns) {
                for (const reference of column.references) {
                    buRow.append(
                        makeElement('th', {
                            class: 'mpb-mv-col-bu',
                            text: bareBUName(reference) || reference,
                            attrs: { scope: 'col' },
                        })
                    );
                }
            }
            thead.append(buRow);
            table.append(thead);

            // ── tbody: one row per variable (suffix first, rest alpha), then the trailing add-row.
            const tbody = makeElement('tbody', {});
            for (const variableName of variableNames) {
                const tr = makeElement('tr', { attrs: { 'data-var': variableName } });
                const name = nameCell(variableName, pipelineReferences);
                tr.append(name.cell);
                tr.append(actionsCell(variableName, pipelineReferences, name.nameInput));
                for (const column of columns) {
                    for (const reference of column.references) {
                        const td = makeElement('td', { class: 'mpb-mv-value-cell' });
                        const cell = variableCell(column.environment, reference, variableName, refreshAll);
                        td.append(cell.cell);
                        tr.append(td);
                        cells.push(cell);
                    }
                }
                tbody.append(tr);
            }
            tbody.append(addRow(pipelineReferences, buColumnCount));
            table.append(tbody);

            scroll.append(table);
            panel.append(scroll);
        }

        // Initial paint now that every cell exists (pre-existing empty/spacey values flag immediately,
        // cross-BU suffix duplicates resolve).
        refreshAll();
    }

    /**
     * `market-vars` gate: non-`suffix` variables may be empty (advisory only), but an empty or
     * duplicate `suffix` is a hard block (identical to `canProceedSuffixes`, via the same shared
     * validator). Surfaces the first offending buRef's message in the reason.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedMarketVariables() {
        const errors = suffixFieldErrors();
        const references = childBUReferences();
        // Empty-suffix errors take precedence over duplicates (mirrors canProceedSuffixes ordering).
        for (const reference of references) {
            const messages = errors.get(reference) || [];
            const empty = messages.find((message) => message.startsWith('Enter a suffix for every BU.'));
            if (empty) {
                return { ok: false, reason: empty };
            }
        }
        for (const reference of references) {
            const messages = errors.get(reference) || [];
            const duplicate = messages.find((message) => message.startsWith('BU suffixes must be unique:'));
            if (duplicate) {
                return { ok: false, reason: duplicate };
            }
        }
        return { ok: true, reason: '' };
    }

    C.registerStep({ id: 'market-vars', render: renderMarketVariablesStep, canProceed: canProceedMarketVariables });

    // Publish the pure state helpers so the Node test harness (which cannot dispatch DOM events /
    // confirm dialogs) can exercise them directly — mirrors config-builder.js's `api` publish.
    C.variableNameError = variableNameError;
    C.renameVariable = renameVariable;
    C.addVariable = addVariable;
    C.filledBUCountFor = filledBUCountFor;
    C.matchMarketsForPipeline = matchMarketsForPipeline;
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
