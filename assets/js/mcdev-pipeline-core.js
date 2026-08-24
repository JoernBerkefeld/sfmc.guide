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
            scheduleAutosave();
        }
        // Hydrate the sticky builder sub-header (name + actions) to reflect the latest state. A no-op
        // under the headless stub (slots are null).
        renderBuilderHeader();
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
        scheduleAutosave();
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
        clearBanner('unassigned-bus');
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
        showBanner(
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
        clearBanner('unassigned-bus');
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
        clearBanner('unassigned-bus');
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
        clearBanner('unassigned-bus');
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
        if (HASH_SESSION_VIEWS.has(view) && persistence.currentId) {
            parts.push('s=' + global.encodeURIComponent(persistence.currentId));
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
        if (!readSaveBlob(parsed.sessionId)) {
            goToStep('intake');
            showBanner(
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
        clearBanner('deeplink');
        // reopenSave loads config + wizardState, acquires the lock, and restores the persisted mode
        // (Fix 1): a save made in wizard mode lands back on the wizard, older mode-less saves on the
        // `mode` picker. A deep link to `wizard` needs a mode to compute the visible sub-steps, so
        // the branch below only overrides the landing when a mode was restored.
        reopenSave(parsed.sessionId);
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
                setText(note, 'Copied to clipboard.');
                return;
            } catch {
                // fall through to the textarea fallback below
            }
        }
        const isOk = copyViaTextarea(text);
        setText(note, isOk ? 'Copied to clipboard.' : 'Copy failed — select the text below and copy manually.');
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
     * Diagramforce integration constants. The diagram JSON conforms to `DIAGRAM_JSON_SPEC.md`
     * (`diagramType: 'process'`); the handoff uses the documented `postMessage` flow from
     * `how-to-use/web-integration.md`. `DIAGRAMFORCE_APP_VERSION` matches the spec snapshot so a
     * generated file does not trigger a compatibility notice.
     */
    const DIAGRAMFORCE_ORIGIN = 'https://diagramforce.com';

    const DIAGRAMFORCE_IMPORT_URL = DIAGRAMFORCE_ORIGIN + '/#import=postmessage';

    const DIAGRAMFORCE_APP_VERSION = '1.22.3';


    // Position-locked environment bands (not by env name). First is a dedicated source-env green;
    // middle and last match `_sass/_variables.scss` color-purple and the Marketing / lineage accent.
    const DIAGRAM_BAND = {
        first: { fill: '#27ae60', stroke: '#1e8449' },
        middle: { fill: '#7C3AED', stroke: '#6D28D9' },
        last: { fill: '#F49825', stroke: '#C2410C' },
    };

    const DIAGRAM_ENV_ICON = 'custom-marketing';

    const DIAGRAM_PARENT_BU_ICON = 'custom-data';

    const DIAGRAM_HEADER_ACCENT_HEIGHT = 48;


    // Layout geometry. The spec is not auto-layout for free-standing cells — every cell carries
    // its own position — but Diagramforce reflows *embedded* children on import (see
    // diagramEnvironmentContainer). Tasks stay top-level so these numbers survive paste/import.
    const DIAGRAM_COLUMN_X = 48;

    const DIAGRAM_COLUMN_STEP = 400;

    const DIAGRAM_COLUMN_WIDTH = 280;

    const DIAGRAM_HEADER_Y = 104;

    const DIAGRAM_TASK_WIDTH = 220;

    const DIAGRAM_TASK_HEIGHT = 52;

    const DIAGRAM_TASK_GAP = 40;

    const DIAGRAM_CONTAINER_PADDING = 36;


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
     * position-locked band; the body stays on Diagramforce's dark container tokens. Visual lane
     * only: do not set `embeds`. The app's import path (`js/canvas/embedding.js` —
     * `fitParentToChildren` / `tuckChildInside`) auto-sizes a parent to its children and tucks
     * embeds below the header, discarding authored width/height/gap/x/y. Auto-sizing is a Display
     * menu localStorage toggle (`sfdiag::autoSizing`); the JSON envelope has no flag to disable it.
     *
     * @param {string} id the container cell id
     * @param {string} name the environment name (header label)
     * @param {number} x the column x position
     * @param {number} height the container height (sized to the stacked BU tasks it visually wraps)
     * @param {{fill: string, stroke: string}} band the column's first/middle/last colours
     * @returns {object} the `sf.Container` cell
     */
    function diagramEnvironmentContainer(id, name, x, height, band) {
        const headerMidY = Math.round(DIAGRAM_HEADER_ACCENT_HEIGHT / 2);
        return {
            id: id,
            type: 'sf.Container',
            position: { x: x, y: 50 },
            size: { width: DIAGRAM_COLUMN_WIDTH, height: height },
            z: 1000,
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
     * Top-level only (no `parent`) so import honours the authored `position` and `size`.
     *
     * @param {string} id the task cell id
     * @param {string} label the BU display label
     * @param {number} x the task x position
     * @param {number} y the task y position
     * @param {boolean} isParentBU whether this BU is a shared-DE parent BU
     * @param {{fill: string, stroke: string}} band the column's first/middle/last colours
     * @returns {object} the `sf.BpmnTask` cell
     */
    function diagramBUTask(id, label, x, y, isParentBU, band) {
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
     * Build the full Diagramforce diagram JSON for the current pipeline: each environment (in
     * `envOrder`) becomes a band-coloured `sf.Container` column, each assigned BU a top-level
     * `sf.BpmnTask` positioned over that lane (not embedded — Diagramforce reflows embeds), and
     * deploy arrows connect each BU to its upstream counterpart (via `lineage`
     * when set, else the same-index BU of the previous environment). Column colours are locked by
     * position (first / middle / last), not by environment name. Shared-DE parent BUs use the
     * `custom-data` icon. Returns a spec-conformant object (never mutates state).
     *
     * @returns {object} the diagram JSON envelope
     */
    function buildDiagramJSON() {
        const wizardState = state.wizardState;
        const environments = environmentNames();
        const lineage = wizardState.lineage || {};
        const cells = [];

        // Assign a stable cell id per buRef-in-env (a BU can appear in several envs) and remember the
        // task id chosen for each buRef per column, so links can resolve upstream counterparts.
        const taskIdByColumn = [];
        let cellCounter = 0;
        const nextId = (prefix) => prefix + '-' + String((cellCounter += 1));
        const columnCount = environments.length;

        for (const [columnIndex, environment] of environments.entries()) {
            const references = assignedBUReferences(environment);
            const columnX = DIAGRAM_COLUMN_X + columnIndex * DIAGRAM_COLUMN_STEP;
            const taskX = columnX + (DIAGRAM_COLUMN_WIDTH - DIAGRAM_TASK_WIDTH) / 2;
            const containerId = nextId('env');
            const columnMap = {};
            const band = diagramBand(columnIndex, columnCount);

            for (const [rowIndex, reference] of references.entries()) {
                const taskId = nextId('bu');
                const taskY = 50 + DIAGRAM_HEADER_Y + rowIndex * (DIAGRAM_TASK_HEIGHT + DIAGRAM_TASK_GAP);
                const isParentBU = bareBUName(reference) === '_ParentBU_';
                cells.push(
                    diagramBUTask(taskId, buDisplayLabel(reference), taskX, taskY, isParentBU, band)
                );
                columnMap[reference] = taskId;
            }

            // Size the lane to its header + stacked tasks (+ bottom padding). Tasks are not
            // embedded; this height is only so the column visually wraps them.
            const taskCount = Math.max(references.length, 1);
            const containerHeight =
                DIAGRAM_HEADER_Y +
                taskCount * DIAGRAM_TASK_HEIGHT +
                (taskCount - 1) * DIAGRAM_TASK_GAP +
                DIAGRAM_CONTAINER_PADDING;
            cells.push(
                diagramEnvironmentContainer(containerId, environment, columnX, containerHeight, band)
            );
            taskIdByColumn.push(columnMap);
        }

        // Deploy arrows: connect each BU in a column to its upstream BU in the previous column. Prefer
        // the explicit lineage parent (child buRef → parent buRef); fall back to the same-index BU.
        for (let columnIndex = 1; columnIndex < environments.length; columnIndex += 1) {
            const previousMap = taskIdByColumn[columnIndex - 1];
            const references = assignedBUReferences(environments[columnIndex]);
            const previousReferences = assignedBUReferences(environments[columnIndex - 1]);
            for (const [rowIndex, reference] of references.entries()) {
                const parentReference = lineage[reference];
                let sourceId = parentReference ? previousMap[parentReference] : undefined;
                if (!sourceId) {
                    const fallbackReference = previousReferences[rowIndex] || previousReferences[0];
                    sourceId = fallbackReference ? previousMap[fallbackReference] : undefined;
                }
                const targetId = taskIdByColumn[columnIndex][reference];
                if (sourceId && targetId) {
                    cells.push(diagramDeployLink(nextId('link'), sourceId, targetId));
                }
            }
        }

        return {
            version: 1,
            appVersion: DIAGRAMFORCE_APP_VERSION,
            timestamp: Date.now(),
            title: diagramTitle(),
            diagramType: 'process',
            graph: { cells: cells },
        };
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
        // eslint-disable-next-line no-console
        console.log('diagramforce debug', JSON.stringify(buildDiagramJSON(), null, 2));
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
        const blob = persistence.currentId ? readSaveBlob(persistence.currentId) : null;
        if (blob && blob.name) {
            return blob.name;
        }
        return deriveConfigName(state.config);
    }


    /**
     * The single currently-open builder dropdown panel (Open or Download share this slot — only one
     * may be open at a time) plus the document listeners wired while it is open, so they can be torn
     * down before every header rebuild (listeners never accumulate).
     *
     * @type {{button: Element, panel: Element, onDocClick: (event: Event) => void, onKeydown: (event: KeyboardEvent) => void}|null}
     */
    let openBuilderPanel = null;


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
        document_.addEventListener('click', onDocumentClick, {capture: true});
        document_.addEventListener('keydown', onKeydown, {capture: true});
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
        const wrapper = makeElement('div', { class: 'mpb-builder-open' });
        const button = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: label + ' \u{25BE}',
            attrs: { 'aria-haspopup': 'menu', 'aria-expanded': 'false' },
        });
        const panelClass = leftAligned
            ? 'mpb-builder-open-panel mpb-builder-open-panel--left'
            : 'mpb-builder-open-panel';
        const panel = makeElement('div', { class: panelClass, attrs: { role: 'menu' } });
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
            const others = listSaves().filter((save) => save.id !== persistence.currentId);
            if (others.length === 0) {
                panel.append(
                    makeElement('div', {
                        class: 'mpb-builder-open-empty',
                        text: 'No other saved configs.',
                    })
                );
                return;
            }
            for (const save of others) {
                const row = makeElement('button', {
                    type: 'button',
                    class: 'mpb-builder-open-row',
                    attrs: { role: 'menuitem' },
                });
                row.append(makeElement('span', { class: 'mpb-builder-open-row-name', text: save.name }));
                row.append(
                    makeElement('span', {
                        class: 'mpb-builder-open-row-meta',
                        text: formatTimestamp(save.timestamp),
                    })
                );
                row.addEventListener('click', () => {
                    closeBuilderOpenPanel();
                    reopenSave(save.id);
                });
                panel.append(row);
            }
        });
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


    /**
     * Descriptor for the header Download Diagramforce row, or `null` when omitted (validations-only).
     * Full mode always returns a row: enabled when drawable, otherwise disabled with a tooltip.
     * Test seam — no DOM required.
     *
     * @returns {({text: string, disabled: boolean, title: (string|null)}|null)} menuitem spec
     */
    function diagramforceMenuItemSpec() {
        if (!shouldShowDiagramforceMenuItem()) {
            return null;
        }
        const isDrawable = isDiagramDrawable();
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
        const diagramItem = makeElement('button', {
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
                openDiagramOrFallback(diagramItem);
            });
        }
        panel.append(diagramItem);
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
            const blockers = outputBlockers();
            const isConfigOk = isConfigDownloadAvailable(state.mode, blockers);
            // Chromium strips a leading dot from the `download` filename; warn the user to re-add it.
            panel.append(
                makeElement('p', {
                    class: 'mpb-dl-hint',
                    text: 'Some browsers save these without the leading dot — re-add it after downloading.',
                })
            );
            // `.mcdevrc.json` — omitted entirely in validations mode; disabled when incomplete.
            if (state.mode !== 'validations') {
                const configItem = makeElement('button', {
                    type: 'button',
                    class: 'mpb-builder-open-row',
                    text: 'Download .mcdevrc.json',
                    attrs: { role: 'menuitem' },
                });
                if (isConfigOk) {
                    configItem.addEventListener('click', () => {
                        closeBuilderOpenPanel();
                        const configObject = global.mpbConfigBuilder.buildConfig(state.wizardState, state.config);
                        downloadText('.mcdevrc.json', jsonPretty(configObject), 'application/json');
                    });
                } else {
                    configItem.disabled = true;
                    configItem.setAttribute('title', 'Finish the wizard before downloading the config.');
                }
                panel.append(configItem);
            }
            // `.mcdev-validations.js` — always available.
            const validationsItem = makeElement('button', {
                type: 'button',
                class: 'mpb-builder-open-row',
                text: 'Download .mcdev-validations.js',
                attrs: { role: 'menuitem' },
            });
            validationsItem.addEventListener('click', () => {
                closeBuilderOpenPanel();
                const validationsSource = global.mpbValidationsBuilder.buildValidations(typeof hooks.deriveValidationsState === 'function' ? hooks.deriveValidationsState() : {});
                downloadText('.mcdev-validations.js', validationsSource, 'text/javascript');
            });
            panel.append(validationsItem);
            fillBuilderDownloadDiagramItem(panel);
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
        const slot = dom.builderHeaderName;
        slot.replaceChildren();
        slot.append(
            makeElement('span', { class: 'mpb-builder-header-name-label', text: currentConfigDisplayName() })
        );
        // Rename is only meaningful when a save is actually open.
        if (!persistence.currentId) {
            return;
        }
        const renameButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Rename',
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
        const slot = dom.builderHeaderName;
        const id = persistence.currentId;
        if (!slot || !id) {
            return;
        }
        slot.replaceChildren();
        const input = makeElement('input', {
            type: 'text',
            class: 'mpb-builder-header-rename-input',
            value: currentConfigDisplayName(),
            attrs: { 'aria-label': 'New name for this config' },
        });
        const saveButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Save',
        });
        const cancelButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Cancel',
        });
        const commit = () => {
            const next = input.value.trim();
            if (next) {
                renameSave(id, next);
            }
            renderBuilderHeader();
            renderSavedList();
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
        const slot = dom.builderHeaderActions;
        slot.replaceChildren();

        // Open ▾ — reopen any other saved config.
        slot.append(buildBuilderOpenDropdown());

        // New version — clone the current config AND switch the active session to the clone.
        const newVersion = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'New version',
        });
        newVersion.addEventListener('click', () => {
            const cloneId = cloneSave(persistence.currentId);
            if (cloneId) {
                reopenSave(cloneId);
            }
        });
        slot.append(newVersion);

        // Upload new — return to intake to load a different config.
        const uploadNew = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--ghost',
            text: 'Upload new',
        });
        uploadNew.addEventListener('click', () => goToStep('intake'));
        slot.append(uploadNew);

        // Download ▾ — the config + validations files (same guards as the output step).
        slot.append(buildBuilderDownloadDropdown());
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
        if (!dom.builderHeaderName || !dom.builderHeaderActions) {
            return;
        }
        renderBuilderHeaderName();
        renderBuilderHeaderActions();
    }


    // ─────────────────────────── Chunk 3b: localStorage persistence ───────────────────────────

    /**
     * localStorage key scheme. Saved configs live under `mcdevpipe::save::<id>`; the single-tab
     * editing lease for a config lives under `mcdevpipe::lock::<id>`. Ids are `crypto.randomUUID()`.
     */
    const SAVE_PREFIX = 'mcdevpipe::save::';

    const LOCK_PREFIX = 'mcdevpipe::lock::';
    const SAVE_VERSION = 1;
    const AUTOSAVE_DELAY_MS = 300;
    const LOCK_HEARTBEAT_MS = 4000;
    const LOCK_STALE_MS = 10_000;
    const STORAGE_WARNING_BYTES = 4_000_000;


    /**
     * A collision-resistant id — `crypto.randomUUID()` when available, else a random+time fallback.
     *
     * @returns {string} a fresh id
     */
    function newId() {
        if (global.crypto && typeof global.crypto.randomUUID === 'function') {
            return global.crypto.randomUUID();
        }
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }


    /**
     * This tab's identity for the lock lease (distinguishes our own writes from other tabs').
     */
    const TAB_ID = newId();


    /**
     * Persistence runtime state (module-scope, not part of the builder-facing `wizardState`):
     * the active save id, the debounce + heartbeat timers, the in-memory fallback store used when
     * localStorage is blocked, and whether the current config is opened read-only (another tab holds
     * the lock and the user hasn't taken over).
     */
    const persistence = {
        available: null, // null until probed; then true/false
        currentId: null, // id of the save being edited
        autosaveTimer: null,
        heartbeatTimer: null,
        memoryStore: {}, // id -> blob, used only when localStorage is unavailable
        readOnly: false, // true when another tab owns the lock and we haven't taken over
    };


    /**
     * Probe whether localStorage is usable (private mode / enterprise lockdown can throw on write).
     * Cached after the first call. When unavailable we fall back to an in-memory store and show a
     * persistent "download-only" banner so the rest of the tool keeps working.
     *
     * @returns {boolean} true when localStorage can be written and read
     */
    function storageAvailable() {
        if (persistence.available !== null) {
            return persistence.available;
        }
        persistence.available = false;
        try {
            const probe = '__mcdevpipe_probe__';
            global.localStorage.setItem(probe, '1');
            global.localStorage.removeItem(probe);
            persistence.available = true;
        } catch {
            persistence.available = false;
        }
        return persistence.available;
    }


    /**
     * True when an error looks like a storage quota overflow. Browsers disagree on the exact shape
     * (name vs. legacy numeric code 22, Firefox's 1014), so we cast a wide net.
     *
     * @param {(Error|{name?: string, code?: number, message?: string}|null)} error a caught error
     * @returns {boolean} true when it is a quota-exceeded error
     */
    function isQuotaError(error) {
        if (!error) {
            return false;
        }
        return (
            error.name === 'QuotaExceededError' ||
            error.code === 22 ||
            error.code === 1014 ||
            /quota/i.test(error.message || '')
        );
    }


    /**
     * Read a raw save blob by id (localStorage or the in-memory fallback), or null when missing/corrupt.
     *
     * @param {string} id the save id
     * @returns {(object|null)} the parsed blob, or null
     */
    function readSaveBlob(id) {
        if (!storageAvailable()) {
            return persistence.memoryStore[id] || null;
        }
        try {
            const raw = global.localStorage.getItem(SAVE_PREFIX + id);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }


    /**
     * Write a save blob by id. Returns `{ ok }` — on a quota overflow `ok` is false and the caller
     * surfaces the "storage full" banner instead of throwing.
     *
     * @param {string} id the save id
     * @param {object} blob the entry `{ id, name, version, timestamp, config, wizardState }`
     * @returns {{ok: boolean, quota: boolean}} write outcome
     */
    function writeSaveBlob(id, blob) {
        if (!storageAvailable()) {
            persistence.memoryStore[id] = blob;
            return { ok: true, quota: false };
        }
        try {
            global.localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(blob));
            return { ok: true, quota: false };
        } catch (ex) {
            return { ok: false, quota: isQuotaError(ex) };
        }
    }


    /**
     * List all saved configs, newest first. Corrupt entries are skipped (never crash the intake list).
     *
     * @returns {{id: string, name: string, version: number, timestamp: number, bytes: number}[]} saves
     */
    function listSaves() {
        const saves = [];
        if (!storageAvailable()) {
            for (const [id, blob] of Object.entries(persistence.memoryStore)) {
                if (blob) {
                    saves.push({
                        id: id,
                        name: blob.name || id,
                        version: blob.version || 0,
                        timestamp: blob.timestamp || 0,
                        bytes: JSON.stringify(blob).length * 2,
                    });
                }
            }
            return saves.toSorted((a, b) => b.timestamp - a.timestamp);
        }
        for (let index = 0; index < global.localStorage.length; index++) {
            const key = global.localStorage.key(index);
            if (!key || key.indexOf(SAVE_PREFIX) !== 0) {
                continue;
            }
            try {
                const raw = global.localStorage.getItem(key) || '';
                const blob = JSON.parse(raw);
                saves.push({
                    id: blob.id || key.slice(SAVE_PREFIX.length),
                    name: blob.name || key.slice(SAVE_PREFIX.length),
                    version: blob.version || 0,
                    timestamp: blob.timestamp || 0,
                    bytes: (key.length + raw.length) * 2,
                });
            } catch {
                // Skip a corrupt entry rather than break the whole list.
            }
        }
        return saves.toSorted((a, b) => b.timestamp - a.timestamp);
    }


    /**
     * Delete a saved config (and its lock) by id, from whichever store is in use.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function deleteSave(id) {
        if (!storageAvailable()) {
            delete persistence.memoryStore[id];
            return;
        }
        try {
            global.localStorage.removeItem(SAVE_PREFIX + id);
            global.localStorage.removeItem(LOCK_PREFIX + id);
        } catch {
            // Best-effort removal.
        }
    }


    /**
     * Approximate bytes consumed by this origin's localStorage (UTF-16, so char count × 2). O(keys),
     * cheap enough to call after each autosave. Returns 0 when storage is unavailable.
     *
     * @returns {number} approximate bytes used
     */
    function storageFootprint() {
        if (!storageAvailable()) {
            return 0;
        }
        let bytes = 0;
        for (let index = 0; index < global.localStorage.length; index++) {
            const key = global.localStorage.key(index);
            if (key == null) {
                continue;
            }
            const value = global.localStorage.getItem(key) || '';
            bytes += (key.length + value.length) * 2;
        }
        return bytes;
    }


    /**
     * Derive the default config label from the FIRST credential entry: `"<credName> (<eid>)"`
     * (e.g. `cred (510004860)`). Multiple credentials is an edge case — the first entry always names
     * it. The stored name becomes authoritative once the user renames it.
     *
     * @param {object} config the parsed `.mcdevrc.json`
     * @returns {string} the derived default name
     */
    function deriveConfigName(config) {
        const credentials = (config && config.credentials) || {};
        const names = Object.keys(credentials);
        if (names.length === 0) {
            return 'Untitled pipeline';
        }
        const first = names[0];
        const eid = credentials[first] && credentials[first].eid;
        return eid == null ? first : first + ' (' + eid + ')';
    }


    /**
     * The next free ` v2` / ` v3` / … name for a clone: strip any trailing ` vN`, then scan existing
     * saves sharing that base and return base + the highest-in-use suffix incremented (min ` v2`).
     *
     * @param {string} name the source config name
     * @returns {string} a unique versioned clone name
     */
    function nextVersionName(name) {
        const base = String(name || 'Untitled pipeline').replace(/ v\d+$/, '');
        let highest = 1;
        for (const save of listSaves()) {
            if (save.name === base) {
                highest = Math.max(highest, 1);
                continue;
            }
            const match = /^(.*) v(\d+)$/.exec(save.name);
            if (match && match[1] === base) {
                highest = Math.max(highest, Number(match[2]));
            }
        }
        return base + ' v' + (highest + 1);
    }


    /**
     * Build a fresh save blob from the current app state.
     *
     * @param {string} id the save id
     * @param {string} name the config name
     * @returns {{id: string, name: string, version: number, timestamp: number, config: object, wizardState: WizardState}} the blob
     */
    function buildSaveBlob(id, name) {
        return {
            id: id,
            name: name,
            version: SAVE_VERSION,
            timestamp: Date.now(),
            config: state.config,
            wizardState: state.wizardState,
        };
    }


    /**
     * Create a new save for a freshly-accepted config and make it the active one. Called from the
     * intake success path so every accepted config is immediately persisted and resumable.
     *
     * @param {object} config the parsed, validated config
     * @returns {void}
     */
    function createSaveForConfig(config) {
        const id = newId();
        persistence.currentId = id;
        persistence.readOnly = false;
        const blob = buildSaveBlob(id, deriveConfigName(config));
        const result = writeSaveBlob(id, blob);
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
        acquireLock(id);
    }


    /**
     * Persist the current state under the active save id (autosave target). No-op when read-only or
     * when there is no active id. On a quota overflow the "storage full" banner is shown.
     *
     * @returns {void}
     */
    function persistCurrent() {
        if (!persistence.currentId || persistence.readOnly) {
            return;
        }
        const existing = readSaveBlob(persistence.currentId);
        const name = existing && existing.name ? existing.name : deriveConfigName(state.config);
        const result = writeSaveBlob(persistence.currentId, buildSaveBlob(persistence.currentId, name));
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
        renderStorageGauge();
    }


    /**
     * Schedule a debounced autosave. Called on every state-changing render so a reopened config
     * resumes exactly where the user left off.
     *
     * @returns {void}
     */
    function scheduleAutosave() {
        if (!persistence.currentId || persistence.readOnly) {
            return;
        }
        if (persistence.autosaveTimer) {
            global.clearTimeout(persistence.autosaveTimer);
        }
        persistence.autosaveTimer = global.setTimeout(() => {
            persistence.autosaveTimer = null;
            persistCurrent();
        }, AUTOSAVE_DELAY_MS);
    }


    /**
     * Flush any pending autosave immediately (on tab hide / unload) so no in-flight edit is lost.
     *
     * @returns {void}
     */
    function flushAutosave() {
        if (persistence.autosaveTimer) {
            global.clearTimeout(persistence.autosaveTimer);
            persistence.autosaveTimer = null;
        }
        persistCurrent();
    }


    // ── Single-tab editing lock ────────────────────────────────────────────────

    /**
     * Read the current lock lease for a save id, or null when none/stale/corrupt.
     *
     * @param {string} id the save id
     * @returns {({tabId: string, ts: number}|null)} the live lease, or null
     */
    function readLock(id) {
        if (!storageAvailable()) {
            return null;
        }
        try {
            const raw = global.localStorage.getItem(LOCK_PREFIX + id);
            if (!raw) {
                return null;
            }
            const lock = JSON.parse(raw);
            if (!lock || Date.now() - (lock.ts || 0) > LOCK_STALE_MS) {
                return null;
            }
            return lock;
        } catch {
            return null;
        }
    }


    /**
     * Write/refresh this tab's lock lease for a save id.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function writeLock(id) {
        if (!storageAvailable()) {
            return;
        }
        try {
            global.localStorage.setItem(LOCK_PREFIX + id, JSON.stringify({ tabId: TAB_ID, ts: Date.now() }));
        } catch {
            // A lock write failing (e.g. quota) must never block editing.
        }
    }


    /**
     * Acquire (or take over) the editing lock for a save id and start the heartbeat. When another tab
     * holds a live lease we open read-only and offer a "Take over" banner rather than clobbering it.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function acquireLock(id) {
        stopHeartbeat();
        const existing = readLock(id);
        if (existing && existing.tabId !== TAB_ID) {
            persistence.readOnly = true;
            showLockedBanner(id);
            return;
        }
        persistence.readOnly = false;
        clearBanner('locked');
        writeLock(id);
        persistence.heartbeatTimer = global.setInterval(() => {
            if (persistence.currentId && !persistence.readOnly) {
                writeLock(persistence.currentId);
            }
        }, LOCK_HEARTBEAT_MS);
    }


    /**
     * Take over editing after the config was opened read-only (another tab's lease). Claims the lock,
     * clears the read-only banner, and re-renders.
     *
     * @returns {void}
     */
    function takeOverLock() {
        if (!persistence.currentId) {
            return;
        }
        persistence.readOnly = false;
        clearBanner('locked');
        acquireLock(persistence.currentId);
        render();
    }


    /**
     * Stop the lock heartbeat timer.
     *
     * @returns {void}
     */
    function stopHeartbeat() {
        if (!persistence.heartbeatTimer) {
        	return;
        }

        global.clearInterval(persistence.heartbeatTimer);
        persistence.heartbeatTimer = null;
    }


    /**
     * Release the active lock (on unload) so another tab can pick the config up immediately.
     *
     * @returns {void}
     */
    function releaseLock() {
        stopHeartbeat();
        if (!persistence.currentId || persistence.readOnly || !storageAvailable()) {
            return;
        }
        try {
            const existing = readLock(persistence.currentId);
            if (existing && existing.tabId === TAB_ID) {
                global.localStorage.removeItem(LOCK_PREFIX + persistence.currentId);
            }
        } catch {
            // Best-effort release.
        }
    }


    /**
     * Handle a cross-tab `storage` event. Two cases matter for the config we are editing:
     * another tab wrote a newer SAVE for it (offer Reload), or another tab claimed its LOCK
     * (we became read-only — offer Take over).
     *
     * @param {StorageEvent} event the storage event
     * @returns {void}
     */
    function onStorageEvent(event) {
        if (!event || !persistence.currentId || !event.key) {
            return;
        }
        if (event.key === SAVE_PREFIX + persistence.currentId && event.newValue && !persistence.readOnly) {
            // Another tab saved a newer version of the config we're editing — never silently clobber.
            showExternalChangeBanner(persistence.currentId);
        } else if (event.key === LOCK_PREFIX + persistence.currentId && event.newValue) {
            try {
                const lock = JSON.parse(event.newValue);
                if (lock && lock.tabId && lock.tabId !== TAB_ID) {
                    persistence.readOnly = true;
                    stopHeartbeat();
                    showLockedBanner(persistence.currentId);
                    render();
                }
            } catch {
                // Ignore an unparseable lock write.
            }
        }
    }


    // ── Restore / reopen ───────────────────────────────────────────────────────

    /**
     * Reopen a saved config: version-guard the blob, load it into state, acquire its lock, and jump
     * to the mode step (or output when a mode was already chosen). A version mismatch or missing
     * required field falls back to intake with a banner rather than crashing.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function reopenSave(id) {
        const blob = readSaveBlob(id);
        if (!blob || blob.version !== SAVE_VERSION || !blob.config || !blob.wizardState) {
            deriveRestoreFailure();
            return;
        }
        clearBanner('restore');
        persistence.currentId = id;
        state.config = blob.config;
        state.wizardState = Object.assign(emptyWizardState(), blob.wizardState);
        // Restore the persisted mode so a deep link / reload lands on the wizard rather than the
        // mode picker (Fix 1). Older saves have no persisted mode → null keeps the original
        // mode-picker landing (backward compatible). `applyHashDescriptor`'s `state.mode` guard then
        // correctly navigates a `#view=wizard&step=…` deep link to the requested step (Download is
        // `step=output` on the wizard view).
        state.mode =
            state.wizardState.mode === 'full' || state.wizardState.mode === 'validations'
                ? state.wizardState.mode
                : null;
        acquireLock(id);
        // With a restored mode, land on the wizard step it implies; otherwise keep the mode picker.
        if (state.mode) {
            const steps = clampWizardStep();
            wizardStep = steps.length > 0 ? steps[0].id : null;
            goToStep('wizard');
            return;
        }
        goToStep('mode');
    }


    /**
     * Surface a non-crashing "couldn't restore" banner and stay on intake.
     *
     * @returns {void}
     */
    function deriveRestoreFailure() {
        showBanner(
            'restore',
            "Couldn't restore this saved session (it was made by a different version of this tool). " +
                'Please re-import your .mcdevrc.json to continue.',
            [],
            'danger'
        );
    }


    // ── Banners ─────────────────────────────────────────────────────────────────

    /**
     * Show (or replace) a keyed status banner in `#mpb-banners`. Keyed so each concern
     * (storage-disabled / quota / locked / external-change / restore) owns exactly one banner and
     * repeated calls update rather than stack. Built with `makeElement`/`setText` only.
     *
     * @param {string} key the banner key (dedupe id)
     * @param {string} message the banner text
     * @param {{label: string, onClick: () => void}[]} [actions] optional action buttons
     * @param {('warning'|'danger'|'')} [variant] optional visual tone
     * @returns {void}
     */
    function showBanner(key, message, actions, variant) {
        if (!dom.banners) {
            return;
        }
        clearBanner(key);
        const className = variant ? 'mpb-banner mpb-banner--' + variant : 'mpb-banner';
        const banner = makeElement('div', {
            class: className,
            attrs: { 'data-banner': key, role: variant === 'danger' ? 'alert' : 'status' },
        });
        banner.append(makeElement('span', { class: 'mpb-banner-msg', text: message }));
        const actionList = actions || [];
        if (actionList.length > 0) {
            const actionsWrap = makeElement('div', { class: 'mpb-banner-actions' });
            for (const action of actionList) {
                const button = makeElement('button', {
                    type: 'button',
                    class: 'mpb-btn mpb-btn--secondary',
                    text: action.label,
                });
                button.addEventListener('click', action.onClick);
                actionsWrap.append(button);
            }
            banner.append(actionsWrap);
        }
        dom.banners.append(banner);
    }


    /**
     * Remove a keyed banner if present.
     *
     * @param {string} key the banner key
     * @returns {void}
     */
    function clearBanner(key) {
        if (!dom.banners) {
            return;
        }
        const existing = dom.banners.querySelector('[data-banner="' + key + '"]');
        if (existing) {
            existing.remove();
        }
    }


    /**
     * Persistent "storage disabled" banner shown when localStorage is unavailable. Everything still
     * works, but nothing is saved — the user must download their files before closing.
     *
     * @returns {void}
     */
    function showStorageDisabledBanner() {
        showBanner(
            'storage',
            'Browser storage is disabled here, so your work won\u{2019}t be saved between visits. ' +
                'Download your files before closing this tab.',
            [],
            'warning'
        );
    }


    /**
     * "Storage full" banner (on a quota overflow) with actionable recovery advice.
     *
     * @returns {void}
     */
    function showQuotaBanner() {
        showBanner(
            'quota',
            'Browser storage is full — download your generated files, then delete old saved configs below.',
            [],
            'danger'
        );
    }


    /**
     * Read-only banner shown when the config is already open in another tab, with a "Take over" action.
     *
     * @param {string} id the save id (unused directly; take-over uses the active id)
     * @returns {void}
     */
    function showLockedBanner(id) {
        void id;
        showBanner(
            'locked',
            'This config is open in another tab, so it\u{2019}s read-only here to avoid conflicting edits.',
            [{ label: 'Take over editing', onClick: takeOverLock }],
            'warning'
        );
    }


    /**
     * Non-destructive "changed in another tab" banner with a Reload action (loads their version).
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function showExternalChangeBanner(id) {
        showBanner(
            'external',
            'This config was changed in another tab. Reload to see those changes (your unsaved edits here will be replaced).',
            [
                {
                    label: 'Reload',
                    onClick: () => {
                        clearBanner('external');
                        reopenSave(id);
                    },
                },
            ],
            'warning'
        );
    }


    // ── Saved-list + gauge UI ────────────────────────────────────────────────────

    /**
     * Format a timestamp for the saved-list rows (locale date + time, or a dash when absent).
     *
     * @param {number} ts epoch ms
     * @returns {string} a human-readable date/time
     */
    function formatTimestamp(ts) {
        if (!ts) {
            return '—';
        }
        try {
            return new Date(ts).toLocaleString();
        } catch {
            return '—';
        }
    }


    /**
     * Render the multi-config saved list into `#mpb-saved-list`: each row shows the name + timestamp
     * and offers Reopen / Rename (inline) / New version (clone) / Delete. Rebuilt with
     * `makeElement`/`setText` only. Shows a designed empty state when there are no saves.
     *
     * @returns {void}
     */
    function renderSavedList() {
        if (!dom.savedList) {
            return;
        }
        setText(dom.savedList, '');
        // Rows mount directly under `.mpb-saved-list`; the designed empty state is the SCSS
        // `.mpb-saved-list:empty::before` rule, so an empty list needs no explicit placeholder node.
        for (const save of listSaves()) {
            dom.savedList.append(savedRow(save));
        }
        renderStorageGauge();
    }


    /**
     * Build a single saved-config row (name + timestamp + the four per-row actions).
     *
     * @param {{id: string, name: string, timestamp: number}} save a saved-config summary
     * @returns {HTMLElement} the row element
     */
    function savedRow(save) {
        const row = makeElement('div', { class: 'mpb-saved-row', attrs: { 'data-save-id': save.id } });

        const name = makeElement('span', { class: 'mpb-saved-name', text: save.name });
        row.append(name);
        row.append(
            makeElement('span', { class: 'mpb-saved-meta', text: formatTimestamp(save.timestamp) })
        );

        const actions = makeElement('div', { class: 'mpb-saved-actions' });

        const reopen = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Reopen',
        });
        reopen.addEventListener('click', () => {
            reopenSave(save.id);
        });
        actions.append(reopen);

        const rename = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Rename',
        });
        rename.addEventListener('click', () => {
            startRename(row, save);
        });
        actions.append(rename);

        const clone = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'New version',
        });
        clone.addEventListener('click', () => {
            cloneSave(save.id);
        });
        actions.append(clone);

        const remove = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Delete',
        });
        remove.addEventListener('click', () => {
            removeSave(save.id);
        });
        actions.append(remove);

        row.append(actions);
        return row;
    }


    /**
     * Swap a row's name label for an inline text input + Save/Cancel to rename a saved config. The
     * stored name becomes authoritative once renamed.
     *
     * @param {HTMLElement} row the row element
     * @param {{id: string, name: string}} save the saved-config summary
     * @returns {void}
     */
    function startRename(row, save) {
        const nameElement = row.querySelector('.mpb-saved-name');
        const actions = row.querySelector('.mpb-saved-actions');
        if (!nameElement || !actions) {
            return;
        }
        const input = makeElement('input', {
            type: 'text',
            class: 'mpb-saved-name mpb-saved-rename',
            value: save.name,
            attrs: { 'aria-label': 'New name for this saved config' },
        });
        const save_ = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Save',
        });
        const cancel = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Cancel',
        });
        const commit = () => {
            const next = input.value.trim();
            if (next) {
                renameSave(save.id, next);
            }
            renderSavedList();
        };
        save_.addEventListener('click', commit);
        cancel.addEventListener('click', renderSavedList);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                renderSavedList();
            }
        });
        nameElement.replaceWith(input);
        setText(actions, '');
        actions.append(save_);
        actions.append(cancel);
        input.focus();
        input.select();
    }


    /**
     * Rename a saved config in place (name becomes authoritative). No-op when the blob is gone.
     *
     * @param {string} id the save id
     * @param {string} name the new name
     * @returns {void}
     */
    function renameSave(id, name) {
        const blob = readSaveBlob(id);
        if (!blob) {
            return;
        }
        blob.name = name;
        blob.timestamp = Date.now();
        const result = writeSaveBlob(id, blob);
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
    }


    /**
     * Deep-clone a saved config under a fresh id with the next free ` vN` name suffix.
     *
     * @param {string} id the source save id
     * @returns {(string|null)} the new clone's id, or null when the source is missing
     */
    function cloneSave(id) {
        const blob = readSaveBlob(id);
        if (!blob) {
            return null;
        }
        const cloneId = newId();
        const clonedBlob = global.structuredClone(blob);
        clonedBlob.id = cloneId;
        clonedBlob.name = nextVersionName(blob.name || deriveConfigName(blob.config));
        clonedBlob.version = SAVE_VERSION;
        clonedBlob.timestamp = Date.now();
        const result = writeSaveBlob(cloneId, clonedBlob);
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
        renderSavedList();
        return cloneId;
    }


    /**
     * Delete a saved config. If it was the active config, clear the active id (and its lock).
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function removeSave(id) {
        deleteSave(id);
        if (persistence.currentId === id) {
            stopHeartbeat();
            persistence.currentId = null;
            persistence.readOnly = false;
        }
        renderSavedList();
    }


    /**
     * Render the storage-footprint gauge into `#mpb-storage-gauge`: approximate KB/MB used, with a
     * warning class once past the pressure threshold. Hidden entirely when storage is unavailable.
     *
     * @returns {void}
     */
    function renderStorageGauge() {
        if (!dom.storageGauge) {
            return;
        }
        setText(dom.storageGauge, '');
        if (!storageAvailable()) {
            dom.storageGauge.hidden = true;
            return;
        }
        dom.storageGauge.hidden = false;
        const bytes = storageFootprint();
        const readable =
            bytes >= 1_000_000
                ? (bytes / 1_000_000).toFixed(1) + ' MB'
                : Math.max(1, Math.round(bytes / 1000)) + ' KB';
        const isNear = bytes >= STORAGE_WARNING_BYTES;
        dom.storageGauge.className = isNear ? 'mpb-storage-gauge is-warning' : 'mpb-storage-gauge';
        const label = isNear
            ? 'Browser storage used: ' + readable + ' — download your files and delete old configs to free space.'
            : 'Browser storage used: ' + readable;
        dom.storageGauge.append(makeElement('span', { class: 'mpb-gauge-label', text: label }));
        // A thin fill bar, capped at the warning threshold so it visibly fills as pressure rises.
        const percent = Math.min(100, Math.round((bytes / STORAGE_WARNING_BYTES) * 100));
        const bar = makeElement('div', { class: 'mpb-gauge-bar' });
        bar.append(
            makeElement('div', { class: 'mpb-gauge-fill', attrs: { style: 'width:' + percent + '%' } })
        );
        dom.storageGauge.append(bar);
    }


    /**
     * Boot the persistence layer: probe storage (banner when disabled), paint the saved list + gauge,
     * and wire the cross-tab `storage` event + exit-flush/lock-release handlers.
     *
     * @returns {void}
     */
    function initPersistence() {
        if (!storageAvailable()) {
            showStorageDisabledBanner();
        }
        // The saved list + gauge are painted by wireEvents() (the Chunk-3b marker), which runs just
        // before this in init(); re-render here only if storage is unavailable so the gauge hides.
        if (!storageAvailable()) {
            renderStorageGauge();
        }
        global.addEventListener('storage', onStorageEvent);
        document_.addEventListener('visibilitychange', () => {
            if (document_.visibilityState === 'hidden') {
                flushAutosave();
            }
        });
        global.addEventListener('beforeunload', () => {
            flushAutosave();
            releaseLock();
        });
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
        showStepError: showStepError,
        clearStepError: clearStepError,
        updateNavGate: updateNavGate,
        clampWizardStep: clampWizardStep,
        everyEnvironmentHasOneBU: everyEnvironmentHasOneBU,
        environmentNames: environmentNames,
        assignedBUReferences: assignedBUReferences,
        childBUReferences: childBUReferences,
        suffixOf: suffixOf,
        seedSuffixes: seedSuffixes,
        suffixSlug: suffixSlug,
        deriveRestoreFailure: deriveRestoreFailure,
        setSharedDEs: setSharedDEs,
        renderEnvironmentColumns: renderEnvironmentColumns,
        showOnly: showOnly,
        createSaveForConfig: createSaveForConfig,
        showBanner: showBanner,
        clearBanner: clearBanner,
        scheduleAutosave: scheduleAutosave,
        initPersistence: initPersistence,
        restoreFromHash: restoreFromHash,
        onHashChange: onHashChange,
        renderBuilderHeader: renderBuilderHeader,
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
        cloneSave: cloneSave,
        parseHash: parseHash,
        hashFromLocation: hashFromLocation,
        applyHashDescriptor: applyHashDescriptor,
        persistence: persistence,
        setWizardStep: function (id) {
            wizardStep = id;
        },
        setCurrentId: function (id) {
            persistence.currentId = id;
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
        DIAGRAM_BAND: DIAGRAM_BAND,
        diagramBand: diagramBand,
        isDiagramDrawable: isDiagramDrawable,
        isDiagramOffered: isDiagramOffered,
        shouldShowDiagramforceMenuItem: shouldShowDiagramforceMenuItem,
        diagramforceMenuItemSpec: diagramforceMenuItemSpec,
        fillBuilderDownloadDiagramItem: fillBuilderDownloadDiagramItem,
        downloadText: downloadText,
        assignBUToEnvironment: assignBUToEnvironment,
        unassignedBUReferences: unassignedBUReferences,
        pooledBUReferences: pooledBUReferences,
        shouldConfirmUnassigned: shouldConfirmUnassigned,
        setUnassignedConfirmed: function (value) {
            hasConfirmedUnassigned = value;
        },
        renderSavedList: renderSavedList,
        reopenSave: reopenSave,
    };

})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
