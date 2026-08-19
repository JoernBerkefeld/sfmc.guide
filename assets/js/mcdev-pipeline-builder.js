/**
 * mcdev Pipeline Builder — app controller (Chunk 1 of 3).
 *
 * Classic browser IIFE (NOT an ES module). Consumes the two pure builder globals
 * `mpbConfigBuilder` / `mpbValidationsBuilder` (loaded before this script via `defer`).
 *
 * This file is being built in chunks to stay within a single worker's budget:
 *   - CHUNK 1: IIFE skeleton, central `state`, escaping helpers, the intake step + parse gate
 *     (auth-file rejection, JSON / mcdevrc classification) and the two-mode choice.
 *   - CHUNK 2a (this pass): the wizard step state machine (derived `visibleSteps`, Back/Next,
 *     the `canProceed` gate hook), the stepper progress nav, and `renderWizardStep` mounting a
 *     labelled placeholder per step.
 *   - CHUNK 2b-1 (this pass): the first four real per-step UIs (env ordering, env-name validation,
 *     BU assignment, lineage linking) + their real per-step `canProceed` validation.
 *   - CHUNK 2b-2: the remaining per-step UIs (suffix editor, prod-BU confirm, rule picker) + their
 *     real per-step `canProceed` validation.
 *   - CHUNK 2c: the output step — build config/validations, textarea fallbacks, download + copy
 *     buttons, and the download guard.
 *   - CHUNK 3: localStorage persistence layer, the two `<details>` rule mini-wizards
 *     (filterPrefixByBu / sendableDeRetention) and the diagramforce preview.
 *
 * Escaping discipline: user/config strings only ever reach the DOM via `textContent`
 * (`setText`) or `document.createElement` (`makeEl`). Never `innerHTML` with interpolated
 * data. `no-console` is an error — problems surface in the DOM, not the console.
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
     * The four auth attributes that identify a `.mcdev-auth.json` secrets file. If every value
     * of the parsed object carries all four, the input is an auth file and must be discarded.
     */
    const AUTH_ATTRIBUTES = ['client_id', 'client_secret', 'auth_url', 'account_id'];

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
     * / `ResetRetentionPeriodOnImport` (boolean).
     *
     * @returns {{c__retentionPolicy: string, DataRetentionPeriodLength: number, c__dataRetentionPeriodUnitOfMeasure: string, ResetRetentionPeriodOnImport: boolean}} default policy
     */
    function emptyRetention() {
        return {
            c__retentionPolicy: 'individialRecords',
            DataRetentionPeriodLength: 3,
            c__dataRetentionPeriodUnitOfMeasure: 'Months',
            ResetRetentionPeriodOnImport: false,
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
        // ── wizard shell (Chunk 2) ──
        stepper: null,
        back: null,
        next: null,
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
     * The wizard's active sub-step id (env ordering, BU assignment, …). Kept separate from the
     * top-level `state.step` (`intake`/`mode`/`wizard`/`output`) so the wizard can recompute its
     * ordered list of visible steps from `state` on every render and clamp the cursor to it.
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
     * Suggested environment names offered as one-click chips on the env-order step and as the
     * initial seed for that step. The user can accept, remove, reorder, or type custom names —
     * nothing here is forced.
     */
    const SUGGESTED_ENVIRONMENTS = ['DEV', 'SIT', 'QA', 'UAT', 'Pre-Prod', 'Prod'];

    /**
     * Characters permitted in an environment name: letters, digits, hyphen, space, underscore.
     * Anything else is rejected inline (no silent rewrite — spaces are kept as typed).
     */
    const ENVIRONMENT_NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;

    /**
     * Canonical, ordered list of full-pipeline wizard step ids. `visibleSteps()` derives the
     * actually-shown subset from this (validations-only collapses to just `rules`; `lineage` is
     * dropped when every environment holds exactly one BU). Later chunks render their real UIs
     * against these ids inside `renderWizardStep()`.
     *
     * @type {readonly string[]}
     */
    const WIZARD_STEP_IDS = [
        'env-order',
        'bu-assign',
        'lineage',
        'suffixes',
        'prod-confirm',
        'rules',
    ];

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
     * Show an inline error in the intake error box (text only — never echoes raw input markup).
     *
     * @param {string} message human-readable error
     * @returns {void}
     */
    function showIntakeError(message) {
        if (!dom.intakeError) {
            return;
        }
        setText(dom.intakeError, message);
        dom.intakeError.hidden = false;
    }

    /**
     * Clear the intake error box.
     *
     * @returns {void}
     */
    function clearIntakeError() {
        if (!dom.intakeError) {
            return;
        }
        setText(dom.intakeError, '');
        dom.intakeError.hidden = true;
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

    // ─────────────────────────── parse gate ───────────────────────────

    /**
     * Auth-file content signature: an object where at least one value is itself an object carrying
     * all four auth attributes. Empty objects do not match. Authoritative over the filename hint.
     *
     * @param {unknown} parsed already-parsed JSON value
     * @returns {boolean} true when the value looks like a `.mcdev-auth.json`
     */
    function looksLikeAuthFile(parsed) {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return false;
        }
        const values = Object.values(parsed);
        if (values.length === 0) {
            return false;
        }
        // Any single auth-shaped value marks the whole input as a secrets file (per the plan).
        return values.some(
            (entry) =>
                entry &&
                typeof entry === 'object' &&
                !Array.isArray(entry) &&
                AUTH_ATTRIBUTES.every((attribute) => Object.hasOwn(entry, attribute))
        );
    }

    /**
     * Filename hint for an auth file (`*.mcdev-auth.json`). Only a hint; the content signature
     * is authoritative. Pasted input has no filename, so `fileName` may be empty.
     *
     * @param {string} [fileName] uploaded file name
     * @returns {boolean} true when the name matches the auth-file pattern
     */
    function isAuthFileName(fileName) {
        return typeof fileName === 'string' && /\.mcdev-auth\.json$/i.test(fileName.trim());
    }

    /**
     * The parse-gate result kinds. Only `ok` advances; every other kind stays on intake.
     *
     * @typedef {object} ParseResult
     * @property {('ok'|'auth'|'not-json'|'not-mcdevrc'|'incomplete')} kind classification
     * @property {object} [config] the parsed `.mcdevrc.json` (only for `ok`)
     * @property {string} [message] error text for non-`ok` kinds
     */

    /**
     * The auth-file rejection message. Deliberately never includes any value from the input.
     *
     * @returns {string} the rejection message
     */
    function authMessage() {
        return (
            'This looks like your .mcdev-auth.json, which holds your secrets (client id/secret). ' +
            'This tool needs your .mcdevrc.json (the non-secret project config) instead. ' +
            'The file was discarded and nothing was stored.'
        );
    }

    /**
     * Classify raw intake text. Never stores anything and never echoes secret values.
     *
     * @param {string} rawText the file/paste contents
     * @param {string} [fileName] the uploaded file name (empty for pasted input)
     * @returns {ParseResult} the classification
     */
    function classifyIntake(rawText, fileName) {
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            // Filename hint still lets us warn about an auth file even if it somehow fails to parse.
            if (isAuthFileName(fileName)) {
                return { kind: 'auth', message: authMessage() };
            }
            return {
                kind: 'not-json',
                message: "Couldn't read this as JSON. Check that you pasted the whole file contents.",
            };
        }

        // Auth-file rejection is top priority — discard immediately, never echo a secret.
        if (isAuthFileName(fileName) || looksLikeAuthFile(parsed)) {
            return { kind: 'auth', message: authMessage() };
        }

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {
                kind: 'not-mcdevrc',
                message: "This JSON isn't an mcdev project config (.mcdevrc.json).",
            };
        }

        // mcdev nests businessUnits under each `credentials.<cred>`. Require a credentials object
        // with at least one credential exposing businessUnits before we accept the config.
        const credentials = parsed.credentials;
        const hasCredentials = credentials && typeof credentials === 'object';
        const hasBusinessUnits =
            hasCredentials &&
            Object.values(credentials).some(
                (cred) => cred && typeof cred === 'object' && cred.businessUnits
            );

        if (!hasCredentials) {
            return {
                kind: 'not-mcdevrc',
                message: "This JSON isn't an mcdev project config (.mcdevrc.json) — no credentials found.",
            };
        }
        if (!hasBusinessUnits) {
            return {
                kind: 'incomplete',
                message: "This .mcdevrc.json has no businessUnits under any credential, so there's nothing to build a pipeline from.",
            };
        }

        return { kind: 'ok', config: parsed };
    }

    // ─────────────────────────── intake handling ───────────────────────────

    /**
     * Accept a validated `.mcdevrc.json`: store it, derive creds/BUs, advance to the mode choice.
     *
     * @param {object} config the parsed, validated config
     * @returns {void}
     */
    function acceptConfig(config) {
        state.config = config;
        const credentials = config.credentials || {};
        const credNames = Object.keys(credentials);
        // Round-trip: re-seed the wizard from the persisted mpb_pipeline block the config builder
        // wrote, so re-opening a tool-generated .mcdevrc.json reproduces the GUI state instead of a
        // blank wizard. Falls back to a fresh state (with a banner) on version mismatch / bad shape.
        state.wizardState = wizardStateFromConfig(config);
        state.wizardState.multiCred = credNames.length > 1;
        // Persist immediately so every accepted config is resumable, and take its editing lock.
        createSaveForConfig(config);
        goToStep('mode');
    }

    /**
     * Rebuild the wizard state from a config's persisted `options.deployment.mpb_pipeline` block
     * (written by the config builder for GUI round-tripping). When the block is present, its version
     * matches the current save version, and every required field is present, its fields are merged
     * over a fresh `emptyWizardState()` so newer empty-state fields (e.g. `prefixBlacklist` /
     * `retention` / `selectedRules`) that predate the block still exist. On any mismatch or malformed
     * input a fresh `emptyWizardState()` is returned; when a block was present but unusable a
     * non-crashing "couldn't restore" banner is surfaced. Never throws on bad input.
     *
     * @param {object} config the accepted `.mcdevrc.json`
     * @returns {WizardState} the seeded (or fresh) wizard state
     */
    function wizardStateFromConfig(config) {
        clearBanner('restore');
        const block = config && config.options && config.options.deployment && config.options.deployment.mpb_pipeline;
        if (!block || typeof block !== 'object') {
            return emptyWizardState();
        }
        // Required fields the config builder always persists; a block missing any of these (or with a
        // mismatched version) is treated as unrestorable rather than partially trusted.
        const requiredFields = ['envOrder', 'envBUs', 'lineage', 'separator', 'suffixes', 'prodBUs'];
        const isVersionOk = block.version === emptyWizardState().version;
        const isFieldsOk = requiredFields.every((field) => Object.hasOwn(block, field));
        if (!isVersionOk || !isFieldsOk) {
            deriveRestoreFailure();
            return emptyWizardState();
        }
        // Merge over a fresh empty state so any newer field the block predates keeps its default.
        const restored = Object.assign(emptyWizardState(), block);
        // Strict single-assignment invariant: a re-opened config that predates this model could hold
        // the same buRef in two environments. Dedupe so each buRef survives only in the first env
        // (by envOrder) that claims it, keeping the board's "exactly one env per BU" rule.
        restored.envBUs = dedupeEnvironmentBUs(restored.envOrder, restored.envBUs);
        return restored;
    }

    /**
     * Enforce the single-assignment invariant on a restored `envBUs` map: walking environments in
     * order, keep each buRef only in the first env that lists it and drop later duplicates. Envs not
     * present in `environmentOrder` are preserved at the end (deduped against earlier claims).
     *
     * @param {string[]} environmentOrder the ordered environment names
     * @param {object} environmentBUs the `{ [env]: buRef[] }` map from a restored block
     * @returns {object} a fresh, deduped `envBUs` map
     */
    function dedupeEnvironmentBUs(environmentOrder, environmentBUs) {
        const source = environmentBUs && typeof environmentBUs === 'object' ? environmentBUs : {};
        const order = Array.isArray(environmentOrder) ? environmentOrder : [];
        // Iterate declared envs first (in order), then any stray envs the order list omits.
        const environments = [...order, ...Object.keys(source).filter((name) => !order.includes(name))];
        const claimed = new Set();
        const result = {};
        for (const environment of environments) {
            const list = Array.isArray(source[environment]) ? source[environment] : [];
            // Keep only references not already claimed by an earlier env; claiming mutates `claimed`.
            result[environment] = list.filter((reference) => claimBUReference(claimed, reference));
        }
        return result;
    }

    /**
     * Claim a buRef for the first env that lists it: returns true (and records it) when unseen,
     * false when a previous env already claimed it. Extracted so the dedupe filter stays flat.
     *
     * @param {Set<string>} claimed the set of already-claimed buRefs (mutated)
     * @param {string} reference the buRef to test/claim
     * @returns {boolean} true when this env may keep the reference
     */
    function claimBUReference(claimed, reference) {
        if (claimed.has(reference)) {
            return false;
        }
        claimed.add(reference);
        return true;
    }

    /**
     * Handle raw intake text from any of the three intake paths (drop / upload / paste).
     * On rejection the raw text is dropped here and never retained.
     *
     * @param {string} rawText the file/paste contents
     * @param {string} [fileName] uploaded file name (empty for pasted input)
     * @returns {void}
     */
    function handleIntakeText(rawText, fileName) {
        const result = classifyIntake(rawText, fileName);
        if (result.kind === 'auth') {
            // Discard immediately: clear the textarea + file input so no secret lingers in the DOM.
            if (dom.pasteInput) {
                dom.pasteInput.value = '';
            }
            if (dom.fileInput) {
                dom.fileInput.value = '';
            }
            showIntakeError(result.message);
            return;
        }
        if (result.kind !== 'ok') {
            showIntakeError(result.message);
            return;
        }

        clearIntakeError();
        acceptConfig(result.config);
    }

    /**
     * Read an uploaded File as text and route it through the parse gate.
     *
     * @param {File} file the uploaded file
     * @returns {Promise<void>} resolves once the file has been classified
     */
    async function readFile(file) {
        if (!file) {
            return;
        }
        let text;
        try {
            text = await file.text();
        } catch {
            showIntakeError("Couldn't read that file. Try the paste box instead.");
            return;
        }
        handleIntakeText(String(text || ''), file.name);
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
     * single BU; validations-only collapses to just the rule picker.
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
     * Move an item within `envOrder` from one index to another and re-render the wizard. Out-of-range
     * indices are ignored so button/drag handlers never throw at the list edges.
     *
     * @param {number} from source index
     * @param {number} to destination index
     * @returns {void}
     */
    function moveEnvironment(from, to) {
        const order = environmentNames();
        if (from === to || from < 0 || from >= order.length || to < 0 || to >= order.length) {
            return;
        }
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        state.wizardState.envOrder = order;
        render();
    }

    /**
     * Case-insensitive trimmed-name collision check across the ordered env names, excluding the row
     * being edited. Used by both the env-order inline feedback and its `canProceed` gate.
     *
     * @param {string[]} names the trimmed env names in order
     * @param {number} index the row to test
     * @returns {boolean} true when the name at `index` duplicates another row
     */
    function isDuplicateName(names, index) {
        const lower = names[index].toLowerCase();
        return names.some((other, otherIndex) => otherIndex !== index && other.toLowerCase() === lower);
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
     * downstream steps (lineage/suffixes/diagram) recompute. Both the drag-drop reconciliation and
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
     * Auto-derive the default lineage: for every environment after the first, link each of its
     * buRefs to a parent buRef from the previous environment (positionally, falling back to the
     * previous env's first BU). Only fills gaps — any parent the user already chose is preserved.
     * Lineage is keyed by child buRef → parent buRef, matching the config builder's persisted shape.
     *
     * @returns {void}
     */
    function autoDeriveLineage() {
        const order = environmentNames();
        const lineage = { ...state.wizardState.lineage };
        const validReferences = new Set();
        for (const environment of order) {
            for (const reference of assignedBUReferences(environment)) {
                validReferences.add(reference);
            }
        }
        // Drop stale links whose child/parent no longer exists so the gate cannot pass on ghosts.
        for (const childReference of Object.keys(lineage)) {
            if (!validReferences.has(childReference) || !validReferences.has(lineage[childReference])) {
                delete lineage[childReference];
            }
        }
        for (let index = 1; index < order.length; index++) {
            const parentReferences = assignedBUReferences(order[index - 1]);
            const childReferences = assignedBUReferences(order[index]);
            for (const [childIndex, childReference] of childReferences.entries()) {
                if (!Object.hasOwn(lineage, childReference) && parentReferences.length > 0) {
                    lineage[childReference] = parentReferences[childIndex] || parentReferences[0];
                }
            }
        }
        state.wizardState.lineage = lineage;
    }

    /**
     * The child buRefs that still need a lineage parent chosen: every buRef of every environment
     * after the first. Used to build the manual-linking UI and its `canProceed` gate.
     *
     * @returns {{childRef: string, environment: string, parentOptions: string[]}[]} link rows
     */
    function lineageLinkRows() {
        const order = environmentNames();
        const rows = [];
        for (let index = 1; index < order.length; index++) {
            const parentOptions = assignedBUReferences(order[index - 1]);
            const childReferences = assignedBUReferences(order[index]);
            for (const childReference of childReferences) {
                rows.push({ childRef: childReference, environment: order[index], parentOptions: parentOptions });
            }
        }
        return rows;
    }

    /**
     * Per-step "can proceed" gate. Returns whether the given step is complete enough to advance,
     * plus a human-readable reason when it is not. All seven steps validate for real; the `rules`
     * step is intentionally permissive (zero rules is allowed).
     *
     * @param {string} stepId the step id being left
     * @returns {{ok: boolean, reason: string}} gate result (`reason` is empty when `ok`)
     */
     
    function canProceed(stepId) {
        switch (stepId) {
            case 'env-order': {
                return canProceedEnvironmentOrder();
            }
            case 'bu-assign': {
                return canProceedBUAssign();
            }
            case 'lineage': {
                return canProceedLineage();
            }
            case 'suffixes': {
                return canProceedSuffixes();
            }
            case 'prod-confirm': {
                return canProceedProductionConfirm();
            }
            case 'rules': {
                // No hard requirement — zero rules is allowed (keySuffix is always emitted at build
                // time). Mini-wizard sub-config gating is Chunk 3, so this step stays permissive.
                return { ok: true, reason: '' };
            }
            default: {
                return { ok: true, reason: '' };
            }
        }
    }

    /**
     * `env-order` gate (naming + ordering are now the same step): at least two environments, and
     * every name non-empty, pattern-valid, and unique after a case-insensitive trim.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedEnvironmentOrder() {
        const order = environmentNames();
        if (order.length < 2) {
            return { ok: false, reason: 'Add at least two environments (e.g. a source and a target).' };
        }
        const names = order.map((name) => name.trim());
        if (names.some((name) => !name)) {
            return { ok: false, reason: 'Every environment needs a name.' };
        }
        const invalid = names.find((name) => !ENVIRONMENT_NAME_PATTERN.test(name));
        if (invalid) {
            return {
                ok: false,
                reason:
                    'Environment names may only contain letters, digits, spaces, hyphens and underscores: "' +
                    invalid +
                    '".',
            };
        }
        const duplicate = names.find((name, index) => isDuplicateName(names, index));
        if (duplicate) {
            return { ok: false, reason: 'Environment names must be unique: "' + duplicate + '".' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * `bu-assign` gate: every environment has at least one BU assigned.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedBUAssign() {
        const missing = environmentNames().filter((environment) => assignedBUReferences(environment).length === 0);
        if (missing.length > 0) {
            return { ok: false, reason: 'Assign at least one BU to: ' + missing.join(', ') + '.' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * `lineage` gate: every child buRef (every BU of every non-first environment) has a parent
     * chosen. Only reached when the step is visible (an env holds >1 BU).
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedLineage() {
        const rows = lineageLinkRows();
        const lineage = state.wizardState.lineage || {};
        const unlinked = rows.filter((row) => !Object.hasOwn(lineage, row.childRef));
        if (unlinked.length > 0) {
            return {
                ok: false,
                reason: 'Choose an upstream BU for every environment BU before continuing.',
            };
        }
        return { ok: true, reason: '' };
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
     * `suffixes` gate: every child buRef has a non-empty suffix and the suffixes are distinct across
     * child BUs (the parent BU reuses child suffixes and is exempt). Surfaces the first offending
     * buRef in the reason.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedSuffixes() {
        const references = childBUReferences();
        const separator = state.wizardState.separator || '_';
        // Every child BU needs a suffix body beyond the bare separator.
        for (const reference of references) {
            const stored = suffixOf(reference);
            const body = stored.startsWith(separator) ? stored.slice(separator.length).trim() : stored.trim();
            if (!body) {
                return { ok: false, reason: 'Enter a suffix for every BU. Missing: ' + reference + '.' };
            }
        }
        // Child-BU suffixes must be distinct (compared on the full stored value).
        const seen = new Map();
        for (const reference of references) {
            const value = suffixOf(reference);
            if (seen.has(value)) {
                return {
                    ok: false,
                    reason:
                        'BU suffixes must be unique: "' +
                        value +
                        '" is used by both ' +
                        seen.get(value) +
                        ' and ' +
                        reference +
                        '.',
                };
            }
            seen.set(value, reference);
        }
        return { ok: true, reason: '' };
    }

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
     * Advance to the next visible wizard step, or to the output step from the last one. Blocked by
     * the per-step `canProceed` gate, whose reason surfaces in `#mpb-step-error` via `setText`.
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
     * Advance to the next visible wizard step (or out to the output step past the last one). Split
     * out of `goNext` so the soft-confirm "Continue anyway" action reuses the exact same advance
     * path after latching the confirmation. Clears the unassigned-BUs banner so it cannot linger on
     * the following step.
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
            return;
        }
        // Past the last visible step → move on to the output step.
        goToStep('output');
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
     * Render the current wizard step's UI into `#mpb-step-host`. All six steps are implemented
     * (env-order / bu-assign / lineage / suffixes / prod-confirm / rules). Environment naming and
     * ordering are combined into the single `env-order` step.
     *
     * @param {string} stepId the active step id
     * @returns {void}
     */
    function renderWizardStep(stepId) {
        if (!dom.stepHost) {
            return;
        }
        // Any step render replaces the step host wholesale — drop the lineage overlay's resize
        // listener/frame and the drag-to-connect handlers first so leaving lineage (or re-rendering
        // it) never leaks a handler. The lineage renderer re-mounts both when it is the active step.
        teardownLineageOverlay();
        teardownLineageDnd();
        setText(dom.stepHost, '');
        const title = WIZARD_STEP_TITLES[stepId] || stepId;
        const panel = makeElement('div', {
            class: 'mpb-step-panel',
            attrs: { 'data-step-id': stepId },
        });
        panel.append(makeElement('h3', { class: 'mpb-step-title', text: title }));
        switch (stepId) {
            case 'env-order': {
                renderEnvironmentOrderStep(panel);
                break;
            }
            case 'bu-assign': {
                renderBUAssignStep(panel);
                break;
            }
            case 'lineage': {
                renderLineageStep(panel);
                break;
            }
            case 'suffixes': {
                renderSuffixesStep(panel);
                break;
            }
            case 'prod-confirm': {
                renderProductionConfirmStep(panel);
                break;
            }
            case 'rules': {
                renderRulesStep(panel);
                break;
            }
            default: {
                panel.append(
                    makeElement('p', {
                        class: 'mpb-step-placeholder text-muted',
                        text: 'This step is coming soon.',
                    })
                );
            }
        }
        dom.stepHost.append(panel);
    }

    /**
     * `env-order` step (naming + ordering combined): quick-fill chips from `SUGGESTED_ENVIRONMENTS`,
     * plus an ordered, reorderable list of environment rows. Each row carries an inline editable
     * name input, drag-and-drop (via a dedicated drag handle) and keyboard-accessible up/down
     * buttons (index 0 is the DEV/source env), plus add/remove. Seeds from `SUGGESTED_ENVIRONMENTS`
     * when empty.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderEnvironmentOrderStep(panel) {
        // Seed a sensible default order on first visit so the list is never empty.
        if (environmentNames().length === 0) {
            state.wizardState.envOrder = [...SUGGESTED_ENVIRONMENTS];
        }
        const order = environmentNames();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Name each environment and order them from source to production. The first row is the DEV / source environment. Type a name inline, drag the handle to reorder, or use the up/down buttons.',
            })
        );

        // Quick-fill chips: append a suggested name as a new row (skipping ones already present).
        const chips = makeElement('div', { class: 'mpb-chips', attrs: { 'aria-label': 'Suggested environment names' } });
        for (const suggestion of SUGGESTED_ENVIRONMENTS) {
            const chip = makeElement('button', {
                type: 'button',
                class: 'mpb-chip',
                text: suggestion,
            });
            chip.addEventListener('click', () => {
                const existing = environmentNames().map((existingName) => existingName.trim().toLowerCase());
                if (!existing.includes(suggestion.toLowerCase())) {
                    state.wizardState.envOrder = [...environmentNames(), suggestion];
                    render();
                }
            });
            chips.append(chip);
        }
        panel.append(chips);

        // Keep a reference to every rendered row so typing a name refreshes the inline validation
        // (which is cross-row for the duplicate check) IN PLACE — never rebuilding the inputs, which
        // would blur the focused field and jump the scroll to the top.
        const rows = [];

        /**
         * Repaint every row's inline validation in place from the current names. Called on each
         * keystroke so a fixed name clears its warning and duplicate flags update across rows,
         * without recreating any input.
         *
         * @returns {void}
         */
        function refreshEnvironmentWarnings() {
            const currentTrimmed = environmentNames().map((environmentName) => environmentName.trim());
            for (const row of rows) {
                setEnvironmentRowWarning(row, currentTrimmed);
            }
        }

        const list = makeElement('ol', { class: 'mpb-list', attrs: { 'aria-label': 'Environment order' } });
        for (const [index, name] of order.entries()) {
            const row = environmentOrderRow(name, index, order.length, refreshEnvironmentWarnings);
            rows.push(row);
            list.append(row.row);
        }
        panel.append(list);
        // Initial validation paint now that every row exists (so cross-row duplicates resolve).
        refreshEnvironmentWarnings();

        const addButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: '+ Add environment',
        });
        addButton.addEventListener('click', () => {
            state.wizardState.envOrder = [...environmentNames(), ''];
            render();
            // Nice-to-have: focus the freshly-added row's name input so the user can type right away.
            const inputs = dom.stepHost
                ? [...dom.stepHost.querySelectorAll('.mpb-env-name-input')]
                : [];
            const last = inputs.at(-1);
            if (last) {
                last.focus();
            }
        });
        panel.append(addButton);
    }

    /**
     * Build one environment row for the env-order list: an inline editable name input with inline
     * validation feedback, a dedicated drag handle, and up/down/remove buttons. Only the handle is
     * `draggable` so the name input stays fully editable (a `draggable` row swallows the mousedown
     * needed to focus/select inside the input on some browsers).
     *
     * @param {string} name the environment name (may be empty for a freshly-added row)
     * @param {number} index the row index in `envOrder`
     * @param {number} total the number of rows (for disabling edge buttons)
     * @param {() => void} refreshWarnings repaint every row's inline validation in place after an edit
     * @returns {{row: HTMLElement, index: number, warnings: HTMLElement}} the row element plus the
     *   handles needed for in-place validation refreshes
     */
    function environmentOrderRow(name, index, total, refreshWarnings) {
        const row = makeElement('li', {
            class: 'mpb-row',
            attrs: { 'data-index': String(index) },
        });

        // Dedicated drag handle — the only draggable element, so the name input remains editable.
        const handle = makeElement('span', {
            class: 'mpb-drag-handle',
            draggable: true,
            text: '⠿',
            attrs: { 'aria-hidden': 'true', title: 'Drag to reorder' },
        });

        const label = makeElement('div', { class: 'mpb-row-label' });
        const inputId = 'mpb-env-name-' + index;
        const input = makeElement('input', {
            type: 'text',
            value: name,
            id: inputId,
            class: 'mpb-env-name-input',
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': 'Environment ' + (index + 1) + ' name',
                placeholder: 'Environment ' + (index + 1),
            },
        });
        input.addEventListener('input', () => {
            const next = environmentNames();
            // Store exactly as typed (no space→underscore conversion); trimming is validation-only.
            next[index] = input.value;
            state.wizardState.envOrder = next;
            // Refresh only the inline validation (cross-row duplicates included), the nav gate and
            // the debounced autosave — never a full render that would blur this input.
            refreshWarnings();
            updateNavGate();
            scheduleAutosave();
        });
        label.append(input);
        if (index === 0) {
            label.append(makeElement('span', { class: 'mpb-chip', text: 'DEV / source' }));
        }

        // Dedicated warnings slot so the inline validation can be wiped + repainted in place (from
        // `setEnvironmentRowWarning`) without touching the input.
        const warnings = makeElement('div', { class: 'mpb-env-name-warnings' });
        label.append(warnings);

        const actions = makeElement('div', { class: 'mpb-row-actions' });
        const upButton = makeElement('button', {
            type: 'button',
            class: 'mpb-move-btn',
            text: '↑',
            disabled: index === 0,
            attrs: { 'aria-label': 'Move ' + (name || 'environment') + ' up' },
        });
        upButton.addEventListener('click', () => moveEnvironment(index, index - 1));
        const downButton = makeElement('button', {
            type: 'button',
            class: 'mpb-move-btn',
            text: '↓',
            disabled: index === total - 1,
            attrs: { 'aria-label': 'Move ' + (name || 'environment') + ' down' },
        });
        downButton.addEventListener('click', () => moveEnvironment(index, index + 1));
        const removeButton = makeElement('button', {
            type: 'button',
            class: 'mpb-move-btn',
            text: '✕',
            attrs: { 'aria-label': 'Remove ' + (name || 'environment') },
        });
        removeButton.addEventListener('click', () => {
            const next = environmentNames();
            next.splice(index, 1);
            state.wizardState.envOrder = next;
            render();
        });
        actions.append(upButton, downButton, removeButton);
        row.append(handle, label, actions);

        wireEnvironmentRowDnD(row, handle, index);
        return { row: row, index: index, warnings: warnings };
    }

    /**
     * Paint a single env-order row's inline validation into its warnings slot, mirroring the merged
     * env-order `canProceed` gate (required / pattern / uniqueness). Wipes the slot first so it can
     * be called repeatedly in place without recreating the input.
     *
     * @param {{index: number, warnings: HTMLElement}} row the row handle
     * @param {string[]} trimmedNames all trimmed names (for the cross-row uniqueness check)
     * @returns {void}
     */
    function setEnvironmentRowWarning(row, trimmedNames) {
        setText(row.warnings, '');
        const trimmedValue = (trimmedNames[row.index] || '').trim();
        let message = '';
        if (!trimmedValue) {
            message = 'Name required.';
        } else if (!ENVIRONMENT_NAME_PATTERN.test(trimmedValue)) {
            message = 'Only letters, digits, spaces, hyphens and underscores are allowed.';
        } else if (isDuplicateName(trimmedNames, row.index)) {
            message = 'Duplicate name — each environment must be unique.';
        }
        if (message) {
            row.warnings.append(makeElement('p', { class: 'mpb-warn', text: message }));
        }
    }

    /**
     * Wire drag-and-drop reordering for a single env-order row. Only the drag `handle` starts a
     * drag (so the row's name input stays editable); the whole `row` remains a valid drop target.
     * On drop, the dragged index is read from the drag payload and the list is reordered via
     * `moveEnvironment`.
     *
     * @param {HTMLElement} row the row element (drop target)
     * @param {HTMLElement} handle the drag handle (drag source)
     * @param {number} index the row's index
     * @returns {void}
     */
    function wireEnvironmentRowDnD(row, handle, index) {
        handle.addEventListener('dragstart', (event) => {
            if (!event.dataTransfer) {
                return;
            }
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
        });
        row.addEventListener('dragover', (event) => {
            event.preventDefault();
            row.classList.add('is-dragover');
        });
        row.addEventListener('dragleave', () => {
            row.classList.remove('is-dragover');
        });
        row.addEventListener('drop', (event) => {
            event.preventDefault();
            row.classList.remove('is-dragover');
            const raw = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
            const from = Number(raw);
            if (raw !== '' && Number.isSafeInteger(from)) {
                moveEnvironment(from, index);
            }
        });
    }

    /**
     * The DOM `data-env` value used for the Unassigned board column. A real environment can never be
     * named this (env names are pattern-validated and this carries a leading space), so it can never
     * collide with a user environment. Mapped to the `null` target of `assignBUToEnvironment`.
     */
    const UNASSIGNED_COLUMN = ' unassigned';

    /**
     * The SortableJS group name shared by every board column so chips can be dragged between them.
     */
    const BU_BOARD_GROUP = 'mpb-bus';

    /**
     * Live SortableJS instances for the current board render, destroyed before every re-render so a
     * discarded step host (which `renderWizardStep` replaces wholesale) never leaves dangling
     * handlers or leaked instances behind.
     *
     * @type {Array<{destroy: function(): void}>}
     */
    let buBoardSortables = [];

    /**
     * Tear down any Sortable instances left from a previous board render.
     *
     * @returns {void}
     */
    function destroyBUBoardSortables() {
        for (const instance of buBoardSortables) {
            try {
                instance.destroy();
            } catch {
                // A destroy() on an already-detached list can throw; the instance is being discarded
                // anyway, so swallow it rather than surface a non-actionable error.
            }
        }
        buBoardSortables = [];
    }

    /**
     * `bu-assign` step — a Jira-style board. Each BU belongs to exactly one environment: an
     * "Unassigned" column holds every not-yet-placed buRef and there is one column per environment.
     * Dragging a chip into an environment assigns it there (and removes it from wherever it was);
     * dragging back to Unassigned un-assigns it. buRefs read `<cred>/<BU>` when multiCred, bare
     * otherwise. Drag-drop (SortableJS) and a compact per-chip `<select>` (keyboard/a11y parity)
     * both route writes through `assignBUToEnvironment`, so the single-assignment invariant lives in
     * one place.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderBUAssignStep(panel) {
        // Any instances from the previous render belong to a now-discarded DOM tree — drop them.
        destroyBUBoardSortables();
        const references = pooledBUReferences();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Each business unit belongs to exactly one environment. Drag a BU from Unassigned into an environment (or use its dropdown); an environment holding more than one BU becomes a branching pipeline.',
            })
        );
        if (references.length === 0) {
            panel.append(
                makeElement('p', { class: 'mpb-warn', text: 'No business units were found in the loaded config.' })
            );
            return;
        }

        const hasSortable = Boolean(global.Sortable);
        if (!hasSortable) {
            // Offline / blocked CDN: SortableJS is absent, so drag-and-drop is unavailable. The
            // per-chip dropdown still assigns every BU, so the wizard stays fully usable.
            panel.append(
                makeElement('p', {
                    class: 'mpb-warn',
                    text: 'Drag-and-drop is unavailable (the SortableJS library did not load). Use each BU’s dropdown to assign it instead.',
                })
            );
        }

        // Split the board into a fixed left pool (Unassigned) and a right grid of environment
        // columns. The grid packs short columns upward independently of the tall pool, so QA/UAT/Prod
        // fill the space beside DEV/SIT instead of wrapping below Unassigned. SortableJS still finds
        // every `.mpb-board-list` (and their `data-env`) via `board.querySelectorAll`, regardless of
        // this extra nesting, so the shared drag group and DOM reconciliation are unaffected.
        const board = makeElement('div', { class: 'mpb-board' });
        const pool = makeElement('div', { class: 'mpb-board-pool' });
        pool.append(buBoardColumn(UNASSIGNED_COLUMN, 'Unassigned', unassignedBUReferences(), hasSortable));
        board.append(pool);
        const environmentRegion = makeElement('div', { class: 'mpb-board-envs' });
        for (const environment of environmentNames()) {
            environmentRegion.append(
                buBoardColumn(environment, environment || '(unnamed environment)', assignedBUReferences(environment), hasSortable)
            );
        }
        board.append(environmentRegion);
        panel.append(board);

        if (hasSortable) {
            wireBoardSortables(board);
        }
    }

    /**
     * Build one board column (Unassigned or a single environment) with its draggable BU chips and,
     * for environments, an empty-state warning.
     *
     * @param {string} columnKey the `data-env` key (`UNASSIGNED_COLUMN` or an env name)
     * @param {string} title the visible column heading
     * @param {string[]} references the buRefs currently in this column
     * @param {boolean} hasSortable whether SortableJS is available (drives the drag affordance)
     * @returns {HTMLElement} the column element
     */
    function buBoardColumn(columnKey, title, references, hasSortable) {
        const isUnassigned = columnKey === UNASSIGNED_COLUMN;
        const column = makeElement('div', {
            class: isUnassigned ? 'mpb-board-col mpb-board-col--pool' : 'mpb-board-col',
        });
        column.append(makeElement('h4', { class: 'mpb-board-col-title', text: title }));
        const list = makeElement('div', {
            class: 'mpb-board-list',
            attrs: { 'data-env': columnKey },
        });
        for (const reference of references) {
            list.append(buBoardChip(reference, columnKey, hasSortable));
        }
        column.append(list);
        if (!isUnassigned && references.length === 0) {
            column.append(makeElement('p', { class: 'mpb-warn', text: 'Assign at least one BU.' }));
        }
        return column;
    }

    /**
     * Build a single BU chip: the draggable buRef text plus a compact `<select>` that reassigns it
     * to any environment or back to Unassigned without dragging (keyboard/a11y parity). The chip's
     * `data-bu` lets the drop reconciliation read DOM order back into state.
     *
     * @param {string} reference the buRef this chip represents
     * @param {string} columnKey the column the chip currently lives in
     * @param {boolean} hasSortable whether SortableJS is available (drives the drag affordance)
     * @returns {HTMLElement} the chip element
     */
    function buBoardChip(reference, columnKey, hasSortable) {
        const chip = makeElement('div', {
            class: 'mpb-board-chip',
            attrs: { 'data-bu': reference },
        });
        if (hasSortable) {
            // A dedicated grip communicates the chip is draggable (Sortable drags the whole chip).
            chip.append(makeElement('span', { class: 'mpb-board-grip', text: '⠿', attrs: { 'aria-hidden': 'true' } }));
        }
        chip.append(makeElement('span', { class: 'mpb-board-chip-name', text: reference }));

        // Keyboard/a11y alternative to dragging: a compact env picker routed through the same invariant.
        const selectId = 'mpb-bu-move-' + reference.replaceAll(/[^a-zA-Z0-9]+/g, '-');
        const select = makeElement('select', {
            class: 'mpb-board-move',
            id: selectId,
            attrs: { 'aria-label': 'Assign ' + reference + ' to environment' },
        });
        select.append(
            makeElement('option', {
                value: UNASSIGNED_COLUMN,
                text: 'Unassigned',
                selected: columnKey === UNASSIGNED_COLUMN,
            })
        );
        for (const environment of environmentNames()) {
            select.append(
                makeElement('option', {
                    value: environment,
                    text: environment || '(unnamed environment)',
                    selected: environment === columnKey,
                })
            );
        }
        select.addEventListener('change', () => {
            assignBUToEnvironment(reference, select.value === UNASSIGNED_COLUMN ? null : select.value);
        });
        chip.append(select);
        return chip;
    }

    /**
     * Initialise a shared SortableJS group across all board lists so chips move between columns, and
     * reconcile `wizardState.envBUs` from the resulting DOM after every drop. SortableJS mutates the
     * DOM directly; we read the post-drop order back into state (via `reconcileBoardFromDOM`) and
     * then re-render from state — so the DOM is never the source of truth and no render loop forms
     * (the reconcile runs on `onEnd` only, and `render()` rebuilds the board fresh). Instances are
     * tracked for teardown on the next render.
     *
     * @param {HTMLElement} board the board container holding the `.mpb-board-list` columns
     * @returns {void}
     */
    function wireBoardSortables(board) {
        const lists = board.querySelectorAll('.mpb-board-list');
        for (const list of lists) {
            const instance = global.Sortable.create(list, {
                group: BU_BOARD_GROUP,
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                // Only reconcile once the drop settles; reading DOM order per column and writing it
                // back through the invariant keeps state authoritative and triggers a clean re-render.
                onEnd: () => reconcileBoardFromDOM(board),
            });
            buBoardSortables.push(instance);
        }
    }

    /**
     * Read the post-drop chip order out of every board column and rebuild `wizardState.envBUs` from
     * it, enforcing the single-assignment invariant (a buRef kept only in the first column that
     * lists it). The Unassigned column contributes no assignments. Re-renders so downstream steps
     * recompute. Runs only after a Sortable drop, never during a render, so it cannot loop.
     *
     * @param {HTMLElement} board the board container
     * @returns {void}
     */
    function reconcileBoardFromDOM(board) {
        const nextEnvironmentBUs = {};
        for (const environment of environmentNames()) {
            nextEnvironmentBUs[environment] = [];
        }
        const claimed = new Set();
        const lists = board.querySelectorAll('.mpb-board-list');
        for (const list of lists) {
            const columnKey = list.dataset.env;
            // The pool column contributes no assignments; only real env columns collect their chips.
            if (columnKey !== UNASSIGNED_COLUMN && Object.hasOwn(nextEnvironmentBUs, columnKey)) {
                nextEnvironmentBUs[columnKey] = collectColumnBUReferences(list, claimed);
            }
        }
        state.wizardState.envBUs = nextEnvironmentBUs;
        render();
    }

    /**
     * Read the buRefs from one board column's chips in DOM order, keeping only those not already
     * claimed by an earlier column (single-assignment invariant). Extracted so the reconcile stays a
     * flat single loop.
     *
     * @param {HTMLElement} list the `.mpb-board-list` element
     * @param {Set<string>} claimed the set of already-claimed buRefs (mutated)
     * @returns {string[]} the buRefs this column keeps, in DOM order
     */
    function collectColumnBUReferences(list, claimed) {
        const references = [];
        for (const chip of list.querySelectorAll('.mpb-board-chip')) {
            const reference = chip.dataset.bu;
            if (claimBUReference(claimed, reference)) {
                references.push(reference);
            }
        }
        return references;
    }

    /**
     * `lineage` step: only reached when at least one environment holds >1 BU (otherwise
     * `visibleSteps()` skips it). Auto-derives the obvious single-parent chains as defaults, then
     * shows a parent-BU selector per child buRef so the user can re-point ambiguous branches.
     * Lineage is stored keyed by child buRef → parent buRef.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderLineageStep(panel) {
        // Note: renderWizardStep() already tore down any prior lineage overlay before this call, so a
        // fresh overlay is mounted below without leaking the previous render's resize listener/frame.
        // Seed defaults for any unlinked child before rendering the selectors.
        autoDeriveLineage();
        const rows = lineageLinkRows();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Link each environment BU to the upstream BU it deploys from. Sensible defaults are filled in — adjust the branching ones as needed. Arrows show which upstream BU each one deploys from.',
            })
        );
        if (rows.length === 0) {
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Nothing to link yet — assign BUs first.' })
            );
            return;
        }

        // One column per environment (in env order); the lowest/source env has no upstream, so its
        // BUs are shown as read-only source nodes and every later env lists its child BUs with an
        // upstream-BU <select>. Columns spread evenly across the width (flex, no masonry wrap).
        const board = makeElement('div', { class: 'mpb-lineage-board' });
        const order = environmentNames();
        for (const [environmentIndex, environment] of order.entries()) {
            board.append(lineageColumn(environment, environmentIndex));
        }
        // The SVG overlay draws the child→parent connector arrows on top of the columns. It is
        // decorative (the <select>s carry the real state), so it is marked aria-hidden.
        const overlay = makeSvg('svg', { class: 'mpb-lineage-overlay', 'aria-hidden': 'true' });
        board.append(overlay);
        panel.append(board);
        // Anchor the overlay + schedule the first draw once the columns have a real layout, and keep
        // the arrows in sync with window resizes until the step is left (teardownLineageOverlay).
        mountLineageOverlay(board, overlay);
        // Enable drag-to-connect (native HTML5 DnD) on top of the <select> keyboard fallback.
        mountLineageDnd(board);
    }

    /**
     * Build one environment column for the lineage board: a titled column listing that environment's
     * BUs. The source (first) environment has no upstream, so its BUs are plain nodes; every later
     * environment gives each BU an upstream-BU `<select>`. Each BU node carries a stable id so the
     * SVG overlay can anchor connector arrows to it.
     *
     * @param {string} environment the environment name
     * @param {number} environmentIndex the environment's index in env order (0 = source)
     * @returns {HTMLElement} the column element
     */
    function lineageColumn(environment, environmentIndex) {
        const column = makeElement('div', { class: 'mpb-lineage-col' });
        column.append(
            makeElement('p', {
                class: 'mpb-lineage-col-title',
                text: environment || '(unnamed environment)',
            })
        );
        const parentOptions =
            environmentIndex > 0 ? assignedBUReferences(environmentNames()[environmentIndex - 1]) : [];
        for (const reference of assignedBUReferences(environment)) {
            column.append(lineageNode(environmentIndex, reference, parentOptions));
        }
        return column;
    }

    /**
     * Build one BU node inside a lineage column: the BU name, plus (for non-source environments) an
     * upstream-BU `<select>` that writes the child→parent lineage. The node id is stable across
     * renders so the SVG overlay can look up its bounding box.
     *
     * @param {number} environmentIndex the environment's index in env order
     * @param {string} reference the BU reference
     * @param {string[]} parentOptions the upstream env's BU references (empty for the source env)
     * @returns {HTMLElement} the node element
     */
    function lineageNode(environmentIndex, reference, parentOptions) {
        const node = makeElement('div', {
            class: 'mpb-lineage-node',
            // draggable + data-env-index drive the native drag-to-connect handlers (mountLineageDnd):
            // dragging a lower-env node onto the adjacent higher-env node creates the lineage link.
            draggable: true,
            attrs: {
                id: lineageNodeId(reference),
                'data-bu': reference,
                'data-env-index': String(environmentIndex),
            },
        });
        node.append(makeElement('span', { class: 'mpb-lineage-node-name', text: reference }));
        // The source env has no upstream to choose — its BUs are pure connector targets/sources.
        if (environmentIndex === 0) {
            return node;
        }
        const current = (state.wizardState.lineage || {})[reference] || '';
        const selectId = 'mpb-lineage-sel-' + environmentIndex + '-' + reference;
        const label = makeElement('label', {
            class: 'mpb-lineage-node-label',
            text: 'deploys from',
            attrs: { for: selectId },
        });
        const select = makeElement('select', { id: selectId, class: 'mpb-lineage-select' });
        select.append(makeElement('option', { value: '', text: '— choose upstream BU —' }));
        for (const option of parentOptions) {
            select.append(
                makeElement('option', { value: option, text: option, selected: option === current })
            );
        }
        select.addEventListener('change', () => {
            const lineage = { ...state.wizardState.lineage };
            if (select.value) {
                lineage[reference] = select.value;
            } else {
                delete lineage[reference];
            }
            state.wizardState.lineage = lineage;
            render();
        });
        node.append(label, select);
        return node;
    }

    /**
     * Stable DOM id for a lineage BU node, so the SVG overlay can resolve a child/parent buRef to its
     * on-screen box. A buRef is unique per board (single-assignment invariant), so the ref alone is a
     * safe key. Non-id-safe characters (`/` from multiCred refs, spaces) are encoded to keep the id
     * valid for a `#<id>` CSS selector.
     *
     * @param {string} reference the BU reference
     * @returns {string} the element id
     */
    function lineageNodeId(reference) {
        return 'mpb-lin-node-' + reference.replaceAll(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Whether a drag-to-connect gesture is a valid lineage link. Lineage only ever links an env to
     * the env immediately upstream (env index +1), and the drag direction is lower→higher env, so a
     * drop is valid only when the target column is exactly one to the right of the dragged node's
     * column. Rightward-onto-lower, onto-self, and skip-a-column drops are all rejected.
     *
     * @param {number} fromEnvironmentIndex the dragged (parent/source) node's env index
     * @param {number} toEnvironmentIndex the drop-target (child) node's env index
     * @returns {boolean} true only when `toEnvironmentIndex === fromEnvironmentIndex + 1`
     */
    function isValidLineageDrag(fromEnvironmentIndex, toEnvironmentIndex) {
        return (
            Number.isSafeInteger(fromEnvironmentIndex) &&
            Number.isSafeInteger(toEnvironmentIndex) &&
            toEnvironmentIndex === fromEnvironmentIndex + 1
        );
    }

    /**
     * Apply a lineage mapping (`child deploys from parent`) in place: update
     * `state.wizardState.lineage`, sync the child's upstream `<select>` value, redraw the connector
     * arrows, refresh the nav gate, and schedule an autosave — without a full re-render, so a drag
     * never blurs focus or rebuilds the board. Mirrors the in-place update pattern used by the
     * text-input handlers.
     *
     * @param {string} childReference the child BU reference (higher/target env)
     * @param {string} parentReference the parent BU reference (lower/source env)
     * @param {HTMLElement} board the lineage board container (to locate the child's select)
     * @returns {void}
     */
    function setLineageMapping(childReference, parentReference, board) {
        const lineage = { ...state.wizardState.lineage , [childReference]: parentReference,};
        state.wizardState.lineage = lineage;
        // Keep the keyboard/a11y <select> in sync with the drag-created mapping.
        const childNode = board.querySelector('#' + lineageNodeId(childReference));
        const select = childNode ? childNode.querySelector('.mpb-lineage-select') : null;
        if (select) {
            select.value = parentReference;
        }
        drawLineageArrows();
        updateNavGate();
        scheduleAutosave();
    }

    /**
     * The SVG XML namespace, needed because SVG elements must be created with `createElementNS`
     * (a plain `createElement('svg')` yields an inert HTML-namespaced element that never renders).
     *
     * @type {string}
     */
    const SVG_NS = 'http://www.w3.org/2000/svg';

    /**
     * Create an SVG element in the SVG namespace and apply attributes. The connector overlay is
     * decorative geometry only (no user data), so plain attribute strings are safe here.
     *
     * @param {string} tag the SVG tag name (`svg` / `marker` / `path` / `line`)
     * @param {{[attribute: string]: (string|number)}} [attributes] attribute name → value map
     * @returns {SVGElement} the created element
     */
    function makeSvg(tag, attributes) {
        const element = document_.createElementNS(SVG_NS, tag);
        const entries = Object.entries(attributes || {});
        for (const [name, value] of entries) {
            element.setAttribute(name, String(value));
        }
        return element;
    }

    /**
     * Module-scoped handle for the active lineage connector overlay: the board + svg it draws into,
     * the bound resize listener, and any pending animation frame. Non-null only while the lineage
     * step is mounted so `teardownLineageOverlay` can remove the listener and cancel the frame.
     *
     * @type {({board: HTMLElement, svg: SVGElement, onResize: () => void, frame: (number|null)}|null)}
     */
    let lineageOverlay = null;

    /**
     * The connector arrow colour — the Marketing accent already used for the diagramforce preview,
     * kept subtle. Mirrors `DIAGRAM_ACCENT` so the lineage arrows and the exported diagram share a
     * palette without coupling the two features.
     *
     * @type {string}
     */
    const LINEAGE_ARROW_COLOR = '#F49825';

    /**
     * Mount the lineage connector overlay: size the SVG to the board, draw the initial arrows, and
     * keep them aligned on window resize (rAF-debounced). Redraws on `<select>` change happen for
     * free because a change re-renders the whole step, which re-mounts the overlay. The listener is
     * removed by `teardownLineageOverlay` when the step is left, so nothing leaks.
     *
     * @param {HTMLElement} board the lineage board container
     * @param {SVGElement} svg the overlay svg element
     * @returns {void}
     */
    function mountLineageOverlay(board, svg) {
        // Guard hosts without a real layout engine (the Node test stub) — nothing to draw there.
        if (typeof board.getBoundingClientRect !== 'function' || !global.requestAnimationFrame) {
            return;
        }
        const onResize = () => {
            if (lineageOverlay && lineageOverlay.frame !== null) {
                return;
            }
            if (lineageOverlay) {
                lineageOverlay.frame = global.requestAnimationFrame(() => {
                    if (!lineageOverlay) {
                    	return;
                    }

                    lineageOverlay.frame = null;
                    drawLineageArrows();
                });
            }
        };
        lineageOverlay = { board: board, svg: svg, onResize: onResize, frame: null };
        if (global.addEventListener) {
            global.addEventListener('resize', onResize);
        }
        // Draw on the next frame so the columns have their final laid-out sizes.
        lineageOverlay.frame = global.requestAnimationFrame(() => {
            if (!lineageOverlay) {
            	return;
            }

            lineageOverlay.frame = null;
            drawLineageArrows();
        });
    }

    /**
     * Draw one arrowed connector per child→parent lineage link over the current board: from the
     * parent (upstream) BU node to the child BU node, with the arrowhead pointing at the child. All
     * geometry is derived from live `getBoundingClientRect` deltas against the board's own rect, so
     * the lines stay correct across column reflow. Rebuilt from scratch each call (cheap, and avoids
     * stale segments).
     *
     * @returns {void}
     */
    function drawLineageArrows() {
        if (!lineageOverlay) {
            return;
        }
        const { board, svg } = lineageOverlay;
        const boardRect = board.getBoundingClientRect();
        // Size the SVG viewport to the board so its coordinate system matches the board's pixels.
        svg.setAttribute('width', String(boardRect.width));
        svg.setAttribute('height', String(boardRect.height));
        svg.setAttribute('viewBox', '0 0 ' + boardRect.width + ' ' + boardRect.height);
        // Reset content, then (re)add the shared arrowhead marker def.
        setText(svg, '');
        svg.append(buildArrowMarkerDefs());
        const lineage = state.wizardState.lineage || {};
        const links = Object.entries(lineage);
        for (const [childReference, parentReference] of links) {
            // ids are sanitised by lineageNodeId, so `#<id>` is always a valid selector; scope the
            // lookup to the board so a stale same-id node elsewhere can never be matched.
            const childNode = board.querySelector('#' + lineageNodeId(childReference));
            const parentNode = board.querySelector('#' + lineageNodeId(parentReference));
            if (childNode && parentNode) {
                svg.append(buildArrowPath(boardRect, parentNode, childNode));
            }
        }
    }

    /**
     * Build the `<defs>` holding the single reusable arrowhead `<marker>`, pointing right and tinted
     * with the lineage accent colour.
     *
     * @returns {SVGElement} the defs element
     */
    function buildArrowMarkerDefs() {
        const defs = makeSvg('defs');
        const marker = makeSvg('marker', {
            id: 'mpb-lineage-arrowhead',
            markerWidth: 8,
            markerHeight: 8,
            refX: 7,
            refY: 4,
            orient: 'auto',
            markerUnits: 'userSpaceOnUse',
        });
        marker.append(makeSvg('path', { d: 'M0,0 L8,4 L0,8 Z', fill: LINEAGE_ARROW_COLOR }));
        defs.append(marker);
        return defs;
    }

    /**
     * Build one smooth cubic-Bézier connector from a parent node's right edge to a child node's left
     * edge, both expressed in board-local coordinates, ending in the shared arrowhead marker (so the
     * arrow points at the child). The control points are offset horizontally by ~45% of the span so
     * the curve leaves the source and arrives at the target horizontally — a gentle S-curve that
     * reads left-to-right (and still enters/exits toward the neighbour when columns stack). No
     * mid-line decoration is drawn.
     *
     * @param {DOMRect} boardRect the board's bounding rect (the coordinate origin)
     * @param {HTMLElement} parentNode the upstream BU node (curve start)
     * @param {HTMLElement} childNode the child BU node (arrow target)
     * @returns {SVGElement} the path element
     */
    function buildArrowPath(boardRect, parentNode, childNode) {
        const parentRect = parentNode.getBoundingClientRect();
        const childRect = childNode.getBoundingClientRect();
        // Start at the parent's right-middle, end at the child's left-middle, relative to the board.
        const x1 = parentRect.right - boardRect.left;
        const y1 = parentRect.top + parentRect.height / 2 - boardRect.top;
        const x2 = childRect.left - boardRect.left;
        const y2 = childRect.top + childRect.height / 2 - boardRect.top;
        // Horizontal control-point offset: 45% of the horizontal span keeps the curve tangent to the
        // horizontal at both ends. Clamped to a small minimum so a near-zero span (stacked columns)
        // still bows out instead of collapsing to a straight segment.
        const dx = x2 - x1;
        const handle = Math.max(Math.abs(dx) * 0.45, 24);
        const cx1 = x1 + handle;
        const cx2 = x2 - handle;
        const d = 'M ' + x1 + ' ' + y1 + ' C ' + cx1 + ' ' + y1 + ', ' + cx2 + ' ' + y2 + ', ' + x2 + ' ' + y2;
        return makeSvg('path', {
            d: d,
            fill: 'none',
            stroke: LINEAGE_ARROW_COLOR,
            'stroke-width': 1.8,
            'stroke-linecap': 'round',
            'marker-end': 'url(#mpb-lineage-arrowhead)',
        });
    }

    /**
     * Tear down the lineage connector overlay: remove the resize listener and cancel any pending
     * animation frame. Called whenever the lineage step re-renders or is left, mirroring the board
     * sortable teardown so a discarded step host never leaves a dangling handler behind.
     *
     * @returns {void}
     */
    function teardownLineageOverlay() {
        if (!lineageOverlay) {
            return;
        }
        if (global.removeEventListener) {
            global.removeEventListener('resize', lineageOverlay.onResize);
        }
        if (lineageOverlay.frame !== null && global.cancelAnimationFrame) {
            global.cancelAnimationFrame(lineageOverlay.frame);
        }
        lineageOverlay = null;
    }

    /**
     * Module-scoped handle for the active lineage drag-to-connect wiring: the board it is bound to
     * and the delegated listeners registered on it, so `teardownLineageDnd` can remove them when the
     * step is left. Non-null only while the lineage step is mounted.
     *
     * @type {({board: HTMLElement, listeners: {type: string, handler: (event: DragEvent) => void}[]}|null)}
     */
    let lineageDnd = null;

    /**
     * The lineage node currently being dragged (its parent/source BU reference + env index), or null
     * when no drag is in progress. Set on `dragstart`, cleared on `dragend`.
     *
     * @type {({reference: string, environmentIndex: number}|null)}
     */
    let lineageDragSource = null;

    /**
     * Resolve the `.mpb-lineage-node` element for a drag event target, or null when the event did not
     * originate on a BU node (e.g. dragging over the board gap or the decorative overlay).
     *
     * @param {EventTarget|null} target the event target
     * @returns {HTMLElement|null} the closest lineage node element, or null
     */
    function lineageNodeFromTarget(target) {
        if (!target || typeof target.closest !== 'function') {
            return null;
        }
        return target.closest('.mpb-lineage-node');
    }

    /**
     * `dragstart` handler for a lineage node: record the dragged node's BU reference + env index as
     * the drag source (it is the parent/source of the mapping) and flag it visually.
     *
     * @param {DragEvent} event the drag event
     * @returns {void}
     */
    function onLineageDragStart(event) {
        const node = lineageNodeFromTarget(event.target);
        if (!node) {
            return;
        }
        lineageDragSource = {
            reference: node.dataset.bu,
            environmentIndex: Number(node.dataset.envIndex),
        };
        node.classList.add('is-dragging');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'link';
            // A payload is required for Firefox to start the drag; the real state lives in
            // lineageDragSource.
            event.dataTransfer.setData('text/plain', lineageDragSource.reference);
        }
    }

    /**
     * `dragover` handler: highlight the hovered node as a valid drop target (and mark it a drop zone
     * via preventDefault) only when it is exactly one column to the right of the drag source;
     * otherwise show the invalid state.
     *
     * @param {DragEvent} event the drag event
     * @returns {void}
     */
    function onLineageDragOver(event) {
        const node = lineageNodeFromTarget(event.target);
        if (!node || !lineageDragSource) {
            return;
        }
        const targetIndex = Number(node.dataset.envIndex);
        const isValid = isValidLineageDrag(lineageDragSource.environmentIndex, targetIndex);
        // preventDefault on a valid target is what makes it a drop zone.
        if (isValid) {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'link';
            }
            node.classList.add('is-drop-target');
        } else {
            node.classList.add('is-drop-invalid');
        }
    }

    /**
     * `dragleave` handler: clear the drop-target/invalid highlight as the pointer exits a node.
     *
     * @param {DragEvent} event the drag event
     * @returns {void}
     */
    function onLineageDragLeave(event) {
        const node = lineageNodeFromTarget(event.target);
        if (node) {
            node.classList.remove('is-drop-target', 'is-drop-invalid');
        }
    }

    /**
     * Enable drag-to-connect on the lineage board using native HTML5 drag-and-drop. Dragging a BU
     * node (lower env) onto the BU node directly one column to the right (higher env) creates the
     * mapping `lineage[child] = parent`. Native DnD is used instead of SortableJS because the gesture
     * targets a *specific* node to form a pair (SortableJS is list-reorder oriented). All listeners
     * are delegated on the board and tracked for teardown. The `<select>` keeps working for keyboard
     * users and stays in sync via `setLineageMapping`. The `drop`/`dragend` handlers close over the
     * board (to resolve nodes and clear stale highlights); the source/over/leave handlers are
     * module-scoped as they only touch module state.
     *
     * @param {HTMLElement} board the lineage board container
     * @returns {void}
     */
    function mountLineageDnd(board) {
        // Guard hosts without DOM drag support (the Node test stub): the pure logic is unit-tested via
        // isValidLineageDrag / setLineageMapping, so skipping the wiring here is safe.
        if (typeof board.addEventListener !== 'function') {
            return;
        }
        const onDrop = (event) => {
            const node = lineageNodeFromTarget(event.target);
            node?.classList.remove('is-drop-target', 'is-drop-invalid');
            if (!node || !lineageDragSource) {
                return;
            }
            const targetIndex = Number(node.dataset.envIndex);
            if (!isValidLineageDrag(lineageDragSource.environmentIndex, targetIndex)) {
                return;
            }
            event.preventDefault();
            // Dragged node = parent/source (lower env); drop target = child (higher env).
            const childReference = node.dataset.bu;
            setLineageMapping(childReference, lineageDragSource.reference, board);
        };
        const onDragEnd = () => {
            if (lineageDragSource) {
                const previous = board.querySelector(
                    '#' + lineageNodeId(lineageDragSource.reference)
                );
                previous?.classList.remove('is-dragging');
            }
            for (const node of board.querySelectorAll('.mpb-lineage-node')) {
                node.classList.remove('is-drop-target', 'is-drop-invalid');
            }
            lineageDragSource = null;
        };
        const listeners = [
            { type: 'dragstart', handler: onLineageDragStart },
            { type: 'dragover', handler: onLineageDragOver },
            { type: 'dragleave', handler: onLineageDragLeave },
            { type: 'drop', handler: onDrop },
            { type: 'dragend', handler: onDragEnd },
        ];
        for (const { type, handler } of listeners) {
            board.addEventListener(type, handler);
        }
        lineageDnd = { board: board, listeners: listeners };
    }

    /**
     * Tear down the lineage drag-to-connect wiring: remove every delegated listener from the board
     * and clear the in-progress drag source. Called alongside the overlay teardown so a discarded
     * step host never leaves dangling drag handlers behind.
     *
     * @returns {void}
     */
    function teardownLineageDnd() {
        if (!lineageDnd) {
            return;
        }
        for (const { type, handler } of lineageDnd.listeners) {
            lineageDnd.board.removeEventListener(type, handler);
        }
        lineageDnd = null;
        lineageDragSource = null;
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

    /**
     * `suffixes` step: a shared separator input plus a per-child-BU suffix editor. Values are
     * trimmed before storing; an internal space triggers a stern (non-rewriting) warning; multi-BU
     * environments auto-number their suffixes but every field stays editable. The stored suffix
     * always includes the leading separator, and child-BU suffixes must be distinct (the parent BU
     * reuses them and is exempt).
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderSuffixesStep(panel) {
        seedSuffixes();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Give each business unit a distinct key suffix. The separator is enforced in front of every suffix. Multi-BU environments are auto-numbered — override them as you like (e.g. _UATN / _UATS).',
            })
        );

        const references = childBUReferences();
        if (references.length === 0) {
            panel.append(separatorField(() => {}));
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }

        // Keep a reference to every rendered row so text-input edits can refresh the inline warnings
        // (and the shown separator prefix) IN PLACE — never rebuilding the inputs, which would blur
        // the focused field and jump the scroll to the top.
        const rows = [];

        /**
         * Recompute and repaint every row's inline warnings in place. Duplicate detection is
         * cross-row, so editing one suffix can change another row's flag — hence all rows refresh
         * together. The input elements themselves are left untouched.
         *
         * @returns {void}
         */
        function refreshSuffixWarnings() {
            const separator = state.wizardState.separator || '_';
            // Duplicate index over the current stored values.
            const counts = new Map();
            for (const reference of childBUReferences()) {
                const value = suffixOf(reference);
                counts.set(value, (counts.get(value) || 0) + 1);
            }
            for (const row of rows) {
                setText(row.warnings, '');
                const stored = suffixOf(row.reference);
                const storedBody = stored.startsWith(separator)
                    ? stored.slice(separator.length)
                    : stored;
                // Internal-space warning reflects the RAW typed body (not the trimmed stored copy).
                if (/\s/.test(row.input.value.trim())) {
                    row.warnings.append(
                        makeElement('p', {
                            class: 'mpb-warn',
                            text: 'Avoid spaces inside a suffix — they can break mcdev CLI commands later.',
                        })
                    );
                }
                if (storedBody.trim() && counts.get(stored) > 1) {
                    row.warnings.append(
                        makeElement('p', {
                            class: 'mpb-warn',
                            text: 'Duplicate suffix — each child BU needs a distinct suffix.',
                        })
                    );
                }
            }
        }

        // The separator input re-bases suffixes in state, updates each row's shown prefix span, then
        // refreshes warnings + the nav gate + autosave — all in place (no full render / blur).
        panel.append(
            separatorField(() => {
                const separator = state.wizardState.separator || '_';
                for (const row of rows) {
                    setText(row.sep, separator);
                }
                refreshSuffixWarnings();
                updateNavGate();
                scheduleAutosave();
            })
        );

        const list = makeElement('div', { class: 'mpb-list' });
        for (const environment of environmentNames()) {
            for (const reference of assignedBUReferences(environment)) {
                const row = suffixRow(environment, reference, refreshSuffixWarnings);
                rows.push(row);
                list.append(row.field);
            }
        }
        panel.append(list);
        // Initial warning paint now that every row exists (so cross-row duplicates resolve).
        refreshSuffixWarnings();
    }

    /**
     * The shared separator input. Changing it re-bases every stored suffix onto the new separator
     * (so stored values stay `<sep><body>`) and then invokes `onInput` so the caller can refresh the
     * dependent UI in place instead of re-rendering the whole step.
     *
     * @param {() => void} onInput callback fired after each keystroke updates the state
     * @returns {HTMLElement} the separator field
     */
    function separatorField(onInput) {
        const field = makeElement('div', { class: 'mpb-field' });
        field.append(makeElement('label', { text: 'Separator', attrs: { for: 'mpb-separator' } }));
        const input = makeElement('input', {
            type: 'text',
            id: 'mpb-separator',
            class: 'mpb-separator-input',
            value: state.wizardState.separator || '_',
            attrs: { autocomplete: 'off', spellcheck: 'false', maxlength: '2', 'aria-label': 'Key separator' },
        });
        input.addEventListener('input', () => {
            const previous = state.wizardState.separator || '_';
            const next = input.value || '_';
            // Re-base every stored suffix onto the new separator (swap only the leading separator).
            const suffixes = { ...state.wizardState.suffixes };
            for (const reference of Object.keys(suffixes)) {
                const value = suffixes[reference];
                const body = value.startsWith(previous) ? value.slice(previous.length) : value;
                suffixes[reference] = next + body;
            }
            state.wizardState.separator = next;
            state.wizardState.suffixes = suffixes;
            onInput();
        });
        field.append(input);
        return field;
    }

    /**
     * Build one suffix editing row for a single child buRef, with the separator shown as a fixed
     * prefix, an editable body, and inline internal-space / duplicate warnings. Typing updates only
     * state + the inline warnings (via `refreshWarnings`) so the focused input is never rebuilt.
     *
     * @param {string} environment the owning environment (for context labelling)
     * @param {string} reference the child buRef
     * @param {() => void} refreshWarnings repaint every row's warnings in place after a state edit
     * @returns {{field: HTMLElement, input: HTMLInputElement, sep: HTMLElement, warnings: HTMLElement, reference: string}}
     *   the row element plus the handles needed for in-place refreshes
     */
    function suffixRow(environment, reference, refreshWarnings) {
        const separator = state.wizardState.separator || '_';
        const field = makeElement('div', { class: 'mpb-field' });
        const inputId = 'mpb-suffix-' + suffixSlug(environment) + '-' + suffixSlug(reference);
        // In validations-only mode the environment is a synthetic pool ("All BUs"), so the label is
        // just the BU name; in full-pipeline mode it is prefixed with the (real) environment.
        const labelText = state.mode === 'validations' ? reference : environment + ' · ' + reference;
        field.append(makeElement('label', { text: labelText, attrs: { for: inputId } }));

        const group = makeElement('div', { class: 'mpb-suffix-input' });
        const separatorSpan = makeElement('span', { class: 'mpb-suffix-sep', text: separator });
        group.append(separatorSpan);
        const stored = suffixOf(reference);
        const body = stored.startsWith(separator) ? stored.slice(separator.length) : stored;
        const input = makeElement('input', {
            type: 'text',
            id: inputId,
            value: body,
            attrs: { autocomplete: 'off', spellcheck: 'false' },
        });
        input.addEventListener('input', () => {
            // Store the leading/trailing-trimmed body (internal spaces are only warned about). The
            // visible input value is left as typed so the caret is never fought mid-typing.
            const activeSeparator = state.wizardState.separator || '_';
            const trimmedBody = input.value.trim();
            state.wizardState.suffixes = {
                ...state.wizardState.suffixes,
                [reference]: activeSeparator + trimmedBody,
            };
            // Refresh only the inline warnings (cross-row duplicates included), the nav gate and the
            // debounced autosave — never a full render that would blur this input.
            refreshWarnings();
            updateNavGate();
            scheduleAutosave();
        });
        group.append(input);
        field.append(group);

        // Dedicated warnings slot so it can be wiped + repainted in place without touching the input.
        const warnings = makeElement('div', { class: 'mpb-suffix-warnings' });
        field.append(warnings);

        return { field: field, input: input, sep: separatorSpan, warnings: warnings, reference: reference };
    }

    // ─────────────────────────── prod-confirm step ───────────────────────────

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
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }

        const productionBUs = new Set(state.wizardState.prodBUs || []);
        const list = makeElement('div', { class: 'mpb-list' });
        for (const reference of references) {
            const label = makeElement('label', { class: 'mpb-field' });
            const checkbox = makeElement('input', {
                type: 'checkbox',
                checked: productionBUs.has(reference),
            });
            checkbox.addEventListener('change', () => {
                toggleProductionBU(reference, checkbox.checked);
            });
            label.append(checkbox, makeElement('span', { text: ' ' + reference }));
            list.append(label);
        }
        panel.append(list);
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
            ? (current.includes(reference) ? current : [...current, reference])
            : current.filter((existing) => existing !== reference);
        state.wizardState.prodBUs = next;
        render();
    }

    // ─────────────────────────── rules step ───────────────────────────

    /**
     * Retention-policy option lists for the `sendableDeRetention` mini-wizard. Values match the
     * DevTools data-extension metadata model consumed verbatim by the validations builder.
     */
    const RETENTION_TYPE_OPTIONS = [
        { value: 'individialRecords', label: 'Individual records' },
        { value: 'allRecords', label: 'All records' },
        { value: 'allRecordsAndDataextension', label: 'All records and the data extension' },
        { value: 'none', label: 'No retention policy' },
    ];
    const RETENTION_UNIT_OPTIONS = ['Years', 'Months', 'Weeks', 'Days'];

    /**
     * Which rule mini-wizard `<details>` panels are currently expanded. This is UI-only state (not
     * part of `wizardState`, so it is neither persisted nor fed to the builders); it is reapplied on
     * every `render()` so a panel stays open while the user edits inputs inside it.
     *
     * @type {Set<string>}
     */
    const openMiniWizards = new Set();

    /**
     * Catalogue of user-selectable validation rules for the rule picker. `keySuffix` is always
     * emitted by the builder and is therefore not offered here. `miniWizard` marks the two rules
     * whose `<details>` sub-config is built in Chunk 3. Descriptions are original one-liners.
     */
    const RULE_CATALOG = [
        {
            id: 'noGuidKeys',
            name: 'No GUID keys',
            description: 'Flags metadata still keyed by a raw GUID instead of a readable key.',
            autoFix: false,
        },
        {
            id: 'properJourneyDeNameAndKey',
            name: 'Named journey DEs',
            description: 'Flags journey data extensions left with the default "New Journey" name or key.',
            autoFix: false,
        },
        {
            id: 'filterText',
            name: 'No test / archive items',
            description: 'Blocks names, keys and folder paths that look like test or archive leftovers.',
            autoFix: true,
        },
        {
            id: 'noSharedAssets',
            name: 'No shared assets',
            description: 'Flags assets shared across business units instead of cloned per BU.',
            autoFix: true,
        },
        {
            id: 'onlyCBbyKey',
            name: 'Content blocks by key',
            description: 'Requires content blocks to be referenced by key, not by id or name.',
            autoFix: false,
        },
        {
            id: 'noMultipartEmails',
            name: 'No multipart journey emails',
            description: 'Ensures journey email activities keep isMultipart off to avoid duplicates.',
            autoFix: true,
        },
        {
            id: 'payloadParameterDEsNoPrimaryKey',
            name: 'No PK on payload DEs',
            description: 'Flags "_PayloadParameters" data extensions that carry a primary key.',
            autoFix: true,
        },
        {
            id: 'noMidDependentCode',
            name: 'No hard-coded MIDs',
            description: 'Flags asset code that hard-codes a business-unit MID instead of a market variable.',
            autoFix: false,
        },
        {
            id: 'filterPrefixByBu',
            name: 'Forbidden prefixes per BU',
            description: 'Blocks configured key/name prefixes on specific business units.',
            autoFix: true,
            miniWizard: true,
        },
        {
            id: 'sendableDeRetention',
            name: 'Sendable DE retention policy',
            description: 'Enforces a data-retention policy on sendable data extensions in production.',
            autoFix: true,
            miniWizard: true,
        },
    ];

    /**
     * `rules` step: a checkbox rule picker feeding the derived `validationsState.selectedRules`.
     * Each row shows the rule name, a short description and an auto-fix badge. The two mini-wizard
     * rules leave a marked mount point where their `<details>` sub-config is built in Chunk 3. This
     * step is also the sole visible step in validations-only mode.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderRulesStep(panel) {
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Pick the validation rules to generate. keySuffix is always included. Selecting no extra rules is fine.',
            })
        );

        const selected = new Set(Array.isArray(state.wizardState.selectedRules) ? state.wizardState.selectedRules : []);
        const list = makeElement('div', { class: 'mpb-list' });
        for (const rule of RULE_CATALOG) {
            list.append(ruleRow(rule, selected.has(rule.id)));
        }
        panel.append(list);
    }

    /**
     * Build one rule-picker row: a checkbox with the rule name, description and an auto-fix badge.
     * Mini-wizard rules also mount a Chunk-3 placeholder for their `<details>` sub-config.
     *
     * @param {{id: string, name: string, description: string, autoFix: boolean, miniWizard?: boolean}} rule the rule
     * @param {boolean} isSelected whether the rule is currently selected
     * @returns {HTMLElement} the row element
     */
    function ruleRow(rule, isSelected) {
        const row = makeElement('div', { class: 'mpb-rule' });
        const label = makeElement('label', { class: 'mpb-field' });
        const checkbox = makeElement('input', { type: 'checkbox', checked: isSelected });
        checkbox.addEventListener('change', () => {
            toggleRule(rule.id, checkbox.checked);
        });
        const heading = makeElement('span', { class: 'mpb-rule-head' });
        heading.append(makeElement('span', { class: 'mpb-rule-name', text: rule.name }));
        if (rule.autoFix) {
            heading.append(makeElement('span', { class: 'mpb-chip', text: 'auto-fix' }));
        }
        label.append(checkbox, heading);
        row.append(label);
        row.append(makeElement('p', { class: 'mpb-rule-desc text-muted', text: rule.description }));

        // Mini-wizard rules mount a native <details> sub-config, but only while the rule is
        // selected — toggling the checkbox OFF hides (and effectively ignores) the sub-config.
        if (isSelected && rule.miniWizard) {
            row.append(miniWizardDetails(rule.id));
        }
        return row;
    }

    /**
     * Build the `<details>/<summary>` sub-wizard for a mini-wizard rule. The panel body is picked by
     * rule id: `filterPrefixByBu` → a per-BU forbidden-prefix blacklist editor; `sendableDeRetention`
     * → an applies-to (production BUs) selector plus the retention-policy inputs. Its open/closed
     * state is remembered in `openMiniWizards` so a `render()` triggered by editing inside it keeps
     * the panel open.
     *
     * @param {string} ruleId the mini-wizard rule id
     * @returns {HTMLElement} the `<details>` element
     */
    function miniWizardDetails(ruleId) {
        const details = makeElement('details', { class: 'mpb-mini' });
        if (openMiniWizards.has(ruleId)) {
            details.open = true;
        }
        details.addEventListener('toggle', () => {
            if (details.open) {
                openMiniWizards.add(ruleId);
            } else {
                openMiniWizards.delete(ruleId);
            }
        });
        details.append(makeElement('summary', { text: 'Configure this rule' }));
        const body = makeElement('div', { class: 'mpb-mini-body' });
        if (ruleId === 'filterPrefixByBu') {
            renderPrefixBlacklist(body);
        } else if (ruleId === 'sendableDeRetention') {
            renderRetentionPolicy(body);
        }
        details.append(body);
        return details;
    }

    // ── filterPrefixByBu mini-wizard ──

    /**
     * The forbidden prefixes stored for a child buRef, always as a fresh array.
     *
     * @param {string} reference the child buRef
     * @returns {string[]} the forbidden prefixes for that BU
     */
    function prefixesFor(reference) {
        const map = state.wizardState.prefixBlacklist || {};
        const list = map[reference];
        return Array.isArray(list) ? [...list] : [];
    }

    /**
     * Add a trimmed forbidden prefix for a child buRef (ignoring blanks and case-insensitive dupes)
     * and re-render.
     *
     * @param {string} reference the child buRef
     * @param {string} prefix the prefix to add
     * @returns {void}
     */
    function addPrefix(reference, prefix) {
        const trimmed = String(prefix).trim();
        if (!trimmed) {
            return;
        }
        const current = prefixesFor(reference);
        if (current.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
            return;
        }
        state.wizardState.prefixBlacklist = {
            ...state.wizardState.prefixBlacklist,
            [reference]: [...current, trimmed],
        };
        render();
    }

    /**
     * Remove a forbidden prefix from a child buRef and re-render.
     *
     * @param {string} reference the child buRef
     * @param {string} prefix the prefix to remove
     * @returns {void}
     */
    function removePrefix(reference, prefix) {
        const next = prefixesFor(reference).filter((existing) => existing !== prefix);
        state.wizardState.prefixBlacklist = {
            ...state.wizardState.prefixBlacklist,
            [reference]: next,
        };
        render();
    }

    /**
     * `filterPrefixByBu` mini-wizard body: a per-child-BU editor for the forbidden-prefix blacklist.
     * An item fails the rule only when its key or name starts with one of that BU's prefixes;
     * everything else (including generic no-prefix items) passes, and a BU with no prefixes passes
     * everything. Prefixes are trimmed; internal spaces trigger a stern (non-rewriting) warning,
     * consistent with the suffix step.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderPrefixBlacklist(body) {
        body.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Add key/name prefixes that must NOT appear on each business unit. Items that do not start with a listed prefix (including generic items) always pass.',
            })
        );
        const references = childBUReferences();
        if (references.length === 0) {
            body.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }
        const list = makeElement('div', { class: 'mpb-list' });
        for (const reference of references) {
            list.append(prefixBURow(reference));
        }
        body.append(list);
    }

    /**
     * Build one BU block in the prefix-blacklist editor: the BU label, its current prefixes as
     * removable chips, and an input + "Add" button to append a new forbidden prefix.
     *
     * @param {string} reference the child buRef
     * @returns {HTMLElement} the BU block element
     */
    function prefixBURow(reference) {
        const field = makeElement('div', { class: 'mpb-field' });
        field.append(makeElement('label', { text: reference }));

        const prefixes = prefixesFor(reference);
        const chips = makeElement('div', { class: 'mpb-chips' });
        if (prefixes.length === 0) {
            chips.append(makeElement('span', { class: 'text-muted', text: 'No forbidden prefixes.' }));
        }
        for (const prefix of prefixes) {
            const chip = makeElement('span', { class: 'mpb-chip' });
            chip.append(makeElement('span', { text: prefix }));
            const remove = makeElement('button', {
                type: 'button',
                class: 'mpb-chip-remove',
                text: '✕',
                attrs: { 'aria-label': 'Remove prefix ' + prefix },
            });
            remove.addEventListener('click', () => {
                removePrefix(reference, prefix);
            });
            chip.append(remove);
            chips.append(chip);
        }
        field.append(chips);

        // Stern, non-rewriting warning about internal spaces (mirrors the suffix step).
        const spaceWarn = makeElement('p', {
            class: 'mpb-warn',
            text: 'Avoid spaces inside a prefix — they rarely match real key or name prefixes.',
            hidden: true,
        });

        const entry = makeElement('div', { class: 'mpb-suffix-input' });
        const input = makeElement('input', {
            type: 'text',
            value: '',
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': 'New forbidden prefix for ' + reference,
                placeholder: 'e.g. tmp_',
            },
        });
        const addButton = makeElement('button', { type: 'button', class: 'mpb-btn', text: 'Add' });
        const commit = () => {
            addPrefix(reference, input.value);
        };
        addButton.addEventListener('click', commit);
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
            	return;
            }

            event.preventDefault();
            commit();
        });
        input.addEventListener('input', () => {
            spaceWarn.hidden = !/\s/.test(input.value.trim());
        });
        entry.append(input, addButton);
        field.append(entry);
        field.append(spaceWarn);
        return field;
    }

    // ── sendableDeRetention mini-wizard ──

    /**
     * The stored retention policy, filled in from defaults for any missing field so the mini-wizard
     * always renders a complete form.
     *
     * @returns {{c__retentionPolicy: string, DataRetentionPeriodLength: number, c__dataRetentionPeriodUnitOfMeasure: string, ResetRetentionPeriodOnImport: boolean}} the policy
     */
    function retentionPolicy() {
        return { ...emptyRetention(), ...state.wizardState.retention };
    }

    /**
     * Patch the stored retention policy with the given fields and re-render.
     *
     * @param {object} patch partial policy fields to merge in
     * @returns {void}
     */
    function updateRetention(patch) {
        state.wizardState.retention = { ...retentionPolicy(), ...patch };
        render();
    }

    /**
     * `sendableDeRetention` mini-wizard body: an applies-to selector (which BUs are production — the
     * rule only checks production sendable DEs) plus the retention-policy inputs (type, length, unit,
     * reset-on-import). The applies-to checkboxes write `wizardState.prodBUs` (the same store the
     * Production step uses), so the derived `prodMap` scopes the rule; the policy inputs write
     * `wizardState.retention`.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderRetentionPolicy(body) {
        renderRetentionAppliesTo(body);
        renderRetentionInputs(body);
    }

    /**
     * The applies-to block: production BUs are pre-selected (via the Production step's default) and
     * the rule only applies to them. Toggling here edits the shared `prodBUs` set.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderRetentionAppliesTo(body) {
        seedProductionBUs();
        body.append(
            makeElement('label', { class: 'mpb-mini-label', text: 'Applies to (production BUs)' })
        );
        body.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'This rule only checks sendable data extensions on production BUs. Confirm which BUs count as production.',
            })
        );
        const references = childBUReferences();
        if (references.length === 0) {
            body.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }
        const productionBUs = new Set(state.wizardState.prodBUs || []);
        const list = makeElement('div', { class: 'mpb-list' });
        for (const reference of references) {
            const label = makeElement('label', { class: 'mpb-field' });
            const checkbox = makeElement('input', {
                type: 'checkbox',
                checked: productionBUs.has(reference),
            });
            checkbox.addEventListener('change', () => {
                toggleProductionBU(reference, checkbox.checked);
            });
            label.append(checkbox, makeElement('span', { text: reference }));
            list.append(label);
        }
        body.append(list);
    }

    /**
     * The retention-policy inputs: type `<select>`, an integer length input, a unit `<select>`, and a
     * reset-on-import checkbox. Length + unit are hidden when the type is `none` (no period applies).
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderRetentionInputs(body) {
        const policy = retentionPolicy();
        body.append(makeElement('label', { class: 'mpb-mini-label', text: 'Retention policy' }));

        // Retention type.
        const typeField = makeElement('div', { class: 'mpb-field' });
        typeField.append(makeElement('label', { text: 'Type' }));
        const typeSelect = makeElement('select');
        for (const option of RETENTION_TYPE_OPTIONS) {
            const element = makeElement('option', { value: option.value, text: option.label });
            if (option.value === policy.c__retentionPolicy) {
                element.selected = true;
            }
            typeSelect.append(element);
        }
        typeSelect.addEventListener('change', () => {
            updateRetention({ c__retentionPolicy: typeSelect.value });
        });
        typeField.append(typeSelect);
        body.append(typeField);

        // Length + unit only apply when a real retention period is used.
        if (policy.c__retentionPolicy !== 'none') {
            const lengthField = makeElement('div', { class: 'mpb-field' });
            lengthField.append(makeElement('label', { text: 'Length' }));
            const lengthInput = makeElement('input', {
                type: 'number',
                value: String(policy.DataRetentionPeriodLength),
                attrs: { min: '1', step: '1', 'aria-label': 'Retention period length' },
            });
            lengthInput.addEventListener('change', () => {
                const parsed = Math.trunc(Number(lengthInput.value));
                updateRetention({
                    DataRetentionPeriodLength: Number.isNaN(parsed) || parsed < 1 ? 1 : parsed,
                });
            });
            lengthField.append(lengthInput);
            body.append(lengthField);

            const unitField = makeElement('div', { class: 'mpb-field' });
            unitField.append(makeElement('label', { text: 'Unit' }));
            const unitSelect = makeElement('select');
            for (const unit of RETENTION_UNIT_OPTIONS) {
                const element = makeElement('option', { value: unit, text: unit });
                if (unit === policy.c__dataRetentionPeriodUnitOfMeasure) {
                    element.selected = true;
                }
                unitSelect.append(element);
            }
            unitSelect.addEventListener('change', () => {
                updateRetention({ c__dataRetentionPeriodUnitOfMeasure: unitSelect.value });
            });
            unitField.append(unitSelect);
            body.append(unitField);
        }

        // Reset-on-import.
        const resetLabel = makeElement('label', { class: 'mpb-field' });
        const resetCheckbox = makeElement('input', {
            type: 'checkbox',
            checked: !!policy.ResetRetentionPeriodOnImport,
        });
        resetCheckbox.addEventListener('change', () => {
            updateRetention({ ResetRetentionPeriodOnImport: resetCheckbox.checked });
        });
        resetLabel.append(resetCheckbox, makeElement('span', { text: 'Reset retention period on import' }));
        body.append(resetLabel);
    }

    /**
     * Toggle a rule id in/out of the selected set and re-render.
     *
     * @param {string} ruleId the rule id to toggle
     * @param {boolean} on true to select, false to deselect
     * @returns {void}
     */
    function toggleRule(ruleId, on) {
        const current = Array.isArray(state.wizardState.selectedRules) ? state.wizardState.selectedRules : [];
        const next = on
            ? (current.includes(ruleId) ? current : [...current, ruleId])
            : current.filter((existing) => existing !== ruleId);
        state.wizardState.selectedRules = next;
        render();
    }

    // ─────────────────────────── mode choice ───────────────────────────

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
        wizardStep = steps.length > 0 ? steps[0].id : null;
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

    // ─────────────────────────── render dispatcher ───────────────────────────

    /**
     * Show exactly one top-level step section and hide the others.
     *
     * @param {string} step the step id to show
     * @returns {void}
     */
    function showOnly(step) {
        const sections = [
            ['intake', dom.stepIntake],
            ['mode', dom.stepMode],
            ['wizard', dom.wizard],
            ['output', dom.stepOutput],
        ];
        for (const [name, element] of sections) {
            if (element) {
                element.hidden = name !== step;
            }
        }
    }

    /**
     * Advance to a step and re-render.
     *
     * @param {string} step the target step id
     * @returns {void}
     */
    function goToStep(step) {
        state.step = step;
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
     * it never gets an `&s=` segment.
     *
     * @type {ReadonlySet<string>}
     */
    const HASH_SESSION_VIEWS = new Set(['mode', 'wizard', 'output']);

    /**
     * The top-level views the tool recognises in a hash. Anything else parses to the intake default.
     *
     * @type {ReadonlySet<string>}
     */
    const HASH_KNOWN_VIEWS = new Set(['intake', 'mode', 'wizard', 'output']);

    /**
     * Parse a `location.hash` string into a plain `{view, step, sessionId}` descriptor. The tool owns
     * this compact format: `#view=<intake|mode|wizard|output>`, plus `&step=<wizardStepId>` for the
     * wizard view and `&s=<sessionId>` when a saved session is open. Unknown params are ignored and a
     * malformed / empty hash yields the intake default so callers never have to guard against throws.
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
     * with no session; the wizard adds the active sub-step; mode/wizard/output add the open session
     * id when one is set. This is the inverse of `parseHash` for the meaningful fields.
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
        // `mode` picker. A deep link to `wizard`/`output` needs a mode to compute the visible
        // sub-steps, so the branches below only override the landing when a mode was restored.
        reopenSave(parsed.sessionId);
        if (parsed.view === 'wizard' && state.mode) {
            // Set the requested sub-step, then clamp it to the restored session's visible steps so a
            // step that no longer applies (e.g. lineage skipped) falls back to the nearest valid one.
            wizardStep = parsed.step;
            clampWizardStep();
            goToStep('wizard');
            return;
        }
        if (parsed.view === 'output' && state.mode) {
            goToStep('output');
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
     * names and stripped of empty lists) and `retention` (from `wizardState.retention`). A mini-wizard
     * rule whose sub-config is left empty is **dropped** from `selectedRules` so no dead rule is
     * emitted (`filterPrefixByBu` with no prefixes on any BU).
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

        // Drop mini-wizard rules whose sub-config is empty so no dead rule is emitted. Only
        // filterPrefixByBu can be "empty" (no prefixes anywhere); sendableDeRetention always carries
        // a policy, so being selected is enough.
        const selectedRules = (
            Array.isArray(wizardState.selectedRules) ? [...wizardState.selectedRules] : []
        ).filter((id) => id !== 'filterPrefixByBu' || Object.keys(prefixBlacklist).length > 0);

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
     * Re-check that the wizard is complete for the current mode before revealing the downloads. Runs
     * every visible step's `canProceed` gate and collects the blocking reasons, so an incomplete
     * pipeline is named precisely rather than silently emitting a broken file.
     *
     * @returns {string[]} the blocking reasons (empty when the wizard is complete)
     */
    function outputBlockers() {
        const reasons = [];
        for (const step of visibleSteps()) {
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

    // Marketing Cloud branding (per DIAGRAM_JSON_SPEC.md): the Marketing accent colour, the
    // env-container icon, and the parent-BU (shared-DE) icon.
    const DIAGRAM_ACCENT = '#F49825';
    const DIAGRAM_ENV_ICON = 'custom-marketing';
    const DIAGRAM_PARENT_BU_ICON = 'custom-data';

    // Layout geometry (the spec is not auto-layout — every cell carries its own position).
    const DIAGRAM_COLUMN_X = 60;
    const DIAGRAM_COLUMN_STEP = 320;
    const DIAGRAM_COLUMN_WIDTH = 240;
    const DIAGRAM_HEADER_Y = 90;
    const DIAGRAM_TASK_WIDTH = 180;
    const DIAGRAM_TASK_HEIGHT = 60;
    const DIAGRAM_TASK_GAP = 24;
    const DIAGRAM_CONTAINER_PADDING = 20;

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
     * Build one `sf.Container` cell for an environment column, branded with the Marketing accent and
     * `custom-marketing` header icon (per the spec).
     *
     * @param {string} id the container cell id
     * @param {string} name the environment name (header label)
     * @param {number} x the column x position
     * @param {number} height the container height (sized to its embedded BU tasks)
     * @param {string[]} embeds the ids of the embedded BU-task cells
     * @returns {object} the `sf.Container` cell
     */
    function diagramEnvironmentContainer(id, name, x, height, embeds) {
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
                    stroke: 'var(--container-border)',
                    strokeWidth: 1,
                },
                accent: { x: 1, y: 1, width: 'calc(w - 2)', height: 40, rx: 11, ry: 11, fill: DIAGRAM_ACCENT },
                accentFill: { x: 1, y: 20, width: 'calc(w - 2)', height: 21, fill: DIAGRAM_ACCENT },
                headerIcon: { x: 12, y: 9, width: 24, height: 24, href: diagramIconHref(DIAGRAM_ENV_ICON) },
                headerLabel: {
                    x: 44,
                    y: 21,
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fill: '#FFFFFF',
                    text: name,
                },
            },
            embeds: embeds,
        };
    }

    /**
     * Build one `sf.BpmnTask` cell for a business unit, on the Marketing accent body with a white
     * label. A shared-DE parent BU carries the `custom-data` icon to set it apart from a regular BU.
     *
     * @param {string} id the task cell id
     * @param {string} parentId the owning container id
     * @param {string} label the BU display label
     * @param {number} x the task x position
     * @param {number} y the task y position
     * @param {boolean} isParentBU whether this BU is a shared-DE parent BU
     * @returns {object} the `sf.BpmnTask` cell
     */
    function diagramBUTask(id, parentId, label, x, y, isParentBU) {
        return {
            id: id,
            type: 'sf.BpmnTask',
            position: { x: x, y: y },
            size: { width: DIAGRAM_TASK_WIDTH, height: DIAGRAM_TASK_HEIGHT },
            z: 2000,
            taskType: 'task',
            parent: parentId,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 8,
                    ry: 8,
                    fill: DIAGRAM_ACCENT,
                    stroke: '#222222',
                    strokeWidth: 1.5,
                },
                taskIcon: {
                    x: 6,
                    y: 6,
                    width: 14,
                    height: 14,
                    href: diagramIconHref(isParentBU ? DIAGRAM_PARENT_BU_ICON : DIAGRAM_ENV_ICON),
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
     * `envOrder`) becomes a branded `sf.Container` column, each assigned BU an `sf.BpmnTask` embedded
     * in it, and deploy arrows connect each BU to its upstream counterpart (via `lineage` when set,
     * else the same-index BU of the previous environment). Shared-DE parent BUs use the `custom-data`
     * icon. Returns a spec-conformant object (never mutates state).
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

        for (const [columnIndex, environment] of environments.entries()) {
            const references = assignedBUReferences(environment);
            const columnX = DIAGRAM_COLUMN_X + columnIndex * DIAGRAM_COLUMN_STEP;
            const taskX = columnX + (DIAGRAM_COLUMN_WIDTH - DIAGRAM_TASK_WIDTH) / 2;
            const containerId = nextId('env');
            const embeds = [];
            const columnMap = {};

            for (const [rowIndex, reference] of references.entries()) {
                const taskId = nextId('bu');
                const taskY = 50 + DIAGRAM_HEADER_Y + rowIndex * (DIAGRAM_TASK_HEIGHT + DIAGRAM_TASK_GAP);
                const isParentBU = bareBUName(reference) === '_ParentBU_';
                cells.push(diagramBUTask(taskId, containerId, buDisplayLabel(reference), taskX, taskY, isParentBU));
                embeds.push(taskId);
                columnMap[reference] = taskId;
            }

            // Size the container to its header + stacked tasks (+ bottom padding).
            const taskCount = Math.max(references.length, 1);
            const containerHeight =
                DIAGRAM_HEADER_Y +
                taskCount * DIAGRAM_TASK_HEIGHT +
                (taskCount - 1) * DIAGRAM_TASK_GAP +
                DIAGRAM_CONTAINER_PADDING;
            cells.push(diagramEnvironmentContainer(containerId, environment, columnX, containerHeight, embeds));
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
     * Decide whether the Diagramforce preview should be offered. The diagram visualises the deploy
     * pipeline, so it is offered only in full-pipeline mode with a complete wizard. Validations-only
     * mode has no pipeline to draw — its synthetic `VALIDATIONS_POOL_ENV` ("All BUs") env exists only
     * to collect suffixes/production scope, so the diagram must never be built there (it would leak an
     * "All BUs" container into the exported diagram).
     *
     * @param {boolean} isComplete whether the wizard is complete (no output blockers)
     * @returns {boolean} true when the diagram CTA should be shown (full mode + complete)
     */
    function isDiagramOffered(isComplete) {
        return state.mode !== 'validations' && isComplete === true;
    }

    /**
     * Render + wire the Diagramforce preview. Offered only in full-pipeline mode with a complete
     * pipeline (see `isDiagramOffered`) — validations-only mode and an incomplete pipeline both hide
     * the whole CTA (and its fallback). Wires the "Open in Diagramforce" button (postMessage handoff,
     * fallback on pop-up-block) and the fallback copy button, rebuilding the diagram JSON on each click
     * so it tracks the latest answers.
     *
     * @param {boolean} isComplete whether the wizard is complete (no output blockers)
     * @returns {void}
     */
    function renderDiagramPreview(isComplete) {
        const cta = dom.openDiagramforce ? dom.openDiagramforce.closest('.mpb-diagram-cta') : null;
        const isOffered = isDiagramOffered(isComplete);
        if (cta) {
            cta.hidden = !isOffered;
        }
        if (dom.diagramFallback) {
            // Reset the fallback each render; it re-reveals only on a pop-up-block or explicit copy.
            dom.diagramFallback.hidden = true;
        }
        if (!isOffered) {
            return;
        }

        if (dom.openDiagramforce) {
            dom.openDiagramforce.onclick = () => {
                const json = jsonPretty(buildDiagramJSON());
                const opened = openInDiagramforce(json);
                if (!opened) {
                    // Pop-up blocked: fall back to the paste-JSON escape hatch.
                    revealDiagramFallback(json);
                }
            };
        }

        if (dom.copyDiagram) {
            dom.copyDiagram.onclick = () => {
                const note = ensureCopyNote(dom.diagramFallback);
                copyToClipboard(jsonPretty(buildDiagramJSON()), note);
            };
        }
    }

    /**
     * Central render dispatcher. Switches on `state.step`. Intake + mode are fully implemented;
     * the wizard branch renders the stepper + a per-step placeholder (Chunk 2a); the output branch
     * is a labelled placeholder (Chunk 2c).
     *
     * @returns {void}
     */
    function render() {
        switch (state.step) {
            case 'intake': {
                showOnly('intake');
                break;
            }
            case 'mode': {
                showOnly('mode');
                break;
            }
            case 'wizard': {
                showOnly('wizard');
                // Recompute the visible steps every render (upstream answers can add/remove steps),
                // clamp the cursor into that set, then paint the stepper nav + the current step.
                const steps = clampWizardStep();
                renderStepper(steps);
                if (wizardStep) {
                    // renderWizardStep now renders all six steps for real (env-order / bu-assign /
                    // lineage / suffixes / prod-confirm / rules).
                    renderWizardStep(wizardStep);
                }
                clearStepError();
                break;
            }
            case 'output': {
                showOnly('output');
                // Build config/validations, fill the textarea fallbacks, wire the download + copy
                // buttons, and run the download-guard for incomplete pipelines.
                renderOutput();
                // Diagramforce preview: offered only when the pipeline is complete (same guard as
                // the downloads), building the diagram JSON on demand and handing it over via the
                // documented postMessage flow.
                renderDiagramPreview(outputBlockers().length === 0);
                break;
            }
            default: {
                showOnly('intake');
                break;
            }
        }
        // Autosave: any render past intake reflects the latest answers — persist them (debounced) so
        // a reopened config resumes exactly. Read-only (another tab holds the lock) skips the write.
        if (state.step && state.step !== 'intake' && state.config) {
            scheduleAutosave();
        }
        // Mirror the current step into location.hash so a reload / shared link reproduces it. Cheap +
        // idempotent (only writes on a real change, via replaceState), so calling it from render() —
        // which also fires on input events — is safe.
        syncHashToState();
    }

    // ─────────────────────────── Chunk 3b: localStorage persistence ───────────────────────────

    /**
     * localStorage key scheme. Saved configs live under `mcdevpipe::save::<id>`; the single-tab
     * editing lease for a config lives under `mcdevpipe::lock::<id>`. Ids are `crypto.randomUUID()`.
     */
    const SAVE_PREFIX = 'mcdevpipe::save::';
    const LOCK_PREFIX = 'mcdevpipe::lock::';

    /**
    Current persisted-blob schema version. A restored blob whose version differs is not trusted.
     */
    const SAVE_VERSION = 1;

    /**
    Debounce window for autosave, in ms.
     */
    const AUTOSAVE_DELAY_MS = 300;

    /**
    Heartbeat cadence for the single-tab lock, in ms.
     */
    const LOCK_HEARTBEAT_MS = 4000;

    /**
    A lock is considered live when its timestamp is newer than this, in ms (≈ 2.5 heartbeats).
     */
    const LOCK_STALE_MS = 10_000;

    /**
    Warn when the origin's localStorage footprint climbs past this (~80 % of a tight 5 MB cap).
     */
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
        // Restore the persisted mode so a deep link / reload lands on the wizard (or output) rather
        // than the mode picker (Fix 1). Older saves have no persisted mode → null keeps the original
        // mode-picker landing (backward compatible). `applyHashDescriptor`'s `state.mode` guard then
        // correctly navigates a `#view=wizard&step=…` deep link to the requested step.
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
     * @returns {void}
     */
    function cloneSave(id) {
        const blob = readSaveBlob(id);
        if (!blob) {
            return;
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

    // ─────────────────────────── wiring ───────────────────────────

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
        // ── wizard shell (Chunk 2) ──
        dom.stepper = document_.querySelector('#mpb-stepper');
        dom.back = document_.querySelector('#mpb-back');
        dom.next = document_.querySelector('#mpb-next');
        dom.stepError = document_.querySelector('#mpb-step-error');
        // ── output (Chunk 2) ──
        dom.downloadGuard = document_.querySelector('#mpb-download-guard');
        dom.outputConfig = document_.querySelector('#mpb-output-config');
        dom.dlConfig = document_.querySelector('#mpb-dl-config');
        dom.copyConfig = document_.querySelector('#mpb-copy-config');
        dom.configFallback = document_.querySelector('#mpb-config-fallback');
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
    }

    /**
     * Wire the intake, mode and (Chunk-2/3 stubbed) controls.
     *
     * @returns {void}
     */
    function wireEvents() {
        // ── intake: explicit upload button (hidden file input) ──
        if (dom.fileInput) {
            dom.fileInput.addEventListener('change', () => {
                const file = dom.fileInput.files && dom.fileInput.files[0];
                if (file) {
                    readFile(file);
                }
            });
        }

        // ── intake: drag & drop ──
        if (dom.dropzone) {
            dom.dropzone.addEventListener('dragover', (event) => {
                event.preventDefault();
                dom.dropzone.classList.add('is-dragover');
            });
            dom.dropzone.addEventListener('dragleave', () => {
                dom.dropzone.classList.remove('is-dragover');
            });
            dom.dropzone.addEventListener('drop', (event) => {
                event.preventDefault();
                dom.dropzone.classList.remove('is-dragover');
                const file =
                    event.dataTransfer &&
                    event.dataTransfer.files &&
                    event.dataTransfer.files[0];
                if (file) {
                    readFile(file);
                }
            });
            // Keyboard access: the dropzone triggers the hidden file input.
            dom.dropzone.addEventListener('keydown', (event) => {
                if (!((event.key === 'Enter' || event.key === ' ') && dom.fileInput)) {
                	return;
                }

                event.preventDefault();
                dom.fileInput.click();
            });
        }

        // ── intake: paste JSON ──
        if (dom.pasteBtn) {
            dom.pasteBtn.addEventListener('click', () => {
                const text = dom.pasteInput ? dom.pasteInput.value : '';
                if (!text.trim()) {
                    showIntakeError('Paste your .mcdevrc.json contents first.');
                    return;
                }
                handleIntakeText(text, '');
            });
        }

        // Chunk 3b: paint the saved-config list + storage gauge from the persistence layer. The rest
        // of the persistence wiring (storage probe/banner, cross-tab `storage` event, exit-flush,
        // lock heartbeat) is set up in initPersistence(), called from init() after cacheDom().
        renderSavedList();

        // ── mode choice ──
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

        // ── wizard nav: Back / Next ──
        if (dom.back) {
            dom.back.addEventListener('click', goBack);
        }
        if (dom.next) {
            dom.next.addEventListener('click', goNext);
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

    // Shared helpers exposed for Chunk 2b / 2c / 3 (which render wizard steps and outputs).
    global.mpbController = {
        state: state,
        setText: setText,
        makeEl: makeElement,
        jsonPretty: jsonPretty,
        goToStep: goToStep,
        visibleSteps: visibleSteps,
        // Hash deep-linking / reload-restore test hooks (pure string helpers + the restore driver).
        parseHash: parseHash,
        hashFromLocation: hashFromLocation,
        applyHashDescriptor: applyHashDescriptor,
        restoreFromHash: restoreFromHash,
        // Persistence runtime + tiny setters so tests drive the module-scoped `wizardStep` /
        // `persistence.currentId` through a defined seam instead of reaching into internals.
        persistence: persistence,
        setWizardStep: function (id) {
            wizardStep = id;
        },
        setCurrentId: function (id) {
            persistence.currentId = id;
        },
        renderWizardStep: renderWizardStep,
        // Nav-gate seam: the in-place text-input handlers (suffix / separator / env-name) update
        // state then call `canProceed(wizardStep)` via `updateNavGate` instead of re-rendering, so
        // tests assert the gate reacts correctly to a simulated keystroke edit.
        canProceed: canProceed,
        goNext: goNext,
        goBack: goBack,
        // Test hook for the stepper reachability logic (Fix 4): classify each visible step as
        // current/done/clickable given the current step id + a gate function. Pure + DOM-free.
        computeStepperStates: computeStepperStates,
        // Test hooks for the stepper forward-jump soft gate (Fix 4 must-fix): the pure predicate that
        // says a forward jump off bu-assign is blocked until the unassigned-BUs confirmation, and the
        // jump itself so the block/resume behaviour can be asserted without a rendered stepper.
        isForwardJumpSoftBlocked: isForwardJumpSoftBlocked,
        jumpToStep: jumpToStep,
        // Test hooks for the unassigned-BUs banner actions + the pending-jump stash: the banner
        // buttons invoke these exact functions, so a DOM-free test can drive the "Go back and assign"
        // (stash-clear) and "Continue anyway" (resume) paths the null-DOM stub can't click, and read
        // the stash via the getter to assert it was cleared.
        confirmUnassignedContinue: confirmUnassignedContinue,
        confirmUnassignedGoBack: confirmUnassignedGoBack,
        getPendingJumpTarget: function () {
            return pendingJumpTarget;
        },
        // Test hook for the persisted-mode round-trip (Fix 1): selectMode writes state.wizardState.mode
        // so a save blob carries it, and reopenSave restores state.mode from it.
        selectMode: selectMode,
        // Test hooks for lineage drag-to-connect (Refinement B): the pure validity predicate (only an
        // adjacent left→right drop is legal) and the in-place mapping setter (child deploys from
        // parent), so the drop direction can be asserted without a DOM drag.
        isValidLineageDrag: isValidLineageDrag,
        setLineageMapping: setLineageMapping,
        deriveValidationsState: deriveValidationsState,
        renderOutput: renderOutput,
        renderSavedList: renderSavedList,
        reopenSave: reopenSave,
        buildDiagramJSON: buildDiagramJSON,
        // Test hook for the diagram-visibility decision (Review-loop fix pass 2): the diagram must not
        // be offered in validations-only mode (no pipeline to draw), so this returns false there.
        isDiagramOffered: isDiagramOffered,
        // Test hooks for the validations-only BU-collection path (Review-loop fix pass 1): seed the
        // synthetic pooled environment + default suffixes without needing a rendered DOM.
        seedValidationsPool: seedValidationsPool,
        seedSuffixes: seedSuffixes,
        // Test hook for the full-mode guard: strips the synthetic "All BUs" pool env from envOrder so
        // it can never leak into a full-pipeline wizard (e.g. after re-opening a validations config).
        stripValidationsPoolEnvironment: stripValidationsPoolEnvironment,
        // Test hooks for the strict single-assignment BU board: the invariant helper, the Unassigned
        // derivation, the pooled list, and the round-trip dedupe run through wizardStateFromConfig.
        assignBUToEnvironment: assignBUToEnvironment,
        unassignedBUReferences: unassignedBUReferences,
        pooledBUReferences: pooledBUReferences,
        wizardStateFromConfig: wizardStateFromConfig,
        // Test hooks for the bu-assign soft-confirm gate: the pure decision helper, the hard gate it
        // layers on top of, and a tiny setter so tests can simulate the "Continue anyway" latch
        // without a rendered banner DOM.
        shouldConfirmUnassigned: shouldConfirmUnassigned,
        canProceedBUAssign: canProceedBUAssign,
        setUnassignedConfirmed: function (value) {
            hasConfirmedUnassigned = value;
        },
    };

    if (document_.readyState === 'loading') {
        document_.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
