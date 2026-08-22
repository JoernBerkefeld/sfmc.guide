/**
 * mcdev Pipeline Builder — prod-confirm wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `prod-confirm` step
 * on `mpbController` and exposes production-selection helpers used by tests.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-production-confirm.js');
    }

    const state = C.state;
    const makeElement = C.makeEl;
    const environmentNames = C.environmentNames;
    const assignedBUReferences = C.assignedBUReferences;
    const childBUReferences = C.childBUReferences;
    const render = C.render;

    /**
     * `prod-confirm` gate: at least one BU is confirmed as production.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedProductionConfirm() {
        const productionBUs = Array.isArray(state.wizardState.prodBUs) ? state.wizardState.prodBUs : [];
        if (productionBUs.length === 0) {
            return { ok: false, reason: 'Select at least one production business unit.' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * Seed the default production BUs (the last environment's BUs) the first time the step is
     * reached, and prune any confirmed prodBU that is no longer assigned anywhere.
     *
     * @returns {void}
     */
    function seedProductionBUs() {
        const assigned = new Set(childBUReferences());
        let productionBUs = Array.isArray(state.wizardState.prodBUs)
            ? state.wizardState.prodBUs.filter((reference) => assigned.has(reference))
            : [];
        if (productionBUs.length === 0) {
            const order = environmentNames();
            if (order.length > 0) {
                productionBUs = assignedBUReferences(order.at(-1));
            }
        }
        state.wizardState.prodBUs = productionBUs;
    }

    /**
     * `prod-confirm` step: default-select the last environment's BUs as production and let the user
     * toggle which pooled buRefs are production. Writes `wizardState.prodBUs` (a buRef array).
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderProductionConfirmStep(panel) {
        seedProductionBUs();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Confirm which business units are production. The last environment’s BUs are pre-selected — adjust as needed.',
            })
        );
        const references = childBUReferences();
        if (references.length === 0) {
            panel.append(makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' }));
            return;
        }

        // One column per environment (lineage visual). Each column header carries a "select all"
        // checkbox; each BU node carries its own "Production?" checkbox in the per-node control slot.
        const productionBUs = new Set(state.wizardState.prodBUs || []);
        const board = makeElement('div', { class: 'mpb-env-board' });
        for (const environment of environmentNames()) {
            board.append(productionColumn(environment, productionBUs));
        }
        panel.append(board);
    }

    /**
     * Build one production-confirm environment column: a header with a "select all" checkbox that
     * reflects/controls every BU in the environment, and one BU node per assigned buRef with its own
     * "Production?" checkbox. The header box is `checked` when ALL the env's BUs are production,
     * `indeterminate` when only some are, and unchecked when none are.
     *
     * @param {string} environment the environment name
     * @param {Set<string>} productionBUs the confirmed-production buRef set for this render
     * @returns {HTMLElement} the column element
     */
    function productionColumn(environment, productionBUs) {
        const references = assignedBUReferences(environment);
        const column = makeElement('div', { class: 'mpb-env-col' });

        const allProduction = isEnvironmentAllProduction(environment, state.wizardState);
        const someProduction = references.some((reference) => productionBUs.has(reference));
        const header = makeElement('label', { class: 'mpb-env-col-title mpb-env-col-select-all' });
        const ariaScope = state.mode === 'validations' ? 'BUs' : environment || 'BUs';
        const selectAll = makeElement('input', {
            type: 'checkbox',
            checked: allProduction,
            // Some-but-not-all selected → show the tri-state box (set as a DOM property).
            indeterminate: someProduction && !allProduction,
            attrs: { 'aria-label': 'Mark all ' + ariaScope + ' business units production' },
        });
        selectAll.addEventListener('change', () => {
            // Checking select-all marks every BU in the env production; unchecking clears them all.
            setEnvironmentProduction(environment, selectAll.checked);
        });
        // Validations-only mode uses the synthetic pool env ("All BUs"); label the select-all
        // generically there rather than leaking that internal container name.
        const headerLabel =
            state.mode === 'validations' ? 'All production' : environment || '(unnamed environment)';
        header.append(selectAll, makeElement('span', { text: headerLabel }));
        column.append(header);

        for (const reference of references) {
            const node = makeElement('div', {
                class: 'mpb-env-node',
                attrs: { 'data-bu': reference },
            });
            node.append(makeElement('span', { class: 'mpb-env-node-name', text: reference }));
            const control = makeElement('label', { class: 'mpb-env-node-control mpb-prod-toggle' });
            const checkbox = makeElement('input', {
                type: 'checkbox',
                checked: productionBUs.has(reference),
            });
            checkbox.addEventListener('change', () => {
                toggleProductionBU(reference, checkbox.checked);
            });
            control.append(checkbox, makeElement('span', { text: 'Production?' }));
            node.append(control);
            column.append(node);
        }
        return column;
    }

    /**
     * Whether every BU assigned to an environment is confirmed production. A pure predicate over the
     * wizard state: true only when the environment has at least one BU and all of them are in
     * `prodBUs`. Drives the column "select all" checkbox's `checked` state and its toggle direction.
     *
     * @param {string} environment the environment name
     * @param {object} wizardState the wizard state (`envBUs` + `prodBUs`)
     * @returns {boolean} true when the env has BUs and all are production
     */
    function isEnvironmentAllProduction(environment, wizardState) {
        const bus = (wizardState.envBUs || {})[environment];
        const references = Array.isArray(bus) ? bus : [];
        if (references.length === 0) {
            return false;
        }
        const productionBUs = new Set(Array.isArray(wizardState.prodBUs) ? wizardState.prodBUs : []);
        return references.every((reference) => productionBUs.has(reference));
    }

    /**
     * Bulk toggle every BU in an environment in/out of the confirmed production set, then re-render.
     * `on === true` adds all the env's BUs (without duplicating already-present ones); `on === false`
     * removes them all. Routes through the same `wizardState.prodBUs` store the per-BU checkbox uses,
     * so the column checkbox and the individual boxes stay consistent on the next render.
     *
     * @param {string} environment the environment whose BUs to (un)mark production
     * @param {boolean} on true to mark all production, false to clear all
     * @returns {void}
     */
    function setEnvironmentProduction(environment, on) {
        const references = assignedBUReferences(environment);
        const current = Array.isArray(state.wizardState.prodBUs) ? state.wizardState.prodBUs : [];
        if (on) {
            const merged = new Set(current);
            for (const reference of references) {
                merged.add(reference);
            }
            state.wizardState.prodBUs = [...merged];
        } else {
            const remove = new Set(references);
            state.wizardState.prodBUs = current.filter((reference) => !remove.has(reference));
        }
        render();
    }

    /**
     * Toggle a buRef in/out of the confirmed production set and re-render.
     *
     * @param {string} reference the buRef to toggle
     * @param {boolean} on true to mark production, false to unmark
     * @returns {void}
     */
    function toggleProductionBU(reference, on) {
        const current = Array.isArray(state.wizardState.prodBUs) ? state.wizardState.prodBUs : [];
        const next = on
            ? current.includes(reference)
                ? current
                : [...current, reference]
            : current.filter((existing) => existing !== reference);
        state.wizardState.prodBUs = next;
        render();
    }

    C.registerStep({
        id: 'prod-confirm',
        render: renderProductionConfirmStep,
        canProceed: canProceedProductionConfirm,
    });
    C.seedProductionBUs = seedProductionBUs;
    C.isEnvironmentAllProduction = isEnvironmentAllProduction;
    C.setEnvironmentProduction = setEnvironmentProduction;
    C.toggleProductionBU = toggleProductionBU;
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
