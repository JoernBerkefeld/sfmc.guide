/**
 * mcdev Pipeline Builder — sticky builder sub-header UI (Extraction 3).
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and `mcdev-pipeline-persistence.js` — a step-style module alongside the other
 * `step-*` modules. It owns the sticky builder sub-header: the config name + inline
 * rename, the Open ▾ / Download ▾ dropdowns (and their single-open panel machinery),
 * the Diagramforce + draw.io menu rows, and the `renderBuilderHeader()` hydration the
 * core `render()` dispatcher calls (via `mpbController`).
 *
 * Reads shared core state/DOM/helpers LAZILY through the `mpbController` global at call
 * time (mirroring the step-lineage / persistence pattern): `C.state`, `C.dom`, `C.makeEl`,
 * `C.goToStep`, `C.downloadText`, `C.jsonPretty`, `C.outputBlockers`,
 * `C.isConfigDownloadAvailable`, `C.currentConfigDisplayName`, `C.shouldShowDiagramforceMenuItem`,
 * `C.isDiagramDrawable`, `C.openDiagramOrFallback`, `C.environmentNames`, `C.assignedBUReferences`,
 * `C.buDisplayLabel`, `C.bareBUName`, `C.diagramBand`, `C.diagramTitle`, `C.getDeriveValidationsState`
 * — and the persistence surface `C.persistence` / `C.renameSave` / `C.cloneSave` / `C.reopenSave`
 * / `C.readSaveBlob` / `C.deriveConfigName` / `C.listSaves` / `C.formatTimestamp` / `C.renderSavedList`.
 * The draw.io / Diagramforce sibling modules are reached via `global.mpbDrawio` and the config /
 * validations builders via `global.mpbConfigBuilder` / `global.mpbValidationsBuilder`.
 *
 * `setBuilderHeaderDom` / `syncBuilderHeaderMount` stay in core (they own the header mount).
 * Installs the header surface (`renderBuilderHeader`, `buildBuilderDownloadDropdown`,
 * `fillBuilderDownloadDiagramItem`, `fillBuilderDrawioMxItem`, `diagramforceMenuItemSpec`,
 * `buildDrawioModel`, `openDrawioOrDownload`) onto `mpbController`.
 */

/**
 * @param {Window} global host window object
 */
