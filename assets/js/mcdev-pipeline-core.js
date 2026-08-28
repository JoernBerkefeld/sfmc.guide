/**
 * mcdev Pipeline Builder — shared core.
 *
 * Classic browser IIFE (NOT an ES module). Attaches `globalThis.mpbController`.
 * Must NOT call `init()` — leftover `mcdev-pipeline-builder.js` is the only script that
 * boots. Core owns state, helpers, `registerStep`, the top-level `render()` dispatcher,
 * nav/stepper/hash/persistence/header, and diagram helpers.
 *
 * @typedef {import('./mcdev-pipeline-config-builder.js').WizardState} WizardState
 */

/**
 * @param {Window} global host window object
 */
(function (global) {
    'use strict';

    const document_ = global.document;

    /**
     * Optional hooks. Core never auto-inits. `setRender` is an override; when unset, the
     * dispatcher in `render()` runs. Output installs `deriveValidationsState`. Lineage
     * installs `beforeWizardStepRender` / `onSharedDEsChange`.
     */
    const hooks = {
        render: null,
        beforeWizardStepRender: null,
        onSharedDEsChange: null,
        deriveValidationsState: null,
    };

    /**
     * Per-step registry. `registerStep` last-wins on duplicate id; missing `render` throws.
     *
     * @type {{[id: string]: {render: (panel: HTMLElement) => void, canProceed: () => {ok: boolean, reason: string}}}}
     */
    const stepRegistry = Object.create(null);

    /**
     * Register a wizard step. Duplicate ids replace the previous entry (last writer wins).
     *
     * @param {{id: string, render: (panel: HTMLElement) => void, canProceed?: () => {ok: boolean, reason: string}}} spec step registration
     * @returns {void}
     */
    function registerStep(spec) {
        if (!spec || typeof spec.id !== 'string' || spec.id === '') {
            throw new Error('registerStep: id is required');
        }
        if (typeof spec.render !== 'function') {
            throw new TypeError('registerStep: render is required for step "' + spec.id + '"');
        }
        stepRegistry[spec.id] = {
            render: spec.render,
            canProceed:
                typeof spec.canProceed === 'function'
                    ? spec.canProceed
                    : function defaultProceedGate() {
                          return { ok: true, reason: '' };
                      },
        };
    }

    /**
     * Look up a registered step (test lock + leftover peels).
     *
     * @param {string} id step id
     * @returns {{render: (panel: HTMLElement) => void, canProceed: () => {ok: boolean, reason: string}}|undefined} registry entry
     */
    function getRegisteredStep(id) {
        return stepRegistry[id];
    }

    /**
     * Per-step gate dispatcher — calls only the registry. Unknown ids are permissive.
     *
     * @param {string} stepId the step id being left
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceed(stepId) {
        const entry = stepRegistry[stepId];
        if (!entry || typeof entry.canProceed !== 'function') {
            return { ok: true, reason: '' };
        }
        return entry.canProceed();
    }

    /**
     * Wizard-step render dispatcher — calls only the registry (no hardcoded step switch).
     *
     * @param {string} stepId the active step id
     * @returns {void}
     */
    function renderWizardStep(stepId) {
        if (!dom.stepHost) {
            return;
        }
        if (typeof hooks.beforeWizardStepRender === 'function') {
            hooks.beforeWizardStepRender();
        }
        setText(dom.stepHost, '');
        const title = WIZARD_STEP_TITLES[stepId] || stepId;
        const panel = makeElement('div', {
            class: 'mpb-step-panel',
            attrs: { 'data-step-id': stepId },
        });
        panel.append(makeElement('h3', { class: 'mpb-step-title', text: title }));
        const entry = stepRegistry[stepId];
        if (entry && typeof entry.render === 'function') {
            entry.render(panel);
        } else {
            panel.append(
                makeElement('p', {
                    class: 'mpb-step-placeholder text-muted',
                    text: 'This step is coming soon.',
                })
            );
        }
        dom.stepHost.append(panel);
    }

    /**
     * Top-level render dispatcher. Switches on `state.step`. Intake and mode are delegated to
     * `mpbController.renderIntake()` / `renderMode()` (installed by those files). The wizard
     * branch renders the stepper + the current step. Download is a wizard sub-step that
     * special-cases static `#mpb-step-output` markup: skip `renderWizardStep` (that function
     * wipes the host) and call the registered `output` render, which hides the host.
     *
     * `setRender` remains an optional override (tests); when unset, this dispatcher runs.
     *
     * @returns {void}
     */
    function render() {
        if (typeof hooks.render === 'function') {
            hooks.render();
            return;
        }
        switch (state.step) {
            case 'intake': {
                if (typeof global.mpbController.renderIntake === 'function') {
                    global.mpbController.renderIntake();
                }
                break;
            }
            case 'mode': {
                if (typeof global.mpbController.renderMode === 'function') {
                    global.mpbController.renderMode();
                }
                break;
            }
            case 'wizard': {
                showOnly('wizard');
                // Recompute the visible steps every render (upstream answers can add/remove steps),
                // clamp the cursor into that set, then paint the stepper nav + the current step.
                const steps = clampWizardStep();
                renderStepper(steps);
                if (wizardStep === 'output') {
                    // Download lives in static markup — do not call renderWizardStep (it wipes the
                    // host and would hit the "coming soon" default). The registered output render
                    // hides the host and unhides `#mpb-step-output`.
                    const entry = getRegisteredStep('output');
                    if (entry && typeof entry.render === 'function') {
                        entry.render();
                    }
                } else {
                    if (dom.stepHost) {
                        dom.stepHost.hidden = false;
                    }
                    if (dom.stepOutput) {
                        dom.stepOutput.hidden = true;
                    }
                    if (wizardStep) {
                        renderWizardStep(wizardStep);
                    }
                }
                // Dual Back/Next: lockstep labels; hide Next only on Download.
                syncWizardNav();
                clearStepError();
                break;
            }
            default: {
                if (typeof global.mpbController.renderIntake === 'function') {
                    global.mpbController.renderIntake();
                }
                break;
            }
        }
        // Autosave: any render past intake reflects the latest answers — persist them (debounced) so
        // a reopened config resumes exactly. Read-only (another tab holds the lock) skips the write.
        if (state.step && state.step !== 'intake' && state.config) {
            global.mpbController.scheduleAutosave();
        }
        // Hydrate the sticky builder sub-header (name + actions) to reflect the latest state. A no-op
        // under the headless stub (slots are null). Lives in the builder-header module now, so it is
        // reached through the controller.
        global.mpbController.renderBuilderHeader();
        // Hide the persistent header Diagramforce fallback when the graph is no longer drawable
        // (validations-only, intake, or a later edit that drops an env/BU/lineage link).
        if (dom.diagramFallbackHeader && !isDiagramDrawable()) {
            dom.diagramFallbackHeader.hidden = true;
        }
        // Mirror the current step into location.hash so a reload / shared link reproduces it. Cheap +
        // idempotent (only writes on a real change, via replaceState), so calling it from render() —
        // which also fires on input events — is safe.
        syncHashToState();
    }

    /**
     * @param {() => void} renderHook optional render override
     * @returns {void}
     */
    function setRender(renderHook) {
        hooks.render = renderHook;
    }

    /**
     * @param {() => void} teardownHook teardown before a wizard-step host rebuild
     * @returns {void}
     */
    function setBeforeWizardStepRender(teardownHook) {
        hooks.beforeWizardStepRender = teardownHook;
    }

    /**
     * @param {(isEnabled: boolean, wasOn: boolean) => boolean} changeHook shared-DEs animation handler
     * @returns {void}
     */
    function setOnSharedDEsChange(changeHook) {
        hooks.onSharedDEsChange = changeHook;
    }

    /**
     * @param {() => object} deriveHook leftover validations-state builder
     * @returns {void}
     */
    function setDeriveValidationsState(deriveHook) {
        hooks.deriveValidationsState = deriveHook;
    }

    /**
     * Persist the shared-DEs answer. Parent-band animation lives in lineage via `onSharedDEsChange`.
     *
     * @param {boolean} enabled whether shared data extensions are in use
     * @returns {void}
     */
    function setSharedDEs(enabled) {
        const isEnabled = !!enabled;
        const wasOn = !!state.wizardState.sharedDEs;
        state.wizardState.sharedDEs = isEnabled;
        global.mpbController.scheduleAutosave();
        if (typeof hooks.onSharedDEsChange === 'function' && hooks.onSharedDEsChange(isEnabled, wasOn)) {
            return;
        }
        render();
    }


    /**
     * Fresh, empty wizard state. Field names/shape must stay in lock-step with the two pure
     * builders (`mpbConfigBuilder` / `mpbValidationsBuilder`) and the Node builder tests.
     *
     * @returns {WizardState} an empty wizard state
     */
    function emptyWizardState() {
        return {
            version: 1,
            multiCred: false,
            // The chosen generation mode (`'full'` | `'validations'`), persisted so a reopened /
            // deep-linked session restores `state.mode` instead of forcing the mode picker. Null on a
            // fresh state and on older saves that predate mode persistence (backward compatible).
            mode: null,
            envOrder: [],
            envBUs: {},
            // Git branch per environment, keyed by env DISPLAY name (same key space as envOrder).
            // Auto-filled from the env name (autoBranchFromEnvName) while the field is empty; once the
            // user types a value it is treated as manual and never overwritten. Feeds the config
            // builder's per-hop branch key (falling back to branchKey() when an entry is absent).
            envBranches: {},
            lineage: {},
            separator: '_',
            suffixes: {},
            // Per-BU extra market variables surfaced by the market-vars step, keyed by BU ref then
            // variable name (`suffix` is NOT stored here — it stays in `suffixes`). Additive field:
            // old saved configs lacking it restore fine via this default (see intake restore), so
            // `version` MUST stay 1 (bumping it makes every prior config unrestorable).
            marketVariables: {},
            // Market-list adoption detected from a vanilla config (Tier 2): { byBU, marketOf, … }
            // when a config's 1:1 BU→market marketLists were detected, else empty. Lives at
            // state.wizardState.marketAdoption (never state.marketAdoption). Additive: old saves
            // lacking it restore fine via this default, so `version` MUST stay 1.
            marketAdoption: {},
            // The market-variable KEY the user picked to act as the suffix source when a config
            // carries no literal `suffix` field (Decision A). `null` = not chosen yet. Additive.
            suffixKey: null,
            prodBUs: [],
            selectedRules: [],
            // Chunk-3a mini-wizard inputs, consumed by the validations builder via
            // deriveValidationsState(): { [childBuRef]: string[] } of forbidden key/name prefixes
            // per BU (filterPrefixByBu), and the single sendable-DE retention policy object
            // (sendableDeRetention). Both keyed/shaped to match mcdev-pipeline-validations-builder.js.
            prefixBlacklist: {},
            retention: emptyRetention(),
            sharedDEs: false,
        };
    }


    /**
     * The retention-policy defaults for the `sendableDeRetention` mini-wizard. Field names mirror
     * the DevTools data-extension metadata model that the validations builder emits verbatim:
     * `c__retentionPolicy` / `DataRetentionPeriodLength` (number) / `c__dataRetentionPeriodUnitOfMeasure`
     * / `ResetRetentionPeriodOnImport` (boolean). `appliesTo` is the rule's own buRef selection (the
     * business units this policy is enforced on) — independent of the pipeline's production set.
     * `deTypeScope` picks which data-extension types the policy is enforced on
     * (`'sendable'` | `'nonSendable'` | `'both'` default). An absent value in a saved config is
     * still read as `'sendable'` by the emitter for back-compat.
     *
     * @returns {{c__retentionPolicy: string, DataRetentionPeriodLength: number, c__dataRetentionPeriodUnitOfMeasure: string, ResetRetentionPeriodOnImport: boolean, appliesTo: string[], deTypeScope: ('sendable'|'nonSendable'|'both')}} default policy
     */
    function emptyRetention() {
        return {
            c__retentionPolicy: 'individialRecords',
            DataRetentionPeriodLength: 3,
            c__dataRetentionPeriodUnitOfMeasure: 'Months',
            ResetRetentionPeriodOnImport: false,
            appliesTo: [],
            deTypeScope: 'both',
        };
    }


    /**
     * Central application state. `render()` dispatches on `state.step`.
     *
     * @type {{mode: (string|null), wizardState: WizardState, config: (object|null), step: (string|null)}}
     */
    const state = {
        mode: null,
        wizardState: emptyWizardState(),
        config: null,
        step: null,
    };


    // ── Cached DOM refs (grabbed from the ids defined in tools/mcdev-pipeline-builder/index.md). ──
    const dom = {
        stepIntake: null,
        stepMode: null,
        wizard: null,
        stepOutput: null,
        dropzone: null,
        fileInput: null,
        pasteInput: null,
        pasteBtn: null,
        intakeError: null,
        savedList: null,
        modeFull: null,
        modeValidations: null,
        stepHost: null,
        // ── sticky builder sub-header (hoisted into .layout-content in builder mode) ──
        builderHeader: null, // the #mpb-builder-header element
        builderHeaderHome: null, // its authored parent (#mpb-app), to park it back on intake
        layoutContent: null, // the .layout-content scroll container it pins inside
        builderHeaderName: null, // #mpb-builder-header-name slot (config name + rename)
        builderHeaderActions: null, // #mpb-builder-header-actions slot (Open/New/Upload/Download)
        // ── wizard shell (Chunk 2) ──
        stepper: null,
        back: null,
        next: null,
        backTop: null,
        nextTop: null,
        stepError: null,
        // ── output (Chunk 2) ──
        downloadGuard: null,
        outputConfig: null,
        dlConfig: null,
        copyConfig: null,
        configFallback: null,
        outputValidations: null,
        dlValidations: null,
        copyValidations: null,
        validationsFallback: null,
        // ── persistence / status (Chunk 3b) ──
        banners: null,
        storageGauge: null,
    };


    /**
     * The wizard's active sub-step id (env ordering, BU assignment, Download, …). Kept separate from
     * the top-level `state.step` (`intake`/`mode`/`wizard`) so the wizard can recompute its ordered
     * list of visible steps from `state` on every render and clamp the cursor to it. Download is a
     * wizard sub-step (`wizardStep === 'output'`), not a top-level view.
     *
     * @type {(string|null)}
     */
    let wizardStep = null;


    /**
     * Soft-confirm latch for the `bu-assign` step. Leaving a BU unassigned is legitimate (a BU may
     * simply not belong to any pipeline), so the "some BUs are unassigned" warning is a confirm-to-
     * proceed gate, not a hard block. Once the user clicks "Continue anyway" this flips true so they
     * are not re-prompted. It is reset to `false` inside `assignBUToEnvironment` (the single board
     * chokepoint) so any assignment/unassignment invalidates a prior confirmation and the user is
     * warned again about the NEW situation if they return to the step.
     *
     * @type {boolean}
     */
    let hasConfirmedUnassigned = false;


    /**
     * Canonical, ordered list of full-pipeline wizard step ids. `visibleSteps()` derives the
     * actually-shown subset from this (validations-only collapses to suffixes / production / rules /
     * Download; `lineage` is dropped when every environment holds exactly one BU). Download is the
     * last crumb in both modes; its UI lives in static `#mpb-step-output` markup, not `renderWizardStep`.
     *
     * @type {readonly string[]}
     */
    const WIZARD_STEP_IDS = [
        'env-order',
        'bu-assign',
        'suffixes',
        'lineage',
        'prod-confirm',
        'market-vars',
        'rules',
        'output',
    ];


    /**
     * Human-readable titles for each wizard step id, shown in the stepper nav and the (Chunk-2b)
     * step headings. Keyed by the ids in `WIZARD_STEP_IDS`.
     *
     * @type {Record<string, string>}
     */
    const WIZARD_STEP_TITLES = {
        'env-order': 'Environments',
        'bu-assign': 'Assign BUs',
        lineage: 'Lineage',
        suffixes: 'Suffixes',
        'prod-confirm': 'Production',
        'market-vars': 'Market Variables',
        rules: 'Rules',
        output: 'Download',
    };


    // ─────────────────────────── escaping / DOM helpers (used by all chunks) ───────────────────────────

    /**
     * Safely set an element's text. Always uses `textContent`, so any `<`, `>` or quote in a
     * config-derived string is rendered literally and can never inject markup.
     *
     * @param {(Element|null)} element target element
     * @param {string} string text to show
     * @returns {void}
     */
    function setText(element, string) {
        if (element) {
            element.textContent = string == null ? '' : String(string);
        }
    }


    /**
     * Element factory. Assigns known-safe properties (never `innerHTML`) and appends children.
     *
     * @param {string} tag element tag name
     * @param {object} [properties] properties/attributes: `text` sets textContent;
     *   `class`/`className` sets the class; `attrs` is a map of attributes; any other key is
     *   set as a DOM property.
     * @param {(Node|string)[]} [children] child nodes (strings become text nodes)
     * @returns {HTMLElement} the created element
     */
    function makeElement(tag, properties, children) {
        const element = document_.createElement(tag);
        const properties_ = properties || {};
        for (const [key, value] of Object.entries(properties_)) {
            if (key === 'text') {
                element.textContent = value == null ? '' : String(value);
            } else if (key === 'class' || key === 'className') {
                element.className = value;
            } else if (key === 'attrs' && value) {
                for (const [attribute, attributeValue] of Object.entries(value)) {
                    element.setAttribute(attribute, attributeValue);
                }
            } else {
                element[key] = value;
            }
        }
        const kids = children || [];
        for (const child of kids) {
            element.append(
                child instanceof global.Node ? child : document_.createTextNode(String(child))
            );
        }
        return element;
    }


    /**
     * Pretty-print a value as stable, 4-space-indented JSON for on-screen/textarea output.
     *
     * @param {unknown} value any JSON-serialisable value
     * @returns {string} formatted JSON text
     */
    function jsonPretty(value) {
        return JSON.stringify(value, null, 4);
    }


    /**
     * Show an inline error in the wizard step-error box (text only — never echoes raw input markup).
     * Used by the per-step "can proceed" gate to surface why Next is blocked.
     *
     * @param {string} message human-readable error
     * @returns {void}
     */
    function showStepError(message) {
        if (!dom.stepError) {
            return;
        }
        setText(dom.stepError, message);
        dom.stepError.hidden = false;
    }


    /**
     * Clear the wizard step-error box.
     *
     * @returns {void}
     */
    function clearStepError() {
        if (!dom.stepError) {
            return;
        }
        setText(dom.stepError, '');
        dom.stepError.hidden = true;
    }


    /**
     * Refresh the wizard navigation gate WITHOUT re-rendering the current step. Text inputs call
     * this on every keystroke instead of a full `render()` (which would tear down and rebuild the
     * step DOM, destroying the focused input and jumping the scroll to the top). Next is always
     * clickable — its `canProceed` check runs in `goNext()` — so all this needs to do is clear a
     * previously-shown step error once the edited step passes its gate again, so a stale "why Next
     * is blocked" message disappears the moment the user fixes the problem.
     *
     * @returns {void}
     */
    function updateNavGate() {
        if (!wizardStep) {
            return;
        }
        if (canProceed(wizardStep).ok) {
            clearStepError();
        }
    }


    // ─────────────────────────── wizard step state machine ───────────────────────────

    /**
     * True when every environment in the wizard state holds exactly one BU. In that case the
     * deploy lineage is unambiguous (each env's single BU chains to the previous env's single BU),
     * so the manual lineage-linking step is skipped from `visibleSteps()`.
     *
     * @returns {boolean} true when no environment has more than one BU
     */
    function everyEnvironmentHasOneBU() {
        const environmentBUs = state.wizardState.envBUs || {};
        const environments = state.wizardState.envOrder || [];
        // With no envs defined yet there is nothing ambiguous to link — treat as "one BU each".
        if (environments.length === 0) {
            return true;
        }
        return environments.every((environment) => {
            const bus = environmentBUs[environment];
            return Array.isArray(bus) && bus.length === 1;
        });
    }


    /**
     * Derive the ordered list of wizard steps to show, given the current mode + wizard state.
     * Full pipeline shows the whole `WIZARD_STEP_IDS` list minus `lineage` when every env has a
     * single BU; validations-only collapses to suffixes / production / rules. Both lists end with
     * Download (`output`).
     *
     * @returns {{id: string, title: string}[]} the ordered visible steps
     */
    function visibleSteps() {
        // Validations-only mode skips env-ordering / lineage, but still needs each BU's suffix
        // (for keySuffix/buSuffixMap) and the production scope (for prodMap). It collects those via a
        // compact BU-suffix table + production confirm over a single pooled synthetic environment.
        if (state.mode === 'validations') {
            return [
                { id: 'suffixes', title: WIZARD_STEP_TITLES.suffixes },
                { id: 'prod-confirm', title: WIZARD_STEP_TITLES['prod-confirm'] },
                { id: 'rules', title: WIZARD_STEP_TITLES.rules },
                { id: 'output', title: WIZARD_STEP_TITLES.output },
            ];
        }
        // Full pipeline: the whole ordered list, dropping the lineage step when it is unambiguous.
        const skipLineage = everyEnvironmentHasOneBU();
        return WIZARD_STEP_IDS.filter((id) => !(id === 'lineage' && skipLineage)).map((id) => ({
            id: id,
            title: WIZARD_STEP_TITLES[id],
        }));
    }


    /**
     * Clamp the active wizard step to the currently-visible set. If the previously-active step is
     * no longer visible (an upstream answer changed which steps apply), fall back to the first
     * visible step so the cursor never points at a hidden step.
     *
     * @returns {{id: string, title: string}[]} the visible steps (already computed, returned for reuse)
     */
    function clampWizardStep() {
        const steps = visibleSteps();
        const ids = steps.map((step) => step.id);
        if (wizardStep === null || !ids.includes(wizardStep)) {
            wizardStep = ids.length > 0 ? ids[0] : null;
        }
        return steps;
    }


    // ─────────────────────────── Chunk 2b-1: step data helpers ───────────────────────────

    /**
     * Pool every business unit across all credentials of the loaded config into a flat list of
     * buRefs. With more than one credential each BU is qualified as `<cred>/<BU>` so DEV-cred and
     * PROD-cred BUs of the same name stay distinct; with a single credential the refs collapse to
     * bare `<BU>` names (matching `wizardState.multiCred === false`). The mcdev-internal
     * `_ParentBU_` placeholder is excluded — it is never an assignable environment BU.
     *
     * @returns {string[]} the assignable buRefs, in credential/declaration order
     */
    function pooledBUReferences() {
        const credentials = (state.config && state.config.credentials) || {};
        const multiCred = state.wizardState.multiCred;
        const references = [];
        for (const [credName, cred] of Object.entries(credentials)) {
            const businessUnits = (cred && cred.businessUnits) || {};
            // Skip the mcdev-internal parent placeholder — it is never an assignable environment BU.
            const assignable = Object.keys(businessUnits).filter((buName) => buName !== '_ParentBU_');
            for (const buName of assignable) {
                references.push(multiCred ? credName + '/' + buName : buName);
            }
        }
        return references;
    }


    /**
     * The environment names currently ordered in the wizard state, as a fresh array.
     *
     * @returns {string[]} the ordered environment names
     */
    function environmentNames() {
        return Array.isArray(state.wizardState.envOrder) ? [...state.wizardState.envOrder] : [];
    }


    /**
     * The set of buRefs assigned to a given environment, always as a fresh array (never shared with
     * the stored state).
     *
     * @param {string} environment the environment name
     * @returns {string[]} the assigned buRefs
     */
    function assignedBUReferences(environment) {
        const bus = state.wizardState.envBUs[environment];
        return Array.isArray(bus) ? [...bus] : [];
    }


    /**
     * The pooled buRefs not currently assigned to any environment — the "Unassigned" column's
     * contents. Preserves `pooledBUReferences()` order so the pool stays stable as BUs are moved.
     *
     * @returns {string[]} the unassigned buRefs, in pooled order
     */
    function unassignedBUReferences() {
        const assigned = new Set(environmentNames().flatMap((environment) => assignedBUReferences(environment)));
        return pooledBUReferences().filter((reference) => !assigned.has(reference));
    }


    /**
     * Whether Next on the `bu-assign` step should surface the soft "some BUs are still unassigned"
     * confirmation instead of advancing. True only when we are on `bu-assign`, at least one pooled BU
     * is unassigned, AND the user has not yet confirmed the current set (`hasConfirmedUnassigned`).
     * This is the pure, testable core of the soft gate — it never touches the DOM and is
     * bu-assign-only.
     *
     * @returns {boolean} true when the confirmation prompt must be shown before advancing
     */
    function shouldConfirmUnassigned() {
        return wizardStep === 'bu-assign' && unassignedBUReferences().length > 0 && !hasConfirmedUnassigned;
    }


    /**
     * Single-assignment invariant, enforced in ONE place: a buRef belongs to at most one
     * environment. Assigning it to `targetEnv` first removes it from EVERY environment, then appends
     * it to `targetEnv` (when non-null). `targetEnv === null` therefore un-assigns it back to the
     * Unassigned pool. Writes a fresh `envBUs` (never mutates the stored arrays) and re-renders so
     * downstream steps (suffixes/lineage/diagram) recompute. Both the drag-drop reconciliation and
     * the keyboard `<select>` route through here so the invariant can never be bypassed.
     *
     * @param {string} buReference the buRef to (re)assign
     * @param {(string|null)} targetEnvironment the destination env name, or null for Unassigned
     * @returns {void}
     */
    function assignBUToEnvironment(buReference, targetEnvironment) {
        const nextEnvironmentBUs = {};
        for (const environment of environmentNames()) {
            nextEnvironmentBUs[environment] = assignedBUReferences(environment).filter(
                (reference) => reference !== buReference
            );
        }
        if (targetEnvironment !== null && Object.hasOwn(nextEnvironmentBUs, targetEnvironment)) {
            nextEnvironmentBUs[targetEnvironment] = [...nextEnvironmentBUs[targetEnvironment], buReference];
        }
        state.wizardState.envBUs = nextEnvironmentBUs;
        // Every board change invalidates a prior "leave BUs unassigned" confirmation: if the user
        // goes back, moves BUs around, and returns, they must be warned again about the new set.
        hasConfirmedUnassigned = false;
        render();
    }


    /**
     * The distinct child buRefs assigned across every environment, in environment order then
     * assignment order. These are the BUs that get their own suffix (the mcdev-internal
     * `_ParentBU_` is never pooled, and reuses the child suffixes at build time).
     *
     * @returns {string[]} the assigned child buRefs, de-duplicated
     */
    function childBUReferences() {
        const all = environmentNames().flatMap((environment) => assignedBUReferences(environment));
        return [...new Set(all)];
    }


    /**
     * The stored suffix (including its leading separator) for a child buRef, or an empty string
     * when none is set yet.
     *
     * @param {string} reference the child buRef
     * @returns {string} the stored suffix, e.g. `_UAT`
     */
    function suffixOf(reference) {
        const suffixes = state.wizardState.suffixes || {};
        return typeof suffixes[reference] === 'string' ? suffixes[reference] : '';
    }


    /**
     * The lineage-root (dev-source) BU ref for a child buRef: walk `wizardState.lineage`
     * child -> parent until a BU with no parent is reached. A cycle guard (visited set) makes a
     * malformed self/loop lineage terminate at the entry point rather than spin forever. An empty
     * lineage (`{}`) makes every BU its own root.
     *
     * @param {string} reference the buRef to resolve
     * @returns {string} the lineage-root buRef (the reference itself when it has no parent)
     */
    function pipelineRootOf(reference) {
        const lineage = state.wizardState.lineage || {};
        const seen = new Set();
        let current = reference;
        // Walk child -> parent. The visited set makes a malformed self/loop lineage terminate rather
        // than spin forever; a falsy/absent parent ends the walk at the current root.
        let parent = lineage[current];
        while (parent && !seen.has(current)) {
            seen.add(current);
            current = parent;
            parent = lineage[current];
        }
        return current;
    }


    /**
     * Group every child buRef by its lineage root, so BUs sharing a dev-source form one pipeline.
     * BUs are visited in `childBUReferences()` order (env order then assignment order), so each
     * root's array preserves that order and roots first appear in that order too.
     *
     * @returns {Map<string, string[]>} lineage-root buRef -> the child buRefs in that pipeline
     */
    function pipelinesByRoot() {
        const groups = new Map();
        for (const reference of childBUReferences()) {
            const root = pipelineRootOf(reference);
            if (!groups.has(root)) {
                groups.set(root, []);
            }
            groups.get(root).push(reference);
        }
        return groups;
    }


    /**
     * The single shared suffix validator consumed by BOTH the Suffixes step and the Market Variables
     * step (for per-field red error text AND their `canProceed` gates), so the two can never drift.
     * Returns a per-buRef list of error messages over `childBUReferences()` and the stored
     * `wizardState.suffixes`: an empty-body error and a duplicate-value error. The parent-BU
     * exemption is IMPLICIT — a parent BU is never in `childBUReferences()`, so no `_ParentBU_`
     * special-casing exists. The reason strings mirror `canProceedSuffixes` (lines ~48 & ~59) verbatim.
     *
     * @returns {Map<string, string[]>} buRef -> error messages (empty array / absent when clean)
     */
    function suffixFieldErrors() {
        const references = childBUReferences();
        const separator = state.wizardState.separator || '_';
        const errors = new Map();
        const push = (reference, message) => {
            if (!errors.has(reference)) {
                errors.set(reference, []);
            }
            errors.get(reference).push(message);
        };
        // Empty-body error: the stored value has no suffix beyond the bare separator.
        for (const reference of references) {
            const stored = suffixOf(reference);
            const body = stored.startsWith(separator) ? stored.slice(separator.length).trim() : stored.trim();
            if (!body) {
                push(reference, 'Enter a suffix for every BU. Missing: ' + reference + '.');
            }
        }
        // Duplicate error: two child BUs share the same stored suffix value (first seen owns it).
        // Empty-body suffixes are excluded — they already raise the empty-body error, and flagging
        // them as duplicates of each other would over-flag the same red field twice.
        const seen = new Map();
        for (const reference of references) {
            const value = suffixOf(reference);
            const body = value.startsWith(separator) ? value.slice(separator.length).trim() : value.trim();
            if (!body) {
                continue;
            }
            if (seen.has(value)) {
                const other = seen.get(value);
                const message =
                    'BU suffixes must be unique: "' +
                    value +
                    '" is used by both ' +
                    other +
                    ' and ' +
                    reference +
                    '.';
                push(other, message);
                push(reference, message);
            } else {
                seen.set(value, reference);
            }
        }
        return errors;
    }


    /**
     * Advance to the next visible wizard step. Blocked by the per-step `canProceed` gate, whose
     * reason surfaces in `#mpb-step-error` via `setText`.
     *
     * @returns {void}
     */
    function goNext() {
        const gate = canProceed(wizardStep);
        if (!gate.ok) {
            // Hard gate failed (e.g. an env has zero BUs) — genuinely cannot proceed, no confirm.
            showStepError(gate.reason);
            return;
        }
        clearStepError();
        // Soft gate: on bu-assign, if some BUs are still unassigned and the user hasn't confirmed
        // the current set, warn (confirm-to-proceed) instead of advancing. Leaving a BU unassigned
        // is legitimate, so this is a soft gate the user can skip via "Continue anyway".
        if (shouldConfirmUnassigned()) {
            showUnassignedConfirmBanner();
            return;
        }
        advanceWizardStep();
    }


    /**
     * Advance to the next visible wizard step. Split out of `goNext` so the soft-confirm "Continue
     * anyway" action reuses the exact same advance path after latching the confirmation. Clears the
     * unassigned-BUs banner so it cannot linger on the following step. Next from Rules sets
     * `wizardStep` to Download like any other advance; on Download, Next is hidden so this is a no-op.
     *
     * @returns {void}
     */
    function advanceWizardStep() {
        const steps = clampWizardStep();
        const ids = steps.map((step) => step.id);
        const index = ids.indexOf(wizardStep);
        global.mpbController.clearBanner('unassigned-bus');
        if (index !== -1 && index < ids.length - 1) {
            wizardStep = ids[index + 1];
            render();
        }
    }


    /**
     * Build a preview of the unassigned buRefs for the warning message: names joined with commas,
     * capped so a large pool stays readable (first few, then an ellipsis).
     *
     * @param {string[]} references the unassigned buRefs
     * @returns {string} a readable, capped name list
     */
    function unassignedNamesPreview(references) {
        const maxNames = 5;
        if (references.length <= maxNames) {
            return references.join(', ');
        }
        return references.slice(0, maxNames).join(', ') + ', \u{2026}';
    }


    /**
     * Show the soft confirmation for the `bu-assign` step: a keyed warning banner naming how many
     * (and which) BUs are unassigned, with a "Continue anyway" action that latches the confirmation
     * and advances, plus a dismiss action that just clears the prompt so the user can go assign them.
     * Uses the shared banner system so it is built with `makeElement`/`setText` (escaped, no raw
     * HTML) and matches the other in-app banners.
     *
     * @returns {void}
     */
    function showUnassignedConfirmBanner() {
        const references = unassignedBUReferences();
        const message =
            references.length +
            ' business unit(s) are not assigned to any environment (' +
            unassignedNamesPreview(references) +
            '). They will NOT be part of the pipeline. Continue anyway?';
        global.mpbController.showBanner(
            'unassigned-bus',
            message,
            [
                { label: 'Continue anyway', onClick: confirmUnassignedContinue },
                { label: 'Go back and assign', onClick: confirmUnassignedGoBack },
            ],
            'warning'
        );
    }


    /**
     * "Continue anyway" action of the unassigned-BUs confirm banner. Latches the confirmation for the
     * current set, then resumes the originally-requested navigation: a stashed stepper jump goes to
     * that exact target (now unblocked by the latch), otherwise a plain Next advances one step.
     * Clearing the stash first keeps `jumpToStep` re-entrant. Extracted as a named seam so it can be
     * exercised DOM-free (the banner buttons invoke it directly).
     *
     * @returns {void}
     */
    function confirmUnassignedContinue() {
        hasConfirmedUnassigned = true;
        const target = pendingJumpTarget;
        pendingJumpTarget = null;
        if (target) {
            jumpToStep(target);
        } else {
            advanceWizardStep();
        }
    }


    /**
     * "Go back and assign" action of the unassigned-BUs confirm banner. Dismiss only — the user stays
     * on bu-assign and Next remains usable — and drop any stashed jump target so a later Next/jump
     * re-evaluates from scratch. Extracted as a named seam so it can be exercised DOM-free.
     *
     * @returns {void}
     */
    function confirmUnassignedGoBack() {
        pendingJumpTarget = null;
        global.mpbController.clearBanner('unassigned-bus');
    }


    /**
     * Step back to the previous visible wizard step, or out to the mode choice from the first one.
     *
     * @returns {void}
     */
    function goBack() {
        const steps = clampWizardStep();
        const ids = steps.map((step) => step.id);
        const index = ids.indexOf(wizardStep);
        clearStepError();
        // Leaving the step (backwards) drops any lingering unassigned-BUs confirmation, plus any
        // stashed stepper-jump target (defense-in-depth: Back must never resume a forward jump).
        global.mpbController.clearBanner('unassigned-bus');
        pendingJumpTarget = null;
        if (index > 0) {
            wizardStep = ids[index - 1];
            render();
            return;
        }
        // Before the first wizard step → return to the mode choice.
        goToStep('mode');
    }


    /**
     * Keep the top (under-stepper) and bottom Back/Next pairs in lockstep labels. Hide both Next
     * buttons when `wizardStep === 'output'` (Download is the last crumb — Next would be a no-op).
     * Do not key on `index === last` (that would hide Next on Rules if Download were absent). Do
     * not disable Next when `canProceed` fails — `goNext` surfaces `#mpb-step-error` instead.
     *
     * @returns {void}
     */
    function syncWizardNav() {
        const backLabel = '\u{2190} Back';
        const nextLabel = 'Next \u{2192}';
        setText(dom.back, backLabel);
        setText(dom.backTop, backLabel);
        setText(dom.next, nextLabel);
        setText(dom.nextTop, nextLabel);
        const isHideNext = wizardStep === 'output';
        if (dom.next) {
            dom.next.hidden = isHideNext;
        }
        if (dom.nextTop) {
            dom.nextTop.hidden = isHideNext;
        }
    }


    /**
     * Test seam: inject the dual Back/Next buttons so `syncWizardNav` can be exercised under the
     * null-`querySelector` document stub (which never sees `#mpb-back-top` / `#mpb-next-top`).
     *
     * @param {(Element|null)} back `#mpb-back`
     * @param {(Element|null)} next `#mpb-next`
     * @param {(Element|null)} backTop `#mpb-back-top`
     * @param {(Element|null)} nextTop `#mpb-next-top`
     * @returns {void}
     */
    function setWizardNavDom(back, next, backTop, nextTop) {
        dom.back = back;
        dom.next = next;
        dom.backTop = backTop;
        dom.nextTop = nextTop;
    }


    /**
     * Classify each visible step relative to the active one for the stepper nav, reusing the SAME
     * `canProceed` gate that Back/Next enforce (no bespoke logic). For a step at index `i` with the
     * current step at index `c`:
     *   - `current` — `i === c`.
     *   - `done` — `i < c` AND `canProceed(step.id)` passes (a completed, satisfied earlier step).
     *   - `clickable` — a navigation target the user may jump to:
     *       • `i < c` → always (going back is always allowed, like the Back button);
     *       • `i > c` → only if every step from `c` up to (but excluding) `i` passes its gate, i.e.
     *         exactly as far forward as pressing Next repeatedly would reach;
     *       • `i === c` → never (the current step is not a navigation target).
     * When `softBlockForward` is set (the bu-assign unassigned-BUs soft gate holds), EVERY forward
     * step is made non-clickable so the affordance matches what `jumpToStep` will actually allow —
     * a forward jump there is blocked until the user confirms. Backward steps stay clickable.
     * Pure and DOM-free so it is unit-testable in isolation.
     *
     * @param {{id: string, title: string}[]} steps the visible steps, in order
     * @param {(string|null)} currentId the active step id
     * @param {(stepId: string) => {ok: boolean, reason: string}} gate the per-step gate (canProceed)
     * @param {boolean} [softBlockForward] true when the current step's soft gate blocks any forward jump
     * @returns {{current: boolean, done: boolean, clickable: boolean}[]} per-step state, aligned to `steps`
     */
    function computeStepperStates(steps, currentId, gate, softBlockForward) {
        const currentIndex = steps.findIndex((step) => step.id === currentId);
        // How far forward the gates currently allow: walk from the current step, stopping at the first
        // step whose gate fails. `forwardLimit` is the last index reachable by pressing Next.
        let forwardLimit = currentIndex;
        for (let index = currentIndex; index >= 0 && index < steps.length - 1; index++) {
            if (!gate(steps[index].id).ok) {
                break;
            }
            forwardLimit = index + 1;
        }
        return steps.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isBefore = currentIndex !== -1 && index < currentIndex;
            const isAfter = currentIndex !== -1 && index > currentIndex;
            const done = isBefore && gate(step.id).ok;
            // A forward step is reachable only within the gate limit AND not held back by the soft gate.
            const isForwardClickable = isAfter && index <= forwardLimit && !softBlockForward;
            const isClickable = isBefore || isForwardClickable;
            return { current: isCurrent, done: done, clickable: isClickable };
        });
    }


    /**
     * A stepper-jump target stashed while the `bu-assign` soft-confirm banner is up, so the banner's
     * "Continue anyway" action can resume navigation to the originally-clicked step (not just a
     * single-step advance). Null when no jump is pending confirmation.
     *
     * @type {(string|null)}
     */
    let pendingJumpTarget = null;


    /**
     * Whether a forward stepper jump would cross/leave the `bu-assign` step while its soft-confirm
     * gate still holds — i.e. the same "some BUs are still unassigned, confirm to proceed" gate that
     * `goNext` enforces but `canProceed` does not. Used both to block the jump in `jumpToStep` and to
     * hide the clickable affordance in `computeStepperStates`, so the two navigation paths stay in
     * lock-step. Backward jumps are never blocked. Pure + DOM-free (drives off `shouldConfirmUnassigned`).
     *
     * @param {(string|null)} currentId the active step id
     * @param {string} targetId the step the user wants to jump to
     * @returns {boolean} true when the forward jump must first be confirmed on bu-assign
     */
    function isForwardJumpSoftBlocked(currentId, targetId) {
        if (currentId !== 'bu-assign' || !shouldConfirmUnassigned()) {
            return false;
        }
        const ids = clampWizardStep().map((step) => step.id);
        const fromIndex = ids.indexOf(currentId);
        const toIndex = ids.indexOf(targetId);
        // Only forward jumps away from bu-assign are gated; backward (or same/unknown) never are.
        return fromIndex !== -1 && toIndex > fromIndex;
    }


    /**
     * Navigate to a visible wizard step from a stepper click. Going backward is always allowed;
     * going forward re-runs the same `canProceed` gate Next enforces for every step between the
     * current one and the target, surfacing the first blocking reason and refusing to jump if any
     * gate fails (belt-and-suspenders — unreachable steps are not rendered clickable). Leaving
     * `bu-assign` forward also honours the SAME soft "unassigned BUs" confirmation `goNext` enforces:
     * the jump is stashed and the confirm banner shown instead of navigating; the banner's "Continue
     * anyway" action resumes the stashed jump. On success it sets `wizardStep` and re-renders via the
     * shared render path (which also syncs the hash).
     *
     * @param {string} targetId the step id to jump to
     * @returns {void}
     */
    function jumpToStep(targetId) {
        const steps = clampWizardStep();
        const ids = steps.map((step) => step.id);
        const fromIndex = ids.indexOf(wizardStep);
        const toIndex = ids.indexOf(targetId);
        if (toIndex === -1 || toIndex === fromIndex) {
            return;
        }
        clearStepError();
        // Forward jumps must clear every intermediate gate, exactly like pressing Next repeatedly.
        if (toIndex > fromIndex) {
            for (let index = fromIndex; index < toIndex; index++) {
                const result = canProceed(ids[index]);
                if (!result.ok) {
                    showStepError(result.reason);
                    return;
                }
            }
            // Soft gate parity with goNext: a forward jump off bu-assign with unassigned BUs must
            // confirm first. Stash the target so "Continue anyway" resumes THIS jump, not just a
            // one-step advance.
            if (isForwardJumpSoftBlocked(wizardStep, targetId)) {
                pendingJumpTarget = targetId;
                showUnassignedConfirmBanner();
                return;
            }
        }
        global.mpbController.clearBanner('unassigned-bus');
        wizardStep = targetId;
        render();
    }


    /**
     * Render the stepper progress nav (`#mpb-stepper`) as an ordered list of the visible steps:
     * the current step is highlighted (`is-current` + `aria-current="step"`), completed earlier
     * steps are colour-coded (`is-done`), and reachable steps are clickable navigation targets wired
     * through the same gating as Back/Next (`jumpToStep`). Text/nodes only — no `innerHTML`.
     *
     * @param {{id: string, title: string}[]} steps the visible steps
     * @returns {void}
     */
    function renderStepper(steps) {
        if (!dom.stepper) {
            return;
        }
        setText(dom.stepper, '');
        // Mirror the jumpToStep soft gate: while bu-assign's unassigned-BUs confirmation is pending,
        // no forward step is actually reachable, so none should render clickable.
        const states = computeStepperStates(
            steps,
            wizardStep,
            canProceed,
            wizardStep === 'bu-assign' && shouldConfirmUnassigned()
        );
        const list = makeElement('ol', { class: 'mpb-stepper-list' });
        for (const [index, step] of steps.entries()) {
            list.append(stepperItem(step, index, states[index]));
        }
        dom.stepper.append(list);
    }


    /**
     * Build one stepper list item. A clickable (reachable) step renders as a real `<button>` with
     * Enter/Space activation via native button semantics; a non-clickable step renders as inert text
     * with `aria-disabled="true"` and no focus/pointer affordance. The current step is marked
     * `aria-current="step"` and is never a navigation target.
     *
     * @param {{id: string, title: string}} step the step
     * @param {number} index the step's zero-based position
     * @param {{current: boolean, done: boolean, clickable: boolean}} stepState the classified state
     * @returns {HTMLElement} the list item element
     */
    function stepperItem(step, index, stepState) {
        const classes = ['mpb-stepper-item'];
        if (stepState.current) {
            classes.push('is-current');
        }
        if (stepState.done) {
            classes.push('is-done');
        }
        if (stepState.clickable) {
            classes.push('is-clickable');
        }
        const item = makeElement('li', {
            class: classes.join(' '),
            attrs: stepState.current ? { 'aria-current': 'step' } : {},
        });
        const indexSpan = makeElement('span', { class: 'mpb-stepper-index', text: String(index + 1) });
        const titleSpan = makeElement('span', { class: 'mpb-stepper-title', text: step.title });
        if (stepState.clickable) {
            // A real <button> gives free Enter/Space activation, focusability and role semantics.
            const button = makeElement('button', {
                class: 'mpb-stepper-btn',
                type: 'button',
            });
            button.append(indexSpan, titleSpan);
            button.addEventListener('click', () => jumpToStep(step.id));
            item.append(button);
        } else {
            // Non-clickable steps (current, or gated-off future steps) are inert, unfocusable text.
            item.setAttribute('aria-disabled', 'true');
            item.append(indexSpan, titleSpan);
        }
        return item;
    }


    /**
     * Shared column layout used by the `bu-assign`, `suffixes`, and `prod-confirm` steps so they all
     * present the same horizontal environment-columns visual as the lineage step: a flex row of
     * one column per environment (in env order), each column titled with the environment name and
     * listing that environment's assigned BUs as nodes. The caller supplies `perNode`, which builds
     * the per-node control (the slot lineage fills with its "deploys from" `<select>`); it may return
     * `null` to leave the node control-less. Returns the board element so the caller can also mount
     * content above it (e.g. an unassigned strip or a separator control).
     *
     * @param {{perNode: (environment: string, reference: string, environmentIndex: number) => (Node|null)}} options
     *   `perNode` builds the control appended into each BU node
     * @returns {HTMLElement} the `.mpb-env-board` element (a titled column per environment)
     */
    function renderEnvironmentColumns(options) {
        const board = makeElement('div', { class: 'mpb-env-board' });
        const order = environmentNames();
        // In validations-only mode the single environment is the synthetic pool (VALIDATIONS_POOL_ENV,
        // "All BUs"); showing that as a column title would leak the internal container name, so the
        // title is suppressed there (the step still lists every pooled BU as a node).
        const shouldShowTitles = state.mode !== 'validations';
        for (const [environmentIndex, environment] of order.entries()) {
            const column = makeElement('div', { class: 'mpb-env-col' });
            if (shouldShowTitles) {
                column.append(
                    makeElement('p', {
                        class: 'mpb-env-col-title',
                        text: environment || '(unnamed environment)',
                    })
                );
            }
            for (const reference of assignedBUReferences(environment)) {
                const node = makeElement('div', {
                    class: 'mpb-env-node',
                    attrs: { 'data-bu': reference },
                });
                node.append(makeElement('span', { class: 'mpb-env-node-name', text: reference }));
                const control = options.perNode(environment, reference, environmentIndex);
                if (control) {
                    node.append(control);
                }
                column.append(node);
            }
            board.append(column);
        }
        return board;
    }


    // ─────────────────────────── suffixes step ───────────────────────────

    /**
     * A lightweight slug (letters/digits only, collapsed to underscores) used to seed default
     * suffix bodies from an environment name. Mirrors the config builder's `slug` so seeded
     * defaults match what the builder would otherwise fall back to.
     *
     * @param {string} value the raw value (usually an environment name)
     * @returns {string} the slugged value
     */
    function suffixSlug(value) {
        return String(value)
            .trim()
            .replaceAll(/[^a-zA-Z0-9]+/g, '_')
            .replaceAll(/^_+|_+$/g, '');
    }


    /**
     * Seed default suffixes for any child buRef that has none yet, and prune suffixes for buRefs
     * that are no longer assigned. A single-BU env seeds `<sep><envSlug>`; a multi-BU env
     * auto-numbers each BU as `<sep><envSlug><n>` (1, 2, …) which the user can override. The stored
     * value always includes the leading separator (the config builder consumes it verbatim).
     *
     * @returns {void}
     */
    function seedSuffixes() {
        const separator = state.wizardState.separator || '_';
        const suffixes = { ...state.wizardState.suffixes };
        const assigned = new Set(childBUReferences());
        // Prune suffixes whose buRef is no longer assigned to any environment.
        for (const reference of Object.keys(suffixes)) {
            if (!assigned.has(reference)) {
                delete suffixes[reference];
            }
        }
        // Seed a default suffix for each assigned child buRef that has none yet.
        for (const environment of environmentNames()) {
            seedEnvironmentSuffixes(environment, suffixes, separator);
        }
        state.wizardState.suffixes = suffixes;
    }


    /**
     * Seed default suffixes for one environment's BUs, in place. A single-BU env seeds
     * `<sep><envSlug>`; a multi-BU env auto-numbers each BU as `<sep><envSlug><n>`. Only buRefs
     * without an existing suffix are touched.
     *
     * @param {string} environment the environment name
     * @param {{[buRef: string]: string}} suffixes the suffix map to seed into (mutated)
     * @param {string} separator the leading separator
     * @returns {void}
     */
    function seedEnvironmentSuffixes(environment, suffixes, separator) {
        const references = assignedBUReferences(environment);
        // In validations-only mode the environment is a synthetic pool ("All BUs") with no real
        // pipeline meaning, so the default suffix is derived from each BU's own name instead of the
        // env name (which would otherwise produce nonsensical `All_BUs1`, `All_BUs2`, … defaults).
        const isValidationsOnly = state.mode === 'validations';
        const isMulti = references.length > 1;
        for (const [index, reference] of references.entries()) {
            const existing = suffixes[reference];
            if (typeof existing !== 'string' || existing === '') {
                const body = isValidationsOnly
                    ? suffixSlug(bareBUName(reference))
                    : suffixSlug(environment) + (isMulti ? String(index + 1) : '');
                suffixes[reference] = separator + body;
            }
        }
    }


    // ─────────────────────────── render dispatcher ───────────────────────────

    /**
     * Show exactly one top-level step section and hide the others. Download lives inside the wizard
     * shell (`#mpb-step-output`), so it is not a top-level section here.
     *
     * @param {string} step the step id to show
     * @returns {void}
     */
    function showOnly(step) {
        const sections = [
            ['intake', dom.stepIntake],
            ['mode', dom.stepMode],
            ['wizard', dom.wizard],
        ];
        for (const [name, element] of sections) {
            if (element) {
                element.hidden = name !== step;
            }
        }
    }


    /**
     * Whether the tool is in "builder mode" — i.e. the user has left the intake landing. Builder
     * mode drives the full-width layout (nav/intro hidden) and reveals the sticky builder sub-header.
     *
     * @returns {boolean} true for every step except intake
     */
    function isBuilderMode() {
        return state.step !== 'intake';
    }


    /**
     * Toggle the `mpb-builder-mode` class on the root element so the builder-mode SCSS (full-width
     * layout, hidden nav/intro, revealed sticky header) applies, and (re)mount the header into the
     * scroll container. No-ops safely under the headless document stub, where `documentElement` is
     * undefined.
     *
     * @returns {void}
     */
    function syncBuilderModeClass() {
        const root = document_ && document_.documentElement;
        if (root && root.classList) {
            root.classList.toggle('mpb-builder-mode', isBuilderMode());
        }
        syncBuilderHeaderMount();
    }


    /**
     * Move the sticky builder sub-header so `position:sticky` can pin it. In builder mode it must be
     * the FIRST CHILD of the tall `.layout-content` scroll container; on intake it is parked back
     * under its authored home (`#mpb-app`). The persistent Diagramforce fallback is a header child,
     * so the same hoist/park path keeps it on screen. Idempotent — skips the move when the header
     * is already in the right place — and a no-op when the header/containers are absent (headless
     * stub).
     *
     * @returns {void}
     */
    function syncBuilderHeaderMount() {
        const header = dom.builderHeader;
        if (!header) {
            return;
        }
        if (isBuilderMode()) {
            const container = dom.layoutContent;
            // Only hoist when there is a container and the header is not already its first child
            // (idempotent — prevents needless DOM churn on every navigation/render).
            if (container && container.firstChild !== header) {
                container.prepend(header);
            }
        } else if (dom.builderHeaderHome && header.parentNode !== dom.builderHeaderHome) {
            // Back on intake: return the header to its authored home so the DOM matches the markup.
            dom.builderHeaderHome.prepend(header);
        }
    }


    /**
     * Test seam: inject the header + its containers so the mount logic can be exercised headlessly
     * (the null-`querySelector` stub never populates these in `cacheDom`).
     *
     * @param {(Node|null)} header the `#mpb-builder-header` element
     * @param {(Node|null)} layoutContent the `.layout-content` scroll container
     * @param {(Node|null)} home the authored home parent (`#mpb-app`)
     * @returns {void}
     */
    function setBuilderHeaderDom(header, layoutContent, home) {
        dom.builderHeader = header;
        dom.layoutContent = layoutContent;
        dom.builderHeaderHome = home;
    }


    /**
     * Advance to a step and re-render.
     *
     * @param {string} step the target step id
     * @returns {void}
     */
    function goToStep(step) {
        state.step = step;
        // Reflect builder-mode (full-width layout + sticky header mount) before the render paints.
        syncBuilderModeClass();
        render();
    }


    // ─────────────────────────── hash deep-linking / reload-restore ───────────────────────────

    /**
     * The last hash string the tool itself wrote to `location.hash`. Used by `onHashChange` to
     * distinguish our own `history.replaceState` writes (which must be ignored) from a genuine user
     * edit / back-forward navigation (which must trigger a restore). Starts null so the very first
     * hashchange after load — if any — is still honoured.
     *
     * @type {(string|null)}
     */
    let lastHashWritten = null;


    /**
     * The top-level views that carry an active session id in the hash. Intake has no session yet, so
     * it never gets an `&s=` segment. Download is a wizard sub-step, not its own view.
     *
     * @type {ReadonlySet<string>}
     */
    const HASH_SESSION_VIEWS = new Set(['mode', 'wizard']);


    /**
     * The top-level views the tool recognises in a hash. Anything else (including the unpublished
     * `#view=output` alias) parses to the intake default.
     *
     * @type {ReadonlySet<string>}
     */
    const HASH_KNOWN_VIEWS = new Set(['intake', 'mode', 'wizard']);


    /**
     * Parse a `location.hash` string into a plain `{view, step, sessionId}` descriptor. The tool owns
     * this compact format: `#view=<intake|mode|wizard>`, plus `&step=<wizardStepId>` for the wizard
     * view (including Download as `step=output`) and `&s=<sessionId>` when a saved session is open.
     * Unknown params are ignored and a malformed / empty / unknown-view hash yields the intake
     * default so callers never have to guard against throws. There is no `#view=output` alias.
     *
     * @param {string} hash the raw hash (with or without the leading `#`)
     * @returns {{view: string, step: (string|null), sessionId: (string|null)}} the parsed descriptor
     */
    function parseHash(hash) {
        const result = { view: 'intake', step: null, sessionId: null };
        if (typeof hash !== 'string') {
            return result;
        }
        // Strip a single leading '#', then read the `key=value` pairs. URLSearchParams handles the
        // decoding and tolerates duplicate/empty/extra params without throwing.
        const raw = hash.charAt(0) === '#' ? hash.slice(1) : hash;
        if (raw === '') {
            return result;
        }
        let parameters;
        try {
            parameters = new global.URLSearchParams(raw);
        } catch {
            return result;
        }
        const view = parameters.get('view');
        if (view && HASH_KNOWN_VIEWS.has(view)) {
            result.view = view;
        }
        const step = parameters.get('step');
        if (step) {
            result.step = step;
        }
        const sessionId = parameters.get('s');
        if (sessionId) {
            result.sessionId = sessionId;
        }
        return result;
    }


    /**
     * Build the canonical hash string for the current UI location from the source-of-truth state
     * (`state.step` / `wizardStep` / `persistence.currentId`). Intake collapses to `#view=intake`
     * with no session; the wizard adds the active sub-step (Download is `step=output`); mode/wizard
     * add the open session id when one is set. This is the inverse of `parseHash` for the meaningful
     * fields. `state.step` stays `'wizard'` on the download page — never `'output'`.
     *
     * @returns {string} the hash string, always starting with `#`
     */
    function hashFromLocation() {
        const view = state.step || 'intake';
        const parts = ['view=' + view];
        if (view === 'wizard' && wizardStep) {
            parts.push('step=' + global.encodeURIComponent(wizardStep));
        }
        if (HASH_SESSION_VIEWS.has(view) && global.mpbController.persistence.currentId) {
            parts.push('s=' + global.encodeURIComponent(global.mpbController.persistence.currentId));
        }
        return '#' + parts.join('&');
    }


    /**
     * Mirror the current state into `location.hash` so a reload / share reproduces this exact step.
     * Called at the end of every `render()`, which also fires on input events — so it must be cheap
     * and idempotent: it only writes when the computed hash differs from what's already there, and it
     * uses `history.replaceState` so repeated renders never spam the history stack. The written value
     * is remembered in `lastHashWritten` so the `hashchange` listener can ignore our own writes.
     *
     * @returns {void}
     */
    function syncHashToState() {
        if (!global.location || !global.history) {
            return;
        }
        const next = hashFromLocation();
        // Only write when something actually changed — avoids redundant hashchange events / loops.
        if (global.location.hash === next) {
            lastHashWritten = next;
            return;
        }
        lastHashWritten = next;
        try {
            // replaceState keeps the address bar in sync without pushing a history entry per render.
            global.history.replaceState(null, '', next);
        } catch {
            // Fall back to a direct assignment if replaceState is unavailable (older/edge hosts).
            global.location.hash = next;
        }
    }


    /**
     * Drive the UI from a parsed hash descriptor. Shared by the on-load restore and the `hashchange`
     * listener. Resolution order:
     *   1. A session id present in the hash and existing in storage → reopen it, then honour the
     *      requested view/step (overriding reopenSave's default `mode` landing).
     *   2. A session id present but NOT in this browser (cross-device share) → land on intake with a
     *      keyed `deeplink` banner; never crash or invent data.
     *   3. No session id (or `view === 'intake'`) → land on intake, exactly as the default boot.
     * A `wizard` view clamps to a valid sub-step for the restored session rather than erroring.
     *
     * @param {{view: string, step: (string|null), sessionId: (string|null)}} parsed the descriptor
     * @returns {void}
     */
    function applyHashDescriptor(parsed) {
        // No session referenced, or an explicit intake link → behave exactly like the default boot.
        if (!parsed.sessionId || parsed.view === 'intake') {
            goToStep('intake');
            return;
        }
        // The hash names a session that isn't in this browser (e.g. a link shared from another device).
        // Don't crash and don't fabricate data — land on intake with a small, keyed explanation.
        if (!global.mpbController.readSaveBlob(parsed.sessionId)) {
            goToStep('intake');
            global.mpbController.showBanner(
                'deeplink',
                'This shared link points at a saved session that isn\u{2019}t stored in this browser. ' +
                    'Import the matching .mcdevrc.json to continue.',
                [],
                'warning'
            );
            return;
        }
        // The session exists locally: load it (this sets persistence.currentId + config + wizardState),
        // then override reopenSave's default `mode` landing with the view/step the hash asked for.
        global.mpbController.clearBanner('deeplink');
        // reopenSave loads config + wizardState, acquires the lock, and restores the persisted mode
        // (Fix 1): a save made in wizard mode lands back on the wizard, older mode-less saves on the
        // `mode` picker. A deep link to `wizard` needs a mode to compute the visible sub-steps, so
        // the branch below only overrides the landing when a mode was restored.
        global.mpbController.reopenSave(parsed.sessionId);
        if (parsed.view === 'wizard' && state.mode) {
            // Set the requested sub-step, then clamp it to the restored session's visible steps so a
            // step that no longer applies (e.g. lineage skipped) falls back to the nearest valid one.
            wizardStep = parsed.step;
            clampWizardStep();
            goToStep('wizard');
            return;
        }
        // view === 'mode', or a deeper view without a resolved mode → reopenSave already landed on mode.
    }


    /**
     * On-load restore entry point, called from `init()` before the default `goToStep('intake')`.
     * Returns whether it handled navigation, so the caller can fall through to the intake default when
     * there is nothing to restore. Never throws — a malformed hash parses to the intake default.
     *
     * We rely solely on the hash for reload-restore (no separate persisted "last active" pointer):
     * since `syncHashToState()` writes the hash on every navigation, a plain reload always carries the
     * step in the URL, making an extra pointer redundant. See the report / code comments for the call.
     *
     * @returns {boolean} true when a session/deep-link was restored, false to use the intake default
     */
    function restoreFromHash() {
        if (!global.location) {
            return false;
        }
        const parsed = parseHash(global.location.hash);
        if (!parsed.sessionId || parsed.view === 'intake') {
            return false;
        }
        applyHashDescriptor(parsed);
        return true;
    }


    /**
     * `hashchange` handler: re-runs the restore logic so pasting a new `#view=…` into the address bar
     * (or using back/forward) navigates there. Ignores the hash values the tool itself just wrote via
     * `syncHashToState` to avoid a write→hashchange→write feedback loop.
     *
     * @returns {void}
     */
    function onHashChange() {
        if (!global.location) {
            return;
        }
        const current = global.location.hash || '';
        // Ignore our own replaceState writes — only genuine user/back-forward edits should navigate.
        if (current === lastHashWritten) {
            return;
        }
        lastHashWritten = current;
        applyHashDescriptor(parseHash(current));
    }


    // ─────────────────────────── Chunk 2c: output step ───────────────────────────

    /**
     * Bare BU name for a stored buRef. Refs are `<cred>/<BU>` when the source config had more than
     * one credential, else a bare `<BU>`; the validations builder keys its maps by bare name, so we
     * strip any credential prefix here.
     *
     * @param {string} reference a stored buRef
     * @returns {string} the bare BU name
     */
    function bareBUName(reference) {
        const slash = String(reference).indexOf('/');
        return slash === -1 ? String(reference) : String(reference).slice(slash + 1);
    }

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
     * Re-check that the wizard is complete for the current mode before revealing the downloads. Runs
     * every visible step's `canProceed` gate and collects the blocking reasons, so an incomplete
     * pipeline is named precisely rather than silently emitting a broken file.
     *
     * @returns {string[]} the blocking reasons (empty when the wizard is complete)
     */
    function outputBlockers() {
        const reasons = [];
        for (const step of visibleSteps()) {
            if (step.id === 'output') {
                continue;
            }
            const result = canProceed(step.id);
            if (!result.ok) {
                reasons.push(step.title + ': ' + result.reason);
            }
        }
        return reasons;
    }


    /**
     * Trigger a client-side file download of a text blob. Creates a transient object URL + anchor,
     * clicks it, then revokes the URL. No network, no server round-trip.
     *
     * @param {string} filename the download file name
     * @param {string} text the file contents
     * @param {string} mimeType the blob MIME type
     * @returns {void}
     */
    function downloadText(filename, text, mimeType) {
        const blob = new global.Blob([text], { type: mimeType });
        const url = global.URL.createObjectURL(blob);
        const anchor = makeElement('a', { href: url, download: filename });
        document_.body.append(anchor);
        anchor.click();
        anchor.remove();
        global.URL.revokeObjectURL(url);
    }


    /**
     * Copy text using a transient off-screen textarea + `execCommand('copy')`. Used when the async
     * Clipboard API is unavailable or rejects (e.g. an insecure context).
     *
     * @param {string} text the text to copy
     * @returns {boolean} true when the copy command reported success
     */
    function copyViaTextarea(text) {
        const textarea = makeElement('textarea', { value: text });
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document_.body.append(textarea);
        textarea.select();
        let isOk;
        try {
            isOk = document_.execCommand('copy');
        } catch {
            isOk = false;
        }
        textarea.remove();
        return isOk;
    }


    /**
     * Copy text to the clipboard, preferring the async Clipboard API and falling back to an off-screen
     * textarea. Reports success/failure in a DOM note (never the console).
     *
     * @param {string} text the text to copy
     * @param {(Element|null)} note the element to write the success/failure message into
     * @returns {Promise<void>} resolves once the note has been updated
     */
    async function copyToClipboard(text, note) {
        const clipboard = global.navigator && global.navigator.clipboard;
        if (clipboard && typeof clipboard.writeText === 'function') {
            try {
                await clipboard.writeText(text);
                flashCopyNote(note, 'Copied to clipboard.', true);
                return;
            } catch {
                // fall through to the textarea fallback below
            }
        }
        const isOk = copyViaTextarea(text);
        flashCopyNote(
            note,
            isOk ? 'Copied to clipboard.' : 'Copy failed — select the text below and copy manually.',
            isOk
        );
    }


    /**
     * Show a transient copy-status message in the note as a toast: fill the text, force the toast
     * visible (even if a prior message is still fading), then auto-hide after a short delay so the
     * user always gets fresh visible confirmation on every COPY click. Failures stay visible longer.
     *
     * @param {(Element|null)} note the copy-status note element
     * @param {string} message the message to show
     * @param {boolean} isOk whether the copy succeeded (styles + hide delay differ for failures)
     * @returns {void}
     */
    function flashCopyNote(note, message, isOk) {
        if (!note) {
            return;
        }
        setText(note, message);
        note.classList.remove('mpb-copy-note--error');
        if (!isOk) {
            note.classList.add('mpb-copy-note--error');
        }
        // Restart the reveal animation even on a rapid second click: drop the class, force a reflow,
        // then re-add it so the toast re-appears and re-runs its fade rather than staying stale.
        note.classList.remove('mpb-copy-note--show');
        void note.offsetWidth;
        note.classList.add('mpb-copy-note--show');
        if (note._mpbCopyTimer) {
            global.clearTimeout(note._mpbCopyTimer);
        }
        note._mpbCopyTimer = global.setTimeout(
            () => {
                note.classList.remove('mpb-copy-note--show');
            },
            isOk ? 2400 : 6000
        );
    }


    /**
     * Fill a readonly textarea fallback with generated output and make it select-all on focus so the
     * user can copy it even if the Clipboard API is blocked.
     *
     * @param {(HTMLTextAreaElement|null)} textarea the fallback textarea
     * @param {string} text the generated output
     * @returns {void}
     */
    function fillFallback(textarea, text) {
        if (!textarea) {
            return;
        }
        textarea.value = text;
        textarea.onfocus = () => {
            textarea.select();
        };
    }


    /**
     * Find (or create) the single copy-status note element for an output card. Created via
     * `makeElement` (no `innerHTML`); marked `aria-live` so assistive tech announces the result.
     *
     * @param {(Element|null)} card the output card
     * @returns {(Element|null)} the note element
     */
    function ensureCopyNote(card) {
        if (!card) {
            return null;
        }
        let note = card.querySelector('.mpb-copy-note');
        if (!note) {
            note = makeElement('p', { class: 'mpb-copy-note', attrs: { 'aria-live': 'polite' } });
            card.append(note);
        }
        return note;
    }


    // ─────────────────────────── Chunk 3c: Diagramforce preview + handoff ───────────────────────────

    /**
     * Diagramforce integration constants. The handoff uses the documented `postMessage` flow from
     * `how-to-use/web-integration.md`. The diagram JSON itself (and its geometry/appVersion) is built
     * by the pure `mcdev-pipeline-diagramforce.js` module; core only gathers the state-derived model.
     */
    const DIAGRAMFORCE_ORIGIN = 'https://diagramforce.com';

    const DIAGRAMFORCE_IMPORT_URL = DIAGRAMFORCE_ORIGIN + '/#import=postmessage';


    // Position-locked environment bands (not by env name). First is a dedicated source-env green;
    // middle and last match `_sass/_variables.scss` color-purple and the Marketing / lineage accent.
    // Kept in core (shared with the draw.io export path); the Diagramforce module receives the
    // resolved band per column on its model.
    const DIAGRAM_BAND = {
        first: { fill: '#27ae60', stroke: '#1e8449' },
        middle: { fill: '#7C3AED', stroke: '#6D28D9' },
        last: { fill: '#F49825', stroke: '#C2410C' },
    };


    /**
     * Band colours for an environment column by position: first → A, last → C, everything
     * between → B. A single column is first (A). Two columns are A then C (no middle).
     *
     * @param {number} columnIndex 0-based environment index
     * @param {number} columnCount number of environments
     * @returns {{fill: string, stroke: string}} the band colours
     */
    function diagramBand(columnIndex, columnCount) {
        if (columnIndex <= 0) {
            return DIAGRAM_BAND.first;
        }
        if (columnIndex >= columnCount - 1) {
            return DIAGRAM_BAND.last;
        }
        return DIAGRAM_BAND.middle;
    }


    /**
     * Gather the pre-resolved Diagramforce model from the current wizard state: one column per
     * environment (in `envOrder`) carrying its assigned buRefs, their display labels, their
     * parent-BU flags, and the position-locked band, plus the child→parent lineage map, the diagram
     * title, and a capture timestamp. Everything the pure `buildDiagramJSON(model)` reads is resolved
     * here so that function stays a deterministic function of its input (no state / no `Date.now()`).
     *
     * @returns {import('./mcdev-pipeline-diagramforce.js').DiagramforceModel} the resolved model
     */
    function buildDiagramforceModel() {
        const environments = environmentNames();
        const lineage = state.wizardState.lineage || {};
        const columnCount = environments.length;
        const columns = environments.map((environment, columnIndex) => {
            const references = assignedBUReferences(environment);
            return {
                env: environment,
                references: references,
                labels: references.map((reference) => buDisplayLabel(reference)),
                parentFlags: references.map((reference) => bareBUName(reference) === '_ParentBU_'),
                band: diagramBand(columnIndex, columnCount),
            };
        });
        return {
            columns: columns,
            lineage: lineage,
            title: diagramTitle(),
            timestamp: Date.now(),
        };
    }


    /**
     * Build the full Diagramforce diagram JSON for the current pipeline by gathering the resolved
     * model (`buildDiagramforceModel`) and delegating to the pure `mcdev-pipeline-diagramforce.js`
     * module. Thin state-reading wrapper so callers (and the geometry regression tests) keep the
     * no-argument `buildDiagramJSON()` entry point while the diagram maths lives in the module.
     *
     * @returns {object} the diagram JSON envelope (empty envelope if the module failed to load)
     */
    function buildDiagramJSON() {
        const model = buildDiagramforceModel();
        if (!global.mpbDiagramforce) {
            return { version: 1, timestamp: model.timestamp, title: model.title, diagramType: 'process', graph: { cells: [] } };
        }
        return global.mpbDiagramforce.buildDiagramJSON(model);
    }


    /**
     * The BU label shown on a task: the bare BU name, prefixed with its credential when the config
     * had more than one credential (matching how buRefs are stored elsewhere).
     *
     * @param {string} reference a stored buRef
     * @returns {string} the display label
     */
    function buDisplayLabel(reference) {
        const bare = bareBUName(reference);
        const credentialName = state.wizardState.multiCred ? credentialOf(reference) : null;
        return credentialName ? credentialName + ' / ' + bare : bare;
    }


    /**
     * A human title for the diagram, derived from the first credential name (falling back to a
     * generic label). Used as the Diagramforce tab title.
     *
     * @returns {string} the diagram title
     */
    function diagramTitle() {
        const credentials = (state.config && state.config.credentials) || {};
        const firstCredential = Object.keys(credentials)[0];
        return (firstCredential ? firstCredential + ' — ' : '') + 'mcdev deploy pipeline';
    }


    /**
     * Open the diagram in Diagramforce in a new tab via the documented `postMessage` handoff: open
     * the import URL synchronously inside the click, then send the diagram JSON once Diagramforce
     * posts its `ready` ping. Must run without `noopener` so the window handle survives.
     *
     * @param {string} json the diagram JSON string to hand over
     * @returns {boolean} false when the pop-up was blocked (caller reveals the fallback)
     */
    function openInDiagramforce(json) {
        const popup = global.open(DIAGRAMFORCE_IMPORT_URL, '_blank');
        if (!popup) {
            return false;
        }
        // Send the diagram only after Diagramforce announces it is listening (avoids a race).
        const onMessage = (event) => {
            if (event.origin !== DIAGRAMFORCE_ORIGIN) {
                return;
            }
            const message = event.data;
            if (!message || message.source !== 'diagramforce' || message.type !== 'ready') {
                return;
            }
            popup.postMessage(
                { source: 'diagramforce', type: 'import', v: 1, json: json },
                DIAGRAMFORCE_ORIGIN
            );
            global.removeEventListener('message', onMessage);
        };
        global.addEventListener('message', onMessage);
        return true;
    }


    /**
     * Reveal the always-available fallback: the diagram JSON in a readonly, select-all textarea plus
     * a copy button, for pasting into Diagramforce's Load & Import → Paste when pop-ups are blocked.
     *
     * @param {string} json the diagram JSON string
     * @returns {void}
     */
    function revealDiagramFallback(json) {
        if (dom.diagramJson) {
            fillFallback(dom.diagramJson, json);
        }
        if (dom.diagramFallback) {
            dom.diagramFallback.hidden = false;
        }
    }


    /**
     * Whether the current wizard state can draw a deploy diagram. Gate is drawable, not
     * wizard-complete: full-pipeline mode, at least two environments, at least one BU per
     * environment, and lineage either skippable (`everyEnvironmentHasOneBU`) or
     * `canProceed('lineage')`. Does not require prod-confirm or rules. Validations-only is a
     * hard hide (the synthetic `All BUs` pool must never become a diagram column).
     * `everyEnvironmentHasOneBU()` alone is not sufficient — it is true when `envOrder` is empty.
     *
     * @returns {boolean} true when Diagramforce should be offered
     */
    function isDiagramDrawable() {
        if (state.mode === 'validations') {
            return false;
        }
        const environments = environmentNames();
        if (environments.length < 2) {
            return false;
        }
        const missingAssignment = environments.some(
            (environment) => assignedBUReferences(environment).length === 0
        );
        if (missingAssignment) {
            return false;
        }
        return everyEnvironmentHasOneBU() || canProceed('lineage').ok;
    }


    /**
     * Alias of `isDiagramDrawable()`. A former `isComplete` argument is ignored if passed — the
     * offer gate is drawable, not wizard-complete. Kept so existing `mpbController` callers resolve.
     *
     * @returns {boolean} true when the diagram should be offered
     */
    function isDiagramOffered() {
        return isDiagramDrawable();
    }


    /**
     * Open Diagramforce with a freshly built pipeline JSON, or reveal the persistent header
     * fallback when the pop-up is blocked. When `trigger` is the output CTA, also reveal the
     * in-section `#mpb-diagram-fallback`. Never calls `buildDiagramJSON` in validations-only mode.
     *
     * @param {(Element|null)} [trigger] the control that requested the open
     * @returns {void}
     */
    function openDiagramOrFallback(trigger) {
        if (state.mode === 'validations' || !isDiagramDrawable()) {
            return;
        }
        const json = jsonPretty(buildDiagramJSON());
        const opened = openInDiagramforce(json);
        if (opened) {
            return;
        }
        revealHeaderDiagramFallback(json);
        if (trigger && trigger === dom.openDiagramforce) {
            revealDiagramFallback(json);
        }
    }


    /**
     * Reveal the persistent header fallback host (textarea + copy) used by lineage and the
     * header Download menu when a pop-up is blocked. Stays visible in builder mode.
     *
     * @param {string} json the diagram JSON string
     * @returns {void}
     */
    function revealHeaderDiagramFallback(json) {
        if (dom.diagramJsonHeader) {
            fillFallback(dom.diagramJsonHeader, json);
        }
        if (dom.diagramFallbackHeader) {
            dom.diagramFallbackHeader.hidden = false;
        }
    }


    // ─────────────────────────── sticky builder sub-header hydration ───────────────────────────

    /**
     * Whether the `.mcdevrc.json` config download is available. Only offered in full mode with a
     * complete pipeline — mirrors the output step's config-card guard exactly.
     *
     * @param {string} mode the active generation mode (`'full'` | `'validations'`)
     * @param {string[]} blockers the unfinished-step reasons from `outputBlockers()`
     * @returns {boolean} true when the `.mcdevrc.json` may be downloaded
     */
    function isConfigDownloadAvailable(mode, blockers) {
        return mode !== 'validations' && blockers.length === 0;
    }


    /**
     * The display name of the config currently being edited: the active save's stored name, falling
     * back to a name derived from the config, then a generic label. Never throws when no save is open.
     *
     * @returns {string} the config display name
     */
    function currentConfigDisplayName() {
        const blob = global.mpbController.persistence.currentId
            ? global.mpbController.readSaveBlob(global.mpbController.persistence.currentId)
            : null;
        if (blob && blob.name) {
            return blob.name;
        }
        return global.mpbController.deriveConfigName(state.config);
    }


    /**
     * Whether the header Download menu shows an "Open in Diagramforce" row. Hard-omitted in
     * validations-only so the All-BUs path cannot even show the action. Distinct from
     * `isDiagramDrawable()` (that gate only enables the row) and from `outputBlockers()` (file rows).
     *
     * @returns {boolean} true when the menuitem should be appended
     */
    function shouldShowDiagramforceMenuItem() {
        return state.mode !== 'validations';
    }


    global.mpbController = {
        state: state,
        dom: dom,
        setText: setText,
        makeEl: makeElement,
        jsonPretty: jsonPretty,
        emptyWizardState: emptyWizardState,
        emptyRetention: emptyRetention,
        goToStep: goToStep,
        visibleSteps: visibleSteps,
        WIZARD_STEP_IDS: WIZARD_STEP_IDS,
        registerStep: registerStep,
        getRegisteredStep: getRegisteredStep,
        getWizardStep: function getWizardStep() {
            return wizardStep;
        },
        setRender: setRender,
        render: render,
        setBeforeWizardStepRender: setBeforeWizardStepRender,
        setOnSharedDEsChange: setOnSharedDEsChange,
        setDeriveValidationsState: setDeriveValidationsState,
        getDeriveValidationsState: function getDeriveValidationsState() {
            return hooks.deriveValidationsState;
        },
        showStepError: showStepError,
        clearStepError: clearStepError,
        updateNavGate: updateNavGate,
        clampWizardStep: clampWizardStep,
        everyEnvironmentHasOneBU: everyEnvironmentHasOneBU,
        environmentNames: environmentNames,
        assignedBUReferences: assignedBUReferences,
        childBUReferences: childBUReferences,
        suffixOf: suffixOf,
        pipelineRootOf: pipelineRootOf,
        pipelinesByRoot: pipelinesByRoot,
        suffixFieldErrors: suffixFieldErrors,
        seedSuffixes: seedSuffixes,
        suffixSlug: suffixSlug,
        setSharedDEs: setSharedDEs,
        renderEnvironmentColumns: renderEnvironmentColumns,
        showOnly: showOnly,
        restoreFromHash: restoreFromHash,
        onHashChange: onHashChange,
        syncHashToState: syncHashToState,
        renderStepper: renderStepper,
        outputBlockers: outputBlockers,
        fillFallback: fillFallback,
        ensureCopyNote: ensureCopyNote,
        copyToClipboard: copyToClipboard,
        openDiagramOrFallback: openDiagramOrFallback,
        bareBUName: bareBUName,
        isBuilderMode: isBuilderMode,
        syncBuilderModeClass: syncBuilderModeClass,
        syncBuilderHeaderMount: syncBuilderHeaderMount,
        setBuilderHeaderDom: setBuilderHeaderDom,
        isConfigDownloadAvailable: isConfigDownloadAvailable,
        currentConfigDisplayName: currentConfigDisplayName,
        parseHash: parseHash,
        hashFromLocation: hashFromLocation,
        applyHashDescriptor: applyHashDescriptor,
        setWizardStep: function (id) {
            wizardStep = id;
        },
        renderWizardStep: renderWizardStep,
        canProceed: canProceed,
        goNext: goNext,
        goBack: goBack,
        syncWizardNav: syncWizardNav,
        setWizardNavDom: setWizardNavDom,
        computeStepperStates: computeStepperStates,
        isForwardJumpSoftBlocked: isForwardJumpSoftBlocked,
        jumpToStep: jumpToStep,
        confirmUnassignedContinue: confirmUnassignedContinue,
        confirmUnassignedGoBack: confirmUnassignedGoBack,
        getPendingJumpTarget: function () {
            return pendingJumpTarget;
        },
        buildDiagramJSON: buildDiagramJSON,
        buildDiagramforceModel: buildDiagramforceModel,
        // Re-exported from the pure Diagramforce module (loaded before core); the tests read these
        // geometry helpers off the controller. Falls back to `undefined` if the module is absent.
        diagramCardYs: global.mpbDiagramforce && global.mpbDiagramforce.diagramCardYs,
        diagramLanePlacement: global.mpbDiagramforce && global.mpbDiagramforce.diagramLanePlacement,
        DIAGRAM_BAND: DIAGRAM_BAND,
        diagramBand: diagramBand,
        buDisplayLabel: buDisplayLabel,
        diagramTitle: diagramTitle,
        isDiagramDrawable: isDiagramDrawable,
        isDiagramOffered: isDiagramOffered,
        shouldShowDiagramforceMenuItem: shouldShowDiagramforceMenuItem,
        downloadText: downloadText,
        assignBUToEnvironment: assignBUToEnvironment,
        unassignedBUReferences: unassignedBUReferences,
        pooledBUReferences: pooledBUReferences,
        shouldConfirmUnassigned: shouldConfirmUnassigned,
        setUnassignedConfirmed: function (value) {
            hasConfirmedUnassigned = value;
        },
    };

})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
