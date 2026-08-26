/**
 * mcdev Pipeline Builder — draw.io export (pure, DOM-free at load).
 *
 * Builds a native mxGraph XML payload from a plain pipeline model and owns the
 * new-tab handoff to app.diagrams.net, falling back to a file download when the URL
 * exceeds the browser length cap. Kept side-by-side with the existing Diagramforce
 * `buildDiagramJSON` path in the core file — nothing here reads or mutates that path.
 *
 * Authored as a classic browser script (IIFE + browser global) with a UMD-style footer
 * so the Node test can load it for its side effect and read the global. NOT an ES module.
 * References no `document` / `window` / `open` at load time — all DOM/handoff access
 * happens inside functions invoked later, with `open` / `downloadText` passed in.
 *
 * The mxGraph XML swimlanes + arrows are loaded via the `#R` raw-XML hash.
 *
 * @typedef {object} DrawioBand
 * @property {string} fill swimlane fill colour
 * @property {string} stroke swimlane stroke colour
 *
 * @typedef {object} DrawioBU
 * @property {string} cellId stable id owned by the model (edges reference these)
 * @property {string} label display label for the BU box
 * @property {boolean} isParentBU whether this BU is the shared-DE parent
 *
 * @typedef {object} DrawioColumn
 * @property {string} env environment display name (swimlane title)
 * @property {DrawioBand} band swimlane colours for this column's position
 * @property {DrawioBU[]} bus the BUs assigned to this environment, top-to-bottom
 *
 * @typedef {object} DrawioLink
 * @property {string} sourceCellId upstream BU cell id (previous column)
 * @property {string} targetCellId downstream BU cell id (this column)
 *
 * @typedef {object} DrawioModel
 * @property {string} title diagram title (draw.io tab title)
 * @property {DrawioColumn[]} columns one per environment, in pipeline order
 * @property {DrawioLink[]} links deploy-lineage edges between columns
 *
 * @typedef {object} DrawioIo
 * @property {(url: string, target: string, features: string) => unknown} open window-open hook
 * @property {(filename: string, text: string, mimeType: string) => void} downloadText download hook
 */

/**
 * @param {(Window|typeof globalThis)} global host object to attach the browser global to
 */