(function (global) {
    'use strict';

    const C = global.mpbController;
    if (!C) {
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-builder-header.js');
    }

    const document_ = global.document;

    /**
     * The single currently-open builder dropdown panel (Open or Download share this slot — only one
     * may be open at a time) plus the document listeners wired while it is open, so they can be torn
     * down before every header rebuild (listeners never accumulate).
     *
     * @type {{button: Element, panel: Element, onDocClick: (event: Event) => void, onKeydown: (event: KeyboardEvent) => void}|null}
     */
    let openBuilderPanel = null;

    /**
     * Whether the static header title button has already had its back-to-intake click wired. The
     * title lives in the page markup (not rebuilt per render), so it is wired exactly once —
     * `renderBuilderHeader` runs on every render and would otherwise stack listeners.
     *
     * @type {boolean}
     */
    let isBuilderHeaderHomeWired = false;


    /**
     * Close the open builder dropdown (if any): hide the panel, sync `aria-expanded`, and remove the
     * document listeners. Safe to call when nothing is open.
     *
     * @returns {void}
     */
    function closeBuilderOpenPanel() {
        if (!openBuilderPanel) {
            return;
        }
        const { button, panel, onDocClick, onKeydown } = openBuilderPanel;
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        // Capture-phase for the click, matching how it was added, so removal actually detaches it.
        document_.removeEventListener('click', onDocClick, true);
        document_.removeEventListener('keydown', onKeydown, true);
        openBuilderPanel = null;
    }


    /**
     * Open a builder dropdown panel: reveal it, sync `aria-expanded`, focus the first enabled menu
     * item, and wire click-outside (capture phase, so the button's own bubble handler can toggle
     * closed without an immediate reopen) + Escape-to-close (refocusing the button). Only one panel
     * is ever open — any previously-open one is closed first.
     *
     * @param {Element} button the toggle button
     * @param {Element} panel the panel element to reveal
     * @returns {void}
     */
    function openBuilderOpenPanel(button, panel) {
        closeBuilderOpenPanel();
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        const onDocumentClick = (event) => {
            // A click anywhere outside this dropdown wrapper closes it. Clicks on the button itself
            // are handled by its own (bubble-phase) toggle so we don't reopen what it just closed.
            if (!panel.contains(event.target) && !button.contains(event.target)) {
                closeBuilderOpenPanel();
            }
        };
        const onKeydown = (event) => {
            if (event.key !== 'Escape') {
                return;
            }

            closeBuilderOpenPanel();
            button.focus();
        };
        document_.addEventListener('click', onDocumentClick, { capture: true });
        document_.addEventListener('keydown', onKeydown, { capture: true });
        openBuilderPanel = { button: button, panel: panel, onDocClick: onDocumentClick, onKeydown: onKeydown };
        const first = panel.querySelector('[role="menuitem"]:not([disabled])');
        if (first) {
            first.focus();
        }
    }


    /**
     * Build a dropdown wrapper (toggle button + downward panel) sharing the single-open machinery.
     * The panel is populated by `fillPanel`. The button toggles open/closed on click.
     *
     * @param {string} label the toggle button label (a ` ▾` caret is appended)
     * @param {boolean} leftAligned whether the panel is left-aligned (Open) vs. right (Download)
     * @param {(panel: HTMLElement) => void} fillPanel populates the panel with menu items
     * @returns {HTMLElement} the dropdown wrapper element
     */
    function buildBuilderDropdown(label, leftAligned, fillPanel) {
        const wrapper = C.makeEl('div', { class: 'mpb-builder-open' });
        const button = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: label + ' \u{25BE}',
            attrs: { 'aria-haspopup': 'menu', 'aria-expanded': 'false' },
        });
        const panelClass = leftAligned
            ? 'mpb-builder-open-panel mpb-builder-open-panel--left'
            : 'mpb-builder-open-panel';
        const panel = C.makeEl('div', { class: panelClass, attrs: { role: 'menu' } });
        panel.hidden = true;
        fillPanel(panel);
        button.addEventListener('click', () => {
            // Toggle: if this exact panel is already open, close it; otherwise open it.
            if (openBuilderPanel && openBuilderPanel.panel === panel) {
                closeBuilderOpenPanel();
            } else {
                openBuilderOpenPanel(button, panel);
            }
        });
        wrapper.append(button, panel);
        return wrapper;
    }


    /**
     * Build the "Open ▾" dropdown: every other saved config (excluding the one currently open),
     * each row reopening its session. Shows an empty-state note when there is nothing else to open.
     *
     * @returns {HTMLElement} the Open dropdown wrapper
     */
    function buildBuilderOpenDropdown() {
        return buildBuilderDropdown('Open', true, (panel) => {
            const others = C
                .listSaves()
                .filter((save) => save.id !== C.persistence.currentId);
            if (others.length === 0) {
                panel.append(
                    C.makeEl('div', {
                        class: 'mpb-builder-open-empty',
                        text: 'No other saved configs.',
                    })
                );
                return;
            }
            for (const save of others) {
                const row = C.makeEl('button', {
                    type: 'button',
                    class: 'mpb-builder-open-row',
                    attrs: { role: 'menuitem' },
                });
                row.append(C.makeEl('span', { class: 'mpb-builder-open-row-name', text: save.name }));
                row.append(
                    C.makeEl('span', {
                        class: 'mpb-builder-open-row-meta',
                        text: C.formatTimestamp(save.timestamp),
                    })
                );
                row.addEventListener('click', () => {
                    closeBuilderOpenPanel();
                    C.reopenSave(save.id);
                });
                panel.append(row);
            }
        });
    }


    /**
     * Descriptor for the header Download Diagramforce row, or `null` when omitted (validations-only).
     * Full mode always returns a row: enabled when drawable, otherwise disabled with a tooltip.
     * Test seam — no DOM required.
     *
     * @returns {({text: string, disabled: boolean, title: (string|null)}|null)} menuitem spec
     */
    function diagramforceMenuItemSpec() {
        if (!C.shouldShowDiagramforceMenuItem()) {
            return null;
        }
        const isDrawable = C.isDiagramDrawable();
        return {
            text: 'Open in Diagramforce',
            disabled: !isDrawable,
            title: isDrawable ? null : 'Finish environment order, BU assignment, and lineage first.',
        };
    }


    /**
     * Append the Diagramforce Download-menu row (or omit it). `buildBuilderDownloadDropdown` is the
     * live caller; tests can pass a stub `{ append }` collector. No-op when the row is omitted.
     *
     * @param {{append: (node: object) => void}} panel the menu panel (live or stub)
     * @returns {void}
     */
    function fillBuilderDownloadDiagramItem(panel) {
        const spec = diagramforceMenuItemSpec();
        if (!spec || !panel) {
            return;
        }
        const canCreate = document_ && typeof document_.createElement === 'function';
        if (!canCreate) {
            panel.append({
                role: 'menuitem',
                textContent: spec.text,
                disabled: spec.disabled,
                title: spec.title,
            });
            return;
        }
        const diagramItem = C.makeEl('button', {
            type: 'button',
            class: 'mpb-builder-open-row',
            text: spec.text,
            attrs: { role: 'menuitem' },
        });
        if (spec.disabled) {
            diagramItem.disabled = true;
            diagramItem.setAttribute('title', spec.title);
        } else {
            diagramItem.addEventListener('click', () => {
                closeBuilderOpenPanel();
                C.openDiagramOrFallback(diagramItem);
            });
        }
        panel.append(diagramItem);
    }


    /**
     * Build the plain draw.io model for the current pipeline, independent of `buildDiagramJSON`
     * (the Diagramforce path is left untouched). Mirrors that function's Pass-A/Pass-B loop but
     * owns its own stable cell ids: one swimlane column per environment, one BU box per assigned
     * reference, and a deploy link per BU resolved as lineage-parent -> same-index -> first.
     *
     * @returns {import('./mcdev-pipeline-drawio.js').DrawioModel} the draw.io model
     */
    function buildDrawioModel() {
        const wizardState = C.state.wizardState;
        const environments = C.environmentNames();
        const lineage = wizardState.lineage || {};
        const columnCount = environments.length;

        // Pass A — columns + stable cell ids (one per buRef-in-env), and a per-column ref->cellId map.
        const columns = [];
        const cellIdByColumn = [];
        const columnReferences = [];
        for (const [columnIndex, environment] of environments.entries()) {
            const references = C.assignedBUReferences(environment);
            const idMap = {};
            const bus = [];
            for (const [rowIndex, reference] of references.entries()) {
                const cellId = 'bu-' + String(columnIndex + 1) + '-' + String(rowIndex + 1);
                idMap[reference] = cellId;
                bus.push({
                    cellId: cellId,
                    label: C.buDisplayLabel(reference),
                    isParentBU: C.bareBUName(reference) === '_ParentBU_',
                });
            }
            columns.push({
                env: environment,
                band: C.diagramBand(columnIndex, columnCount),
                bus: bus,
            });
            cellIdByColumn.push(idMap);
            columnReferences.push(references);
        }

        // Pass B — links to the upstream BU: prefer the explicit lineage parent, else the same-index
        // BU (or the first) in the previous column. References the model's own cell ids.
        const links = [];
        for (let columnIndex = 1; columnIndex < environments.length; columnIndex += 1) {
            const previousMap = cellIdByColumn[columnIndex - 1];
            const references = columnReferences[columnIndex];
            const previousReferences = columnReferences[columnIndex - 1];
            for (const [rowIndex, reference] of references.entries()) {
                const parentReference = lineage[reference];
                let sourceCellId = parentReference ? previousMap[parentReference] : undefined;
                if (!sourceCellId) {
                    const fallbackReference = previousReferences[rowIndex] || previousReferences[0];
                    sourceCellId = fallbackReference ? previousMap[fallbackReference] : undefined;
                }
                const targetCellId = cellIdByColumn[columnIndex][reference];
                if (sourceCellId && targetCellId) {
                    links.push({ sourceCellId: sourceCellId, targetCellId: targetCellId });
                }
            }
        }

        return { title: C.diagramTitle(), columns: columns, links: links };
    }


    /**
     * Host hooks passed into the draw.io module so it stays DOM-free: the real window `open` and
     * the core's `downloadText`. Kept as a helper so both draw.io rows share one wiring.
     *
     * @returns {{open: (url: string, target: string, features: string) => unknown, downloadText: (filename: string, text: string, mimeType: string) => void}} the io hooks
     */
    function drawioIo() {
        return {
            open: (url, target, features) => global.open(url, target, features),
            downloadText: C.downloadText,
        };
    }


    /**
     * Build the pipeline's mxGraph XML from the current model and hand it off to app.diagrams.net
     * (the `#R<xml>` open path), falling back to a `pipeline.drawio` file download when the URL
     * would exceed the module's length cap. Shared by the Download-dropdown row and the output
     * step's draw.io tile so both trigger the identical open/fallback behaviour.
     *
     * @returns {('open'|'download'|undefined)} which branch the draw.io module took, if available
     */
    function openDrawioOrDownload() {
        if (!global.mpbDrawio) {
            return;
        }
        const model = buildDrawioModel();
        const xml = global.mpbDrawio.buildMxGraphXml(model);
        return global.mpbDrawio.openInDrawioOrDownload(xml, model.title, 'pipeline.drawio', drawioIo());
    }


    /**
     * Append the "Open in draw.io" Download row, gated by `isDiagramDrawable()`. Hands off via the
     * shared `openDrawioOrDownload()` (URL, else download) on click.
     *
     * @param {{append: (node: unknown) => void}} panel the dropdown panel
     * @returns {void}
     */
    function fillBuilderDrawioMxItem(panel) {
        if (!panel || !C.isDiagramDrawable()) {
            return;
        }
        const canCreate = document_ && typeof document_.createElement === 'function';
        if (!canCreate) {
            panel.append({ role: 'menuitem', textContent: 'Open in draw.io' });
            return;
        }
        const item = C.makeEl('button', {
            type: 'button',
            class: 'mpb-builder-open-row',
            text: 'Open in draw.io',
            attrs: { role: 'menuitem' },
        });
        item.addEventListener('click', () => {
            closeBuilderOpenPanel();
            openDrawioOrDownload();
        });
        panel.append(item);
    }


    /**
     * Build the "Download ▾" dropdown: the `.mcdevrc.json` item (full mode + complete pipeline only,
     * disabled with a tooltip otherwise), the always-present `.mcdev-validations.js` item, and an
     * "Open in Diagramforce" row gated by `isDiagramDrawable()` only (file rows keep
     * `outputBlockers()` / `isConfigDownloadAvailable`). Hard-omitted in validations-only.
     *
     * @returns {HTMLElement} the Download dropdown wrapper
     */
    function buildBuilderDownloadDropdown() {
        return buildBuilderDropdown('Download', false, (panel) => {
            const blockers = C.outputBlockers();
            const isConfigOk = C.isConfigDownloadAvailable(C.state.mode, blockers);
            // Chromium strips a leading dot from the `download` filename; warn the user to re-add it.
            panel.append(
                C.makeEl('p', {
                    class: 'mpb-dl-hint',
                    text: 'Some browsers save these without the leading dot — re-add it after downloading.',
                })
            );
            // `.mcdevrc.json` — omitted entirely in validations mode; disabled when incomplete.
            if (C.state.mode !== 'validations') {
                const configItem = C.makeEl('button', {
                    type: 'button',
                    class: 'mpb-builder-open-row',
                    text: 'Download .mcdevrc.json',
                    attrs: { role: 'menuitem' },
                });
                if (isConfigOk) {
                    configItem.addEventListener('click', () => {
                        closeBuilderOpenPanel();
                        const configObject = global.mpbConfigBuilder.buildConfig(C.state.wizardState, C.state.config);
                        C.downloadText('.mcdevrc.json', C.jsonPretty(configObject), 'application/json');
                    });
                } else {
                    configItem.disabled = true;
                    configItem.setAttribute('title', 'Finish the wizard before downloading the config.');
                }
                panel.append(configItem);
            }
            // `.mcdev-validations.js` — always available.
            const validationsItem = C.makeEl('button', {
                type: 'button',
                class: 'mpb-builder-open-row',
                text: 'Download .mcdev-validations.js',
                attrs: { role: 'menuitem' },
            });
            validationsItem.addEventListener('click', () => {
                closeBuilderOpenPanel();
                const deriveValidationsState = C.getDeriveValidationsState();
                const validationsSource = global.mpbValidationsBuilder.buildValidations(typeof deriveValidationsState === 'function' ? deriveValidationsState() : {});
                C.downloadText('.mcdev-validations.js', validationsSource, 'text/javascript');
            });
            panel.append(validationsItem);
            // Divider between the download-file rows above and the open-in-tool rows below.
            panel.append(
                C.makeEl('hr', {
                    class: 'mpb-builder-open-divider',
                    attrs: { role: 'separator' },
                })
            );
            fillBuilderDownloadDiagramItem(panel);
            fillBuilderDrawioMxItem(panel);
        });
    }


    /**
     * Fill the header name slot with the config display name plus an inline "Rename" affordance that
     * swaps in an `<input>` + Save/Cancel. Commit trims, ignores empty, persists via `renameSave`,
     * then re-renders the header and the intake saved-list. Enter commits, Escape cancels.
     *
     * @returns {void}
     */
    function renderBuilderHeaderName() {
        const slot = C.dom.builderHeaderName;
        slot.replaceChildren();
        slot.append(
            C.makeEl('span', { class: 'mpb-builder-header-name-label', text: C.currentConfigDisplayName() })
        );
        // Rename is only meaningful when a save is actually open.
        if (!C.persistence.currentId) {
            return;
        }
        const renameButton = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: '✎',
            attrs: { 'aria-label': 'Rename this config', title: 'Rename' },
        });
        renameButton.addEventListener('click', () => startBuilderHeaderRename());
        slot.append(renameButton);
    }


    /**
     * Swap the header name label for an inline rename input + Save/Cancel. Commit persists a trimmed,
     * non-empty name and re-renders the header + intake saved-list; Cancel/Escape restores the label.
     *
     * @returns {void}
     */
    function startBuilderHeaderRename() {
        const slot = C.dom.builderHeaderName;
        const id = C.persistence.currentId;
        if (!slot || !id) {
            return;
        }
        slot.replaceChildren();
        const input = C.makeEl('input', {
            type: 'text',
            class: 'mpb-builder-header-rename-input',
            value: C.currentConfigDisplayName(),
            attrs: { 'aria-label': 'New name for this config' },
        });
        const saveButton = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Save',
        });
        const cancelButton = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Cancel',
        });
        const commit = () => {
            const next = input.value.trim();
            if (next) {
                C.renameSave(id, next);
            }
            renderBuilderHeader();
            C.renderSavedList();
        };
        saveButton.addEventListener('click', commit);
        cancelButton.addEventListener('click', () => renderBuilderHeader());
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                renderBuilderHeader();
            }
        });
        slot.append(input, saveButton, cancelButton);
        input.focus();
        input.select();
    }


    /**
     * Fill the header actions slot with the four builder actions, in order: Open ▾, New version,
     * Upload new, Download ▾.
     *
     * @returns {void}
     */
    function renderBuilderHeaderActions() {
        const slot = C.dom.builderHeaderActions;
        slot.replaceChildren();

        // Open ▾ — reopen any other saved config.
        slot.append(buildBuilderOpenDropdown());

        // New version — clone the current config AND switch the active session to the clone.
        const newVersion = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'New version',
        });
        newVersion.addEventListener('click', () => {
            const cloneId = C.cloneSave(C.persistence.currentId);
            if (cloneId) {
                C.reopenSave(cloneId);
            }
        });
        slot.append(newVersion);

        // Upload new — return to intake to load a different config.
        const uploadNew = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Upload new',
        });
        uploadNew.addEventListener('click', () => C.goToStep('intake'));
        slot.append(uploadNew);

        // Download ▾ — the config + validations files (same guards as the output step).
        slot.append(buildBuilderDownloadDropdown());
    }


    /**
     * Wire the static header title button as a "start over" affordance that returns to the intake
     * view via `C.goToStep('intake')`. The button is authored in the page markup (not rebuilt per
     * render), so the click is bound exactly once — guarded by `isBuilderHeaderHomeWired`.
     *
     * @returns {void}
     */
    function wireBuilderHeaderHome() {
        if (isBuilderHeaderHomeWired || !document_ || typeof document_.querySelector !== 'function') {
            return;
        }
        const home = document_.querySelector('#mpb-builder-header-home');
        if (!home) {
            return;
        }
        home.addEventListener('click', () => C.goToStep('intake'));
        isBuilderHeaderHomeWired = true;
    }


    /**
     * Hydrate the sticky builder sub-header: (re)fill the name + actions slots. Called at the end of
     * every render and after rename/clone. Tears down any open dropdown first so its document
     * listeners never accumulate across rebuilds. Early-returns under the headless stub (no slots).
     *
     * @returns {void}
     */
    function renderBuilderHeader() {
        closeBuilderOpenPanel();
        if (!C.dom.builderHeaderName || !C.dom.builderHeaderActions) {
            return;
        }
        wireBuilderHeaderHome();
        renderBuilderHeaderName();
        renderBuilderHeaderActions();
    }

    // ── module API ──────────────────────────────────────────────────────────────────────

    // Install the header surface on the controller. The tests reach these off `mpbController`
    // (`buildDrawioModel`, `openDrawioOrDownload`, `buildBuilderDownloadDropdown`,
    // `fillBuilderDownloadDiagramItem`, `fillBuilderDrawioMxItem`, `diagramforceMenuItemSpec`), and
    // the core `render()` dispatcher calls `C.renderBuilderHeader()` after the extraction.
    Object.assign(C, {
        renderBuilderHeader: renderBuilderHeader,
        buildBuilderDownloadDropdown: buildBuilderDownloadDropdown,
        fillBuilderDownloadDiagramItem: fillBuilderDownloadDiagramItem,
        fillBuilderDrawioMxItem: fillBuilderDrawioMxItem,
        diagramforceMenuItemSpec: diagramforceMenuItemSpec,
        buildDrawioModel: buildDrawioModel,
        openDrawioOrDownload: openDrawioOrDownload,
    });

    // UMD-style footer to mirror the sibling standalone modules. Dead in Node (the package is
    // "type":"module", so module.exports is unavailable); the tests read `globalThis.mpbController`.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = C;
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
