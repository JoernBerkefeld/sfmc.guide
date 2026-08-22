/**
 * mcdev Pipeline Builder — suffixes wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `suffixes` step
 * on `mpbController`. The shared-DEs toggle is lineage-step UI, not this file.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-suffixes.js');
    }

    const state = C.state;
    const setText = C.setText;
    const makeElement = C.makeEl;
    const childBUReferences = C.childBUReferences;
    const suffixOf = C.suffixOf;
    const suffixSlug = C.suffixSlug;
    const seedSuffixes = C.seedSuffixes;
    const renderEnvironmentColumns = C.renderEnvironmentColumns;
    const updateNavGate = C.updateNavGate;
    const scheduleAutosave = C.scheduleAutosave;

    /**
     * `suffixes` gate: every child buRef has a non-empty suffix and the suffixes are distinct across
     * child BUs (the parent BU reuses child suffixes and is exempt). Surfaces the first offending
     * buRef in the reason.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedSuffixes() {
        const references = childBUReferences();
        const separator = state.wizardState.separator || '_';
        // Every child BU needs a suffix body beyond the bare separator.
        for (const reference of references) {
            const stored = suffixOf(reference);
            const body = stored.startsWith(separator) ? stored.slice(separator.length).trim() : stored.trim();
            if (!body) {
                return { ok: false, reason: 'Enter a suffix for every BU. Missing: ' + reference + '.' };
            }
        }
        // Child-BU suffixes must be distinct (compared on the full stored value).
        const seen = new Map();
        for (const reference of references) {
            const value = suffixOf(reference);
            if (seen.has(value)) {
                return {
                    ok: false,
                    reason:
                        'BU suffixes must be unique: "' +
                        value +
                        '" is used by both ' +
                        seen.get(value) +
                        ' and ' +
                        reference +
                        '.',
                };
            }
            seen.set(value, reference);
        }
        return { ok: true, reason: '' };
    }

    /**
     * The shared separator input. Changing it re-bases every stored suffix onto the new separator
     * (so stored values stay `<sep><body>`) and then invokes `onInput` so the caller can refresh the
     * dependent UI in place instead of re-rendering the whole step.
     *
     * @param {() => void} onInput callback fired after each keystroke updates the state
     * @returns {HTMLElement} the separator field
     */
    function separatorField(onInput) {
        const field = makeElement('div', { class: 'mpb-field' });
        field.append(makeElement('label', { text: 'Separator', attrs: { for: 'mpb-separator' } }));
        const input = makeElement('input', {
            type: 'text',
            id: 'mpb-separator',
            class: 'mpb-separator-input',
            value: state.wizardState.separator || '_',
            attrs: { autocomplete: 'off', spellcheck: 'false', maxlength: '2', 'aria-label': 'Key separator' },
        });
        input.addEventListener('input', () => {
            const previous = state.wizardState.separator || '_';
            const next = input.value || '_';
            // Re-base every stored suffix onto the new separator (swap only the leading separator).
            const suffixes = { ...state.wizardState.suffixes };
            for (const reference of Object.keys(suffixes)) {
                const value = suffixes[reference];
                const body = value.startsWith(previous) ? value.slice(previous.length) : value;
                suffixes[reference] = next + body;
            }
            state.wizardState.separator = next;
            state.wizardState.suffixes = suffixes;
            onInput();
        });
        field.append(input);
        return field;
    }

    /**
     * Build one suffix editing row for a single child buRef, with the separator shown as a fixed
     * prefix, an editable body, and inline internal-space / duplicate warnings. Typing updates only
     * state + the inline warnings (via `refreshWarnings`) so the focused input is never rebuilt.
     *
     * @param {string} environment the owning environment (for context labelling)
     * @param {string} reference the child buRef
     * @param {() => void} refreshWarnings repaint every row's warnings in place after a state edit
     * @returns {{control: HTMLElement, input: HTMLInputElement, sep: HTMLElement, warnings: HTMLElement, reference: string}}
     *   the per-node control (label + suffix input + warnings) plus the handles needed for in-place refreshes
     */
    function suffixRow(environment, reference, refreshWarnings) {
        const separator = state.wizardState.separator || '_';
        // The BU name is already shown by the column node; this control adds the "suffix" label +
        // input + warnings into the per-node slot (where lineage places its "deploys from" select).
        const control = makeElement('div', { class: 'mpb-env-node-control' });
        const inputId = 'mpb-suffix-' + suffixSlug(environment) + '-' + suffixSlug(reference);
        control.append(
            makeElement('label', {
                class: 'mpb-env-node-label',
                text: 'suffix',
                attrs: { for: inputId },
            })
        );

        const group = makeElement('div', { class: 'mpb-suffix-input' });
        const separatorSpan = makeElement('span', { class: 'mpb-suffix-sep', text: separator });
        group.append(separatorSpan);
        const stored = suffixOf(reference);
        const body = stored.startsWith(separator) ? stored.slice(separator.length) : stored;
        const input = makeElement('input', {
            type: 'text',
            id: inputId,
            value: body,
            attrs: { autocomplete: 'off', spellcheck: 'false' },
        });
        input.addEventListener('input', () => {
            // Store the leading/trailing-trimmed body (internal spaces are only warned about). The
            // visible input value is left as typed so the caret is never fought mid-typing.
            const activeSeparator = state.wizardState.separator || '_';
            const trimmedBody = input.value.trim();
            state.wizardState.suffixes = {
                ...state.wizardState.suffixes,
                [reference]: activeSeparator + trimmedBody,
            };
            // Refresh only the inline warnings (cross-row duplicates included), the nav gate and the
            // debounced autosave — never a full render that would blur this input.
            refreshWarnings();
            updateNavGate();
            scheduleAutosave();
        });
        group.append(input);
        control.append(group);

        // Dedicated warnings slot so it can be wiped + repainted in place without touching the input.
        const warnings = makeElement('div', { class: 'mpb-suffix-warnings' });
        control.append(warnings);

        return { control: control, input: input, sep: separatorSpan, warnings: warnings, reference: reference };
    }

    /**
     * `suffixes` step: a shared separator input plus a per-child-BU suffix editor. Values are
     * trimmed before storing; an internal space triggers a stern (non-rewriting) warning; multi-BU
     * environments auto-number their suffixes but every field stays editable. The stored suffix
     * always includes the leading separator, and child-BU suffixes must be distinct (the parent BU
     * reuses them and is exempt).
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderSuffixesStep(panel) {
        seedSuffixes();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Give each business unit a distinct key suffix. The separator is enforced in front of every suffix. Multi-BU environments are auto-numbered — override them as you like (e.g. _UATN / _UATS).',
            })
        );

        const references = childBUReferences();
        if (references.length === 0) {
            panel.append(separatorField(() => {}));
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }

        // Keep a reference to every rendered row so text-input edits can refresh the inline warnings
        // (and the shown separator prefix) IN PLACE — never rebuilding the inputs, which would blur
        // the focused field and jump the scroll to the top.
        const rows = [];

        /**
         * Recompute and repaint every row's inline warnings in place. Duplicate detection is
         * cross-row, so editing one suffix can change another row's flag — hence all rows refresh
         * together. The input elements themselves are left untouched.
         *
         * @returns {void}
         */
        function refreshSuffixWarnings() {
            const separator = state.wizardState.separator || '_';
            // Duplicate index over the current stored values.
            const counts = new Map();
            for (const reference of childBUReferences()) {
                const value = suffixOf(reference);
                counts.set(value, (counts.get(value) || 0) + 1);
            }
            for (const row of rows) {
                setText(row.warnings, '');
                const stored = suffixOf(row.reference);
                const storedBody = stored.startsWith(separator)
                    ? stored.slice(separator.length)
                    : stored;
                // Internal-space warning reflects the RAW typed body (not the trimmed stored copy).
                if (/\s/.test(row.input.value.trim())) {
                    row.warnings.append(
                        makeElement('p', {
                            class: 'mpb-warn',
                            text: 'Avoid spaces inside a suffix — they can break mcdev CLI commands later.',
                        })
                    );
                }
                if (storedBody.trim() && counts.get(stored) > 1) {
                    row.warnings.append(
                        makeElement('p', {
                            class: 'mpb-warn',
                            text: 'Duplicate suffix — each child BU needs a distinct suffix.',
                        })
                    );
                }
            }
        }

        // The central separator input sits ABOVE the environment columns (a single control spanning
        // the column row), matching the lineage visual. It re-bases suffixes in state, updates each
        // row's shown prefix span, then refreshes warnings + the nav gate + autosave — all in place
        // (no full render / blur).
        const separatorRow = makeElement('div', { class: 'mpb-separator-row' });
        separatorRow.append(
            separatorField(() => {
                const separator = state.wizardState.separator || '_';
                for (const row of rows) {
                    setText(row.sep, separator);
                }
                refreshSuffixWarnings();
                updateNavGate();
                scheduleAutosave();
            })
        );
        panel.append(separatorRow);

        // One column per environment (lineage visual); each BU node carries its suffix input in the
        // per-node control slot. The row handles are captured as nodes are built so the in-place
        // update path (no full re-render) keeps working.
        const board = renderEnvironmentColumns({
            perNode: (environment, reference) => {
                const row = suffixRow(environment, reference, refreshSuffixWarnings);
                rows.push(row);
                return row.control;
            },
        });
        panel.append(board);
        // Initial warning paint now that every row exists (so cross-row duplicates resolve).
        refreshSuffixWarnings();
    }

    C.registerStep({ id: 'suffixes', render: renderSuffixesStep, canProceed: canProceedSuffixes });
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
