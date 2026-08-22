/**
 * mcdev Pipeline Builder — env-order wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `env-order` step
 * on `mpbController` and exposes `SUGGESTED_ENVIRONMENTS` / `autoBranchFromEnvName`
 * for leftover (validations-pool strip) and tests.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-environment-order.js');
    }

    const state = C.state;
    const dom = C.dom;
    const setText = C.setText;
    const makeElement = C.makeEl;
    const environmentNames = C.environmentNames;
    const render = C.render;
    const updateNavGate = C.updateNavGate;
    const scheduleAutosave = C.scheduleAutosave;

    /**
     * Suggested environment names offered as one-click chips on the env-order step and as the
     * initial seed for that step. The user can accept, remove, reorder, or type custom names —
     * nothing here is forced. Leftover also uses this list when stripping the validations pool.
     */
    const SUGGESTED_ENVIRONMENTS = ['DEV', 'SIT', 'QA', 'UAT', 'Pre-Prod', 'Prod'];

    /**
     * Characters permitted in an environment name: letters, digits, hyphen, space, underscore.
     * Anything else is rejected inline (no silent rewrite — spaces are kept as typed).
     */
    const ENVIRONMENT_NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;

    /**
     * Move an item within `envOrder` from one index to another and re-render the wizard. Out-of-range
     * indices are ignored so button/drag handlers never throw at the list edges.
     *
     * @param {number} from source index
     * @param {number} to destination index
     * @returns {void}
     */
    function moveEnvironment(from, to) {
        const order = environmentNames();
        if (from === to || from < 0 || from >= order.length || to < 0 || to >= order.length) {
            return;
        }
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        state.wizardState.envOrder = order;
        render();
    }

    /**
     * Case-insensitive trimmed-name collision check across the ordered env names, excluding the row
     * being edited. Used by both the env-order inline feedback and its `canProceed` gate.
     *
     * @param {string[]} names the trimmed env names in order
     * @param {number} index the row to test
     * @returns {boolean} true when the name at `index` duplicates another row
     */
    function isDuplicateName(names, index) {
        const lower = names[index].toLowerCase();
        return names.some((other, otherIndex) => otherIndex !== index && other.toLowerCase() === lower);
    }

    /**
     * Slugify an environment display name into its default git branch: trim, lower-case, and collapse
     * every run of non-`[a-z0-9]` characters (spaces included) to a single dash, with leading/trailing
     * dashes stripped. Mirrors the config builder's `branchKey()` so the auto-filled UI value and the
     * generator's fallback agree. Pure.
     *
     * @param {string} name the environment display name
     * @returns {string} the auto-generated git branch slug (empty when the name has no usable chars)
     */
    function autoBranchFromEnvironmentName(name) {
        return String(name)
            .trim()
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/g, '-')
            .replaceAll(/^-+|-+$/g, '');
    }

    /**
     * `env-order` gate (naming + ordering are now the same step): at least two environments, and
     * every name non-empty, pattern-valid, and unique after a case-insensitive trim.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedEnvironmentOrder() {
        const order = environmentNames();
        if (order.length < 2) {
            return { ok: false, reason: 'Add at least two environments (e.g. a source and a target).' };
        }
        const names = order.map((name) => name.trim());
        if (names.some((name) => !name)) {
            return { ok: false, reason: 'Every environment needs a name.' };
        }
        const invalid = names.find((name) => !ENVIRONMENT_NAME_PATTERN.test(name));
        if (invalid) {
            return {
                ok: false,
                reason:
                    'Environment names may only contain letters, digits, spaces, hyphens and underscores: "' +
                    invalid +
                    '".',
            };
        }
        const duplicate = names.find((name, index) => isDuplicateName(names, index));
        if (duplicate) {
            return { ok: false, reason: 'Environment names must be unique: "' + duplicate + '".' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * `env-order` step (naming + ordering combined): quick-fill chips from `SUGGESTED_ENVIRONMENTS`,
     * plus an ordered, reorderable horizontal board of environment columns (one column per env,
     * mirroring the lineage board). Each column carries an inline editable name input, drag-and-drop
     * (via a dedicated drag handle) and keyboard-accessible left/right buttons (index 0 is the
     * DEV/source env), plus add/remove. Seeds from `SUGGESTED_ENVIRONMENTS` when empty.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderEnvironmentOrderStep(panel) {
        // Seed a sensible default order on first visit so the board is never empty.
        if (environmentNames().length === 0) {
            state.wizardState.envOrder = [...SUGGESTED_ENVIRONMENTS];
        }
        const order = environmentNames();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Name each environment and order them from source to production. The first column is the DEV / source environment. Type a name inline, drag the handle to reorder, or use the left/right buttons.',
            })
        );

        // Quick-fill chips: append a suggested name as a new row (skipping ones already present).
        const chips = makeElement('div', { class: 'mpb-chips', attrs: { 'aria-label': 'Suggested environment names' } });
        chips.append(makeElement('span', { class: 'mpb-chips-label', text: 'Insert default environments: ' }));
        for (const suggestion of SUGGESTED_ENVIRONMENTS) {
            const chip = makeElement('button', {
                type: 'button',
                class: 'mpb-chip',
                text: suggestion,
            });
            chip.addEventListener('click', () => {
                const existing = environmentNames().map((existingName) => existingName.trim().toLowerCase());
                if (!existing.includes(suggestion.toLowerCase())) {
                    state.wizardState.envOrder = [...environmentNames(), suggestion];
                    render();
                }
            });
            chips.append(chip);
        }
        panel.append(chips);

        // Keep a reference to every rendered column so typing a name refreshes the inline validation
        // (which is cross-column for the duplicate check) IN PLACE — never rebuilding the inputs,
        // which would blur the focused field and jump the scroll to the top.
        const rows = [];

        /**
         * Repaint every column's inline validation in place from the current names. Called on each
         * keystroke so a fixed name clears its warning and duplicate flags update across columns,
         * without recreating any input.
         *
         * @returns {void}
         */
        function refreshEnvironmentWarnings() {
            const currentTrimmed = environmentNames().map((environmentName) => environmentName.trim());
            for (const row of rows) {
                setEnvironmentRowWarning(row, currentTrimmed);
            }
        }

        const board = makeElement('div', {
            class: 'mpb-env-order-board',
            attrs: { 'aria-label': 'Environment order' },
        });
        for (const [index, name] of order.entries()) {
            const row = environmentOrderRow(name, index, order.length, refreshEnvironmentWarnings);
            rows.push(row);
            board.append(row.row);
        }
        panel.append(board);
        // Initial validation paint now that every column exists (so cross-column duplicates resolve).
        refreshEnvironmentWarnings();

        const addButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: '+ Add environment',
        });
        addButton.addEventListener('click', () => {
            state.wizardState.envOrder = [...environmentNames(), ''];
            render();
            // Nice-to-have: focus the freshly-added row's name input so the user can type right away.
            const inputs = dom.stepHost ? [...dom.stepHost.querySelectorAll('.mpb-env-name-input')] : [];
            const last = inputs.at(-1);
            if (last) {
                last.focus();
            }
        });
        panel.append(addButton);
    }

    /**
     * Build one environment column for the env-order board: a header line (drag handle + left/right
     * reorder + remove buttons), the optional DEV/source chip, an inline editable name input with
     * inline validation feedback. Only the handle is `draggable` so the name input stays fully
     * editable (a `draggable` column swallows the mousedown needed to focus/select inside the input
     * on some browsers). Returns the same `{ row, index, warnings }` shape the caller relies on for
     * in-place validation refreshes.
     *
     * @param {string} name the environment name (may be empty for a freshly-added column)
     * @param {number} index the column index in `envOrder`
     * @param {number} total the number of columns (for disabling edge buttons)
     * @param {() => void} refreshWarnings repaint every column's inline validation in place after an edit
     * @returns {{row: HTMLElement, index: number, warnings: HTMLElement}} the column element plus the
     *   handles needed for in-place validation refreshes
     */
    function environmentOrderRow(name, index, total, refreshWarnings) {
        const column = makeElement('div', {
            class: 'mpb-env-order-col',
            attrs: { 'data-index': String(index) },
        });

        // Dedicated drag handle — the only draggable element, so the name input remains editable.
        const handle = makeElement('span', {
            class: 'mpb-drag-handle',
            draggable: true,
            text: '⠿',
            attrs: { 'aria-hidden': 'true', title: 'Drag to reorder' },
        });

        // Header line: drag handle on the left, reorder/remove buttons on the right.
        const header = makeElement('div', { class: 'mpb-env-order-col-header' });
        const actions = makeElement('div', { class: 'mpb-row-actions' });
        const leftButton = makeElement('button', {
            type: 'button',
            class: 'mpb-move-btn',
            text: '←',
            disabled: index === 0,
            attrs: { 'aria-label': 'Move ' + (name || 'environment') + ' left' },
        });
        leftButton.addEventListener('click', () => moveEnvironment(index, index - 1));
        const rightButton = makeElement('button', {
            type: 'button',
            class: 'mpb-move-btn',
            text: '→',
            disabled: index === total - 1,
            attrs: { 'aria-label': 'Move ' + (name || 'environment') + ' right' },
        });
        rightButton.addEventListener('click', () => moveEnvironment(index, index + 1));
        const removeButton = makeElement('button', {
            type: 'button',
            class: 'mpb-move-btn',
            text: '✕',
            attrs: { 'aria-label': 'Remove ' + (name || 'environment') },
        });
        removeButton.addEventListener('click', () => {
            const next = environmentNames();
            const [removed] = next.splice(index, 1);
            state.wizardState.envOrder = next;
            // Drop the removed env's git-branch entry (keyed by display name) so it doesn't linger.
            if (removed && state.wizardState.envBranches && Object.hasOwn(state.wizardState.envBranches, removed)) {
                const branches = { ...state.wizardState.envBranches };
                delete branches[removed];
                state.wizardState.envBranches = branches;
            }
            render();
        });
        actions.append(leftButton, rightButton, removeButton);
        header.append(handle, actions);
        column.append(header);

        // ── env-name field (labelled, mirroring the lineage "deploys from" label styling). ──
        const inputId = 'mpb-env-name-' + index;
        const nameLabel = makeElement('label', {
            class: 'mpb-env-order-label',
            text: 'env name',
            attrs: { for: inputId },
        });
        const input = makeElement('input', {
            type: 'text',
            value: name,
            id: inputId,
            class: 'mpb-env-name-input',
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': 'Environment ' + (index + 1) + ' name',
                placeholder: 'Environment ' + (index + 1),
            },
        });

        // ── git-branch field (labelled), bound to envBranches[env] and auto-filled from the name. ──
        const branchId = 'mpb-env-branch-' + index;
        const branchLabel = makeElement('label', {
            class: 'mpb-env-order-label',
            text: 'git branch',
            attrs: { for: branchId },
        });
        // Auto-seed the git branch from the env name whenever the stored branch is empty/absent, using
        // the SAME rule as the blur handler. Persist the slug into envBranches[name] (so it round-trips
        // and downstream branchSourceTargetMapping keys are populated) — never overwriting a stored
        // value, and never storing an empty key when the name has no usable chars (auto === '').
        const stored = (state.wizardState.envBranches || {})[name] || '';
        let branchValue = stored;
        if (!stored) {
            const auto = autoBranchFromEnvironmentName(name);
            if (auto) {
                state.wizardState.envBranches = { ...state.wizardState.envBranches, [name]: auto };
                branchValue = auto;
                // Debounced, so a burst of seeded rows on one render collapses into a single save.
                scheduleAutosave();
            }
        }
        const branchInput = makeElement('input', {
            type: 'text',
            value: branchValue,
            id: branchId,
            class: 'mpb-env-branch-input',
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': 'Environment ' + (index + 1) + ' git branch',
                placeholder: 'git branch',
            },
        });

        // Track the name this row is currently keyed under so a rename can migrate the envBranches
        // entry to the new key (envBranches is keyed by DISPLAY name, same key space as envOrder).
        let boundName = name;

        input.addEventListener('input', () => {
            const next = environmentNames();
            // Store exactly as typed (no space→underscore conversion); trimming is validation-only.
            next[index] = input.value;
            state.wizardState.envOrder = next;
            // Migrate this env's git branch to the new display-name key so the binding follows the
            // rename. While the branch field is still empty, keep auto-filling it from the new name.
            const branches = { ...state.wizardState.envBranches };
            const existing = branches[boundName];
            if (boundName !== input.value) {
                delete branches[boundName];
            }
            if (existing) {
                branches[input.value] = existing;
            } else {
                // Empty branch → live-track the auto slug so it mirrors the name as the user types.
                const auto = autoBranchFromEnvironmentName(input.value);
                if (auto) {
                    branches[input.value] = auto;
                    branchInput.value = auto;
                } else {
                    delete branches[input.value];
                    branchInput.value = '';
                }
            }
            state.wizardState.envBranches = branches;
            boundName = input.value;
            // Refresh only the inline validation (cross-column duplicates included), the nav gate and
            // the debounced autosave — never a full render that would blur this input.
            refreshWarnings();
            updateNavGate();
            scheduleAutosave();
        });
        input.addEventListener('blur', () => {
            // On leaving the name field, (re-)generate the branch only when it is currently empty, so
            // a cleared branch auto-fills again but a user-typed value is never overwritten.
            const branches = { ...state.wizardState.envBranches };
            const currentBranch = branches[boundName];
            if (!currentBranch) {
                const auto = autoBranchFromEnvironmentName(boundName);
                if (auto) {
                    branches[boundName] = auto;
                    branchInput.value = auto;
                    state.wizardState.envBranches = branches;
                    setEnvironmentBranchWarning(branchWarnings, auto);
                    scheduleAutosave();
                }
            }
        });

        branchInput.addEventListener('input', () => {
            // A typed value makes the branch manual — store exactly as typed (validation-only trim).
            const branches = { ...state.wizardState.envBranches };
            const value = branchInput.value;
            if (value.trim()) {
                branches[boundName] = value;
            } else {
                delete branches[boundName];
            }
            state.wizardState.envBranches = branches;
            setEnvironmentBranchWarning(branchWarnings, value);
            scheduleAutosave();
        });

        column.append(nameLabel, input);

        // Dedicated warnings slot so the inline validation can be wiped + repainted in place (from
        // `setEnvironmentRowWarning`) without touching the input.
        const warnings = makeElement('div', { class: 'mpb-env-name-warnings' });
        column.append(warnings);

        column.append(branchLabel, branchInput);
        const branchWarnings = makeElement('div', { class: 'mpb-env-branch-warnings' });
        column.append(branchWarnings);
        setEnvironmentBranchWarning(branchWarnings, branchValue);

        wireEnvironmentRowDnD(column, handle, index);
        return { row: column, index: index, warnings: warnings };
    }

    /**
     * Paint a single env-order column's inline validation into its warnings slot, mirroring the
     * merged env-order `canProceed` gate (required / pattern / uniqueness). Wipes the slot first so
     * it can be called repeatedly in place without recreating the input.
     *
     * @param {{index: number, warnings: HTMLElement}} row the column handle
     * @param {string[]} trimmedNames all trimmed names (for the cross-row uniqueness check)
     * @returns {void}
     */
    function setEnvironmentRowWarning(row, trimmedNames) {
        setText(row.warnings, '');
        const trimmedValue = (trimmedNames[row.index] || '').trim();
        let message = '';
        if (!trimmedValue) {
            message = 'Name required.';
        } else if (!ENVIRONMENT_NAME_PATTERN.test(trimmedValue)) {
            message = 'Only letters, digits, spaces, hyphens and underscores are allowed.';
        } else if (isDuplicateName(trimmedNames, row.index)) {
            message = 'Duplicate name — each environment must be unique.';
        }
        if (message) {
            row.warnings.append(makeElement('p', { class: 'mpb-warn', text: message }));
        }
    }

    /**
     * Git-branch names allowing the common characters: letters, digits, and `-_./`. Anything outside
     * this set (spaces, `~^:?*[]\` etc.) triggers a warn-only hint — consistent with the tool's other
     * warn-not-block conventions, since mcdev never rejects the config on branch spelling.
     */
    const GIT_BRANCH_PATTERN = /^[\w\-./]+$/;

    /**
     * Paint (or clear) a git-branch input's warn-only hint into its slot. Empty is fine (it will
     * auto-fill); a value with spaces or characters outside the typical git-branch set gets a hint
     * but never blocks. Wipes the slot first so it can be repainted in place.
     *
     * @param {HTMLElement} slot the branch-warnings slot element
     * @param {string} value the current branch value
     * @returns {void}
     */
    function setEnvironmentBranchWarning(slot, value) {
        setText(slot, '');
        const trimmed = (value || '').trim();
        if (trimmed && !GIT_BRANCH_PATTERN.test(trimmed)) {
            slot.append(
                makeElement('p', {
                    class: 'mpb-warn',
                    text: 'Unusual git branch characters — letters, digits and - _ . / are typical.',
                })
            );
        }
    }

    /**
     * Wire drag-and-drop reordering for a single env-order column. Only the drag `handle` starts a
     * drag (so the column's name input stays editable); the whole `row` (column element) remains a
     * valid drop target. On drop, the dragged index is read from the drag payload and the order is
     * reordered via `moveEnvironment`.
     *
     * @param {HTMLElement} row the column element (drop target)
     * @param {HTMLElement} handle the drag handle (drag source)
     * @param {number} index the column's index
     * @returns {void}
     */
    function wireEnvironmentRowDnD(row, handle, index) {
        handle.addEventListener('dragstart', (event) => {
            if (!event.dataTransfer) {
                return;
            }
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
        });
        row.addEventListener('dragover', (event) => {
            event.preventDefault();
            row.classList.add('is-dragover');
        });
        row.addEventListener('dragleave', () => {
            row.classList.remove('is-dragover');
        });
        row.addEventListener('drop', (event) => {
            event.preventDefault();
            row.classList.remove('is-dragover');
            const raw = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
            const from = Number(raw);
            if (raw !== '' && Number.isSafeInteger(from)) {
                moveEnvironment(from, index);
            }
        });
    }

    C.registerStep({
        id: 'env-order',
        render: renderEnvironmentOrderStep,
        canProceed: canProceedEnvironmentOrder,
    });
    C.SUGGESTED_ENVIRONMENTS = SUGGESTED_ENVIRONMENTS;
    C.autoBranchFromEnvName = autoBranchFromEnvironmentName;
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
