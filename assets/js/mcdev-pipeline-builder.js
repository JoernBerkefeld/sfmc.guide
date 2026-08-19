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
     * Suggested environment names offered as one-click chips on the env-names step and as the
     * initial seed for the env-order step. The user can accept, remove, reorder, or type custom
     * names — nothing here is forced.
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
        'env-names',
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
        'env-names': 'Names',
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
        return Object.assign(emptyWizardState(), block);
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
     * being edited. Used by both the env-names inline feedback and its `canProceed` gate.
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
     * Toggle a buRef for an environment, writing the updated array back into `envBUs` and
     * re-rendering. Adding/removing a BU can change whether the lineage step is needed, so a full
     * re-render (which recomputes `visibleSteps()`) is required.
     *
     * @param {string} environment the environment name
     * @param {string} buReference the buRef to toggle
     * @param {boolean} on true to assign, false to unassign
     * @returns {void}
     */
    function toggleEnvironmentBU(environment, buReference, on) {
        const current = assignedBUReferences(environment);
        const next = on
            ? (current.includes(buReference) ? current : [...current, buReference])
            : current.filter((reference) => reference !== buReference);
        state.wizardState.envBUs = { ...state.wizardState.envBUs, [environment]: next };
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
            case 'env-names': {
                return canProceedEnvironmentNames();
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
     * `env-order` gate: at least two environments, and no empty/whitespace-only rows.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedEnvironmentOrder() {
        const order = environmentNames();
        if (order.length < 2) {
            return { ok: false, reason: 'Add at least two environments (e.g. a source and a target).' };
        }
        if (order.some((name) => !name.trim())) {
            return { ok: false, reason: 'Remove or name the empty environment rows before continuing.' };
        }
        return { ok: true, reason: '' };
    }

    /**
     * `env-names` gate: every name non-empty, pattern-valid, and unique after a case-insensitive
     * trim.
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function canProceedEnvironmentNames() {
        const names = environmentNames().map((name) => name.trim());
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
        const steps = clampWizardStep();
        const ids = steps.map((step) => step.id);
        const index = ids.indexOf(wizardStep);
        const gate = canProceed(wizardStep);
        if (!gate.ok) {
            showStepError(gate.reason);
            return;
        }
        clearStepError();
        if (index !== -1 && index < ids.length - 1) {
            wizardStep = ids[index + 1];
            render();
            return;
        }
        // Past the last visible step → move on to the output step.
        goToStep('output');
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
        if (index > 0) {
            wizardStep = ids[index - 1];
            render();
            return;
        }
        // Before the first wizard step → return to the mode choice.
        goToStep('mode');
    }

    /**
     * Render the stepper progress nav (`#mpb-stepper`) as a simple ordered list of the visible
     * steps, highlighting the active one. Text/nodes only — no `innerHTML`.
     *
     * @param {{id: string, title: string}[]} steps the visible steps
     * @returns {void}
     */
    function renderStepper(steps) {
        if (!dom.stepper) {
            return;
        }
        setText(dom.stepper, '');
        const list = makeElement('ol', { class: 'mpb-stepper-list' });
        for (const [index, step] of steps.entries()) {
            const isCurrent = step.id === wizardStep;
            const item = makeElement('li', {
                class: isCurrent ? 'mpb-stepper-item is-current' : 'mpb-stepper-item',
                attrs: isCurrent ? { 'aria-current': 'step' } : {},
            });
            item.append(
                makeElement('span', { class: 'mpb-stepper-index', text: String(index + 1) }),
                makeElement('span', { class: 'mpb-stepper-title', text: step.title })
            );
            list.append(item);
        }
        dom.stepper.append(list);
    }

    /**
     * Render the current wizard step's UI into `#mpb-step-host`. All seven steps are implemented
     * (env-order / env-names / bu-assign / lineage / suffixes / prod-confirm / rules).
     *
     * @param {string} stepId the active step id
     * @returns {void}
     */
    function renderWizardStep(stepId) {
        if (!dom.stepHost) {
            return;
        }
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
            case 'env-names': {
                renderEnvironmentNamesStep(panel);
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
     * `env-order` step: an ordered, reorderable list of environment rows with drag-and-drop and
     * keyboard-accessible up/down buttons (index 0 is the DEV/source env), plus add/remove. Seeds
     * from `SUGGESTED_ENVIRONMENTS` when empty. Name editing happens on the next step — here rows
     * only reorder / add / remove.
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
                text: 'Order your environments from source to production. The first row is the DEV / source environment. Drag to reorder, or use the up/down buttons.',
            })
        );

        const list = makeElement('ol', { class: 'mpb-list', attrs: { 'aria-label': 'Environment order' } });
        for (const [index, name] of order.entries()) {
            list.append(environmentOrderRow(name, index, order.length));
        }
        panel.append(list);

        const addButton = makeElement('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: '+ Add environment',
        });
        addButton.addEventListener('click', () => {
            state.wizardState.envOrder = [...environmentNames(), ''];
            render();
        });
        panel.append(addButton);
    }

    /**
     * Build one draggable environment row for the env-order list.
     *
     * @param {string} name the environment name (may be empty for a freshly-added row)
     * @param {number} index the row index in `envOrder`
     * @param {number} total the number of rows (for disabling edge buttons)
     * @returns {HTMLElement} the row element
     */
    function environmentOrderRow(name, index, total) {
        const row = makeElement('li', {
            class: 'mpb-row',
            draggable: true,
            attrs: { 'data-index': String(index) },
        });

        const label = makeElement('span', {
            class: 'mpb-row-label',
            text: name || '(unnamed — set on the next step)',
        });
        if (index === 0) {
            label.append(makeElement('span', { class: 'mpb-chip', text: 'DEV / source' }));
        }

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
        row.append(label, actions);

        wireEnvironmentRowDnD(row, index);
        return row;
    }

    /**
     * Wire drag-and-drop reordering for a single env-order row. On drop, the dragged index is read
     * from the drag payload and the list is reordered via `moveEnvironment`.
     *
     * @param {HTMLElement} row the row element
     * @param {number} index the row's index
     * @returns {void}
     */
    function wireEnvironmentRowDnD(row, index) {
        row.addEventListener('dragstart', (event) => {
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
     * `env-names` step: quick-fill chips from `SUGGESTED_ENVIRONMENTS`, a text input per row with
     * live pattern/uniqueness feedback, writing trimmed names back into `envOrder`. No
     * space→underscore rewrite — the name is stored exactly as typed (trimmed only on validation).
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderEnvironmentNamesStep(panel) {
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Name each environment. Names must be unique and may use letters, digits, spaces, hyphens and underscores.',
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

        const order = environmentNames();
        const trimmed = order.map((name) => name.trim());
        const list = makeElement('div', { class: 'mpb-list' });
        for (const [index, name] of order.entries()) {
            list.append(environmentNameRow(name, index, trimmed));
        }
        panel.append(list);
    }

    /**
     * Build one env-name editing row with inline validation feedback.
     *
     * @param {string} name the current (untrimmed) name
     * @param {number} index the row index in `envOrder`
     * @param {string[]} trimmedNames all trimmed names (for uniqueness feedback)
     * @returns {HTMLElement} the field element
     */
    function environmentNameRow(name, index, trimmedNames) {
        const field = makeElement('div', { class: 'mpb-field' });
        const inputId = 'mpb-env-name-' + index;
        field.append(
            makeElement('label', { text: 'Environment ' + (index + 1), attrs: { for: inputId } })
        );
        const input = makeElement('input', {
            type: 'text',
            value: name,
            id: inputId,
            attrs: { autocomplete: 'off', spellcheck: 'false' },
        });
        input.addEventListener('input', () => {
            const next = environmentNames();
            // Store exactly as typed (no space→underscore conversion); trimming is validation-only.
            next[index] = input.value;
            state.wizardState.envOrder = next;
            render();
        });
        field.append(input);

        const trimmedValue = name.trim();
        let message = '';
        if (!trimmedValue) {
            message = 'Name required.';
        } else if (!ENVIRONMENT_NAME_PATTERN.test(trimmedValue)) {
            message = 'Only letters, digits, spaces, hyphens and underscores are allowed.';
        } else if (isDuplicateName(trimmedNames, index)) {
            message = 'Duplicate name — each environment must be unique.';
        }
        if (message) {
            field.append(makeElement('p', { class: 'mpb-warn', text: message }));
        }
        return field;
    }

    /**
     * `bu-assign` step: for each environment (in order) list every pooled buRef as a checkbox; the
     * user assigns ≥1 BU per env. buRefs are `<cred>/<BU>` when multiCred, bare otherwise. Toggling
     * writes arrays back into `envBUs`.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderBUAssignStep(panel) {
        const references = pooledBUReferences();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Assign at least one business unit to each environment. An environment with more than one BU becomes a branching pipeline.',
            })
        );
        if (references.length === 0) {
            panel.append(
                makeElement('p', { class: 'mpb-warn', text: 'No business units were found in the loaded config.' })
            );
            return;
        }

        const grid = makeElement('div', { class: 'mpb-assign-grid' });
        for (const environment of environmentNames()) {
            grid.append(buAssignColumn(environment, references));
        }
        panel.append(grid);
    }

    /**
     * Build the BU-assignment column for one environment.
     *
     * @param {string} environment the environment name
     * @param {string[]} references the pooled buRefs
     * @returns {HTMLElement} the column element
     */
    function buAssignColumn(environment, references) {
        const column = makeElement('div', { class: 'mpb-assign-col' });
        column.append(makeElement('h4', { text: environment || '(unnamed environment)' }));
        const assigned = new Set(assignedBUReferences(environment));
        for (const reference of references) {
            const label = makeElement('label', { class: 'mpb-field' });
            const checkbox = makeElement('input', {
                type: 'checkbox',
                checked: assigned.has(reference),
            });
            checkbox.addEventListener('change', () => {
                toggleEnvironmentBU(environment, reference, checkbox.checked);
            });
            label.append(checkbox, makeElement('span', { text: ' ' + reference }));
            column.append(label);
        }
        if (assigned.size === 0) {
            column.append(makeElement('p', { class: 'mpb-warn', text: 'Assign at least one BU.' }));
        }
        return column;
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
        // Seed defaults for any unlinked child before rendering the selectors.
        autoDeriveLineage();
        const rows = lineageLinkRows();
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Link each environment BU to the upstream BU it deploys from. Sensible defaults are filled in — adjust the branching ones as needed.',
            })
        );
        if (rows.length === 0) {
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Nothing to link yet — assign BUs first.' })
            );
            return;
        }

        const list = makeElement('div', { class: 'mpb-list' });
        for (const [index, linkRow] of rows.entries()) {
            list.append(lineageRow(linkRow, index));
        }
        panel.append(list);
    }

    /**
     * Build one lineage link row: a labelled parent-BU `<select>` for a single child buRef.
     *
     * @param {{childRef: string, environment: string, parentOptions: string[]}} linkRow the link row
     * @param {number} index the row index (for a stable field id)
     * @returns {HTMLElement} the field element
     */
    function lineageRow(linkRow, index) {
        const field = makeElement('div', { class: 'mpb-field' });
        const selectId = 'mpb-lineage-' + index;
        field.append(
            makeElement('label', {
                text: linkRow.environment + ' · ' + linkRow.childRef + ' deploys from',
                attrs: { for: selectId },
            })
        );
        const current = (state.wizardState.lineage || {})[linkRow.childRef] || '';
        const select = makeElement('select', { id: selectId });
        select.append(makeElement('option', { value: '', text: '— choose upstream BU —' }));
        for (const option of linkRow.parentOptions) {
            select.append(
                makeElement('option', {
                    value: option,
                    text: option,
                    selected: option === current,
                })
            );
        }
        select.addEventListener('change', () => {
            const lineage = { ...state.wizardState.lineage };
            if (select.value) {
                lineage[linkRow.childRef] = select.value;
            } else {
                delete lineage[linkRow.childRef];
            }
            state.wizardState.lineage = lineage;
            render();
        });
        field.append(select);
        return field;
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
        panel.append(separatorField());

        const references = childBUReferences();
        if (references.length === 0) {
            panel.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }

        // A quick duplicate index so each row can flag a collision with another child BU.
        const counts = new Map();
        for (const reference of references) {
            const value = suffixOf(reference);
            counts.set(value, (counts.get(value) || 0) + 1);
        }

        const list = makeElement('div', { class: 'mpb-list' });
        for (const environment of environmentNames()) {
            for (const reference of assignedBUReferences(environment)) {
                list.append(suffixRow(environment, reference, counts));
            }
        }
        panel.append(list);
    }

    /**
     * The shared separator input. Changing it re-seeds unset suffixes and keeps existing suffixes'
     * leading separator in sync so stored values stay `<sep><body>`.
     *
     * @returns {HTMLElement} the separator field
     */
    function separatorField() {
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
            render();
        });
        field.append(input);
        return field;
    }

    /**
     * Build one suffix editing row for a single child buRef, with the separator shown as a fixed
     * prefix, an editable body, and inline internal-space / duplicate warnings.
     *
     * @param {string} environment the owning environment (for context labelling)
     * @param {string} reference the child buRef
     * @param {Map<string, number>} counts stored-suffix → occurrence count (for duplicate flags)
     * @returns {HTMLElement} the field element
     */
    function suffixRow(environment, reference, counts) {
        const separator = state.wizardState.separator || '_';
        const field = makeElement('div', { class: 'mpb-field' });
        const inputId = 'mpb-suffix-' + suffixSlug(environment) + '-' + suffixSlug(reference);
        // In validations-only mode the environment is a synthetic pool ("All BUs"), so the label is
        // just the BU name; in full-pipeline mode it is prefixed with the (real) environment.
        const labelText = state.mode === 'validations' ? reference : environment + ' · ' + reference;
        field.append(makeElement('label', { text: labelText, attrs: { for: inputId } }));

        const group = makeElement('div', { class: 'mpb-suffix-input' });
        group.append(makeElement('span', { class: 'mpb-suffix-sep', text: separator }));
        const stored = suffixOf(reference);
        const body = stored.startsWith(separator) ? stored.slice(separator.length) : stored;
        const input = makeElement('input', {
            type: 'text',
            id: inputId,
            value: body,
            attrs: { autocomplete: 'off', spellcheck: 'false' },
        });
        input.addEventListener('input', () => {
            // Trim leading/trailing whitespace before storing (internal spaces are only warned about).
            const trimmedBody = input.value.trim();
            const suffixes = { ...state.wizardState.suffixes , [reference]: separator + trimmedBody,};
            state.wizardState.suffixes = suffixes;
            render();
        });
        group.append(input);
        field.append(group);

        const trimmedBody = body.trim();
        if (/\s/.test(trimmedBody)) {
            field.append(
                makeElement('p', {
                    class: 'mpb-warn',
                    text: 'Avoid spaces inside a suffix — they can break mcdev CLI commands later.',
                })
            );
        }
        if (trimmedBody && counts.get(stored) > 1) {
            field.append(
                makeElement('p', {
                    class: 'mpb-warn',
                    text: 'Duplicate suffix — each child BU needs a distinct suffix.',
                })
            );
        }
        return field;
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
        // Validations-only mode has no env-ordering step, but its suffix + production steps iterate
        // the assigned BUs. Pool every BU into one synthetic environment so those steps (and the
        // derived buSuffixMap / prodMap / devBU) have real data to work with.
        if (mode === 'validations') {
            seedValidationsPool();
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
                    // renderWizardStep now renders all seven steps for real (env-order / env-names /
                    // bu-assign / lineage / suffixes / prod-confirm / rules).
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
        state.mode = null;
        acquireLock(id);
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
        goToStep('intake');
    }

    // Shared helpers exposed for Chunk 2b / 2c / 3 (which render wizard steps and outputs).
    global.mpbController = {
        state: state,
        setText: setText,
        makeEl: makeElement,
        jsonPretty: jsonPretty,
        goToStep: goToStep,
        visibleSteps: visibleSteps,
        renderWizardStep: renderWizardStep,
        goNext: goNext,
        goBack: goBack,
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
    };

    if (document_.readyState === 'loading') {
        document_.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
