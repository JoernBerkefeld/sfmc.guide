/**
 * mcdev Pipeline Builder — mode view (not a wizard step).
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Owns full vs validations-only
 * selection, the validations-pool seed, and the mode-button wiring. Installs
 * `selectMode` / `seedValidationsPool` / `stripValidationsPoolEnvironment` on
 * `mpbController`. Core `render()` dispatches `case 'mode'` to `C.renderMode()`;
 * leftover `init()` calls `C.wireMode()` after `cacheDom()`.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-mode.js');
    }
    if (!Array.isArray(C.SUGGESTED_ENVIRONMENTS)) {
        throw new TypeError('mcdev-pipeline-step-environment-order.js must load before mcdev-pipeline-mode.js');
    }

    const state = C.state;
    const dom = C.dom;
    const visibleSteps = C.visibleSteps;
    const pooledBUReferences = C.pooledBUReferences;
    const environmentNames = C.environmentNames;
    const assignedBUReferences = C.assignedBUReferences;
    const goToStep = C.goToStep;
    const showOnly = C.showOnly;
    const SUGGESTED_ENVIRONMENTS = C.SUGGESTED_ENVIRONMENTS;

    /**
     * Synthetic environment name used in validations-only mode to pool every BU into one "column" so
     * the shared suffix + production steps (which iterate environments) have data to work with. It is
     * never shown as an environment (validations mode has no env-ordering step) and is only a label
     * for the pooled BU list.
     *
     * @type {string}
     */
    const VALIDATIONS_POOL_ENV = 'All BUs';

    /**
     * Select a generation mode and advance to the first wizard step.
     *
     * @param {('full'|'validations')} mode chosen mode
     * @returns {void}
     */
    function selectMode(mode) {
        state.mode = mode;
        // Persist the mode inside the wizardState save blob so reopen / deep-link restores it (Fix 1).
        state.wizardState.mode = mode;
        // Validations-only mode has no env-ordering step, but its suffix + production steps iterate
        // the assigned BUs. Pool every BU into one synthetic environment so those steps (and the
        // derived buSuffixMap / prodMap / devBU) have real data to work with.
        if (mode === 'validations') {
            seedValidationsPool();
        } else {
            // Full-pipeline mode must never carry the synthetic validations pool env. A config saved
            // in validations mode persists envOrder === ['All BUs']; re-opening it and then picking
            // full mode would otherwise leak that label as the DEV/source environment name. Strip it.
            stripValidationsPoolEnvironment();
        }
        // The visible steps (and therefore the first one) differ per mode: the full pipeline starts
        // at the environments step; validations-only jumps straight to the suffix table.
        const steps = visibleSteps();
        C.setWizardStep(steps.length > 0 ? steps[0].id : null);
        goToStep('wizard');
    }

    /**
     * Seed a single synthetic environment holding every pooled BU, so the shared suffix + production
     * steps have data to iterate in validations-only mode (which has no env-ordering step). Only
     * seeds when no environment is assigned yet, so a config restored from `mpb_pipeline` (which
     * already carries `envOrder`/`envBUs`) is left untouched.
     *
     * @returns {void}
     */
    function seedValidationsPool() {
        const alreadyAssigned = environmentNames().some(
            (environment) => assignedBUReferences(environment).length > 0
        );
        if (alreadyAssigned) {
            return;
        }
        const pooled = pooledBUReferences();
        state.wizardState.envOrder = [VALIDATIONS_POOL_ENV];
        state.wizardState.envBUs = { [VALIDATIONS_POOL_ENV]: pooled };
    }

    /**
     * Mode-aware guard: remove the synthetic `VALIDATIONS_POOL_ENV` ("All BUs") from the wizard
     * state so it can never surface as a real environment in full-pipeline mode. This is the one
     * place that reconciles a config round-tripped from validations mode (its persisted `envOrder`
     * is `['All BUs']`) or a mid-session mode switch — not a cosmetic filter in the render layer.
     * When stripping empties `envOrder`, re-seed the suggested defaults so the env-order step shows
     * real environment names instead of a blank first row.
     *
     * @returns {void}
     */
    function stripValidationsPoolEnvironment() {
        const order = environmentNames();
        if (!order.includes(VALIDATIONS_POOL_ENV)) {
            return;
        }
        const cleaned = order.filter((environment) => environment !== VALIDATIONS_POOL_ENV);
        const nextBUs = { ...state.wizardState.envBUs };
        delete nextBUs[VALIDATIONS_POOL_ENV];
        // Re-seed a sensible default order when removal left nothing, so no blank first row shows.
        state.wizardState.envOrder = cleaned.length > 0 ? cleaned : [...SUGGESTED_ENVIRONMENTS];
        state.wizardState.envBUs = nextBUs;
    }

    /**
     * Show the mode view. Core `render()` owns the step switch and calls this.
     *
     * @returns {void}
     */
    function renderMode() {
        showOnly('mode');
    }

    /**
     * Wire full vs validations-only buttons. Leftover `init()` calls this after `cacheDom()`.
     *
     * @returns {void}
     */
    function wireMode() {
        if (dom.modeFull) {
            dom.modeFull.addEventListener('click', () => {
                selectMode('full');
            });
        }
        if (dom.modeValidations) {
            dom.modeValidations.addEventListener('click', () => {
                selectMode('validations');
            });
        }
    }

    Object.assign(C, {
        selectMode: selectMode,
        seedValidationsPool: seedValidationsPool,
        stripValidationsPoolEnvironment: stripValidationsPoolEnvironment,
        renderMode: renderMode,
        wireMode: wireMode,
    });
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
