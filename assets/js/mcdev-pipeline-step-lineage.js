/**
 * mcdev Pipeline Builder — lineage wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `lineage` step
 * on `mpbController`. Owns the shared-DEs parent band, SVG connector overlay, and
 * native HTML5 drag-to-connect (not SortableJS). Installs `setBeforeWizardStepRender`
 * (overlay/DnD teardown) and `setOnSharedDEsChange` (parent-band animation).
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-lineage.js');
    }

    const document_ = global.document;
    const state = C.state;
    const setText = C.setText;
    const makeElement = C.makeEl;
    const environmentNames = C.environmentNames;
    const assignedBUReferences = C.assignedBUReferences;
    const suffixOf = C.suffixOf;
    const render = C.render;
    const updateNavGate = C.updateNavGate;
    const scheduleAutosave = C.scheduleAutosave;
    const setSharedDEs = C.setSharedDEs;

    /**
     * Auto-derive the default lineage: for every environment after the first, link each of its
     * buRefs to a parent buRef from the previous environment (positionally, falling back to the
     * previous env's first BU). Only fills gaps — any parent the user already chose is preserved.
     * Lineage is keyed by child buRef → parent buRef, matching the config builder's persisted shape.
     *
     * @returns {void}
     */
    function autoDeriveLineage() {
        const order = environmentNames();
        const lineage = { ...state.wizardState.lineage };
        const validReferences = new Set();
        for (const environment of order) {
            for (const reference of assignedBUReferences(environment)) {
                validReferences.add(reference);
            }
        }
        // Drop stale links whose child/parent no longer exists so the gate cannot pass on ghosts.
        for (const childReference of Object.keys(lineage)) {
            if (!validReferences.has(childReference) || !validReferences.has(lineage[childReference])) {
                delete lineage[childReference];
            }
        }
        for (let index = 1; index < order.length; index++) {
            const parentReferences = assignedBUReferences(order[index - 1]);
            const childReferences = assignedBUReferences(order[index]);
            for (const [childIndex, childReference] of childReferences.entries()) {
                if (!Object.hasOwn(lineage, childReference) && parentReferences.length > 0) {
                    lineage[childReference] = parentReferences[childIndex] || parentReferences[0];
                }
            }
        }
        state.wizardState.lineage = lineage;
    }

    /**
     * The child buRefs that still need a lineage parent chosen: every buRef of every environment
     * after the first. Used to build the manual-linking UI and its `canProceed` gate.
     *
     * @returns {{childRef: string, environment: string, parentOptions: string[]}[]} link rows
     */
    function lineageLinkRows() {
        const order = environmentNames();
        const rows = [];
        for (let index = 1; index < order.length; index++) {
            const parentOptions = assignedBUReferences(order[index - 1]);
            const childReferences = assignedBUReferences(order[index]);
            for (const childReference of childReferences) {
                rows.push({ childRef: childReference, environment: order[index], parentOptions: parentOptions });
            }
        }
        return rows;
    }

    /**
     * Collect assigned buRefs from one environment's list, first-seen order, skipping empties.
     *
     * @param {string[]} references one environment's assigned buRefs
     * @param {string[]} assigned accumulator
     * @param {Set<string>} seen already-recorded buRefs
     * @returns {void}
     */
    function collectAssignedBUReferences(references, assigned, seen) {
        if (!Array.isArray(references)) {
            return;
        }
        for (const reference of references) {
            if (!reference || seen.has(reference)) {
                continue;
            }
            seen.add(reference);
            assigned.push(reference);
        }
    }

    /**
     * Assigned BUs that do not appear in any lineage mapping — neither as a source
     * (`Object.values(lineage)`) nor as a target (`Object.keys(lineage)`). Typical case: a
     * source-env BU that nothing deploys from, or a downstream BU whose "deploys from" is empty.
     * Pure: does not read `wizardState`.
     *
     * @param {{[environment: string]: string[]}} environmentBUs environment → assigned buRefs
     * @param {{[childReference: string]: string}} lineage child → parent map
     * @returns {string[]} unused buRefs in assignment order (first-seen)
     */
    function unusedLineageBUs(environmentBUs, lineage) {
        const assigned = [];
        const seen = new Set();
        const grouped = Object.values(environmentBUs || {});
        for (const references of grouped) {
            collectAssignedBUReferences(references, assigned, seen);
        }
        const map = lineage || {};
        const used = new Set([...Object.keys(map), ...Object.values(map)]);
        return assigned.filter((reference) => !used.has(reference));
    }

    /**
     * Non-blocking explainer listing unused BUs. One original sentence; empty unused → empty string.
     *
     * @param {string[]} unused unused buRefs
     * @returns {string} the note text
     */
    function unusedLineageNoteText(unused) {
        if (!unused || unused.length === 0) {
            return '';
        }
        const names = unused.join(', ');
        if (unused.length === 1) {
            return (
                names + ' is not linked in the lineage, so it will not appear in generated pipelines.'
            );
        }
        return (
            names + ' are not linked in the lineage, so they will not appear in generated pipelines.'
        );
    }

    /**
     * `lineage` gate: every child buRef (every BU of every non-first environment) has a parent
     * chosen. Only reached when the step is visible (an env holds >1 BU).
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedLineage() {
        const rows = lineageLinkRows();
        const lineage = state.wizardState.lineage || {};
        const unlinked = rows.filter((row) => !Object.hasOwn(lineage, row.childRef));
        if (unlinked.length > 0) {
            return {
                ok: false,
                reason: 'Choose an upstream BU for every environment BU before continuing.',
            };
        }
        return { ok: true, reason: '' };
    }


    /**
     * The "Do you use shared data extensions?" question for the lineage step (full-pipeline mode).
     * A single yes/no checkbox bound to `state.wizardState.sharedDEs` plus a short explainer. Toggling
     * it persists the answer (autosave) and re-renders so the Parent BU band appears or disappears.
     * When on, the config builder emits a parent-BU (`_ParentBU_`) source==target pipeline per hop
     * that isolates each upstream env's shared-DE metadata.
     *
     * Lives in the lineage step (UI stays out of core). `setSharedDEs` is the shared core setter.
     *
     * @returns {HTMLElement} the toggle field (label + checkbox + explainer)
     */
    function sharedDEsToggle() {
        const field = makeElement('div', { class: 'mpb-field mpb-shared-des' });
        const label = makeElement('label', { class: 'mpb-check-row' });
        const checkbox = makeElement('input', {
            type: 'checkbox',
            checked: !!state.wizardState.sharedDEs,
        });
        checkbox.addEventListener('change', () => {
            setSharedDEs(checkbox.checked);
        });
        label.append(checkbox, makeElement('span', { text: 'Do you use shared data extensions?' }));
        field.append(label);
        field.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Turn this on if a parent business unit owns data extensions that every child BU inherits. The generated config then adds a parent-BU deployment pipeline per environment hop so those shared DEs are promoted alongside the child metadata.',
            })
        );
        return field;
    }

    /**
     * `lineage` step: only reached when at least one environment holds >1 BU (otherwise
     * `visibleSteps()` skips it). Auto-derives the obvious single-parent chains as defaults, then
     * shows a parent-BU selector per child buRef so the user can re-point ambiguous branches.
     * Lineage is stored keyed by child buRef → parent buRef.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderLineageStep(panel) {
        // Note: renderWizardStep() already tore down any prior lineage overlay before this call, so a
        // fresh overlay is mounted below without leaking the previous render's resize listener/frame.
        // Seed defaults for any unlinked child before rendering the selectors.
        autoDeriveLineage();
        const rows = lineageLinkRows();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Link each environment BU to the upstream BU it deploys from. Sensible defaults are filled in — adjust the branching ones as needed. Arrows show which upstream BU each one deploys from.',
            })
        );
        // Shared-DE question sits above the board (and the Parent BU band) so toggling it can show
        // or hide the read-only parent overlay without leaving the step.
        panel.append(sharedDEsToggle());
        if (rows.length === 0) {
            // No board to reveal into — drop a pending enter animation so it cannot fire later.
            shouldAnimateParentBandEnter = false;
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Nothing to link yet — assign BUs first.' })
            );
            return;
        }

        const stack = makeElement('div', {
            class: state.wizardState.sharedDEs ? 'mpb-lineage-stack mpb-lineage-stack--with-parent' : 'mpb-lineage-stack',
        });
        // Read-only Parent BU band: same env-column rhythm as the board below, only when shared DEs
        // are in play. Mounted first so it reads as a spanning row above the interactive graph.
        const parentMount = state.wizardState.sharedDEs ? renderParentBand() : null;
        if (parentMount) {
            stack.append(parentMount.band);
            revealParentBand(parentMount);
        }

        // One column per environment (in env order); the lowest/source env has no upstream, so its
        // BUs are shown as read-only source nodes and every later env lists its child BUs with an
        // upstream-BU <select>. Columns spread evenly across the width (flex, no masonry wrap).
        const unusedSet = new Set(
            unusedLineageBUs(state.wizardState.envBUs, state.wizardState.lineage)
        );
        const board = makeElement('div', { class: 'mpb-lineage-board' });
        const order = environmentNames();
        for (const [environmentIndex, environment] of order.entries()) {
            board.append(lineageColumn(environment, environmentIndex, unusedSet));
        }
        // The SVG overlay draws the child→parent connector arrows on top of the columns. It is
        // decorative (the <select>s carry the real state), so it is marked aria-hidden.
        const overlay = makeSvg('svg', {
            class: 'mpb-lineage-overlay',
            'aria-hidden': 'true',
            'data-marker-id': 'mpb-lineage-arrowhead',
        });
        board.append(overlay);
        stack.append(board);
        panel.append(stack);
        const unused = [...unusedSet];
        if (unused.length > 0) {
            panel.append(unusedLineageNote(unused));
        }
        // Anchor each overlay + schedule the first draw once the columns have a real layout, and keep
        // the arrows in sync with window resizes until the step is left (teardownLineageOverlay).
        if (parentMount) {
            mountLineageOverlay(parentMount.board, parentMount.overlay);
        }
        mountLineageOverlay(board, overlay);
        // Enable drag-to-connect (native HTML5 DnD) on top of the <select> keyboard fallback.
        mountLineageDnd(board);
    }

    /**
     * The read-only Parent BU overlay groups: one entry per environment (including empty ones, so
     * columns stay aligned with the lineage board), each listing that env's assigned child BUs and
     * their stored suffixes. Empty when `sharedDEs` is off — the band is not mounted in that case.
     *
     * @returns {{environment: string, nodes: {reference: string, suffix: string}[]}[]} env-grouped nodes
     */
    function parentBandNodes() {
        if (!state.wizardState.sharedDEs) {
            return [];
        }
        return environmentNames().map((environment) => ({
            environment: environment,
            nodes: assignedBUReferences(environment).map((reference) => ({
                reference: reference,
                suffix: suffixOf(reference),
            })),
        }));
    }

    /**
     * Whether the Parent BU `<details>` is expanded. UI-only (not part of `wizardState`, so it is
     * neither persisted nor fed to the builders). Defaults to true; reset to true whenever
     * `sharedDEs` flips from false → true. Survives `render()` so a lineage remount does not force
     * the band back open after the user collapsed it via the summary.
     *
     * @type {boolean}
     */
    let isParentBandExpanded = true;

    /**
     * One-shot: the next Parent BU mount should play the 0fr → 1fr enter animation (checkbox just
     * turned shared DEs on). Cleared when consumed. UI-only — never persisted.
     *
     * @type {boolean}
     */
    let shouldAnimateParentBandEnter = false;

    /**
     * The mounted Parent BU slot, or null when the band is not in the document. Lets the
     * shared-DEs exit animation collapse in place without a remount.
     *
     * @type {HTMLElement|null}
     */
    let parentBandSlotElement = null;

    /**
     * Pending shared-DEs collapse: the slot being hidden and its `transitionend` handler. Null
     * when no exit is in flight. Cancelled if the checkbox is turned back on before the collapse
     * finishes.
     *
     * @type {{slot: HTMLElement, onEnd: (event: TransitionEvent) => void}|null}
     */
    let parentBandExit = null;

    /**
     * Build the spanning Parent BU band: a native `<details>` / `<summary>` across every environment
     * column, with one inert node per assigned child BU (name + stored suffix) grouped into the
     * same columns as the lineage board below. Decorative — no drag, no select, no focus. The
     * outer slot is the 0fr → 1fr animator so enabling shared DEs expands the whole band
     * top-to-bottom; the inner body uses the same grid so collapsing via the summary animates too.
     *
     * @returns {{band: HTMLElement, board: HTMLElement, overlay: SVGElement, shouldAnimateEnter: boolean}} mount handles
     */
    function renderParentBand() {
        const shouldAnimateEnter = shouldAnimateParentBandEnter;
        shouldAnimateParentBandEnter = false;
        const slot = makeElement('div', { class: 'mpb-parent-band-slot' });
        const details = makeElement('details', {
            class: 'mpb-parent-band',
            open: isParentBandExpanded,
            attrs: {
                role: 'group',
                'aria-label': 'Parent BU shared-data-extension flows',
            },
        });
        details.append(makeElement('summary', { class: 'mpb-parent-band-title', text: 'Parent BU' }));
        const body = makeElement('div', { class: 'mpb-parent-band-body' });
        const board = makeElement('div', { class: 'mpb-lineage-board' });
        for (const group of parentBandNodes()) {
            const column = makeElement('div', { class: 'mpb-lineage-col' });
            for (const node of group.nodes) {
                column.append(parentBandNode(node.reference, node.suffix));
            }
            board.append(column);
        }
        const overlay = makeSvg('svg', {
            class: 'mpb-lineage-overlay',
            'aria-hidden': 'true',
            'data-marker-id': 'mpb-parent-arrowhead',
        });
        board.append(overlay);
        body.append(board);
        details.append(body);
        slot.append(details);
        parentBandSlotElement = slot;
        details.addEventListener('toggle', () => {
            isParentBandExpanded = details.open;
            drawLineageArrows();
        });
        body.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'grid-template-rows') {
                drawLineageArrows();
            }
        });
        slot.addEventListener('transitionend', (event) => {
            if (event.propertyName === 'grid-template-rows') {
                drawLineageArrows();
            }
        });
        return { band: slot, board: board, overlay: overlay, shouldAnimateEnter: shouldAnimateEnter };
    }

    /**
     * Reveal the Parent BU slot after it is in the document. A normal remount (lineage drag /
     * suffix-less re-render) applies `.is-visible` immediately so the band does not re-animate.
     * A shared-DEs false → true flip starts at 0fr and adds the class on the next frame so the
     * grid row animates open top-to-bottom.
     *
     * @param {{band: HTMLElement, shouldAnimateEnter: boolean}} parentMount the slot + enter flag
     * @returns {void}
     */
    function revealParentBand(parentMount) {
        const slot = parentMount.band;
        if (!parentMount.shouldAnimateEnter) {
            slot.classList.add('is-visible');
            return;
        }
        // Force a 0fr layout so adding `.is-visible` on the next frame animates 0fr → 1fr.
        if (typeof slot.getBoundingClientRect === 'function') {
            slot.getBoundingClientRect();
        }
        const reveal = () => {
            // Rapid uncheck before this frame: stay collapsed so the exit path owns the slot.
            if (parentBandExit || !state.wizardState.sharedDEs) {
                return;
            }
            slot.classList.add('is-visible');
        };
        if (global.requestAnimationFrame) {
            global.requestAnimationFrame(reveal);
        } else {
            reveal();
        }
    }

    /**
     * Shared name + suffix title row used by both the inert Parent BU nodes and the interactive
     * lineage nodes. The unused-pipeline warning sits between name and suffix when requested so
     * the suffix stays right-aligned.
     *
     * @param {string} reference the BU reference
     * @param {{suffix?: string, unused?: boolean}} [options] stored suffix override + unused flag
     * @returns {HTMLElement} the title-row element
     */
    function lineageNodeTitleRow(reference, options) {
        const settings = options || {};
        const suffix = typeof settings.suffix === 'string' ? settings.suffix : suffixOf(reference);
        const row = makeElement('div', { class: 'mpb-lineage-node-title' });
        row.append(makeElement('span', { class: 'mpb-lineage-node-name', text: reference }));
        if (settings.unused) {
            row.append(unusedLineageIcon());
        }
        row.append(makeElement('span', { class: 'mpb-lineage-node-suffix', text: suffix }));
        return row;
    }

    /**
     * Small non-blocking warning mark for a BU that is assigned but unused in the lineage.
     *
     * @returns {HTMLElement} the icon element
     */
    function unusedLineageIcon() {
        return makeElement('span', {
            class: 'mpb-lineage-node-unused',
            text: '\u{26A0}',
            attrs: {
                role: 'img',
                'aria-label': 'Not used in any pipeline',
            },
        });
    }

    /**
     * Non-blocking note below the lineage board listing unused BUs.
     *
     * @param {string[]} unused unused buRefs
     * @returns {HTMLElement} the note paragraph
     */
    function unusedLineageNote(unused) {
        return makeElement('p', {
            class: 'mpb-warn mpb-lineage-unused-note',
            text: unusedLineageNoteText(unused),
        });
    }

    /**
     * One inert Parent BU node: shared title row (name left, suffix right). Not focusable and not
     * a drag source — the child board owns the interactive lineage mapping.
     *
     * @param {string} reference the child buRef
     * @param {string} suffix the stored suffix (may be empty; never invented here)
     * @returns {HTMLElement} the node element
     */
    function parentBandNode(reference, suffix) {
        const node = makeElement('div', {
            class: 'mpb-parent-node',
            attrs: {
                id: parentBandNodeId(reference),
                'data-bu': reference,
            },
        });
        node.append(lineageNodeTitleRow(reference, { suffix: suffix }));
        return node;
    }

    /**
     * Stable DOM id for a Parent BU overlay node. Prefixed separately from `lineageNodeId` so the
     * two boards can share a document without id collisions.
     *
     * @param {string} reference the BU reference
     * @returns {string} the element id
     */
    function parentBandNodeId(reference) {
        return 'mpb-parent-node-' + reference.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Build one environment column for the lineage board: a titled column listing that environment's
     * BUs. The source (first) environment has no upstream, so its BUs are plain nodes; every later
     * environment gives each BU an upstream-BU `<select>`. Each BU node carries a stable id so the
     * SVG overlay can anchor connector arrows to it.
     *
     * @param {string} environment the environment name
     * @param {number} environmentIndex the environment's index in env order (0 = source)
     * @param {Set<string>} unusedSet assigned buRefs that are unused in the lineage
     * @returns {HTMLElement} the column element
     */
    function lineageColumn(environment, environmentIndex, unusedSet) {
        const column = makeElement('div', { class: 'mpb-lineage-col' });
        column.append(
            makeElement('p', {
                class: 'mpb-lineage-col-title',
                text: environment || '(unnamed environment)',
            })
        );
        const parentOptions =
            environmentIndex > 0 ? assignedBUReferences(environmentNames()[environmentIndex - 1]) : [];
        const unused = unusedSet || new Set();
        for (const reference of assignedBUReferences(environment)) {
            column.append(lineageNode(environmentIndex, reference, parentOptions, unused));
        }
        return column;
    }

    /**
     * Build one BU node inside a lineage column: the BU name, plus (for non-source environments) an
     * upstream-BU `<select>` that writes the child→parent lineage. The node id is stable across
     * renders so the SVG overlay can look up its bounding box.
     *
     * @param {number} environmentIndex the environment's index in env order
     * @param {string} reference the BU reference
     * @param {string[]} parentOptions the upstream env's BU references (empty for the source env)
     * @param {Set<string>} unusedSet assigned buRefs that are unused in the lineage
     * @returns {HTMLElement} the node element
     */
    function lineageNode(environmentIndex, reference, parentOptions, unusedSet) {
        const node = makeElement('div', {
            class: 'mpb-lineage-node',
            // draggable + data-env-index drive the native drag-to-connect handlers (mountLineageDnd):
            // dragging a lower-env node onto the adjacent higher-env node creates the lineage link.
            draggable: true,
            attrs: {
                id: lineageNodeId(reference),
                'data-bu': reference,
                'data-env-index': String(environmentIndex),
            },
        });
        node.append(
            lineageNodeTitleRow(reference, { unused: unusedSet && unusedSet.has(reference) })
        );
        // The source env has no upstream to choose — its BUs are pure connector targets/sources.
        if (environmentIndex === 0) {
            return node;
        }
        const current = (state.wizardState.lineage || {})[reference] || '';
        const selectId = 'mpb-lineage-sel-' + environmentIndex + '-' + reference;
        const label = makeElement('label', {
            class: 'mpb-lineage-node-label',
            text: 'deploys from',
            attrs: { for: selectId },
        });
        const select = makeElement('select', { id: selectId, class: 'mpb-lineage-select' });
        select.append(makeElement('option', { value: '', text: '— choose upstream BU —' }));
        for (const option of parentOptions) {
            select.append(
                makeElement('option', { value: option, text: option, selected: option === current })
            );
        }
        select.addEventListener('change', () => {
            const lineage = { ...state.wizardState.lineage };
            if (select.value) {
                lineage[reference] = select.value;
            } else {
                delete lineage[reference];
            }
            state.wizardState.lineage = lineage;
            render();
        });
        node.append(label, select);
        return node;
    }

    /**
     * Stable DOM id for a lineage BU node, so the SVG overlay can resolve a child/parent buRef to its
     * on-screen box. A buRef is unique per board (single-assignment invariant), so the ref alone is a
     * safe key. Non-id-safe characters (`/` from multiCred refs, spaces) are encoded to keep the id
     * valid for a `#<id>` CSS selector.
     *
     * @param {string} reference the BU reference
     * @returns {string} the element id
     */
    function lineageNodeId(reference) {
        return 'mpb-lin-node-' + reference.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Whether a drag-to-connect gesture is a valid lineage link. Lineage only ever links an env to
     * the env immediately upstream (env index +1), and the drag direction is lower→higher env, so a
     * drop is valid only when the target column is exactly one to the right of the dragged node's
     * column. Rightward-onto-lower, onto-self, and skip-a-column drops are all rejected.
     *
     * @param {number} fromEnvironmentIndex the dragged (parent/source) node's env index
     * @param {number} toEnvironmentIndex the drop-target (child) node's env index
     * @returns {boolean} true only when `toEnvironmentIndex === fromEnvironmentIndex + 1`
     */
    function isValidLineageDrag(fromEnvironmentIndex, toEnvironmentIndex) {
        return (
            Number.isSafeInteger(fromEnvironmentIndex) &&
            Number.isSafeInteger(toEnvironmentIndex) &&
            toEnvironmentIndex === fromEnvironmentIndex + 1
        );
    }

    /**
     * Apply a lineage mapping (`child deploys from parent`) in place: update
     * `state.wizardState.lineage`, sync the child's upstream `<select>` value, redraw the connector
     * arrows, refresh the nav gate, and schedule an autosave — without a full re-render, so a drag
     * never blurs focus or rebuilds the board. Mirrors the in-place update pattern used by the
     * text-input handlers.
     *
     * @param {string} childReference the child BU reference (higher/target env)
     * @param {string} parentReference the parent BU reference (lower/source env)
     * @param {HTMLElement} board the lineage board container (to locate the child's select)
     * @returns {void}
     */
    function setLineageMapping(childReference, parentReference, board) {
        const lineage = { ...state.wizardState.lineage , [childReference]: parentReference,};
        state.wizardState.lineage = lineage;
        // Keep the keyboard/a11y <select> in sync with the drag-created mapping.
        const childNode = board.querySelector('#' + lineageNodeId(childReference));
        const select = childNode ? childNode.querySelector('.mpb-lineage-select') : null;
        if (select) {
            select.value = parentReference;
        }
        refreshUnusedLineageWarnings(board);
        updateNavGate();
        scheduleAutosave();
    }

    /**
     * Sync unused-BU warning icons and the board-level explainer after a lineage mapping change,
     * then redraw connectors (icon presence can change node height). Safe on a stub board that
     * lacks `querySelectorAll`.
     *
     * @param {HTMLElement} board the interactive lineage board
     * @returns {void}
     */
    function refreshUnusedLineageWarnings(board) {
        const unused = unusedLineageBUs(state.wizardState.envBUs, state.wizardState.lineage);
        if (board && typeof board.querySelectorAll === 'function') {
            const unusedSet = new Set(unused);
            for (const node of board.querySelectorAll('.mpb-lineage-node')) {
                const title = node.querySelector('.mpb-lineage-node-title');
                if (!title) {
                    continue;
                }
                const existing = title.querySelector('.mpb-lineage-node-unused');
                const isUnused = unusedSet.has(node.dataset.bu);
                if (isUnused && !existing) {
                    const suffix = title.querySelector('.mpb-lineage-node-suffix');
                    title.insertBefore(unusedLineageIcon(), suffix || null);
                } else if (!isUnused && existing && existing.parentNode) {
                    existing.remove();
                }
            }
            refreshUnusedLineageNote(board, unused);
        }
        drawLineageArrows();
    }

    /**
     * Create, update, or remove the non-blocking unused-BU note below the lineage board.
     *
     * @param {HTMLElement} board the interactive lineage board
     * @param {string[]} unused unused buRefs
     * @returns {void}
     */
    function refreshUnusedLineageNote(board, unused) {
        const stack = board.parentElement;
        if (!stack) {
            return;
        }
        const host = stack.parentElement;
        if (!host) {
            return;
        }
        const note =
            typeof host.querySelector === 'function' ? host.querySelector('.mpb-lineage-unused-note') : null;
        if (unused.length === 0) {
            if (note && note.parentNode) {
                note.remove();
            }
            return;
        }
        const text = unusedLineageNoteText(unused);
        if (note) {
            setText(note, text);
            return;
        }
        const created = unusedLineageNote(unused);
        if (typeof stack.after === 'function') {
            stack.after(created);
        } else if (typeof host.append === 'function') {
            host.append(created);
        }
    }

    /**
     * The SVG XML namespace, needed because SVG elements must be created with `createElementNS`
     * (a plain `createElement('svg')` yields an inert HTML-namespaced element that never renders).
     *
     * @type {string}
     */
    const SVG_NS = 'http://www.w3.org/2000/svg';

    /**
     * Create an SVG element in the SVG namespace and apply attributes. The connector overlay is
     * decorative geometry only (no user data), so plain attribute strings are safe here.
     *
     * @param {string} tag the SVG tag name (`svg` / `marker` / `path` / `line`)
     * @param {{[attribute: string]: (string|number)}} [attributes] attribute name → value map
     * @returns {SVGElement} the created element
     */
    function makeSvg(tag, attributes) {
        const element = document_.createElementNS(SVG_NS, tag);
        const entries = Object.entries(attributes || {});
        for (const [name, value] of entries) {
            element.setAttribute(name, String(value));
        }
        return element;
    }

    /**
     * Module-scoped handles for every active lineage connector overlay (the interactive board plus
     * the optional Parent BU band). Each entry is the board + svg it draws into, the bound resize
     * listener, and any pending animation frame. Empty when the lineage step is not mounted so
     * `teardownLineageOverlay` can remove every listener and cancel every frame.
     *
     * @type {{board: HTMLElement, svg: SVGElement, onResize: () => void, frame: (number|null)}[]}
     */
    let lineageOverlays = [];

    /**
     * The connector arrow colour — the Marketing accent already used for the diagramforce preview,
     * kept subtle. Mirrors `DIAGRAM_ACCENT` so the lineage arrows and the exported diagram share a
     * palette without coupling the two features.
     *
     * @type {string}
     */
    const LINEAGE_ARROW_COLOR = '#F49825';

    /**
     * Mount the lineage connector overlay: size the SVG to the board, draw the initial arrows, and
     * keep them aligned on window resize (rAF-debounced). Redraws on `<select>` change happen for
     * free because a change re-renders the whole step, which re-mounts the overlay. The listener is
     * removed by `teardownLineageOverlay` when the step is left, so nothing leaks.
     *
     * @param {HTMLElement} board the lineage board container
     * @param {SVGElement} svg the overlay svg element
     * @returns {void}
     */
    function mountLineageOverlay(board, svg) {
        // Guard hosts without a real layout engine (the Node test stub) — nothing to draw there.
        if (typeof board.getBoundingClientRect !== 'function' || !global.requestAnimationFrame) {
            return;
        }
        const overlay = { board: board, svg: svg, onResize: null, frame: null };
        overlay.onResize = () => {
            if (overlay.frame !== null) {
                return;
            }
            overlay.frame = global.requestAnimationFrame(() => {
                if (!lineageOverlays.includes(overlay)) {
                    return;
                }
                overlay.frame = null;
                drawLineageArrows();
            });
        };
        lineageOverlays.push(overlay);
        if (global.addEventListener) {
            global.addEventListener('resize', overlay.onResize);
        }
        // Draw on the next frame so the columns have their final laid-out sizes.
        overlay.frame = global.requestAnimationFrame(() => {
            if (!lineageOverlays.includes(overlay)) {
                return;
            }
            overlay.frame = null;
            drawLineageArrows();
        });
    }

    /**
     * Collect a buRef → node map from every `[data-bu]` element inside a connector container
     * (the interactive lineage board or the Parent BU band). Scoped to that container so the two
     * boards never resolve each other's nodes.
     *
     * @param {HTMLElement} container the board that owns the nodes
     * @returns {{[reference: string]: HTMLElement}} the node map
     */
    function collectLineageNodeMap(container) {
        const nodeMap = {};
        for (const node of container.querySelectorAll('[data-bu]')) {
            nodeMap[node.dataset.bu] = node;
        }
        return nodeMap;
    }

    /**
     * Draw one arrowed connector per child→parent lineage link whose both ends exist in `nodeMap`.
     * Geometry is derived from live `getBoundingClientRect` deltas against `container`'s own rect.
     * Shared by the interactive lineage board and the read-only Parent BU band.
     *
     * @param {HTMLElement} container the board the SVG is sized to
     * @param {{[reference: string]: HTMLElement}} nodeMap buRef → node element
     * @param {{[childReference: string]: string}} lineage child → parent map
     * @returns {void}
     */
    function drawLineageConnectors(container, nodeMap, lineage) {
        const svg = container.querySelector('.mpb-lineage-overlay');
        if (!svg || typeof container.getBoundingClientRect !== 'function') {
            return;
        }
        const boardRect = container.getBoundingClientRect();
        svg.setAttribute('width', String(boardRect.width));
        svg.setAttribute('height', String(boardRect.height));
        svg.setAttribute('viewBox', '0 0 ' + boardRect.width + ' ' + boardRect.height);
        const markerId = svg.dataset.markerId || 'mpb-lineage-arrowhead';
        setText(svg, '');
        svg.append(buildArrowMarkerDefs(markerId));
        for (const [childReference, parentReference] of Object.entries(lineage)) {
            const childNode = nodeMap[childReference];
            const parentNode = nodeMap[parentReference];
            if (childNode && parentNode) {
                svg.append(buildArrowPath(boardRect, parentNode, childNode, markerId));
            }
        }
    }

    /**
     * Redraw every mounted lineage overlay (interactive board + optional Parent BU band) from the
     * current `wizardState.lineage`. Rebuilt from scratch each call (cheap, and avoids stale segments).
     *
     * @returns {void}
     */
    function drawLineageArrows() {
        if (lineageOverlays.length === 0) {
            return;
        }
        const lineage = state.wizardState.lineage || {};
        for (const overlay of lineageOverlays) {
            // Skip the Parent BU overlay while its `<details>` is closed so we do not measure
            // collapsed node boxes. The interactive child board has no ancestor details.
            const parentDetails =
                overlay.board && typeof overlay.board.closest === 'function'
                    ? overlay.board.closest('details.mpb-parent-band')
                    : null;
            if (parentDetails && !parentDetails.open) {
                continue;
            }
            // Skip the parent overlay while the shared-DEs exit collapse is in flight.
            if (
                parentBandExit &&
                overlay.board &&
                typeof overlay.board.closest === 'function' &&
                overlay.board.closest('.mpb-parent-band-slot')
            ) {
                continue;
            }
            drawLineageConnectors(overlay.board, collectLineageNodeMap(overlay.board), lineage);
        }
    }

    /**
     * Build the `<defs>` holding one reusable arrowhead `<marker>`, pointing right and tinted
     * with the lineage accent colour. `markerId` is unique per overlay so two SVGs in the same
     * document do not share a `#id`.
     *
     * @param {string} markerId the marker element id
     * @returns {SVGElement} the defs element
     */
    function buildArrowMarkerDefs(markerId) {
        const defs = makeSvg('defs');
        const marker = makeSvg('marker', {
            id: markerId,
            markerWidth: 8,
            markerHeight: 8,
            refX: 7,
            refY: 4,
            orient: 'auto',
            markerUnits: 'userSpaceOnUse',
        });
        marker.append(makeSvg('path', { d: 'M0,0 L8,4 L0,8 Z', fill: LINEAGE_ARROW_COLOR }));
        defs.append(marker);
        return defs;
    }

    /**
     * Build one smooth cubic-Bézier connector from a parent node's right edge to a child node's left
     * edge, both expressed in board-local coordinates, ending in the shared arrowhead marker (so the
     * arrow points at the child). The control points are offset horizontally by ~45% of the span so
     * the curve leaves the source and arrives at the target horizontally — a gentle S-curve that
     * reads left-to-right (and still enters/exits toward the neighbour when columns stack). No
     * mid-line decoration is drawn.
     *
     * @param {DOMRect} boardRect the board's bounding rect (the coordinate origin)
     * @param {HTMLElement} parentNode the upstream BU node (curve start)
     * @param {HTMLElement} childNode the child BU node (arrow target)
     * @param {string} markerId the arrowhead marker id declared on this overlay's svg
     * @returns {SVGElement} the path element
     */
    function buildArrowPath(boardRect, parentNode, childNode, markerId) {
        const parentRect = parentNode.getBoundingClientRect();
        const childRect = childNode.getBoundingClientRect();
        // Start at the parent's right-middle, end at the child's left-middle, relative to the board.
        const x1 = parentRect.right - boardRect.left;
        const y1 = parentRect.top + parentRect.height / 2 - boardRect.top;
        const x2 = childRect.left - boardRect.left;
        const y2 = childRect.top + childRect.height / 2 - boardRect.top;
        // Horizontal control-point offset: 45% of the horizontal span keeps the curve tangent to the
        // horizontal at both ends. Clamped to a small minimum so a near-zero span (stacked columns)
        // still bows out instead of collapsing to a straight segment.
        const dx = x2 - x1;
        const handle = Math.max(Math.abs(dx) * 0.45, 24);
        const cx1 = x1 + handle;
        const cx2 = x2 - handle;
        const d = 'M ' + x1 + ' ' + y1 + ' C ' + cx1 + ' ' + y1 + ', ' + cx2 + ' ' + y2 + ', ' + x2 + ' ' + y2;
        return makeSvg('path', {
            d: d,
            fill: 'none',
            stroke: LINEAGE_ARROW_COLOR,
            'stroke-width': 1.8,
            'stroke-linecap': 'round',
            'marker-end': 'url(#' + markerId + ')',
        });
    }

    /**
     * Tear down the lineage connector overlay: remove the resize listener and cancel any pending
     * animation frame. Called whenever the lineage step re-renders or is left, mirroring the board
     * sortable teardown so a discarded step host never leaves a dangling handler behind.
     *
     * @returns {void}
     */
    function teardownLineageOverlay() {
        clearParentBandExit();
        parentBandSlotElement = null;
        for (const overlay of lineageOverlays) {
            if (global.removeEventListener) {
                global.removeEventListener('resize', overlay.onResize);
            }
            if (overlay.frame !== null && global.cancelAnimationFrame) {
                global.cancelAnimationFrame(overlay.frame);
            }
        }
        lineageOverlays = [];
    }

    /**
     * Module-scoped handle for the active lineage drag-to-connect wiring: the board it is bound to
     * and the delegated listeners registered on it, so `teardownLineageDnd` can remove them when the
     * step is left. Non-null only while the lineage step is mounted.
     *
     * @type {({board: HTMLElement, listeners: {type: string, handler: (event: DragEvent) => void}[]}|null)}
     */
    let lineageDnd = null;

    /**
     * The lineage node currently being dragged (its parent/source BU reference + env index), or null
     * when no drag is in progress. Set on `dragstart`, cleared on `dragend`.
     *
     * @type {({reference: string, environmentIndex: number}|null)}
     */
    let lineageDragSource = null;

    /**
     * Resolve the `.mpb-lineage-node` element for a drag event target, or null when the event did not
     * originate on a BU node (e.g. dragging over the board gap or the decorative overlay).
     *
     * @param {EventTarget|null} target the event target
     * @returns {HTMLElement|null} the closest lineage node element, or null
     */
    function lineageNodeFromTarget(target) {
        if (!target || typeof target.closest !== 'function') {
            return null;
        }
        return target.closest('.mpb-lineage-node');
    }

    /**
     * `dragstart` handler for a lineage node: record the dragged node's BU reference + env index as
     * the drag source (it is the parent/source of the mapping) and flag it visually.
     *
     * @param {DragEvent} event the drag event
     * @returns {void}
     */
    function onLineageDragStart(event) {
        const node = lineageNodeFromTarget(event.target);
        if (!node) {
            return;
        }
        lineageDragSource = {
            reference: node.dataset.bu,
            environmentIndex: Number(node.dataset.envIndex),
        };
        node.classList.add('is-dragging');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'link';
            // A payload is required for Firefox to start the drag; the real state lives in
            // lineageDragSource.
            event.dataTransfer.setData('text/plain', lineageDragSource.reference);
        }
    }

    /**
     * `dragover` handler: highlight the hovered node as a valid drop target (and mark it a drop zone
     * via preventDefault) only when it is exactly one column to the right of the drag source;
     * otherwise show the invalid state.
     *
     * @param {DragEvent} event the drag event
     * @returns {void}
     */
    function onLineageDragOver(event) {
        const node = lineageNodeFromTarget(event.target);
        if (!node || !lineageDragSource) {
            return;
        }
        const targetIndex = Number(node.dataset.envIndex);
        const isValid = isValidLineageDrag(lineageDragSource.environmentIndex, targetIndex);
        // preventDefault on a valid target is what makes it a drop zone.
        if (isValid) {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'link';
            }
            node.classList.add('is-drop-target');
        } else {
            node.classList.add('is-drop-invalid');
        }
    }

    /**
     * `dragleave` handler: clear the drop-target/invalid highlight as the pointer exits a node.
     *
     * @param {DragEvent} event the drag event
     * @returns {void}
     */
    function onLineageDragLeave(event) {
        const node = lineageNodeFromTarget(event.target);
        if (node) {
            node.classList.remove('is-drop-target', 'is-drop-invalid');
        }
    }

    /**
     * Enable drag-to-connect on the lineage board using native HTML5 drag-and-drop. Dragging a BU
     * node (lower env) onto the BU node directly one column to the right (higher env) creates the
     * mapping `lineage[child] = parent`. Native DnD is used instead of SortableJS because the gesture
     * targets a *specific* node to form a pair (SortableJS is list-reorder oriented). All listeners
     * are delegated on the board and tracked for teardown. The `<select>` keeps working for keyboard
     * users and stays in sync via `setLineageMapping`. The `drop`/`dragend` handlers close over the
     * board (to resolve nodes and clear stale highlights); the source/over/leave handlers are
     * module-scoped as they only touch module state.
     *
     * @param {HTMLElement} board the lineage board container
     * @returns {void}
     */
    function mountLineageDnd(board) {
        // Guard hosts without DOM drag support (the Node test stub): the pure logic is unit-tested via
        // isValidLineageDrag / setLineageMapping, so skipping the wiring here is safe.
        if (typeof board.addEventListener !== 'function') {
            return;
        }
        const onDrop = (event) => {
            const node = lineageNodeFromTarget(event.target);
            node?.classList.remove('is-drop-target', 'is-drop-invalid');
            if (!node || !lineageDragSource) {
                return;
            }
            const targetIndex = Number(node.dataset.envIndex);
            if (!isValidLineageDrag(lineageDragSource.environmentIndex, targetIndex)) {
                return;
            }
            event.preventDefault();
            // Dragged node = parent/source (lower env); drop target = child (higher env).
            const childReference = node.dataset.bu;
            setLineageMapping(childReference, lineageDragSource.reference, board);
        };
        const onDragEnd = () => {
            if (lineageDragSource) {
                const previous = board.querySelector(
                    '#' + lineageNodeId(lineageDragSource.reference)
                );
                previous?.classList.remove('is-dragging');
            }
            for (const node of board.querySelectorAll('.mpb-lineage-node')) {
                node.classList.remove('is-drop-target', 'is-drop-invalid');
            }
            lineageDragSource = null;
        };
        const listeners = [
            { type: 'dragstart', handler: onLineageDragStart },
            { type: 'dragover', handler: onLineageDragOver },
            { type: 'dragleave', handler: onLineageDragLeave },
            { type: 'drop', handler: onDrop },
            { type: 'dragend', handler: onDragEnd },
        ];
        for (const { type, handler } of listeners) {
            board.addEventListener(type, handler);
        }
        lineageDnd = { board: board, listeners: listeners };
    }

    /**
     * Tear down the lineage drag-to-connect wiring: remove every delegated listener from the board
     * and clear the in-progress drag source. Called alongside the overlay teardown so a discarded
     * step host never leaves dangling drag handlers behind.
     *
     * @returns {void}
     */
    function teardownLineageDnd() {
        if (!lineageDnd) {
            return;
        }
        for (const { type, handler } of lineageDnd.listeners) {
            lineageDnd.board.removeEventListener(type, handler);
        }
        lineageDnd = null;
        lineageDragSource = null;
    }

    /**
     * Drop a pending shared-DEs exit listener without unmounting the slot.
     *
     * @returns {void}
     */
    function clearParentBandExit() {
        if (!parentBandExit) {
            return;
        }
        parentBandExit.slot.removeEventListener('transitionend', parentBandExit.onEnd);
        parentBandExit = null;
    }

    /**
     * Cancel an in-flight shared-DEs collapse: keep the slot, re-add `.is-visible`, and redraw.
     *
     * @returns {boolean} true when a pending exit was cancelled
     */
    function cancelParentBandExit() {
        if (!parentBandExit) {
            return false;
        }
        const slot = parentBandExit.slot;
        clearParentBandExit();
        slot.classList.add('is-visible');
        slot.removeAttribute('inert');
        drawLineageArrows();
        return true;
    }

    /**
     * Start the top-to-bottom collapse. The slot stays in the DOM until `transitionend` on
     * `grid-template-rows`. A slot that was never revealed unmounts immediately.
     *
     * @returns {boolean} true when a mounted slot is being collapsed (or was immediately removed)
     */
    function beginParentBandExit() {
        const slot = parentBandSlotElement;
        if (!slot || !slot.classList) {
            return false;
        }
        clearParentBandExit();
        if (!slot.classList.contains('is-visible')) {
            finishParentBandExit(slot);
            return true;
        }
        const onEnd = (event) => {
            if (event.target !== slot || event.propertyName !== 'grid-template-rows') {
                return;
            }
            clearParentBandExit();
            finishParentBandExit(slot);
        };
        parentBandExit = { slot: slot, onEnd: onEnd };
        slot.addEventListener('transitionend', onEnd);
        slot.classList.remove('is-visible');
        slot.setAttribute('inert', '');
        return true;
    }

    /**
     * Tear down one lineage overlay (resize listener + pending frame) whose board matches.
     *
     * @param {HTMLElement|null} board the board whose overlay should be dropped
     * @returns {void}
     */
    function teardownLineageOverlayForBoard(board) {
        if (!board) {
            return;
        }
        const remaining = [];
        for (const overlay of lineageOverlays) {
            if (overlay.board === board) {
                if (global.removeEventListener) {
                    global.removeEventListener('resize', overlay.onResize);
                }
                if (overlay.frame !== null && global.cancelAnimationFrame) {
                    global.cancelAnimationFrame(overlay.frame);
                }
            } else {
                remaining.push(overlay);
            }
        }
        lineageOverlays = remaining;
    }

    /**
     * Remove the collapsed Parent BU slot, drop its overlay, restore child-board alignment, and
     * redraw the remaining connectors.
     *
     * @param {HTMLElement} slot the `.mpb-parent-band-slot` being removed
     * @returns {void}
     */
    function finishParentBandExit(slot) {
        const parentBoard =
            typeof slot.querySelector === 'function' ? slot.querySelector('.mpb-lineage-board') : null;
        teardownLineageOverlayForBoard(parentBoard);
        const stack =
            typeof slot.closest === 'function' ? slot.closest('.mpb-lineage-stack') : slot.parentElement;
        if (slot.parentNode) {
            slot.remove();
        }
        if (stack && stack.classList) {
            stack.classList.remove('mpb-lineage-stack--with-parent');
        }
        if (parentBandSlotElement === slot) {
            parentBandSlotElement = null;
        }
        drawLineageArrows();
    }

    /**
     * Persist shared-DEs parent-band animation state. Returns true when lineage handled the
     * transition without needing a full re-render.
     *
     * @param {boolean} isEnabled new value
     * @param {boolean} wasOn previous value
     * @returns {boolean} true when render should be skipped
     */
    function onSharedDEsChange(isEnabled, wasOn) {
        if (isEnabled && !wasOn) {
            isParentBandExpanded = true;
            if (cancelParentBandExit()) {
                return true;
            }
            shouldAnimateParentBandEnter = true;
            return false;
        }
        if (!isEnabled && wasOn) {
            return beginParentBandExit();
        }
        return false;
    }

    C.registerStep({ id: 'lineage', render: renderLineageStep, canProceed: canProceedLineage });
    C.setBeforeWizardStepRender(function beforeWizardStepRender() {
        teardownLineageOverlay();
        teardownLineageDnd();
    });
    C.setOnSharedDEsChange(onSharedDEsChange);
    Object.assign(C, {
        isValidLineageDrag: isValidLineageDrag,
        setLineageMapping: setLineageMapping,
        parentBandNodes: parentBandNodes,
        unusedLineageBUs: unusedLineageBUs,
        unusedLineageNoteText: unusedLineageNoteText,
    });
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
