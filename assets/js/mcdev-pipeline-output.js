/**
 * mcdev Pipeline Builder — output (Download) wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `output` step on
 * `mpbController`. Owns Download-card generation, diagram CTA wiring, and
 * `deriveValidationsState`. The Download UI lives in static `#mpb-step-output`
 * markup — this file's `registerStep` render hides the dynamic host and unhides
 * that section (core's dispatcher skips `renderWizardStep` for this id).
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-output.js');
    }
    if (typeof C.selectMode !== 'function') {
        throw new TypeError('mcdev-pipeline-mode.js must load before mcdev-pipeline-output.js');
    }

    const state = C.state;
    const dom = C.dom;
    const makeElement = C.makeEl;
    const jsonPretty = C.jsonPretty;
    const emptyRetention = C.emptyRetention;
    const assignedBUReferences = C.assignedBUReferences;
    const childBUReferences = C.childBUReferences;
    const suffixOf = C.suffixOf;
    const isDiagramDrawable = C.isDiagramDrawable;
    const buildDiagramJSON = C.buildDiagramJSON;
    const openDiagramOrFallback = C.openDiagramOrFallback;
    const outputBlockers = C.outputBlockers;
    const downloadText = C.downloadText;
    const copyToClipboard = C.copyToClipboard;
    const fillFallback = C.fillFallback;
    const ensureCopyNote = C.ensureCopyNote;
    const bareBUName = C.bareBUName;

    /**
     * The credential name for a stored buRef. When the ref is bare (single-credential config) we
     * fall back to the first credential in the loaded config.
     *
     * @param {string} reference a stored buRef
     * @returns {(string|null)} the credential name, or null when none can be resolved
     */
    function credentialOf(reference) {
        const slash = String(reference).indexOf('/');
        if (slash !== -1) {
            return String(reference).slice(0, slash);
        }
        const credentials = (state.config && state.config.credentials) || {};
        const names = Object.keys(credentials);
        return names.length > 0 ? names[0] : null;
    }

    /**
     * The numeric MID of a stored buRef, looked up in its credential's `businessUnits` map, or null
     * when the BU is unknown / has no numeric MID.
     *
     * @param {string} reference a stored buRef
     * @returns {(number|null)} the MID, or null
     */
    function midOf(reference) {
        const credentials = (state.config && state.config.credentials) || {};
        const credName = credentialOf(reference);
        const cred = credName ? credentials[credName] : null;
        const businessUnits = (cred && cred.businessUnits) || {};
        const mid = businessUnits[bareBUName(reference)];
        return typeof mid === 'number' ? mid : null;
    }

    /**
     * Derive the `validationsState` the validations builder consumes, mapping from `wizardState` +
     * the loaded config. The builder keys `buSuffixMap` / `prodMap` / `prefixBlacklist` by **bare**
     * BU name and needs the source (DEV) BU name plus the pipeline MIDs. The two Chunk-3a mini-wizard
     * fields are mapped here: `prefixBlacklist` (from `wizardState.prefixBlacklist`, re-keyed to bare
     * names and stripped of empty lists) and `retention` (from `wizardState.retention`, including its
     * bare-name `appliesToMap` scope). A mini-wizard rule whose sub-config is left empty is **dropped**
     * from `selectedRules` so no dead rule is emitted (`filterPrefixByBu` with no prefixes on any BU;
     * `sendableDeRetention` with no BU selected).
     *
     * @returns {import('./mcdev-pipeline-validations-builder.js').ValidationsState} the derived state
     */
    function deriveValidationsState() {
        const wizardState = state.wizardState;
        const separator = wizardState.separator || '_';
        const references = childBUReferences();
        const productionSet = new Set(Array.isArray(wizardState.prodBUs) ? wizardState.prodBUs : []);

        // bare-BU-name -> suffix, and bare-BU-name -> is-production, both keyed by bare name.
        const buSuffixMap = {};
        const productionMap = {};
        for (const reference of references) {
            const bare = bareBUName(reference);
            buSuffixMap[bare] = suffixOf(reference);
            productionMap[bare] = productionSet.has(reference);
        }

        // The DEV source BU is the first BU assigned to the first (index-0) environment.
        const environmentOrder = Array.isArray(wizardState.envOrder) ? wizardState.envOrder : [];
        const firstEnvironmentBUs = environmentOrder.length > 0 ? assignedBUReferences(environmentOrder[0]) : [];
        const developmentBU = firstEnvironmentBUs.length > 0 ? bareBUName(firstEnvironmentBUs[0]) : '';

        // Pipeline MIDs (deduplicated) for the hard-coded-MID scan.
        const mids = [
            ...new Set(references.map((reference) => midOf(reference)).filter((mid) => mid !== null)),
        ];

        // filterPrefixByBu: re-key the per-BU forbidden-prefix blacklist to bare BU names, keeping
        // only child BUs that are still assigned and only non-empty prefix lists.
        const prefixBlacklist = {};
        const storedBlacklist = wizardState.prefixBlacklist || {};
        for (const reference of references) {
            const list = Array.isArray(storedBlacklist[reference]) ? storedBlacklist[reference] : [];
            if (list.length > 0) {
                prefixBlacklist[bareBUName(reference)] = [...list];
            }
        }

        const retention = { ...emptyRetention(), ...wizardState.retention };

        // sendableDeRetention scope: the rule's own BU selection, re-keyed to bare BU names. Only the
        // still-assigned, user-selected child BUs get a `true` entry — the emitter reads this map to
        // decide which BUs the policy is enforced on (fully decoupled from the pipeline prod set).
        const retentionAppliesToSet = new Set(Array.isArray(retention.appliesTo) ? retention.appliesTo : []);
        const retentionAppliesToMap = {};
        for (const reference of references) {
            if (retentionAppliesToSet.has(reference)) {
                retentionAppliesToMap[bareBUName(reference)] = true;
            }
        }
        retention.appliesToMap = retentionAppliesToMap;

        // Drop mini-wizard rules whose sub-config is empty so no dead rule is emitted:
        // filterPrefixByBu with no prefixes on any BU, and sendableDeRetention with no BU selected.
        const selectedRules = (
            Array.isArray(wizardState.selectedRules) ? [...wizardState.selectedRules] : []
        ).filter((id) => {
            if (id === 'filterPrefixByBu') {
                return Object.keys(prefixBlacklist).length > 0;
            }
            if (id === 'sendableDeRetention') {
                return Object.keys(retentionAppliesToMap).length > 0;
            }
            return true;
        });

        return {
            buSuffixMap: buSuffixMap,
            separator: separator,
            devBU: developmentBU,
            selectedRules: selectedRules,
            prodMap: productionMap,
            mids: mids,
            prefixBlacklist: prefixBlacklist,
            retention: retention,
        };
    }

    /**
     * Render the output step: run the download-guard, and when the wizard is complete build both
     * files, fill the textarea fallbacks, and wire the download + copy buttons. In validations-only
     * mode only the `.mcdev-validations.js` file is emitted (the config card is hidden).
     *
     * @returns {void}
     */
    function renderOutput() {
        const isValidationsOnly = state.mode === 'validations';

        // ── download-guard: block incomplete pipelines and name what is unfinished. ──
        const blockers = outputBlockers();
        if (dom.downloadGuard) {
            dom.downloadGuard.hidden = blockers.length === 0;
            if (blockers.length > 0) {
                dom.downloadGuard.replaceChildren();
                dom.downloadGuard.append(
                    makeElement('p', { text: 'Finish these steps before downloading:' }),
                    (() => {
                        const list = makeElement('ul');
                        for (const reason of blockers) {
                            list.append(makeElement('li', { text: reason }));
                        }
                        return list;
                    })()
                );
            }
        }

        // Config output only exists in full mode; hide its card in validations-only mode.
        if (dom.outputConfig) {
            dom.outputConfig.hidden = isValidationsOnly;
        }

        if (blockers.length > 0) {
            // Incomplete: hide the output cards until the user goes back and completes the wizard.
            if (dom.outputValidations) {
                dom.outputValidations.hidden = true;
            }
            if (dom.outputConfig) {
                dom.outputConfig.hidden = true;
            }
            return;
        }

        // Complete: reveal the relevant card(s).
        if (dom.outputValidations) {
            dom.outputValidations.hidden = false;
        }
        if (dom.outputConfig) {
            dom.outputConfig.hidden = isValidationsOnly;
        }

        // ── build the validations file (always emitted). ──
        const validationsSource = global.mpbValidationsBuilder.buildValidations(deriveValidationsState());
        fillFallback(dom.validationsFallback, validationsSource);
        wireDownload(dom.dlValidations, '.mcdev-validations.js', validationsSource, 'text/javascript');
        wireCopy(dom.copyValidations, validationsSource, dom.outputValidations);

        // ── build the config file (full mode only). ──
        if (!isValidationsOnly) {
            const configObject = global.mpbConfigBuilder.buildConfig(state.wizardState, state.config);
            const configText = jsonPretty(configObject);
            fillFallback(dom.configFallback, configText);
            wireDownload(dom.dlConfig, '.mcdevrc.json', configText, 'application/json');
            wireCopy(dom.copyConfig, configText, dom.outputConfig);
        }
    }

    /**
     * (Re)wire a download button to emit a fresh blob each click. Replacing the handler on every
     * render keeps the download in lock-step with the latest generated output.
     *
     * @param {(Element|null)} button the download button
     * @param {string} filename the download file name
     * @param {string} text the file contents
     * @param {string} mimeType the blob MIME type
     * @returns {void}
     */
    function wireDownload(button, filename, text, mimeType) {
        if (!button) {
            return;
        }
        button.onclick = () => {
            downloadText(filename, text, mimeType);
        };
    }

    /**
     * (Re)wire a copy button to copy the given text and report the result in a DOM note appended to
     * the card. Replacing the handler on every render keeps it copying the latest output.
     *
     * @param {(Element|null)} button the copy button
     * @param {string} text the text to copy
     * @param {(Element|null)} card the output card the success/failure note is appended to
     * @returns {void}
     */
    function wireCopy(button, text, card) {
        if (!button) {
            return;
        }
        button.onclick = () => {
            const note = ensureCopyNote(card);
            copyToClipboard(text, note);
        };
    }

    /**
     * Bind the output-section Diagramforce CTA (`#mpb-open-diagramforce`) and its in-section
     * fallback. Offered only when `isDiagramDrawable()` — never called from lineage or the header.
     * Rebuilds JSON on each click so it tracks the latest lineage.
     *
     * @returns {void}
     */
    function renderDiagramPreview() {
        const cta = dom.openDiagramforce ? dom.openDiagramforce.closest('.mpb-diagram-cta') : null;
        const isOffered = isDiagramDrawable();
        if (cta) {
            cta.hidden = !isOffered;
        }
        if (dom.diagramFallback) {
            // Reset the in-section fallback each output render; it re-reveals only on a pop-up-block.
            dom.diagramFallback.hidden = true;
        }
        if (!isOffered) {
            return;
        }

        if (dom.openDiagramforce) {
            dom.openDiagramforce.onclick = () => {
                openDiagramOrFallback(dom.openDiagramforce);
            };
        }

        if (dom.copyDiagram) {
            dom.copyDiagram.onclick = () => {
                if (state.mode === 'validations' || !isDiagramDrawable()) {
                    return;
                }
                const note = ensureCopyNote(dom.diagramFallback);
                copyToClipboard(jsonPretty(buildDiagramJSON()), note);
            };
        }
    }

    /**
     * Download step: hide the dynamic host (static `#mpb-step-output` markup) then paint cards.
     *
     * @returns {void}
     */
    function renderOutputStep() {
        if (dom.stepHost) {
            dom.stepHost.hidden = true;
        }
        if (dom.stepOutput) {
            dom.stepOutput.hidden = false;
        }
        renderOutput();
        renderDiagramPreview();
    }

    C.setDeriveValidationsState(deriveValidationsState);

    C.registerStep({
        id: 'output',
        render: renderOutputStep,
        canProceed: function proceedOutputGate() {
            return { ok: true, reason: '' };
        },
    });

    Object.assign(C, {
        deriveValidationsState: deriveValidationsState,
        renderOutput: renderOutput,
    });
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
