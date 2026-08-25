/**
 * mcdev Pipeline Builder — draw.io export (pure, DOM-free at load).
 *
 * Builds two independent draw.io payloads from a plain pipeline model and owns the
 * new-tab handoff to app.diagrams.net, falling back to a file download when the URL
 * exceeds the browser length cap. Kept side-by-side with the existing Diagramforce
 * `buildDiagramJSON` path in the core file — nothing here reads or mutates that path.
 *
 * Authored as a classic browser script (IIFE + browser global) with a UMD-style footer
 * so the Node test can load it for its side effect and read the global. NOT an ES module.
 * References no `document` / `window` / `open` at load time — all DOM/handoff access
 * happens inside functions invoked later, with `open` / `downloadText` passed in.
 *
 * Two approaches live in clearly delimited sections so the losing one can be deleted
 * wholesale (its section + its one dropdown row) without touching the other:
 *   - Approach A: native mxGraph XML swimlanes + arrows (loaded via the `#R` raw-XML hash).
 *   - Approach B: a mermaid flowchart (handed over via the `?create=` JSON descriptor).
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

    // ── Approach A: native mxGraph XML ──────────────────────────────────────────────────

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

        // One swimlane per column, with its BU boxes. Both are parented to "1" (the layer),
        // so BU geometry is absolute and never offset by the swimlane origin.
        for (const [columnIndex, column] of columns.entries()) {
            const laneId = 'lane-' + String(columnIndex + 1);
            const laneX = COLUMN_X + columnIndex * COLUMN_STEP;
            const bus = column.bus || [];
            const height = laneHeight(bus.length);
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
                '" height="' + height + '" as="geometry"/>', '</mxCell>');

            for (const [rowIndex, bu] of bus.entries()) {
                const buX = laneX + BU_LEFT_INSET;
                const buY = LANE_TOP + LANE_TOP_INSET + rowIndex * BU_ROW_STEP;
                // Fill with the column band so each BU matches its environment header (mirrors
                // Diagramforce's diagramBUTask). Parent vs regular differ only by shape/fontStyle;
                // white text stays readable on the green/purple/orange band fills.
                const buFill = band.fill || '#FFFFFF';
                const buStroke = band.stroke || '#666666';
                const buStyle = bu.isParentBU
                    ? 'rounded=0;whiteSpace=wrap;html=1;fillColor=' + buFill + ';strokeColor=' + buStroke + ';fontColor=#FFFFFF;fontStyle=1;'
                    : 'rounded=1;whiteSpace=wrap;html=1;fillColor=' + buFill + ';strokeColor=' + buStroke + ';fontColor=#FFFFFF;';
                parts.push('<mxCell id="' + escapeXml(bu.cellId) + '" value="' + escapeXml(bu.label) +
                    '" style="' + escapeXml(buStyle) + '" vertex="1" parent="1">', '<mxGeometry x="' + buX + '" y="' + buY + '" width="' + BU_WIDTH +
                    '" height="' + BU_HEIGHT + '" as="geometry"/>', '</mxCell>');
            }
        }

        // Deploy arrows between BU boxes across adjacent columns.
        for (const [linkIndex, link] of links.entries()) {
            const edgeId = 'edge-' + String(linkIndex + 1);
            // Fixed connection points: exit the source at its right-middle, enter the target at its
            // left-middle, so every arrow terminates at the left-middle of the target BU box.
            const edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;' +
                'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;';
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

    // ── Approach B: mermaid ─────────────────────────────────────────────────────────────

    /**
     * Build a mermaid `flowchart LR` string for the pipeline model: a subgraph per non-empty
     * environment holding its BU nodes, plus edges for the deploy lineage. Node ids reuse the
     * model's stable cell ids so the links line up. Columns with no BUs are skipped because
     * mermaid rejects an empty `subgraph … end` — well-formed models (every column populated)
     * are unaffected.
     *
     * @param {DrawioModel} model the pipeline model
     * @returns {string} mermaid flowchart source
     */
    function buildMermaid(model) {
        const columns = (model && model.columns) || [];
        const links = (model && model.links) || [];
        const lines = ['flowchart LR'];
        for (const [columnIndex, column] of columns.entries()) {
            const bus = column.bus || [];
            // Skip empty columns: an empty `subgraph … end` is a mermaid parse error.
            if (bus.length === 0) {
                continue;
            }
            // Subgraph ids are prefixed (`sg`) to stay provably disjoint from the `n_`-prefixed node
            // ids, and the title uses the space-before-bracket form for broad mermaid compatibility.
            lines.push('  subgraph sg' + String(columnIndex + 1) + ' [' + mermaidText(column.env) + ']');
            for (const bu of bus) {
                lines.push(' '.repeat(4) + mermaidNodeId(bu.cellId) + '[' + mermaidText(bu.label) + ']');
            }
            lines.push('  end');
        }
        for (const link of links) {
            lines.push('  ' + mermaidNodeId(link.sourceCellId) + ' --> ' + mermaidNodeId(link.targetCellId));
        }
        return lines.join('\n');
    }

    /**
     * Sanitise a model cell id into a mermaid-safe node id (alphanumeric + underscore).
     *
     * @param {string} cellId the model cell id
     * @returns {string} a mermaid-safe node id
     */
    function mermaidNodeId(cellId) {
        return 'n_' + String(cellId).replaceAll(/[^a-zA-Z0-9_]/g, '_');
    }

    /**
     * Escape a label for use inside a mermaid `[...]` node/subgraph title by quoting it and
     * neutralising the double-quote character mermaid uses to delimit the string.
     *
     * @param {string} value raw label text
     * @returns {string} a quoted, mermaid-safe label
     */
    function mermaidText(value) {
        return '"' + String(value).replaceAll('"', '&quot;') + '"';
    }

    /**
     * Open the mermaid flowchart in app.diagrams.net via the `?create=` JSON descriptor
     * (`{type:'mermaid', data}`), or download a `.mmd` file when the URL would exceed
     * `DRAWIO_URL_LIMIT`. NOTE: draw.io's mermaid import is a natively-gated feature — if it is
     * gated off for the visitor, the render throws *inside the opened tab* with no signal back
     * here, so this fallback covers only the URL-length case, never a gated-off render.
     *
     * @param {string} mermaid the mermaid flowchart source
     * @param {string} title the diagram title (tab title)
     * @param {string} filename the `.mmd` filename for the download fallback
     * @param {DrawioIo} io host hooks (`open`, `downloadText`)
     * @returns {('open'|'download')} which branch was taken
     */
    function openMermaidInDrawioOrDownload(mermaid, title, filename, io) {
        const descriptor = encodeURIComponent(JSON.stringify({ type: 'mermaid', data: mermaid }));
        const finalUrl = 'https://app.diagrams.net/?title=' + encodeURIComponent(title) +
            '&splash=0&create=' + descriptor;
        if (finalUrl.length <= DRAWIO_URL_LIMIT) {
            io.open(finalUrl, '_blank', 'noopener');
            return 'open';
        }
        io.downloadText(filename, mermaid, 'text/plain');
        return 'download';
    }

    // ── module API ──────────────────────────────────────────────────────────────────────

    const api = {
        buildMxGraphXml: buildMxGraphXml,
        buildMermaid: buildMermaid,
        openInDrawioOrDownload: openInDrawioOrDownload,
        openMermaidInDrawioOrDownload: openMermaidInDrawioOrDownload,
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
