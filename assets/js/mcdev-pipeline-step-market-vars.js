/* eslint-disable unicorn/name-replacements -- the `mcdev-pipeline-step-market-vars.js` filename is fixed by the script-order invariant (referenced verbatim in index.md, the test require-list, and the hardcoded lock array); `varName` mirrors the `marketVariables[buRef][varName]` state shape used across the feature. */
/**
 * mcdev Pipeline Builder — market variables wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `market-vars` step on
 * `mpbController`. Shown after `prod-confirm`.
 *
 * Per pipeline (grouped by lineage root via `pipelinesByRoot()`) it renders a per-BU input board:
 * a `suffix` row first (sharing `wizardState.suffixes` with the Suffixes step, auto-trimmed on
 * store) then every other variable name alphabetically, each read/written on
 * `wizardState.marketVariables[buRef][varName]` verbatim. Empty inputs get a yellow warning border;
 * non-`suffix` surrounding whitespace shows an advisory line; empty/duplicate `suffix` is a hard
 * error (red per-field text) enforced identically to the Suffixes step via the shared
 * `C.suffixFieldErrors()` validator.
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
     * that pipeline's BUs assigned to each — so a pipeline renders one column per environment it
     * touches, listing only its own BUs.
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

    /**
     * Build one variable input cell for a single BU node. Returns the cell element plus the handles a
     * caller needs for in-place warning/border refreshes. Typing (or paste/cut/undo — all `input`
     * events) updates state and refreshes the warnings/border in place, never rebuilding the input.
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

        const group = makeElement('div', { class: 'mpb-suffix-input' });
        let initialValue;
        if (isSuffix) {
            // The suffix row shares wizardState.suffixes and shows the fixed separator prefix.
            group.append(makeElement('span', { class: 'mpb-suffix-sep', text: separator }));
            const stored = suffixOf(reference);
            initialValue = stored.startsWith(separator) ? stored.slice(separator.length) : stored;
        } else {
            initialValue = variableValueOf(reference, varName);
        }
        const input = makeElement('input', {
            type: 'text',
            id: inputId,
            value: initialValue,
            attrs: { autocomplete: 'off', spellcheck: 'false' },
        });
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
        group.append(input);
        cell.append(group);

        // Per-cell warnings slot (painted/cleared in place).
        const warnings = makeElement('div', { class: 'mpb-suffix-warnings' });
        cell.append(warnings);

        return { cell: cell, input: input, warnings: warnings, reference: reference, varName: varName };
    }

    /**
     * The `market-vars` step render. Builds one board per pipeline (grouped by lineage root), each
     * with a `suffix` row (first) and every other variable row alphabetically; every BU gets a
     * per-variable input. Empty inputs flag yellow; non-`suffix` surrounding whitespace warns inline;
     * empty/duplicate `suffix` errors red. Add-variable per pipeline, delete per non-`suffix` variable.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderMarketVariablesStep(panel) {
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Define extra market variables per pipeline. Each variable gets one value per business unit — like the suffix row. The suffix is always shown first and is shared with the Suffixes step.',
            })
        );

        const references = childBUReferences();
        if (references.length === 0) {
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }

        // Every cell across every pipeline, so a value edit can refresh all borders/warnings and the
        // shared legend in one pass (cross-BU suffix duplicates included).
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
         * Repaint every cell's border + warnings in place, and toggle the advisory legend. Empty →
         * yellow border (`mpb-input-warn`); non-`suffix` value with surrounding whitespace → inline
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
        for (const [root, pipelineReferences] of pipelines) {
            const section = makeElement('section', { class: 'mpb-market-pipeline' });
            section.append(
                makeElement('h3', {
                    class: 'mpb-market-pipeline-title',
                    text: bareBUName(root),
                })
            );

            const columns = pipelineColumns(pipelineReferences);
            const variableNames = variableNamesFor(pipelineReferences);

            // Build the board: one column per environment the pipeline touches, one node per BU, each
            // node stacking a cell per variable name (suffix first).
            const board = makeElement('div', { class: 'mpb-env-board' });
            for (const column of columns) {
                const col = makeElement('div', { class: 'mpb-env-col' });
                col.append(
                    makeElement('p', {
                        class: 'mpb-env-col-title',
                        text: column.environment || '(unnamed environment)',
                    })
                );
                for (const reference of column.references) {
                    const node = makeElement('div', {
                        class: 'mpb-env-node',
                        attrs: { 'data-bu': reference },
                    });
                    node.append(makeElement('span', { class: 'mpb-env-node-name', text: reference }));
                    for (const variableName of variableNames) {
                        const label = makeElement('label', {
                            class: 'mpb-env-node-label',
                            text: variableName,
                        });
                        const cell = variableCell(column.environment, reference, variableName, refreshAll);
                        label.setAttribute('for', cell.input.id);
                        node.append(label, cell.cell);
                        cells.push(cell);
                    }
                    col.append(node);
                }
                board.append(col);
            }
            section.append(board);

            // Per-pipeline controls: add a variable (seeds empty on every BU) and delete a variable.
            const controls = makeElement('div', { class: 'mpb-market-controls' });
            const addButton = makeElement('button', {
                type: 'button',
                class: 'mpb-btn mpb-btn--secondary',
                text: '+ Add variable',
            });
            addButton.addEventListener('click', () => {
                const raw = global.prompt('New variable name (e.g. Contact_Salesforce):');
                if (raw == null) {
                    return;
                }
                const name = raw.trim();
                if (!name || name === 'suffix' || name === 'description') {
                    return;
                }
                // Seed an empty entry for every BU in this pipeline, then re-render (empty → yellow).
                const all = { ...state.wizardState.marketVariables };
                for (const reference of pipelineReferences) {
                    const forBU = { ...all[reference] };
                    if (!Object.hasOwn(forBU, name)) {
                        forBU[name] = '';
                    }
                    all[reference] = forBU;
                }
                state.wizardState.marketVariables = all;
                scheduleAutosave();
                render();
            });
            controls.append(addButton);

            const deletableVariableNames = variableNames.filter((name) => name !== 'suffix');
            for (const variableName of deletableVariableNames) {
                const deleteButton = makeElement('button', {
                    type: 'button',
                    class: 'mpb-btn mpb-btn--ghost',
                    text: 'Delete "' + variableName + '"',
                });
                deleteButton.addEventListener('click', () => {
                    const all = { ...state.wizardState.marketVariables };
                    for (const reference of pipelineReferences) {
                        const forBU = all[reference];
                        if (!forBU || forBU[variableName] === undefined) {
                            continue;
                        }
                        const nextForBU = { ...forBU };
                        delete nextForBU[variableName];
                        all[reference] = nextForBU;
                    }
                    state.wizardState.marketVariables = all;
                    scheduleAutosave();
                    render();
                });
                controls.append(deleteButton);
            }
            section.append(controls);

            panel.append(section);
        }

        // Initial paint now that every cell exists (pre-existing empty/spacey values flag immediately,
        // cross-BU suffix duplicates resolve).
        refreshAll();
    }

    C.registerStep({ id: 'market-vars', render: renderMarketVariablesStep, canProceed: canProceedMarketVariables });
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
