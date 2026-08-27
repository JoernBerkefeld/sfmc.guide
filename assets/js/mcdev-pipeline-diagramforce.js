/**
 * mcdev Pipeline Builder — Diagramforce export (pure, DOM-free at load).
 *
 * Builds a Diagramforce diagram-JSON envelope from a plain pipeline model. The model
 * pre-resolves everything the builder would otherwise read from wizard state (per-BU display
 * labels, parent-BU flags, the column bands, the title, and a timestamp), so `buildDiagramJSON`
 * is a pure, deterministic function of its input — nothing here reads or mutates controller state.
 * Kept side-by-side with the draw.io export; `DIAGRAM_BAND` / `diagramBand` stay in the core file
 * because they are shared with the draw.io path.
 *
 * Authored as a classic browser script (IIFE + browser global) with a UMD-style footer so the
 * Node test can load it for its side effect and read the global. NOT an ES module. References no
 * `document` / `window` at load time.
 *
 * @typedef {object} DiagramforceBand
 * @property {string} fill header/task fill colour
 * @property {string} stroke header/task stroke colour
 *
 * @typedef {object} DiagramforceColumn
 * @property {string} env environment name (lane header label)
 * @property {string[]} references the assigned buRefs for this environment, top-to-bottom
 * @property {string[]} labels the display label per buRef (index-aligned to `references`)
 * @property {boolean[]} parentFlags whether each buRef is a shared-DE parent BU (index-aligned)
 * @property {DiagramforceBand} band the position-locked band colours for this column
 *
 * @typedef {object} DiagramforceModel
 * @property {DiagramforceColumn[]} columns one per environment, in pipeline order
 * @property {{[childReference: string]: string}} lineage child buRef → parent buRef map
 * @property {string} title the diagram title (Diagramforce tab title)
 * @property {number} timestamp the envelope timestamp (`Date.now()` captured by the caller)
 */

/**
 * @param {(Window|typeof globalThis)} global host object to attach the browser global to
 */
