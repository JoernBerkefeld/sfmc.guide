/**
 * mcdev Pipeline Builder — leftover boot only.
 *
 * Classic browser IIFE (NOT an ES module). Must load LAST, after core and every peeled
 * step/view file (env-order, prod-confirm, suffixes, rules, bu-assign, lineage, intake,
 * mode, output). Owns `cacheDom`, leftover event wiring, and `init()`. Core must **not**
 * auto-init; this file is the only script that calls `init()`.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-builder.js');
    }
    if (typeof C.classifyIntake !== 'function') {
        throw new TypeError('mcdev-pipeline-intake.js must load before mcdev-pipeline-builder.js');
    }
    if (typeof C.selectMode !== 'function') {
        throw new TypeError('mcdev-pipeline-mode.js must load before mcdev-pipeline-builder.js');
    }
    if (typeof C.deriveValidationsState !== 'function') {
        throw new TypeError('mcdev-pipeline-output.js must load before mcdev-pipeline-builder.js');
    }

    const document_ = global.document;
    const state = C.state;
    const dom = C.dom;
    const goNext = C.goNext;
    const goBack = C.goBack;
    const goToStep = C.goToStep;
    const jsonPretty = C.jsonPretty;
    const initPersistence = C.initPersistence;
    const restoreFromHash = C.restoreFromHash;
    const onHashChange = C.onHashChange;
    const renderSavedList = C.renderSavedList;
    const isDiagramDrawable = C.isDiagramDrawable;
    const buildDiagramJSON = C.buildDiagramJSON;
    const copyToClipboard = C.copyToClipboard;
    const ensureCopyNote = C.ensureCopyNote;

    /**
     * Grab all DOM refs from the ids defined in the page shell.
     *
     * @returns {void}
     */
    function cacheDom() {
        dom.stepIntake = document_.querySelector('#mpb-step-intake');
        dom.stepMode = document_.querySelector('#mpb-step-mode');
        dom.wizard = document_.querySelector('#mpb-wizard');
        dom.stepOutput = document_.querySelector('#mpb-step-output');
        dom.dropzone = document_.querySelector('#mpb-dropzone');
        dom.fileInput = document_.querySelector('#mpb-file-input');
        dom.pasteInput = document_.querySelector('#mpb-paste-input');
        dom.pasteBtn = document_.querySelector('#mpb-paste-btn');
        dom.intakeError = document_.querySelector('#mpb-intake-error');
        dom.savedList = document_.querySelector('#mpb-saved-list');
        dom.modeFull = document_.querySelector('#mpb-mode-full');
        dom.modeValidations = document_.querySelector('#mpb-mode-validations');
        dom.stepHost = document_.querySelector('#mpb-step-host');
        // ── sticky builder sub-header (Chunk header) ──
        dom.builderHeader = document_.querySelector('#mpb-builder-header');
        // Remember the authored home parent so intake can park the header back where it started.
        dom.builderHeaderHome = dom.builderHeader ? dom.builderHeader.parentNode : null;
        dom.layoutContent = document_.querySelector('.layout-content');
        dom.builderHeaderName = document_.querySelector('#mpb-builder-header-name');
        dom.builderHeaderActions = document_.querySelector('#mpb-builder-header-actions');
        // ── wizard shell (Chunk 2) ──
        dom.stepper = document_.querySelector('#mpb-stepper');
        dom.back = document_.querySelector('#mpb-back');
        dom.next = document_.querySelector('#mpb-next');
        dom.backTop = document_.querySelector('#mpb-back-top');
        dom.nextTop = document_.querySelector('#mpb-next-top');
        dom.stepError = document_.querySelector('#mpb-step-error');
        // ── output (Chunk 2) ──
        dom.downloadGuard = document_.querySelector('#mpb-download-guard');
        dom.outputConfig = document_.querySelector('#mpb-output-config');
        dom.dlConfig = document_.querySelector('#mpb-dl-config');
        dom.copyConfig = document_.querySelector('#mpb-copy-config');
        dom.configFallback = document_.querySelector('#mpb-config-fallback');
        // ── output-config options (Chunk 4): strip-foreign + adopt-existing (pro) + missing panel ──
        dom.optAdoptExisting = document_.querySelector('#mpb-opt-adopt-existing');
        dom.optStripForeign = document_.querySelector('#mpb-opt-strip-foreign');
        dom.adoptMissing = document_.querySelector('#mpb-adopt-missing');
        dom.adoptMissingList = document_.querySelector('#mpb-adopt-missing-list');
        dom.outputValidations = document_.querySelector('#mpb-output-validations');
        dom.dlValidations = document_.querySelector('#mpb-dl-validations');
        dom.copyValidations = document_.querySelector('#mpb-copy-validations');
        dom.validationsFallback = document_.querySelector('#mpb-validations-fallback');
        // ── persistence / status (Chunk 3b) ──
        dom.banners = document_.querySelector('#mpb-banners');
        dom.storageGauge = document_.querySelector('#mpb-storage-gauge');
        // ── diagramforce preview (Chunk 3c) ──
        dom.openDiagramforce = document_.querySelector('#mpb-open-diagramforce');
        dom.diagramFallback = document_.querySelector('#mpb-diagram-fallback');
        dom.diagramJson = document_.querySelector('#mpb-diagram-json');
        dom.copyDiagram = document_.querySelector('#mpb-copy-diagram');
        // ── draw.io export tile (shares the Architecture-diagrams block with diagramforce) ──
        dom.openDrawio = document_.querySelector('#mpb-open-drawio');
        // Persistent header fallback (lineage + header Download menu; output keeps in-section ids).
        dom.diagramFallbackHeader = document_.querySelector('#mpb-diagram-fallback-header');
        dom.diagramJsonHeader = document_.querySelector('#mpb-diagram-json-header');
        dom.copyDiagramHeader = document_.querySelector('#mpb-copy-diagram-header');
    }

    /**
     * Wire leftover-owned controls (wizard nav, header diagram copy). Intake and mode listeners
     * live in `C.wireIntake()` / `C.wireMode()`, called from `init()` after `cacheDom()`.
     *
     * @returns {void}
     */
    function wireEvents() {
        // Chunk 3b: paint the saved-config list + storage gauge from the persistence layer. The rest
        // of the persistence wiring (storage probe/banner, cross-tab `storage` event, exit-flush,
        // lock heartbeat) is set up in initPersistence(), called from init() after cacheDom().
        renderSavedList();

        // ── wizard nav: Back / Next (top under stepper + bottom below host) ──
        if (dom.back) {
            dom.back.addEventListener('click', goBack);
        }
        if (dom.next) {
            dom.next.addEventListener('click', goNext);
        }
        if (dom.backTop) {
            dom.backTop.addEventListener('click', goBack);
        }
        if (dom.nextTop) {
            dom.nextTop.addEventListener('click', goNext);
        }

        // ── persistent header Diagramforce fallback copy ──
        if (dom.copyDiagramHeader) {
            dom.copyDiagramHeader.addEventListener('click', () => {
                if (state.mode === 'validations' || !isDiagramDrawable()) {
                    return;
                }
                const note = ensureCopyNote(dom.diagramFallbackHeader);
                copyToClipboard(jsonPretty(buildDiagramJSON()), note);
            });
        }
    }

    /**
     * Boot the controller once the DOM is ready and the page shell is present.
     *
     * @returns {void}
     */
    function init() {
        if (!document_.querySelector('#mpb-app')) {
            return;
        }
        cacheDom();
        C.wireIntake();
        C.wireMode();
        wireEvents();
        initPersistence();
        // React to manual address-bar edits + back/forward. onHashChange ignores our own writes.
        if (global.addEventListener) {
            global.addEventListener('hashchange', onHashChange);
        }
        // Reload-restore + deep-link: if the hash names a saved session in this browser, reopen it and
        // jump to the requested view/step; otherwise fall through to the default intake landing. We
        // rely on the hash alone (no separate persisted "last active" pointer) because
        // syncHashToState() writes the step on every navigation, so a plain reload always carries it.
        if (!restoreFromHash()) {
            goToStep('intake');
        }
    }

    if (document_.readyState === 'loading') {
        document_.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