(function (global) {
    'use strict';

    // Conservative cap on the whole draw.io URL. The real browser limit is much higher,
    // so real pipelines almost always take the "open in tab" path; oversized diagrams fall
    // back to a file download. Locked low on purpose — not a measured browser maximum.
    const DRAWIO_URL_LIMIT = 30000;

    // Layout geometry for the emitted mxGraph swimlanes. All coordinates are absolute and
    // every cell is parented to the base layer ("1"), so BU boxes are NOT offset by a
    // swimlane origin (a child of a swimlane would be positioned relative to it).
    const COLUMN_X = 40;
    const COLUMN_STEP = 320;
    const LANE_WIDTH = 240;
    const LANE_TOP = 40;
    const LANE_START_SIZE = 30;
    const LANE_TOP_INSET = 50;
    const BU_WIDTH = 200;
    const BU_HEIGHT = 40;
    const BU_LEFT_INSET = 20;
    const BU_ROW_STEP = 60;
    const LANE_BOTTOM_PAD = 30;

    /**
     * Escape the five XML-significant characters so labels are safe inside both element
     * text and double-quoted attribute values. `&` must be replaced first.
     *
     * @param {string} value raw text
     * @returns {string} XML-escaped text
     */
    function escapeXml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll('\'', '&#39;');
    }

    /**
     * The height a swimlane needs to hold all its BU boxes (or an empty lane's header).
     *
     * @param {number} buCount number of BU boxes in the lane
     * @returns {number} lane height in px
     */
    function laneHeight(buCount) {
        const rows = Math.max(buCount, 1);
        return LANE_TOP_INSET + rows * BU_ROW_STEP - (BU_ROW_STEP - BU_HEIGHT) + LANE_BOTTOM_PAD;
    }

    /**
     * True when two id→y maps assign the same value to every id in the first map. Used as the
     * fixed-point test for the layout relaxation: identical maps mean nothing moved, which both
     * terminates the loop and rules out oscillation (a repeated state stops iterating).
     *
     * @param {Map<string, number>} a the previous-iteration map
     * @param {Map<string, number>} b the current-iteration map
     * @returns {boolean} whether every entry in `a` matches `b`
     */
    function sameYMap(a, b) {
        for (const [id, value] of a) {
            if (b.get(id) !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Assign every BU an absolute top-y so that 1:1 deploy hops are straight horizontal lines
     * and 1:n fan-outs sit their source vertically centered on the span of its targets. The
     * model carries no y-coordinates, so all vertical positioning is computed here from the
     * link graph. Deterministic and general — never keyed to a specific pipeline's numbers.
     *
     * Passes:
     *   1. First column: stack BUs top-to-bottom from the lane top inset at `BU_ROW_STEP`.
     *   2. Left→right: give each linked BU the center of its resolved parent(s); unlinked BUs
     *      keep their model-order slot. Then a min-gap sweep pushes overlaps down, preserving
     *      top-to-bottom model order.
     *   3. Right→left: re-center every source on the span (min→max center) of its children —
     *      this straightens 1:1 chains (parent inherits the child's y) and centers 1:n sources
     *      on their fan-out. A min-gap sweep re-runs on each column so nothing overlaps. Because
     *      the sweep can shove a re-centered source off its target center (under crossing
     *      lineage a low-order source that belongs high gets pushed down), the whole right→left
     *      pass is iterated to a fixed point: {re-center every column, sweep every column} repeats
     *      until the y-map stops changing (stable) or a small bounded cap is reached. The equality
     *      check on the y-map guarantees termination and rules out oscillation; when centering and
     *      the order+min-gap constraints are mutually unsatisfiable the loop settles on the
     *      order-preserving, overlap-free placement nearest each source's target center.
     *
     * @param {DrawioColumn[]} columns the model columns, left-to-right
     * @param {DrawioLink[]} links the deploy-lineage edges
     * @returns {Map<string, number>} cellId → absolute top-y in px
     */
    function computeBuLayout(columns, links) {
        const parentsOf = new Map();
        const childrenOf = new Map();
        for (const link of links) {
            if (!childrenOf.has(link.sourceCellId)) {
                childrenOf.set(link.sourceCellId, []);
            }
            childrenOf.get(link.sourceCellId).push(link.targetCellId);
            if (!parentsOf.has(link.targetCellId)) {
                parentsOf.set(link.targetCellId, []);
            }
            parentsOf.get(link.targetCellId).push(link.sourceCellId);
        }

        const orderInColumn = columns.map((column) => (column.bus || []).map((bu) => bu.cellId));
        const y = new Map();
        const top = LANE_TOP + LANE_TOP_INSET;

        // Center of the span covered by a set of related cells (min top-center → max top-center),
        // expressed as the top-y that would place a BU box on that center line.
        function spanCenterTop(cellIds) {
            const centers = cellIds.map((id) => y.get(id) + BU_HEIGHT / 2);
            return (Math.min(...centers) + Math.max(...centers)) / 2 - BU_HEIGHT / 2;
        }

        // Push overlapping/out-of-order BUs down to a minimum BU_ROW_STEP gap, keeping model order.
        function sweep(columnIndex) {
            const ids = orderInColumn[columnIndex];
            for (let row = 1; row < ids.length; row += 1) {
                const minY = y.get(ids[row - 1]) + BU_ROW_STEP;
                if (y.get(ids[row]) < minY) {
                    y.set(ids[row], minY);
                }
            }
        }

        // Pass 1 — first column stacks in model order from the lane top inset.
        const firstColumn = orderInColumn[0] || [];
        for (const [row, id] of firstColumn.entries()) {
            y.set(id, top + row * BU_ROW_STEP);
        }

        // Pass 2 — left→right: center each linked BU on its parents, else keep its slot; sweep.
        for (let columnIndex = 1; columnIndex < columns.length; columnIndex += 1) {
            const ids = orderInColumn[columnIndex];
            for (const [row, id] of ids.entries()) {
                const parents = parentsOf.get(id) || [];
                y.set(id, parents.length ? spanCenterTop(parents) : top + row * BU_ROW_STEP);
            }
            sweep(columnIndex);
        }

        // Pass 3 — right→left, iterated to a fixed point: re-center each source on its children's
        // span (straightens 1:1 chains, centers 1:n fan-outs), then re-sweep so the re-centered
        // column keeps its min gap. A single sweep can push a re-centered source off its target
        // center, so the pass repeats until the y-map is stable (or a bounded cap), which lets a
        // crossing-lineage source settle as close to its children's center as order+min-gap allow.
        const MAX_PASS3_ITERATIONS = 8;
        for (let iteration = 0; iteration < MAX_PASS3_ITERATIONS; iteration += 1) {
            const before = new Map(y);
            for (let columnIndex = columns.length - 2; columnIndex >= 0; columnIndex -= 1) {
                const ids = orderInColumn[columnIndex];
                for (const id of ids) {
                    const children = childrenOf.get(id) || [];
                    if (children.length) {
                        y.set(id, spanCenterTop(children));
                    }
                }
                sweep(columnIndex);
            }
            // No BU moved this iteration, so the layout is stable and further passes are no-ops.
            if (sameYMap(before, y)) {
                break;
            }
        }

        return y;
    }

    // ── native mxGraph XML ──────────────────────────────────────────────────────────────

    /**
     * Build a draw.io-native mxGraph XML document for the pipeline model: one swimlane per
     * environment, one box per BU, and one arrow per deploy-lineage link. Cells are parented
     * to the base layer with absolute geometry (see the geometry constants) and the swimlane
     * header height is pinned via `startSize` so the computed layout matches what draw.io draws.
     *
     * @param {DrawioModel} model the pipeline model
     * @returns {string} a complete `<mxGraphModel>…</mxGraphModel>` document
     */
    function buildMxGraphXml(model) {
        const columns = (model && model.columns) || [];
        const links = (model && model.links) || [];
        const parts = [ '<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" ' +
            'tooltips="1" connect="1" arrows="1" fold="0" page="1" pageScale="1" math="0" shadow="0">', '<root>', '<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
        // The two seed cells draw.io requires: the model root (0) and the default layer (1).

        // Every BU's absolute top-y comes from the link graph (1:1 hops horizontal, 1:n sources
        // centered on their fan-out), and every lane shares one height so the columns line up as a
        // uniform grid. All cells stay parented to "1" (absolute geometry). The uniform height is
        // the greater of the BU-count height and the extent height: a fan-out plus the min-gap
        // sweep can push a column's stack deeper than its BU count, so we take the lowest computed
        // BU bottom across every cell and pad it — otherwise the bottom BU escapes below the lane.
        const buY = computeBuLayout(columns, links);
        const maxBuCount = columns.reduce((max, column) => Math.max(max, (column.bus || []).length), 0);
        let maxBottom = LANE_TOP;
        for (const topY of buY.values()) {
            maxBottom = Math.max(maxBottom, topY + BU_HEIGHT);
        }
        const uniformHeight = Math.max(laneHeight(maxBuCount), maxBottom - LANE_TOP + LANE_BOTTOM_PAD);

        // One swimlane per column, with its BU boxes. Both are parented to "1" (the layer),
        // so BU geometry is absolute and never offset by the swimlane origin.
        for (const [columnIndex, column] of columns.entries()) {
            const laneId = 'lane-' + String(columnIndex + 1);
            const laneX = COLUMN_X + columnIndex * COLUMN_STEP;
            const bus = column.bus || [];
            const band = column.band || {};
            // Body stays white; the title bar shows the position-locked band colour. In mxGraph a
            // swimlane's `fillColor` is the header bar and `swimlaneFillColor` is the body, so
            // header=band / body=white. `collapsible=0` drops the top-left fold toggle.
            const laneStyle = 'swimlane;html=1;startSize=' + String(LANE_START_SIZE) +
                ';horizontal=1;fillColor=' + (band.fill || '#FFFFFF') + ';swimlaneFillColor=#FFFFFF' +
                ';strokeColor=' + (band.stroke || '#000000') +
                ';fontColor=#FFFFFF;fontStyle=1;collapsible=0;';
            parts.push('<mxCell id="' + escapeXml(laneId) + '" value="' + escapeXml(column.env) +
                '" style="' + escapeXml(laneStyle) + '" vertex="1" parent="1">', '<mxGeometry x="' + laneX + '" y="' + LANE_TOP + '" width="' + LANE_WIDTH +
                '" height="' + uniformHeight + '" as="geometry"/>', '</mxCell>');

            for (const bu of bus) {
                const buX = laneX + BU_LEFT_INSET;
                const buYValue = buY.get(bu.cellId);
                // Fill with the column band so each BU matches its environment header (mirrors
                // Diagramforce's diagramBUTask). Parent vs regular differ only by shape/fontStyle;
                // white text stays readable on the green/purple/orange band fills.
                const buFill = band.fill || '#FFFFFF';
                const buStroke = band.stroke || '#666666';
                const buStyle = bu.isParentBU
                    ? 'rounded=0;whiteSpace=wrap;html=1;fillColor=' + buFill + ';strokeColor=' + buStroke + ';fontColor=#FFFFFF;fontStyle=1;'
                    : 'rounded=1;whiteSpace=wrap;html=1;fillColor=' + buFill + ';strokeColor=' + buStroke + ';fontColor=#FFFFFF;';
                parts.push('<mxCell id="' + escapeXml(bu.cellId) + '" value="' + escapeXml(bu.label) +
                    '" style="' + escapeXml(buStyle) + '" vertex="1" parent="1">', '<mxGeometry x="' + buX + '" y="' + buYValue + '" width="' + BU_WIDTH +
                    '" height="' + BU_HEIGHT + '" as="geometry"/>', '</mxCell>');
            }
        }

        // Deploy arrows between BU boxes across adjacent columns.
        for (const [linkIndex, link] of links.entries()) {
            const edgeId = 'edge-' + String(linkIndex + 1);
            // Fixed connection points: exit the source at its right-middle, enter the target at its
            // left-middle, so every arrow terminates at the left-middle of the target BU box.
            // `rounded=1;curved=0;` gives rounded (not curved) corners on the orthogonal routing.
            const edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=block;' +
                'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;curved=0;';
            parts.push('<mxCell id="' + escapeXml(edgeId) + '" style="' + escapeXml(edgeStyle) +
                '" edge="1" parent="1" source="' + escapeXml(link.sourceCellId) +
                '" target="' + escapeXml(link.targetCellId) + '">', '<mxGeometry relative="1" as="geometry"/>', '</mxCell>');
        }

        parts.push('</root>', '</mxGraphModel>');
        return parts.join('');
    }

    /**
     * Open the mxGraph XML in app.diagrams.net in a new tab via the `#R` raw-XML hash (loaded
     * uncompressed because the payload starts with `<`), or download a `.drawio` file when the
     * resulting URL would exceed `DRAWIO_URL_LIMIT`. The download IS the fallback — no textarea
     * is revealed. A null `open()` return is treated as best-effort, not proof of a blocked pop-up.
     *
     * @param {string} xml the mxGraph XML document
     * @param {string} title the diagram title (tab title)
     * @param {string} filename the `.drawio` filename for the download fallback
     * @param {DrawioIo} io host hooks (`open`, `downloadText`)
     * @returns {('open'|'download')} which branch was taken
     */
    function openInDrawioOrDownload(xml, title, filename, io) {
        const base = 'https://app.diagrams.net/?title=' + encodeURIComponent(title) + '&splash=0';
        const finalUrl = base + '#R' + encodeURIComponent(xml);
        if (finalUrl.length <= DRAWIO_URL_LIMIT) {
            io.open(finalUrl, '_blank', 'noopener');
            return 'open';
        }
        io.downloadText(filename, xml, 'application/xml');
        return 'download';
    }

    // ── module API ──────────────────────────────────────────────────────────────────────

    const api = {
        buildMxGraphXml: buildMxGraphXml,
        openInDrawioOrDownload: openInDrawioOrDownload,
        DRAWIO_URL_LIMIT: DRAWIO_URL_LIMIT,
    };

    // Browser global.
    global.mpbDrawio = api;

    // UMD-style footer to mirror the sibling standalone modules. Dead in Node (the package is
    // "type":"module", so module.exports is unavailable); the tests read `globalThis.mpbDrawio`.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