(function (global) {
    'use strict';

    // Diagramforce integration constants. The diagram JSON conforms to `DIAGRAM_JSON_SPEC.md`
    // (`diagramType: 'process'`). `DIAGRAMFORCE_APP_VERSION` matches the spec snapshot so a
    // generated file does not trigger a compatibility notice.
    const DIAGRAMFORCE_APP_VERSION = '1.23.1';

    const DIAGRAM_ENV_ICON = 'custom-marketing';

    const DIAGRAM_PARENT_BU_ICON = 'custom-data';

    const DIAGRAM_HEADER_ACCENT_HEIGHT = 48;

    // Layout geometry, authored to the spec's "Container lanes" section so the diagram reads as a
    // set of uniform lanes (not a bar chart). Every lane shares one top (`y: 50`) and one height;
    // each BU task is embedded in its lane (`parent`/`embeds`) and the lane is pinned with
    // `manualSize: true` so Diagramforce's content-hug (`fitParentToChildren`) leaves the uniform
    // height intact on import and on the first card drag. Insets follow the spec: 40px header + 48px
    // pad = 88px top inset, 48px bottom, 48px left/right (so lane width = task 220 + 2*48 = 316),
    // 24px between rows.
    const DIAGRAM_COLUMN_X = 48;

    const DIAGRAM_COLUMN_STEP = 400;

    const DIAGRAM_COLUMN_WIDTH = 316;

    const DIAGRAM_TASK_WIDTH = 220;

    const DIAGRAM_TASK_HEIGHT = 52;

    const DIAGRAM_LANE_TOP_INSET = 88;

    const DIAGRAM_LANE_BOTTOM_INSET = 48;

    const DIAGRAM_LANE_SIDE_INSET = 48;

    const DIAGRAM_ROW_GAP = 24;

    /**
     * The minimal icon href the app resolves to real artwork on load (see spec "Setting an icon").
     * Naming an icon id keeps the payload small; the loader expands it via `refreshAllIconHrefs`.
     *
     * @param {string} iconId a `custom-*` / SLDS icon id from the spec's allowed set
     * @returns {string} the `data:image/svg+xml,…` href
     */
    function diagramIconHref(iconId) {
        return 'data:image/svg+xml,<svg data-icon-id="' + iconId + '"/>';
    }

    /**
     * The standard 4-port block every connectable process shape ships with. Emitted verbatim per the
     * spec so links can attach and the user can wire new connections after import.
     *
     * @returns {object} the JointJS `ports` config
     */
    function diagramPorts() {
        const portAttributes = {
            circle: {
                r: 5,
                magnet: true,
                fill: 'var(--port-color, #1D73C9)',
                stroke: '#FFFFFF',
                strokeWidth: 1.5,
            },
        };
        const markup = [{ tagName: 'circle', selector: 'circle' }];
        const group = (name) => ({ position: { name: name }, attrs: portAttributes, markup: markup });
        return {
            groups: { top: group('top'), right: group('right'), bottom: group('bottom'), left: group('left') },
            items: [
                { id: 'port-top', group: 'top' },
                { id: 'port-right', group: 'right' },
                { id: 'port-bottom', group: 'bottom' },
                { id: 'port-left', group: 'left' },
            ],
        };
    }

    /**
     * Build one `sf.Container` cell for an environment column. Header accent and outline use the
     * position-locked band; the body stays on Diagramforce's dark container tokens. The lane
     * captures its BU tasks: their ids are listed in `embeds` and each task carries the matching
     * `parent` (see the spec "Capture" section — the loader does not reconcile a half-declared
     * embed). `manualSize: true` pins the authored geometry so the content-hug
     * (`js/canvas/embedding.js` — `fitParentToChildren` early-returns on `manualSize`) does not
     * shrink-wrap the lane to its own card count on import or on the first card drag, keeping every
     * lane at the shared uniform height computed in `buildDiagramJSON`.
     *
     * @param {string} id the container cell id
     * @param {string} name the environment name (header label)
     * @param {number} x the column x position
     * @param {number} height the shared lane height (identical for every lane)
     * @param {{fill: string, stroke: string}} band the column's first/middle/last colours
     * @param {string[]} embeds the ids of the BU tasks captured by this lane
     * @returns {object} the `sf.Container` cell
     */
    function diagramEnvironmentContainer(id, name, x, height, band, embeds) {
        const headerMidY = Math.round(DIAGRAM_HEADER_ACCENT_HEIGHT / 2);
        return {
            id: id,
            type: 'sf.Container',
            position: { x: x, y: 50 },
            size: { width: DIAGRAM_COLUMN_WIDTH, height: height },
            z: 1000,
            embeds: embeds,
            manualSize: true,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 12,
                    ry: 12,
                    fill: 'var(--container-bg)',
                    stroke: band.stroke,
                    strokeWidth: 1.5,
                },
                accent: {
                    x: 1,
                    y: 1,
                    width: 'calc(w - 2)',
                    height: DIAGRAM_HEADER_ACCENT_HEIGHT,
                    rx: 11,
                    ry: 11,
                    fill: band.fill,
                },
                accentFill: {
                    x: 1,
                    y: 20,
                    width: 'calc(w - 2)',
                    height: DIAGRAM_HEADER_ACCENT_HEIGHT - 19,
                    fill: band.fill,
                },
                headerIcon: { x: 12, y: headerMidY - 12, width: 24, height: 24, href: diagramIconHref(DIAGRAM_ENV_ICON) },
                headerLabel: {
                    x: 44,
                    y: headerMidY,
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fill: '#FFFFFF',
                    text: name,
                },
            },
        };
    }

    /**
     * Build one `sf.BpmnTask` cell for a business unit. Fill/stroke follow the column band so the
     * task matches its environment header. Regular BUs hide `taskIcon` (the `custom-*` placeholder
     * renders as a broken image on `sf.BpmnTask`). A shared-DE parent BU still uses `custom-data`.
     * The task is captured by its environment lane via `parent` (the lane also lists this id in its
     * `embeds`); the lane carries `manualSize: true`, so the authored `position` / `size` survive
     * import instead of being tucked/reflowed.
     *
     * @param {string} id the task cell id
     * @param {string} label the BU display label
     * @param {number} x the task x position
     * @param {number} y the task y position
     * @param {boolean} isParentBU whether this BU is a shared-DE parent BU
     * @param {{fill: string, stroke: string}} band the column's first/middle/last colours
     * @param {string} parent the id of the environment container that captures this task
     * @returns {object} the `sf.BpmnTask` cell
     */
    function diagramBUTask(id, label, x, y, isParentBU, band, parent) {
        const taskIcon = isParentBU
            ? {
                  x: 8,
                  y: 8,
                  width: 14,
                  height: 14,
                  href: diagramIconHref(DIAGRAM_PARENT_BU_ICON),
              }
            : { display: 'none', width: 0, height: 0, href: '' };
        return {
            id: id,
            type: 'sf.BpmnTask',
            position: { x: x, y: y },
            size: { width: DIAGRAM_TASK_WIDTH, height: DIAGRAM_TASK_HEIGHT },
            z: 2000,
            parent: parent,
            taskType: 'task',
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 8,
                    ry: 8,
                    fill: band.fill,
                    stroke: band.stroke,
                    strokeWidth: isParentBU ? 2.5 : 1.5,
                },
                label: {
                    x: 'calc(0.5 * w)',
                    y: 'calc(0.5 * h)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontSize: 12,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fill: '#FFFFFF',
                    text: label,
                    textWrap: { width: 'calc(w - 16)', maxLineCount: 4, ellipsis: true },
                },
                taskIcon: taskIcon,
            },
            ports: diagramPorts(),
        };
    }

    /**
     * Build one `standard.Link` deploy arrow between two BU tasks (source → target = upstream env →
     * downstream env). `targetMarker` is omitted so the loader normalises it to the canonical arrow.
     *
     * @param {string} id the link cell id
     * @param {string} sourceId the upstream BU-task id
     * @param {string} targetId the downstream BU-task id
     * @returns {object} the `standard.Link` cell
     */
    function diagramDeployLink(id, sourceId, targetId) {
        return {
            id: id,
            type: 'standard.Link',
            z: 3001,
            source: { id: sourceId, port: 'port-right' },
            target: { id: targetId, port: 'port-left' },
            attrs: { line: { stroke: '#74797F', strokeWidth: 2 } },
            router: { name: 'sfManhattan' },
            connector: { name: 'rounded', args: { radius: 8 } },
        };
    }

    /**
     * Plan the vertical placement of every lane's cards, porting Diagramforce's "Match Container
     * Height" (layout-core.js `planLaneNormalisation`) to the pipeline's simpler world: every card
     * shares one height (`DIAGRAM_TASK_HEIGHT`) and lanes are already ordered left-to-right. Only the
     * REFERENCE lane (the one with the most cards) is evenly spread; every OTHER lane is placed by
     * BARYCENTRE — each card sits at the mean centre of the cards it actually links to — walked
     * outward from the reference across lane adjacency. A one-to-one link therefore reads as a flat
     * connector; a fan reads as a symmetric block.
     *
     * Deliberate deviation from the app: a fan of cards sharing ONE source (identical barycentre) is
     * centred symmetrically on that shared centre, not stacked downward from it.
     *
     * @param {Array<{id: string, cards: Array<{id: string}>}>} columns one entry per env (envOrder
     *        order); each carries its container id and its ordered cards' task ids.
     * @param {Array<{source: string, target: string}>} links upstream→downstream deploy links (task
     *        id → task id); same-lane and dangling links are ignored.
     * @returns {{top: number, height: number, ysByColumn: number[][]}} the shared lane top and
     *          height, plus `ysByColumn[i]` = the top-`y` per card of column `i`, in card order.
     */
    function diagramLanePlacement(columns, links) {
        const taskH = DIAGRAM_TASK_HEIGHT;
        const rowGap = DIAGRAM_ROW_GAP;
        const cols = Array.isArray(columns) ? columns : [];

        // No columns → nothing to place; return the empty plan at the shared lane top base (50).
        if (cols.length === 0) {
            return { top: 50, height: 0, ysByColumn: [] };
        }

        // ── Shared geometry: one height for the whole diagram — the deepest lane's need — so columns
        // read as uniform lanes. `n` is floored at 1 so an empty lane still reserves one row.
        const laneNeed = (n) => {
            const count = Math.max(n, 1);
            return (
                DIAGRAM_LANE_TOP_INSET +
                count * taskH +
                (count - 1) * rowGap +
                DIAGRAM_LANE_BOTTOM_INSET
            );
        };
        const top = 50;
        const height = cols.reduce((tallest, column) => Math.max(tallest, laneNeed(column.cards.length)), 0);
        const innerTop = top + DIAGRAM_LANE_TOP_INSET;
        const innerBottom = top + height - DIAGRAM_LANE_BOTTOM_INSET;
        const innerHeight = innerBottom - innerTop;

        // ── Reference lane: most cards, tie-break to the leftmost (lowest index) for determinism.
        // The app's "tallest" tie-break tier is intentionally omitted: every card shares one uniform
        // DIAGRAM_TASK_HEIGHT, so lane height is a pure function of card count and that tier is vacuous.
        let referenceIndex = 0;
        for (let index = 1; index < cols.length; index += 1) {
            if (cols[index].cards.length > cols[referenceIndex].cards.length) {
                referenceIndex = index;
            }
        }

        /**
         * Spread `n` cards evenly down the inner box (equal gaps), returning their top-`y` in order.
         * A single card is centred; otherwise the gap is floored at `rowGap`.
         *
         * @param {number} n the number of cards
         * @returns {number[]} the top-`y` per card, top to bottom
         */
        const spread = (n) => {
            if (n <= 1) {
                return [Math.round(innerTop + Math.max(0, (innerHeight - taskH) / 2))];
            }
            const gap = Math.max(rowGap, (innerHeight - n * taskH) / (n - 1));
            const ys = [];
            let y = innerTop;
            for (let index = 0; index < n; index += 1) {
                ys.push(Math.round(y));
                y += taskH + gap;
            }
            return ys;
        };

        /**
         * Place cards at desired CENTRE `targetCentres` (index-aligned to `cards`), de-overlapped and
         * clamped into the box, then apply the centred shared-source fan deviation. Returns top-`y`
         * per card in ORIGINAL card order.
         *
         * @param {Array<{id: string}>} cards the lane's cards in card order
         * @param {number[]} targetCentres the desired centre-`y` per card (index-aligned)
         * @returns {number[]} the top-`y` per card, in original card order
         */
        const place = (cards, targetCentres) => {
            // Sort by desired centre, de-overlap with a downward cursor, remembering original order.
            const order = cards.map((card, index) => ({
                index: index,
                desired: targetCentres[index],
                y: 0,
            }));
            order.sort((left, right) => left.desired - right.desired);
            let cursor = innerTop;
            for (const entry of order) {
                entry.y = Math.max(entry.desired - taskH / 2, cursor);
                cursor = entry.y + taskH + rowGap;
            }
            // Overflow → slide the whole stack up by the excess, then clamp each top to the box.
            const overflow = cursor - rowGap - innerBottom;
            if (overflow > 0) {
                for (const entry of order) {
                    entry.y = Math.max(innerTop, entry.y - overflow);
                }
            }

            // Centred shared-source fan (deviation): each maximal run of EQUAL desired centres is a
            // fan from one shared source; shift it up so the block straddles that centre symmetrically
            // instead of hanging below it. Re-clamp to the box and never overlap the cards just
            // outside the run.
            let runStart = 0;
            while (runStart < order.length) {
                let runEnd = runStart;
                while (
                    runEnd + 1 < order.length &&
                    order[runEnd + 1].desired === order[runStart].desired
                ) {
                    runEnd += 1;
                }
                const runCount = runEnd - runStart + 1;
                if (runCount >= 2) {
                    const shift = ((runCount - 1) * (taskH + rowGap)) / 2;
                    // Upper bound: stay below the card above (min-gap) and inside the box top.
                    const minTop = runStart > 0 ? order[runStart - 1].y + taskH + rowGap : innerTop;
                    // Lower bound for the LAST card in the run: stay above the card below and the box.
                    const maxBottomTop =
                        (runEnd + 1 < order.length ? order[runEnd + 1].y - rowGap : innerBottom) - taskH;
                    for (let position = 0; position < runCount; position += 1) {
                        const entry = order[runStart + position];
                        let newTop = entry.y - shift;
                        // Clamp the whole run so its first card clears the neighbour above / box top…
                        newTop = Math.max(newTop, minTop + position * (taskH + rowGap));
                        // …and its last card clears the neighbour below / box bottom.
                        newTop = Math.min(
                            newTop,
                            maxBottomTop - (runCount - 1 - position) * (taskH + rowGap)
                        );
                        entry.y = newTop;
                    }
                }
                runStart = runEnd + 1;
            }

            // Re-project into original card order.
            const ys = Array.from({length: cards.length});
            for (const entry of order) {
                ys[entry.index] = Math.round(entry.y);
            }
            return ys;
        };

        // ── Card → column index and adjacency (both directions), skipping same-lane/dangling links.
        const columnOf = new Map();
        for (const [index, column] of cols.entries()) {
            for (const card of column.cards) {
                columnOf.set(card.id, index);
            }
        }
        const neighbours = new Map();
        const linkList = links || [];
        for (const link of linkList) {
            if (!columnOf.has(link.source) || !columnOf.has(link.target)) {
                continue;
            }
            if (columnOf.get(link.source) === columnOf.get(link.target)) {
                continue;
            }
            if (!neighbours.has(link.source)) {
                neighbours.set(link.source, []);
            }
            if (!neighbours.has(link.target)) {
                neighbours.set(link.target, []);
            }
            neighbours.get(link.source).push(link.target);
            neighbours.get(link.target).push(link.source);
        }

        // ── Commit helper: record top-`y` for a column and remember each card's centre for the walk.
        const ysByColumn = Array.from({length: cols.length});
        const placedCentre = new Map();
        const commit = (columnIndex, ys) => {
            ysByColumn[columnIndex] = ys;
            const committedCards = cols[columnIndex].cards;
            for (const [row, card] of committedCards.entries()) {
                placedCentre.set(card.id, ys[row] + taskH / 2);
            }
        };

        // Reference lane: even spread.
        if (cols.length > 0) {
            commit(referenceIndex, spread(cols[referenceIndex].cards.length));
        }

        // ── BFS across lane adjacency ("some card here links to some card there"), reaching left AND
        // right of the reference. A `seen` set makes cycles harmless.
        const laneNeighbours = (columnIndex) => {
            const out = new Set();
            const laneCards = cols[columnIndex].cards;
            for (const card of laneCards) {
                const linked = neighbours.get(card.id) || [];
                for (const other of linked) {
                    out.add(columnOf.get(other));
                }
            }
            out.delete(columnIndex);
            return [...out];
        };
        const seen = new Set([referenceIndex]);
        const queue = laneNeighbours(referenceIndex);
        while (queue.length) {
            const columnIndex = queue.shift();
            if (seen.has(columnIndex)) {
                continue;
            }
            seen.add(columnIndex);
            const cards = cols[columnIndex].cards;
            const n = cards.length;
            // Each card's target = mean centre of its already-placed linked neighbours. A dangling card
            // (no placed neighbour) keeps its rank mapped into the box so it can't sort to the top.
            const targets = cards.map((card, rank) => {
                const linked = (neighbours.get(card.id) || []).filter((other) => placedCentre.has(other));
                if (linked.length) {
                    let sum = 0;
                    for (const other of linked) {
                        sum += placedCentre.get(other);
                    }
                    return sum / linked.length;
                }
                if (n <= 1) {
                    return innerTop + Math.max(0, (innerHeight - taskH) / 2) + taskH / 2;
                }
                return innerTop + (rank / (n - 1)) * (innerHeight - taskH) + taskH / 2;
            });
            commit(columnIndex, place(cards, targets));
            for (const nextIndex of laneNeighbours(columnIndex)) {
                if (!seen.has(nextIndex)) {
                    queue.push(nextIndex);
                }
            }
        }

        // ── Lanes never reached (no link path to the reference) get the same even spread.
        for (const [index, col] of cols.entries()) {
            if (ysByColumn[index] === undefined) {
                commit(index, spread(col.cards.length));
            }
        }

        return { top: top, height: height, ysByColumn: ysByColumn };
    }

    /**
     * The vertical centre-to-top offsets for `count` cards evenly spread inside a lane's inner box —
     * a thin shim exposing the same even-spread maths `diagramLanePlacement`'s internal `spread` uses
     * (a single card centres; otherwise the gap is floored at `rowGap`). Retained for its direct unit
     * test and any legacy callers. The even-spread maths is unchanged.
     *
     * @param {number} count the number of cards in the lane (floored at 1 by the caller)
     * @param {number} laneHeight the shared lane height
     * @returns {number[]} the task `y` (top) positions, top to bottom
     */
    function diagramCardYs(count, laneHeight) {
        const n = Math.max(count, 1);
        const innerTop = 50 + DIAGRAM_LANE_TOP_INSET;
        const innerBottom = 50 + laneHeight - DIAGRAM_LANE_BOTTOM_INSET;
        const innerHeight = innerBottom - innerTop;
        if (n <= 1) {
            return [Math.round(innerTop + Math.max(0, (innerHeight - DIAGRAM_TASK_HEIGHT) / 2))];
        }
        const gap = Math.max(DIAGRAM_ROW_GAP, (innerHeight - n * DIAGRAM_TASK_HEIGHT) / (n - 1));
        const ys = [];
        let y = innerTop;
        for (let index = 0; index < n; index += 1) {
            ys.push(Math.round(y));
            y += DIAGRAM_TASK_HEIGHT + gap;
        }
        return ys;
    }

    /**
     * Build the full Diagramforce diagram JSON for a pre-resolved pipeline model: each environment
     * (in model order) becomes a band-coloured `sf.Container` lane, each assigned BU a `sf.BpmnTask`
     * captured by that lane (`parent` on the task, id in the lane's `embeds`), and deploy arrows
     * connect each BU to its upstream counterpart (via `lineage` when set, else the same-index BU of
     * the previous environment). All lanes share one top (`y: 50`) and one height — the deepest
     * lane's need — and carry `manualSize: true`, so they read as uniform lanes and stay put on
     * import (see the spec "Container lanes"). Column colours are locked by position in the model.
     * Shared-DE parent BUs use the `custom-data` icon. Pure: reads only `model`, never controller
     * state; `labels` / `parentFlags` / `band` / `title` / `timestamp` are all pre-resolved.
     *
     * @param {DiagramforceModel} model the pre-resolved pipeline model
     * @returns {object} the diagram JSON envelope
     */
    function buildDiagramJSON(model) {
        const modelColumns = (model && model.columns) || [];
        const lineage = (model && model.lineage) || {};
        const cells = [];

        let cellCounter = 0;
        const nextId = (prefix) => prefix + '-' + String((cellCounter += 1));

        // ── Pass A — model + ids. Assign a stable task id per buRef-in-env (a BU can appear in
        // several envs) and collect the per-column card lists the placement pass reads. `columnMap`
        // (buRef → taskId) lets the link pass resolve upstream counterparts by reference.
        const taskIdByColumn = [];
        const columns = [];
        const columnReferences = [];
        for (const modelColumn of modelColumns) {
            const references = modelColumn.references || [];
            const containerId = nextId('env');
            const columnMap = {};
            const cards = [];
            for (const reference of references) {
                const taskId = nextId('bu');
                columnMap[reference] = taskId;
                cards.push({ id: taskId });
            }
            columns.push({ id: containerId, cards: cards });
            columnReferences.push(references);
            taskIdByColumn.push(columnMap);
        }

        // ── Pass B — links FIRST (placement needs the deploy graph). Connect each BU to its upstream
        // BU in the previous column: prefer the explicit lineage parent (child buRef → parent buRef),
        // else fall back to the same-index BU (or the first). Emit each as a deploy-arrow cell AND
        // collect it for `diagramLanePlacement`.
        const links = [];
        for (let columnIndex = 1; columnIndex < modelColumns.length; columnIndex += 1) {
            const previousMap = taskIdByColumn[columnIndex - 1];
            const references = columnReferences[columnIndex];
            const previousReferences = columnReferences[columnIndex - 1];
            for (const [rowIndex, reference] of references.entries()) {
                const parentReference = lineage[reference];
                let sourceId = parentReference ? previousMap[parentReference] : undefined;
                if (!sourceId) {
                    const fallbackReference = previousReferences[rowIndex] || previousReferences[0];
                    sourceId = fallbackReference ? previousMap[fallbackReference] : undefined;
                }
                const targetId = taskIdByColumn[columnIndex][reference];
                if (sourceId && targetId) {
                    links.push({ source: sourceId, target: targetId });
                    cells.push(diagramDeployLink(nextId('link'), sourceId, targetId));
                }
            }
        }

        // ── Pass C — placement + emit. Plan every lane's card Ys from the model + graph (reference
        // lane spread, others by barycentre), then emit each BU task at its planned `y` and each lane
        // container at the shared top/height. Embeds/parent wiring and `manualSize` are unchanged.
        // `labels` / `parentFlags` / `band` come pre-resolved on the model column (index-aligned to
        // `references`), so no controller state is consulted here.
        const placement = diagramLanePlacement(columns, links);
        for (const [columnIndex, modelColumn] of modelColumns.entries()) {
            const references = columnReferences[columnIndex];
            const labels = modelColumn.labels || [];
            const parentFlags = modelColumn.parentFlags || [];
            const band = modelColumn.band;
            const columnX = DIAGRAM_COLUMN_X + columnIndex * DIAGRAM_COLUMN_STEP;
            const taskX = columnX + DIAGRAM_LANE_SIDE_INSET;
            const containerId = columns[columnIndex].id;
            const cardYs = placement.ysByColumn[columnIndex];
            const embeds = [];
            for (const [rowIndex] of references.entries()) {
                const taskId = columns[columnIndex].cards[rowIndex].id;
                cells.push(
                    diagramBUTask(
                        taskId,
                        labels[rowIndex],
                        taskX,
                        cardYs[rowIndex],
                        parentFlags[rowIndex] === true,
                        band,
                        containerId
                    )
                );
                embeds.push(taskId);
            }
            cells.push(
                diagramEnvironmentContainer(
                    containerId,
                    modelColumn.env,
                    columnX,
                    placement.height,
                    band,
                    embeds
                )
            );
        }

        return {
            version: 1,
            appVersion: DIAGRAMFORCE_APP_VERSION,
            timestamp: (model && model.timestamp) || 0,
            title: (model && model.title) || '',
            diagramType: 'process',
            graph: { cells: cells },
        };
    }

    // ── module API ──────────────────────────────────────────────────────────────────────

    const api = {
        buildDiagramJSON: buildDiagramJSON,
        diagramLanePlacement: diagramLanePlacement,
        diagramCardYs: diagramCardYs,
        DIAGRAMFORCE_APP_VERSION: DIAGRAMFORCE_APP_VERSION,
    };

    // Browser global.
    global.mpbDiagramforce = api;

    // UMD-style footer to mirror the sibling standalone modules. Dead in Node (the package is
    // "type":"module", so module.exports is unavailable); the tests read `globalThis.mpbDiagramforce`.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
