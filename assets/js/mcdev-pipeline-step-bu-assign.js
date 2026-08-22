/**
 * mcdev Pipeline Builder — bu-assign wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `bu-assign` step
 * on `mpbController`. Wires SortableJS (`window.Sortable` from the CDN UMD) for the
 * assignment board; degrades to per-chip dropdowns when Sortable is absent.
 *
 * Filename keeps `bu` (`unicorn/prevent-abbreviations` is off in this package).
 * Step id stays `bu-assign`.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-bu-assign.js');
    }

    const state = C.state;
    const makeElement = C.makeEl;
    const environmentNames = C.environmentNames;
    const assignedBUReferences = C.assignedBUReferences;
    const unassignedBUReferences = C.unassignedBUReferences;
    const pooledBUReferences = C.pooledBUReferences;
    const assignBUToEnvironment = C.assignBUToEnvironment;
    const render = C.render;

    /**
     * `bu-assign` gate: every environment has at least one BU assigned.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedBUAssign() {
        const missing = environmentNames().filter((environment) => assignedBUReferences(environment).length === 0);
        if (missing.length > 0) {
            return { ok: false, reason: 'Assign at least one BU to: ' + missing.join(', ') + '.' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * The DOM `data-env` value used for the Unassigned board column. A real environment can never be
     * named this (env names are pattern-validated and this carries a leading space), so it can never
     * collide with a user environment. Mapped to the `null` target of `assignBUToEnvironment`.
     */
    const UNASSIGNED_COLUMN = ' unassigned';

    /**
     * The SortableJS group name shared by every board column so chips can be dragged between them.
     */
    const BU_BOARD_GROUP = 'mpb-bus';

    /**
     * Live SortableJS instances for the current board render, destroyed before every re-render so a
     * discarded step host (which `renderWizardStep` replaces wholesale) never leaves dangling
     * handlers or leaked instances behind.
     *
     * @type {Array<{destroy: function(): void}>}
     */
    let buBoardSortables = [];

    /**
     * Tear down any Sortable instances left from a previous board render.
     *
     * @returns {void}
     */
    function destroyBUBoardSortables() {
        for (const instance of buBoardSortables) {
            try {
                instance.destroy();
            } catch {
                // A destroy() on an already-detached list can throw; the instance is being discarded
                // anyway, so swallow it rather than surface a non-actionable error.
            }
        }
        buBoardSortables = [];
    }

    /**
     * Claim a buRef for the first column that lists it: returns true (and records it) when unseen,
     * false when a previous column already claimed it. Local copy of leftover's helper (leftover still
     * uses its own for restored `envBUs` dedupe).
     *
     * @param {Set<string>} claimed the set of already-claimed buRefs (mutated)
     * @param {string} reference the buRef to test/claim
     * @returns {boolean} true when this column may keep the reference
     */
    function claimBUReference(claimed, reference) {
        if (claimed.has(reference)) {
            return false;
        }
        claimed.add(reference);
        return true;
    }

    /**
     * `bu-assign` step — a Jira-style board. Each BU belongs to exactly one environment: an
     * "Unassigned" column holds every not-yet-placed buRef and there is one column per environment.
     * Dragging a chip into an environment assigns it there (and removes it from wherever it was);
     * dragging back to Unassigned un-assigns it. buRefs read `<cred>/<BU>` when multiCred, bare
     * otherwise. Drag-drop (SortableJS) and a compact per-chip `<select>` (keyboard/a11y parity)
     * both route writes through `assignBUToEnvironment`, so the single-assignment invariant lives in
     * one place.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderBUAssignStep(panel) {
        // Any instances from the previous render belong to a now-discarded DOM tree — drop them.
        destroyBUBoardSortables();
        const references = pooledBUReferences();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Each business unit belongs to exactly one environment. Drag a BU from Unassigned into an environment (or use its dropdown); an environment holding more than one BU becomes a branching pipeline.',
            })
        );
        if (references.length === 0) {
            panel.append(
                makeElement('p', { class: 'mpb-warn', text: 'No business units were found in the loaded config.' })
            );
            return;
        }

        const hasSortable = Boolean(global.Sortable);
        if (!hasSortable) {
            // Offline / blocked CDN: SortableJS is absent, so drag-and-drop is unavailable. The
            // per-chip dropdown still assigns every BU, so the wizard stays fully usable.
            panel.append(
                makeElement('p', {
                    class: 'mpb-warn',
                    text: 'Drag-and-drop is unavailable (the SortableJS library did not load). Use each BU’s dropdown to assign it instead.',
                })
            );
        }

        // Match the lineage step's visual: the Unassigned pool is a full-width horizontal strip ABOVE
        // one column per environment (spread across the width). SortableJS still finds every
        // `.mpb-board-list` (and their `data-env`) via `board.querySelectorAll`, regardless of this
        // nesting, so the shared drag group and DOM reconciliation are unaffected — only the layout
        // differs from the previous left-pool/right-grid arrangement.
        const board = makeElement('div', { class: 'mpb-board' });

        // Unassigned pool: a full-browser-width row whose chips flow horizontally (not a same-height
        // left column). It reuses the same `.mpb-board-list[data-env]` drop target so drag works.
        const unassignedRow = makeElement('div', { class: 'mpb-unassigned-row' });
        unassignedRow.append(
            buBoardColumn(UNASSIGNED_COLUMN, 'Unassigned', unassignedBUReferences(), hasSortable)
        );
        board.append(unassignedRow);

        // Assigned BUs: one column per environment, spread horizontally like the lineage board.
        const environmentRegion = makeElement('div', { class: 'mpb-env-board' });
        for (const environment of environmentNames()) {
            environmentRegion.append(
                buBoardColumn(environment, environment || '(unnamed environment)', assignedBUReferences(environment), hasSortable)
            );
        }
        board.append(environmentRegion);
        panel.append(board);

        if (hasSortable) {
            wireBoardSortables(board);
        }
    }

    /**
     * Build one board column (Unassigned or a single environment) with its draggable BU chips and,
     * for environments, an empty-state warning.
     *
     * @param {string} columnKey the `data-env` key (`UNASSIGNED_COLUMN` or an env name)
     * @param {string} title the visible column heading
     * @param {string[]} references the buRefs currently in this column
     * @param {boolean} hasSortable whether SortableJS is available (drives the drag affordance)
     * @returns {HTMLElement} the column element
     */
    function buBoardColumn(columnKey, title, references, hasSortable) {
        const isUnassigned = columnKey === UNASSIGNED_COLUMN;
        // Assigned-env columns adopt the shared `.mpb-env-col` look (horizontal spread); the
        // Unassigned pool is a distinct full-width strip whose chips flow horizontally.
        const column = makeElement('div', {
            class: isUnassigned ? 'mpb-board-col mpb-board-col--pool' : 'mpb-board-col mpb-env-col',
        });
        column.append(makeElement('h4', { class: 'mpb-board-col-title', text: title }));
        const list = makeElement('div', {
            // The pool's list flows chips left-to-right across the full width; env lists stack.
            class: isUnassigned ? 'mpb-board-list mpb-board-list--pool' : 'mpb-board-list',
            attrs: { 'data-env': columnKey },
        });
        for (const reference of references) {
            list.append(buBoardChip(reference, columnKey, hasSortable));
        }
        column.append(list);
        if (!isUnassigned && references.length === 0) {
            column.append(makeElement('p', { class: 'mpb-warn', text: 'Assign at least one BU.' }));
        }
        return column;
    }

    /**
     * Build a single BU chip: the draggable buRef text plus a compact `<select>` that reassigns it
     * to any environment or back to Unassigned without dragging (keyboard/a11y parity). The chip's
     * `data-bu` lets the drop reconciliation read DOM order back into state.
     *
     * @param {string} reference the buRef this chip represents
     * @param {string} columnKey the column the chip currently lives in
     * @param {boolean} hasSortable whether SortableJS is available (drives the drag affordance)
     * @returns {HTMLElement} the chip element
     */
    function buBoardChip(reference, columnKey, hasSortable) {
        const chip = makeElement('div', {
            class: 'mpb-board-chip',
            attrs: { 'data-bu': reference },
        });
        if (hasSortable) {
            // A dedicated grip communicates the chip is draggable (Sortable drags the whole chip).
            chip.append(makeElement('span', { class: 'mpb-board-grip', text: '⠿', attrs: { 'aria-hidden': 'true' } }));
        }
        chip.append(makeElement('span', { class: 'mpb-board-chip-name', text: reference }));

        // Keyboard/a11y alternative to dragging: a compact env picker routed through the same invariant.
        const selectId = 'mpb-bu-move-' + reference.replaceAll(/[^a-zA-Z0-9]+/g, '-');
        // The drag board is the primary affordance; this <select> is the keyboard/SR alternative,
        // kept in the DOM (Tab-focusable + SR-operable) but visually hidden via the 1px-clip pattern.
        const select = makeElement('select', {
            class: 'mpb-board-move visually-hidden',
            id: selectId,
            attrs: { 'aria-label': 'Assign ' + reference + ' to environment' },
        });
        select.append(
            makeElement('option', {
                value: UNASSIGNED_COLUMN,
                text: 'Unassigned',
                selected: columnKey === UNASSIGNED_COLUMN,
            })
        );
        for (const environment of environmentNames()) {
            select.append(
                makeElement('option', {
                    value: environment,
                    text: environment || '(unnamed environment)',
                    selected: environment === columnKey,
                })
            );
        }
        select.addEventListener('change', () => {
            assignBUToEnvironment(reference, select.value === UNASSIGNED_COLUMN ? null : select.value);
        });
        chip.append(select);
        return chip;
    }

    /**
     * Initialise a shared SortableJS group across all board lists so chips move between columns, and
     * reconcile `wizardState.envBUs` from the resulting DOM after every drop. SortableJS mutates the
     * DOM directly; we read the post-drop order back into state (via `reconcileBoardFromDOM`) and
     * then re-render from state — so the DOM is never the source of truth and no render loop forms
     * (the reconcile runs on `onEnd` only, and `render()` rebuilds the board fresh). Instances are
     * tracked for teardown on the next render.
     *
     * @param {HTMLElement} board the board container holding the `.mpb-board-list` columns
     * @returns {void}
     */
    function wireBoardSortables(board) {
        const lists = board.querySelectorAll('.mpb-board-list');
        for (const list of lists) {
            const instance = global.Sortable.create(list, {
                group: BU_BOARD_GROUP,
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                // Only reconcile once the drop settles; reading DOM order per column and writing it
                // back through the invariant keeps state authoritative and triggers a clean re-render.
                onEnd: () => reconcileBoardFromDOM(board),
            });
            buBoardSortables.push(instance);
        }
    }

    /**
     * Read the post-drop chip order out of every board column and rebuild `wizardState.envBUs` from
     * it, enforcing the single-assignment invariant (a buRef kept only in the first column that
     * lists it). The Unassigned column contributes no assignments. Re-renders so downstream steps
     * recompute. Runs only after a Sortable drop, never during a render, so it cannot loop.
     *
     * @param {HTMLElement} board the board container
     * @returns {void}
     */
    function reconcileBoardFromDOM(board) {
        const nextEnvironmentBUs = {};
        for (const environment of environmentNames()) {
            nextEnvironmentBUs[environment] = [];
        }
        const claimed = new Set();
        const lists = board.querySelectorAll('.mpb-board-list');
        for (const list of lists) {
            const columnKey = list.dataset.env;
            // The pool column contributes no assignments; only real env columns collect their chips.
            if (columnKey !== UNASSIGNED_COLUMN && Object.hasOwn(nextEnvironmentBUs, columnKey)) {
                nextEnvironmentBUs[columnKey] = collectColumnBUReferences(list, claimed);
            }
        }
        state.wizardState.envBUs = nextEnvironmentBUs;
        render();
    }

    /**
     * Read the buRefs from one board column's chips in DOM order, keeping only those not already
     * claimed by an earlier column (single-assignment invariant). Extracted so the reconcile stays a
     * flat single loop.
     *
     * @param {HTMLElement} list the `.mpb-board-list` element
     * @param {Set<string>} claimed the set of already-claimed buRefs (mutated)
     * @returns {string[]} the buRefs this column keeps, in DOM order
     */
    function collectColumnBUReferences(list, claimed) {
        const references = [];
        for (const chip of list.querySelectorAll('.mpb-board-chip')) {
            const reference = chip.dataset.bu;
            if (claimBUReference(claimed, reference)) {
                references.push(reference);
            }
        }
        return references;
    }

    C.registerStep({ id: 'bu-assign', render: renderBUAssignStep, canProceed: canProceedBUAssign });
    C.canProceedBUAssign = canProceedBUAssign;
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
