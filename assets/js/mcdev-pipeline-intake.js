/**
 * mcdev Pipeline Builder — intake view (not a wizard step).
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Owns the parse gate, config accept /
 * restore, vanilla reverse-inference, and dropzone/paste/file wiring. Installs
 * `classifyIntake` / `looksLikeAuthFile` / `isAuthFileName` plus restore hooks on
 * `mpbController`. Core `render()` dispatches `case 'intake'` to `C.renderIntake()`;
 * leftover `init()` calls `C.wireIntake()` after `cacheDom()`.
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
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-intake.js');
    }

    const state = C.state;
    const dom = C.dom;
    const setText = C.setText;
    const emptyWizardState = C.emptyWizardState;
    const createSaveForConfig = C.createSaveForConfig;
    const showBanner = C.showBanner;
    const clearBanner = C.clearBanner;
    const deriveRestoreFailure = C.deriveRestoreFailure;
    const goToStep = C.goToStep;
    const showOnly = C.showOnly;

    /**
     * The four auth attributes that identify a `.mcdev-auth.json` secrets file. If every value
     * of the parsed object carries all four, the input is an auth file and must be discarded.
     */
    const AUTH_ATTRIBUTES = ['client_id', 'client_secret', 'auth_url', 'account_id'];




    /**
     * Warnings from the most recent heuristic reconstruction of a vanilla (no-`mpb_pipeline`)
     * config, stashed by `wizardStateFromConfig` and surfaced as an intake banner by `acceptConfig`.
     * Empty when the last accepted config was a tool-generated round-trip (nothing was guessed).
     *
     * @type {string[]}
     */
    let lastReconstructionWarnings = [];

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
        // Surface the heuristic-reconstruction banner when a vanilla config was inferred (never for a
        // clean tool-generated round-trip, which stashes no warnings).
        surfaceReconstructionBanner();
        // Tier-2 market-list adoption banner: fired right after the reconstruction banner when a
        // vanilla config had per-BU 1:1 marketLists detected (byBU non-empty). Distinct from the
        // reconstruction banner (whose headline hard-codes "reconstructed heuristically"). REUSES
        // the existing 'warning' variant — variant is the 4th positional arg (empty actions in slot 3).
        surfaceMarketAdoptionBanner();
        // Persist immediately so every accepted config is resumable, and take its editing lock.
        createSaveForConfig(config);
        goToStep('mode');
    }

    /**
     * Show (or clear) the heuristic-reconstruction banner from `lastReconstructionWarnings`. When a
     * vanilla config was reverse-parsed, a warning banner tells the user the pipeline was inferred and
     * should be reviewed; the first few warnings are appended (escaped via `makeElement`/`setText`).
     * A clean round-trip leaves the banner cleared.
     *
     * @returns {void}
     */
    function surfaceReconstructionBanner() {
        clearBanner('reconstructed');
        const warnings = lastReconstructionWarnings || [];
        if (warnings.length === 0) {
            return;
        }
        // Lead with the summary, then a few SPECIFIC notes. The generic "no builder metadata …"
        // summary warning is dropped from the detail so the banner headline is not repeated verbatim.
        const detail = warnings
            .filter((warning) => !warning.includes('had no builder metadata'))
            .slice(0, 4)
            .join(' ');
        const suffix = detail ? ' ' + detail : '';
        showBanner(
            'reconstructed',
            'No builder metadata was found in this .mcdevrc.json, so the pipeline was reconstructed ' +
                'heuristically. Please review every step before regenerating.' +
                suffix,
            [],
            'warning'
        );
    }

    /**
     * Fire the Tier-2 market-list adoption banner when the accepted config had per-BU 1:1
     * marketLists detected (`state.wizardState.marketAdoption.byBU` non-empty). Uses the existing
     * `'warning'` variant (amber advisory tone) — no new SCSS. When the detection also flagged
     * `needsSuffixKey`, the message gains a sentence about the missing `suffix` field.
     *
     * HARD RULE: `showBanner(key, message, actions, variant)` — variant is the 4th arg. The 3rd
     * arg is an empty actions array; never pass the variant as the 3rd positional arg.
     *
     * @returns {void}
     */
    function surfaceMarketAdoptionBanner() {
        clearBanner('marketAdoption');
        const adoption = state.wizardState && state.wizardState.marketAdoption;
        const byBU = adoption && adoption.byBU;
        if (!byBU || Object.keys(byBU).length === 0) {
            return;
        }
        let message =
            'Detected per-BU market lists; use the market picker on the Market Variables step to ' +
            'auto-fill suffixes and variables.';
        // When no market carried a real `suffix` field, point the user at the suffix-key picker too.
        if (adoption.needsSuffixKey) {
            message +=
                ' No suffix field was found, so pick which market variable acts as the suffix on the ' +
                'Market Variables step.';
        }
        showBanner('marketAdoption', message, [], 'warning');
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
     * When NO `mpb_pipeline` block is present (a hand-authored / vanilla config, or a pipeline built
     * by other means) the state is instead reconstructed heuristically from `credentials` / `markets`
     * / `marketList` / `branchSourceTargetMapping` via `inferWizardStateFromVanilla`. Any inference
     * warnings are stashed in `lastReconstructionWarnings` for `acceptConfig` to surface as a banner.
     *
     * @param {object} config the accepted `.mcdevrc.json`
     * @returns {WizardState} the seeded (or fresh) wizard state
     */
    function wizardStateFromConfig(config) {
        clearBanner('restore');
        lastReconstructionWarnings = [];
        const block = config && config.options && config.options.deployment && config.options.deployment.mpb_pipeline;
        if (!block || typeof block !== 'object') {
            // Vanilla config: three-tier decision (§9).
            const config_ = config && typeof config === 'object' ? config : {};
            const deployment =
                config_.options && typeof config_.options.deployment === 'object'
                    ? config_.options.deployment
                    : {};
            const branchMapping =
                deployment.branchSourceTargetMapping && typeof deployment.branchSourceTargetMapping === 'object'
                    ? deployment.branchSourceTargetMapping
                    : {};
            const marketLists =
                config_.marketList && typeof config_.marketList === 'object'
                    ? config_.marketList
                    : {};

            // ── Tier 1: reliable branchSourceTargetMapping → full heuristic pre-map. ──
            if (isBranchMappingReliable(branchMapping, marketLists)) {
                const inferred = inferWizardStateFromVanilla(config);
                if (
                    inferred &&
                    inferred.state &&
                    inferred.state.envOrder.some((environment) => (inferred.state.envBUs[environment] || []).length > 0)
                ) {
                    lastReconstructionWarnings = inferred.warnings;
                    return inferred.state;
                }
                // Mapping looked reliable but inference yielded no envs — fall through to Tier 2/3.
            }

            // ── Tier 2: unreliable/absent mapping BUT 1:1 marketLists detected → seed BUs only,
            // mark adoption on the returned wizardState so acceptConfig can fire the banner. ──
            const adoption = detectMarketListAdoption(config);
            if (adoption.detected) {
                const seeded = emptyWizardState();
                seeded.marketAdoption = {
                    byBU: adoption.byBU,
                    marketOf: adoption.marketOf,
                    needsSuffixKey: adoption.needsSuffixKey,
                    suffixKeyCandidates: adoption.suffixKeyCandidates,
                };
                return seeded;
            }

            // ── Tier 3: nothing reliable/detected → blank wizard (BUs come from credentials). ──
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

    // ─────────────────────────── vanilla-config reverse inference (WS4) ───────────────────────────

    /**
     * Known short environment tokens whose canonical display name is simply the upper-cased branch
     * key (so `sit` → `SIT`, `uat` → `UAT`). Any other branch is Title-cased instead.
     */
    const KNOWN_ENV_TOKENS = new Set(['dev', 'sit', 'qa', 'uat', 'prod', 'stg', 'staging', 'test', 'int']);

    /**
     * The `_ParentBU_` sentinel BU name mcdev uses for shared-DE / parent pipelines. Its presence in
     * any marketList marks the config as using a shared-DE parent pattern, and it is never an
     * assignable pipeline BU itself.
     */
    const PARENT_BU = '_ParentBU_';

    /**
     * Derive an environment DISPLAY name from a git-branch key: known short tokens (dev/sit/qa/uat/
     * prod/…) upper-case, everything else Title-cases each dash-separated word. Pure.
     *
     * @param {string} branch the branch key (e.g. `sit`, `pre-prod`)
     * @returns {string} the display name (e.g. `SIT`, `Pre Prod`)
     */
    function environmentNameFromBranch(branch) {
        const key = String(branch || '').trim();
        if (key === '') {
            return '';
        }
        if (KNOWN_ENV_TOKENS.has(key.toLowerCase())) {
            return key.toUpperCase();
        }
        return key
            .split(/[-_\s]+/)
            .filter((word) => word.length > 0)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * The bare BU name of a marketList `<cred>/<BU>: market` entry key. `_ParentBU_` and any
     * `filter`/`description` meta keys are NOT BU entries and are handled by the caller.
     *
     * @param {string} entryKey a marketList entry key
     * @returns {string} the bare BU name (segment after the last `/`, or the whole key)
     */
    function bareBUFromEntryKey(entryKey) {
        const slash = String(entryKey).lastIndexOf('/');
        return slash === -1 ? String(entryKey) : String(entryKey).slice(slash + 1);
    }

    /**
     * Read the assignable BU entries of a single marketList: `{ <buRef>: marketNameOrList }` pairs,
     * skipping the reserved `filter`/`description` meta keys and the `_ParentBU_` sentinel. Each
     * returned entry keeps the raw ref key and its bare BU name; a market value that is an array
     * (one BU → many markets) keeps the first market for suffix lookup.
     *
     * @param {object} marketList a single marketList object
     * @returns {{ref: string, bu: string, market: string, hasParent: boolean}[]} parsed BU entries
     */
    function parseMarketListBUs(marketList) {
        const result = [];
        if (!marketList || typeof marketList !== 'object') {
            return result;
        }
        for (const [key, value] of Object.entries(marketList)) {
            if (key === 'filter' || key === 'description') {
                continue;
            }
            const bu = bareBUFromEntryKey(key);
            const market = Array.isArray(value) ? value[0] : value;
            result.push({
                ref: key,
                bu: bu,
                market: typeof market === 'string' ? market : '',
                hasParent: bu === PARENT_BU,
            });
        }
        return result;
    }

    // Market-variable keys that are never treated as pipeline "variables" for key-set/adoption
    // purposes (mirrors config-builder's RESERVED_MARKET_KEYS). `suffix` is the effective-suffix
    // source and `description` is human metadata; both are excluded from `marketOf[].keys`/`vars`.
    const RESERVED_MARKET_KEYS = new Set(['suffix', 'description']);

    /**
     * Read the shared effective-suffix accessor from config-builder (loaded first). Defensive `|| {}`
     * guards the headless test block, where config-builder is required before intake so the export
     * is always present in practice. Single source of truth — never duplicate the body here.
     *
     * @param {object} marketVariables a market's variable object
     * @param {string|null} [suffixKey] the variable key the user picked as the suffix source
     * @returns {string} the effective suffix, or `''` when none is available
     */
    function effectiveSuffixOf(marketVariables, suffixKey) {
        const accessor = (global.mpbConfigBuilder || {}).effectiveSuffix;
        return typeof accessor === 'function' ? accessor(marketVariables, suffixKey) : '';
    }

    /**
     * The non-reserved variable-key set of a market's variables (excludes `suffix`/`description`),
     * sorted for a stable comparison.
     *
     * @param {object} marketVariables a market's variable object
     * @returns {string[]} sorted non-reserved keys
     */
    function nonReservedMarketKeys(marketVariables) {
        if (!marketVariables || typeof marketVariables !== 'object') {
            return [];
        }
        return Object.keys(marketVariables)
            .filter((key) => !RESERVED_MARKET_KEYS.has(key))
            .toSorted((a, b) => a.localeCompare(b));
    }

    /**
     * True when a `branchSourceTargetMapping` is RELIABLE enough to drive the full heuristic pre-map
     * (Tier 1). Every `{sourceMl: targetMl}` pair must name marketLists that (a) EXIST in
     * `marketLists` and (b) `parseMarketListBUs(...)` yields ≥1 known BU for both sides — UNLESS the
     * pair is a `_ParentBU_`/parent pair (legitimately no child BU), which is exempt. Any pair that
     * is neither a satisfied child pair nor a parent pair → the whole mapping is unreliable. An empty
     * mapping is unreliable (nothing to trust). Pure.
     *
     * @param {object} branchMapping config.options.deployment.branchSourceTargetMapping
     * @param {object} marketLists config.marketList
     * @returns {boolean} true when every pair is a satisfied child pair or a parent pair
     */
    function isBranchMappingReliable(branchMapping, marketLists) {
        const mapping = branchMapping && typeof branchMapping === 'object' ? branchMapping : {};
        const lists = marketLists && typeof marketLists === 'object' ? marketLists : {};
        // Flatten every {sourceMl: targetMl} pair across all branches, then require every pair to be
        // reliable and at least one pair to exist. A flat check keeps this out of a nested loop.
        const pairs = [];
        for (const branchValue of Object.values(mapping)) {
            const branchPairs = branchValue && typeof branchValue === 'object' ? branchValue : {};
            for (const pair of Object.entries(branchPairs)) {
                pairs.push(pair);
            }
        }
        return pairs.length > 0 && pairs.every(([sourceMlName, targetMlName]) => isReliablePair(sourceMlName, targetMlName, lists));
    }

    /**
     * True when one `{sourceMl: targetMl}` deployment pair is reliable: it is a `_ParentBU_`/parent
     * pair (exempt from the known-BU rule) OR both marketLists exist and resolve to ≥1 BU with a
     * market name. Pure.
     *
     * @param {string} sourceMlName the source marketList name
     * @param {string|string[]} targetMlName the target marketList name
     * @param {object} lists config.marketList
     * @returns {boolean} whether this pair is reliable
     */
    function isReliablePair(sourceMlName, targetMlName, lists) {
        const sourceEntries = parseMarketListBUs(lists[sourceMlName]);
        const targetEntries = parseMarketListBUs(typeof targetMlName === 'string' ? lists[targetMlName] : undefined);
        // A parent pair (either side references _ParentBU_) is exempt from the known-BU requirement.
        if (sourceEntries.some((entry) => entry.hasParent) || targetEntries.some((entry) => entry.hasParent)) {
            return true;
        }
        // Otherwise both sides must resolve to ≥1 entry (a BU with a market name).
        return (
            sourceEntries.some((entry) => entry.market !== '') && targetEntries.some((entry) => entry.market !== '')
        );
    }

    /**
     * Scan a config's `marketList` for 1:1 child entries (a `<cred>/<BU>` ref → a single market NAME
     * string whose market EXISTS in `config.markets`) and build a flat, lineage-independent adoption
     * map (Tier 2). Existence is the ONLY qualifying gate — a market's `suffix` field is NOT required
     * (§12b); the effective suffix is computed separately and may be `''` until the user picks a key.
     * Tolerates junk (a ref whose market does not exist is ignored, no throw), skips array-valued
     * entries and `_ParentBU_`-keyed lists/entries and `filter`/`description` meta keys.
     *
     * For each detected stub market, §13's `resolveRichMarketForStub` may substitute a richer same-BU
     * market; `marketOf[name].adoptedFrom` records the original stub name when a substitution happened.
     *
     * @param {object} config the accepted vanilla `.mcdevrc.json`
     * @returns {{detected: boolean, byBU: {[buRef: string]: string}, marketOf: {[marketName: string]: {suffix: string, keys: string[], vars: object, adoptedFrom: (string|null)}}, needsSuffixKey: boolean, suffixKeyCandidates: string[]}} the adoption map
     */
    function detectMarketListAdoption(config) {
        const config_ = config && typeof config === 'object' ? config : {};
        const markets = config_.markets && typeof config_.markets === 'object' ? config_.markets : {};
        const marketLists =
            config_.marketList && typeof config_.marketList === 'object' ? config_.marketList : {};
        const credentials =
            config_.credentials && typeof config_.credentials === 'object' ? config_.credentials : {};
        // A vanilla `.mcdevrc.json` carries no top-level `suffixKey` (it lives under `mpb_pipeline`,
        // absent on this path), so the effective suffix here is derived only from a real `.suffix` field.
        const suffixKey = null;

        // Shared accumulators the per-entry processor writes into (keeps the scan out of a nested loop).
        const accumulator = { byBU: {}, marketOf: {}, hasRealSuffix: false, candidateKeys: new Set() };
        const scanContext = { markets: markets, credentials: credentials, suffixKey: suffixKey, accumulator: accumulator };

        for (const [listName, list] of Object.entries(marketLists)) {
            // Skip _ParentBU_-named lists and non-object lists entirely.
            if (typeof listName === 'string' && listName.includes(PARENT_BU)) {
                continue;
            }
            if (!list || typeof list !== 'object') {
                continue;
            }
            processAdoptionList(list, scanContext);
        }

        const isDetected = Object.keys(accumulator.byBU).length > 0;
        // needsSuffixKey: adoption detected, no market carries a real `suffix`, and no key chosen yet.
        const isNeedsSuffixKey = isDetected && !accumulator.hasRealSuffix && !suffixKey;
        const suffixKeyCandidates = [...accumulator.candidateKeys].toSorted((a, b) => a.localeCompare(b));
        return {
            detected: isDetected,
            byBU: accumulator.byBU,
            marketOf: accumulator.marketOf,
            needsSuffixKey: isNeedsSuffixKey,
            suffixKeyCandidates: suffixKeyCandidates,
        };
    }

    /**
     * Process one marketList's entries into the adoption accumulator: for each 1:1 `<cred>/<BU> →
     * marketName` entry whose market exists, resolve a richer same-BU market (§13) and record it in
     * `byBU`/`marketOf`. Skips meta keys, array-valued entries, `_ParentBU_` entries, and refs whose
     * market does not exist (junk tolerance). Pure (mutates the accumulator in `context`).
     *
     * @param {object} list a single marketList object
     * @param {{markets: object, credentials: object, suffixKey: (string|null), accumulator: {byBU: object, marketOf: object, hasRealSuffix: boolean, candidateKeys: Set<string>}}} context shared scan state
     * @returns {void}
     */
    function processAdoptionList(list, context) {
        const { markets, credentials, suffixKey, accumulator } = context;
        for (const [entryKey, entryValue] of Object.entries(list)) {
            // Skip meta keys, array-valued entries, and _ParentBU_ entries.
            if (entryKey === 'filter' || entryKey === 'description') {
                continue;
            }
            if (typeof entryValue !== 'string' || Array.isArray(entryValue)) {
                continue;
            }
            if (bareBUFromEntryKey(entryKey) === PARENT_BU) {
                continue;
            }
            // Junk tolerance: the referenced market must exist, else ignore the entry.
            if (!Object.hasOwn(markets, entryValue)) {
                continue;
            }
            // §13: adopt a richer same-BU market for a near-empty stub when one exists.
            const resolved = resolveRichMarketForStub(entryValue, { markets: markets }, credentials);
            const marketName = resolved.name;
            const marketVariables = markets[marketName] || {};
            accumulator.byBU[entryKey] = marketName;
            if (Object.hasOwn(accumulator.marketOf, marketName)) {
                continue;
            }
            const keys = nonReservedMarketKeys(marketVariables);
            const variables = {};
            for (const key of keys) {
                variables[key] = marketVariables[key];
                accumulator.candidateKeys.add(key);
            }
            if (typeof marketVariables.suffix === 'string' && marketVariables.suffix !== '') {
                accumulator.hasRealSuffix = true;
            }
            accumulator.marketOf[marketName] = {
                suffix: effectiveSuffixOf(marketVariables, suffixKey),
                keys: keys,
                vars: variables,
                adoptedFrom: resolved.adoptedFrom,
            };
        }
    }

    /**
     * Resolve the numeric business-unit `mid` for a bare BU name from `credentials.*.businessUnits`
     * (first match wins). Returns `null` when unknown. Pure.
     *
     * @param {string} buName the bare BU name
     * @param {object} credentials config.credentials
     * @returns {(string|null)} the mid as a string, or null
     */
    function midForBUName(buName, credentials) {
        const creds = Object.values(credentials || {});
        for (const cred of creds) {
            const businessUnits = cred && typeof cred === 'object' && cred.businessUnits;
            if (businessUnits && typeof businessUnits === 'object' && Object.hasOwn(businessUnits, buName)) {
                return String(businessUnits[buName]);
            }
        }
        return null;
    }

    /**
     * True when a market is "richer" than a bare stub: it carries a variable key beyond
     * `{buName, description}`, OR it carries any of `env` / `mid` / `marketId`. Pure.
     *
     * @param {object} market a market's variable object
     * @returns {boolean} whether the market qualifies as rich
     */
    function isRicherMarket(market) {
        if (!market || typeof market !== 'object') {
            return false;
        }
        if (market.env != null || market.mid != null || market.marketId != null) {
            return true;
        }
        return Object.keys(market).some((key) => key !== 'buName' && key !== 'description');
    }

    /**
     * §13a. Given a stub market NAME that a marketList references, adopt a RICHER same-BU market when
     * one exists. Exact-match-only precedence (no fuzzy): (1) equal `buName`, (2) equal `mid` (from
     * `credentials.*.businessUnits`), (3) equal ISO-like code. The FIRST precedence tier that yields
     * ≥1 richer candidate wins; tie-break = most non-reserved keys, then alphabetical name. Falls
     * back to the stub itself when no richer same-BU market is found. Pure.
     *
     * @param {string} stubName the market name a marketList references
     * @param {object} config the accepted `.mcdevrc.json`
     * @param {object} credentials config.credentials (for mid resolution)
     * @returns {{name: string, adoptedFrom: (string|null)}} the resolved market name; `adoptedFrom`
     *   is the stub name when a different rich market was chosen, else `null`
     */
    function resolveRichMarketForStub(stubName, config, credentials) {
        const config_ = config && typeof config === 'object' ? config : {};
        const markets = config_.markets && typeof config_.markets === 'object' ? config_.markets : {};
        const stub = markets[stubName];
        if (!stub || typeof stub !== 'object') {
            return { name: stubName, adoptedFrom: null };
        }
        const stubBUName = typeof stub.buName === 'string' ? stub.buName : null;
        const stubMid = stubBUName ? midForBUName(stubBUName, credentials) : null;
        const stubIso = typeof stub.ISO === 'string' ? stub.ISO : null;

        // Candidate markets: every OTHER market that qualifies as richer.
        const richCandidates = Object.keys(markets).filter(
            (name) => name !== stubName && isRicherMarket(markets[name])
        );

        // Exact-match precedence tiers, first non-empty wins.
        const tiers = [
            // (1) same buName.
            (name) => stubBUName != null && markets[name].buName === stubBUName,
            // (2) same mid (from credentials for the stub's BU).
            (name) => stubMid != null && markets[name].mid != null && String(markets[name].mid) === stubMid,
            // (3) same ISO-like code.
            (name) => stubIso != null && typeof markets[name].ISO === 'string' && markets[name].ISO === stubIso,
        ];
        for (const matches of tiers) {
            const matched = richCandidates.filter(matches);
            if (matched.length === 0) {
                continue;
            }
            // Tie-break: most non-reserved keys, then alphabetical name.
            const best = matched.toSorted((a, b) => {
                const diff = nonReservedMarketKeys(markets[b]).length - nonReservedMarketKeys(markets[a]).length;
                return diff === 0 ? a.localeCompare(b) : diff;
            })[0];
            return { name: best, adoptedFrom: best === stubName ? null : stubName };
        }
        // No richer same-BU market — adopt the stub as-is.
        return { name: stubName, adoptedFrom: null };
    }

    /**
     * Heuristically reconstruct a wizard state from a vanilla `.mcdevrc.json` that carries NO
     * `options.deployment.mpb_pipeline` block (hand-authored, or a pipeline built by other means).
     * Never throws: every step falls back to a safe default and records a human-readable warning
     * instead of failing, so a partially-inferred state still lands the user mid-wizard.
     *
     * Heuristics:
     *  1. BUs & credentials from `credentials.*.businessUnits` (multiCred when >1 credential;
     *     `<cred>/<BU>` refs when multiCred else bare). `_ParentBU_` is excluded from the pool.
     *  2. `separator` defaults to `_`; each BU's suffix is read from `markets[<its market>].suffix`.
     *  3. Pipeline hops from `branchSourceTargetMapping`: each `{ srcMl: tgtMl }` pair links the
     *     single source-BU as the upstream of every target-BU → `lineage[targetBU] = sourceBU`.
     *     `_ParentBU_`/filter-only parent pairs are skipped for lineage but flip `sharedDEs` on.
     *  4. `envOrder`/`envBUs` reconstructed from the hop graph: a BU's env is the branch under which
     *     it first appears as a target; root BUs (never a target) form the first (source) env. Envs
     *     are ordered by walking the lineage DAG from roots to leaves.
     *  5. `prodBUs` default to the leaf environment's BUs.
     *  6. `sharedDEs` true when any `_ParentBU_` marketList / parent pipeline pattern exists.
     *  7. Anything ambiguous/missing → safe default + a warning string.
     *
     * @param {object} config the accepted vanilla `.mcdevrc.json`
     * @returns {{state: WizardState, warnings: string[]}} the inferred state and any warnings
     */
    function inferWizardStateFromVanilla(config) {
        const warnings = [];
        const state_ = emptyWizardState();
        const config_ = config && typeof config === 'object' ? config : {};

        // ── Step 1: credentials + BU pool. ──
        const credentials = config_.credentials && typeof config_.credentials === 'object' ? config_.credentials : {};
        const credNames = Object.keys(credentials);
        const isMultiCred = credNames.length > 1;
        state_.multiCred = isMultiCred;
        // Map bare BU name → its ref (bare or <cred>/<BU>) and detect the _ParentBU_ sentinel.
        const buReferenceByName = new Map();
        let hasParentBU = false;
        for (const credName of credNames) {
            if (collectCredentialBUs(credentials[credName], credName, isMultiCred, buReferenceByName)) {
                hasParentBU = true;
            }
        }
        if (buReferenceByName.size === 0) {
            warnings.push('No business units were found under any credential, so the pipeline could not be reconstructed.');
            state_.sharedDEs = hasParentBU;
            return { state: state_, warnings: warnings };
        }

        // ── Step 6 (early): shared-DE detection also picks up parent marketLists below. ──
        state_.sharedDEs = hasParentBU;

        // ── Step 3: lineage from branchSourceTargetMapping + marketList. ──
        const marketLists = config_.marketList && typeof config_.marketList === 'object' ? config_.marketList : {};
        const deployment = config_.options && config_.options.deployment && typeof config_.options.deployment === 'object' ? config_.options.deployment : {};
        const branchMapping = deployment.branchSourceTargetMapping && typeof deployment.branchSourceTargetMapping === 'object' ? deployment.branchSourceTargetMapping : {};

        const lineage = {};
        // buName → the branch under which it first appears as a TARGET (its environment key).
        const targetBranchOfBU = new Map();
        // Every buName referenced anywhere in a real (non-parent) hop, so we can pick a suffix market.
        const buMarketByName = new Map();

        const hopContext = {
            marketLists: marketLists,
            buReferenceByName: buReferenceByName,
            lineage: lineage,
            targetBranchOfBU: targetBranchOfBU,
            buMarketByName: buMarketByName,
            warnings: warnings,
        };
        for (const [branch, branchValue] of Object.entries(branchMapping)) {
            const pairs = branchValue && typeof branchValue === 'object' ? branchValue : {};
            for (const [sourceMlName, targetMlName] of Object.entries(pairs)) {
                if (processHopPair(branch, sourceMlName, targetMlName, hopContext)) {
                    // The hop was a parent / shared-DE pair — flip the flag without child lineage.
                    state_.sharedDEs = true;
                }
            }
        }

        // ── Step 4: reconstruct envOrder + envBUs from the hop graph. ──
        const grouping = groupBUsIntoEnvironments(buReferenceByName, targetBranchOfBU, lineage, warnings);
        state_.envOrder = grouping.envOrder;
        state_.envBUs = grouping.envBUs;
        state_.envBranches = grouping.envBranches;
        // Translate the bare-BU lineage into the ref space the rest of the wizard uses.
        state_.lineage = {};
        for (const [childBU, parentBU] of Object.entries(lineage)) {
            const childReference = buReferenceByName.get(childBU);
            const parentReference = buReferenceByName.get(parentBU);
            if (childReference && parentReference) {
                state_.lineage[childReference] = parentReference;
            }
        }

        // ── Step 2: separator + suffixes from markets. ──
        state_.separator = '_';
        const markets = config_.markets && typeof config_.markets === 'object' ? config_.markets : {};
        state_.suffixes = {};
        state_.marketVariables = {};
        for (const [buName, reference] of buReferenceByName) {
            // Resolve the ONE market entry the suffix comes from, so the extracted sibling variables
            // are read from the SAME entry (same-entry resolution).
            const market = resolveMarketForBU(buName, reference, buMarketByName, markets);
            const suffix = market && typeof market.suffix === 'string' && market.suffix !== '' ? market.suffix : '';
            if (suffix) {
                state_.suffixes[reference] = suffix;
            } else {
                warnings.push('No suffix could be found for business unit "' + buName + '"; you will need to set it.');
            }
            // Copy every key except suffix/description from the resolved market into marketVariables.
            if (market && typeof market === 'object') {
                const variables = {};
                for (const [key, value] of Object.entries(market)) {
                    if (key !== 'suffix' && key !== 'description') {
                        variables[key] = value;
                    }
                }
                if (Object.keys(variables).length > 0) {
                    state_.marketVariables[reference] = variables;
                }
            }
        }

        // ── Step 5: prodBUs default to the leaf (last) environment's BUs. ──
        const lastEnvironment = state_.envOrder.at(-1);
        state_.prodBUs = lastEnvironment ? [...(state_.envBUs[lastEnvironment] || [])] : [];

        if (state_.sharedDEs) {
            warnings.push('A shared-DE (parent BU) pipeline was detected and enabled; review the shared-DE step.');
        }
        warnings.push('This config had no builder metadata, so the pipeline was reconstructed heuristically — please review every step before regenerating.');

        return { state: state_, warnings: warnings };
    }

    /**
     * Collect one credential's business units into the shared ref map (first credential wins a
     * name clash in the bare-ref space). The `_ParentBU_` sentinel is not an assignable BU; its
     * presence is reported via the return value. Pure (mutates the passed map only).
     *
     * @param {object} cred the credential object (`{ businessUnits: {...} }`)
     * @param {string} credName the credential name (used as the ref prefix when multiCred)
     * @param {boolean} isMultiCred true when refs must be `<cred>/<BU>` qualified
     * @param {Map<string, string>} buReferenceByName BU name → ref accumulator (mutated)
     * @returns {boolean} true when this credential exposes a `_ParentBU_` sentinel
     */
    function collectCredentialBUs(cred, credName, isMultiCred, buReferenceByName) {
        const businessUnits = cred && typeof cred === 'object' && cred.businessUnits && typeof cred.businessUnits === 'object' ? cred.businessUnits : {};
        let hasParent = false;
        for (const buName of Object.keys(businessUnits)) {
            if (buName === PARENT_BU) {
                hasParent = true;
            } else if (!buReferenceByName.has(buName)) {
                buReferenceByName.set(buName, isMultiCred ? credName + '/' + buName : buName);
            }
        }
        return hasParent;
    }

    /**
     * Process one `sourceMl → targetMl` deployment hop: skip tool-generated (`mpb_`) pairs, detect
     * shared-DE parent pairs, and otherwise write the child lineage + target-branch grouping. Pure
     * (mutates the accumulator maps in `context`).
     *
     * @param {string} branch the branch key this pair is nested under (≈ target env)
     * @param {string} sourceMlName the source marketList name
     * @param {string|string[]} targetMlName the target marketList name
     * @param {{marketLists: object, buReferenceByName: Map<string, string>, lineage: object, targetBranchOfBU: Map<string, string>, buMarketByName: Map<string, string>, warnings: string[]}} context shared accumulators
     * @returns {boolean} true when the pair was a shared-DE / `_ParentBU_` parent pair
     */
    function processHopPair(branch, sourceMlName, targetMlName, context) {
        // Skip tool-generated (mpb_) pairs entirely — they are not the vanilla pipeline.
        if (sourceMlName.indexOf('mpb_') === 0 || (typeof targetMlName === 'string' && targetMlName.indexOf('mpb_') === 0)) {
            return false;
        }
        const sourceEntries = parseMarketListBUs(context.marketLists[sourceMlName]);
        const targetEntries = parseMarketListBUs(typeof targetMlName === 'string' ? context.marketLists[targetMlName] : undefined);
        if (sourceEntries.some((entry) => entry.hasParent) || targetEntries.some((entry) => entry.hasParent)) {
            // Parent / shared-DE hop: never contributes child lineage, but proves sharedDEs.
            return true;
        }
        const realSources = sourceEntries.filter((entry) => context.buReferenceByName.has(entry.bu));
        const realTargets = targetEntries.filter((entry) => context.buReferenceByName.has(entry.bu));
        if (realSources.length === 0 || realTargets.length === 0) {
            return false;
        }
        if (realSources.length > 1) {
            context.warnings.push('Source pipeline "' + sourceMlName + '" lists more than one business unit; only "' + realSources[0].bu + '" was used as the upstream.');
        }
        const sourceBU = realSources[0].bu;
        recordBUMarket(context.buMarketByName, sourceBU, realSources[0].market);
        for (const targetEntry of realTargets) {
            recordBUMarket(context.buMarketByName, targetEntry.bu, targetEntry.market);
            context.lineage[targetEntry.bu] = sourceBU;
            if (!context.targetBranchOfBU.has(targetEntry.bu)) {
                context.targetBranchOfBU.set(targetEntry.bu, branch);
            }
        }
        return false;
    }

    /**
     * Record the first non-empty market name seen for a BU, used later for suffix lookup. Pure
     * (mutates the passed map only).
     *
     * @param {Map<string, string>} buMarketByName BU name → market name accumulator
     * @param {string} buName the bare BU name
     * @param {string} market the market name from a marketList entry
     * @returns {void}
     */
    function recordBUMarket(buMarketByName, buName, market) {
        if (market && !buMarketByName.has(buName)) {
            buMarketByName.set(buName, market);
        }
    }

    /**
     * Resolve the single market entry a BU's suffix (and its sibling variables) come from. Tries the
     * candidate cascade `[buMarketByName.get(buName), buName, bareBUFromEntryKey(reference)]` — prefer
     * the market the BU maps to in a pipeline marketList, then a market named exactly after the BU,
     * then one named after the bare BU — and returns the FIRST candidate whose market carries a
     * non-empty `suffix` (so the resolved entry is exactly the one the suffix is read from). When no
     * candidate has a non-empty suffix, falls back to the first EXISTING candidate
     * market (so sibling variables can still be extracted from a suffix-less market), or `undefined`
     * when no candidate market exists at all. In that fallback path the returned entry's `suffix` is
     * `''`, so the caller leaves `suffixes[ref]` unset and pushes a warning while still harvesting the
     * market variables from that suffix-less entry. Pure.
     *
     * @param {string} buName the bare BU name
     * @param {string} reference the BU ref (bare or `<cred>/<BU>`)
     * @param {Map<string, string>} buMarketByName BU name → market name from pipeline marketLists
     * @param {object} markets the config `markets` map
     * @returns {(object|undefined)} the resolved market entry, or `undefined`
     */
    function resolveMarketForBU(buName, reference, buMarketByName, markets) {
        const candidates = [buMarketByName.get(buName), buName, bareBUFromEntryKey(reference)];
        let firstExisting;
        for (const candidate of candidates) {
            const market = candidate && Object.hasOwn(markets, candidate) ? markets[candidate] : undefined;
            if (!market) {
                continue;
            }
            if (firstExisting === undefined) {
                firstExisting = market;
            }
            if (typeof market.suffix === 'string' && market.suffix !== '') {
                return market;
            }
        }
        return firstExisting;
    }

    /**
     * Group BUs into ordered environments from the hop graph. A BU's environment is the branch under
     * which it first appears as a target (via `targetBranchOfBU`); BUs that are never a target are
     * roots and form the first (source) environment. Environments are ordered by walking the lineage
     * DAG from roots to leaves (a target env always follows its source env). Never throws; falls back
     * to a single "All BUs" environment (with a warning) when the graph yields nothing usable.
     *
     * @param {Map<string, string>} buReferenceByName BU name → ref map (the full assignable pool)
     * @param {Map<string, string>} targetBranchOfBU BU name → the branch it is a target under
     * @param {{[childBU: string]: string}} lineage bare-BU child → parent map
     * @param {string[]} warnings accumulator for human-readable fallback notes
     * @returns {{envOrder: string[], envBUs: object, envBranches: object}} grouped environments
     */
    function groupBUsIntoEnvironments(buReferenceByName, targetBranchOfBU, lineage, warnings) {
        // Branch key → env display name; roots share a synthesized source env.
        const branchOrder = orderBranchesByLineage(targetBranchOfBU, lineage);
        const allBUNames = buReferenceByName.keys().toArray();
        const rootBUs = allBUNames.filter((bu) => !targetBranchOfBU.has(bu));
        const environmentBUs = {};
        const environmentBranches = {};
        const environmentOrder = [];

        // Source (root) environment first, when any BU is never a target.
        if (rootBUs.length > 0) {
            const sourceName = sourceEnvironmentName(branchOrder, warnings);
            environmentOrder.push(sourceName);
            environmentBUs[sourceName] = rootBUs.map((bu) => buReferenceByName.get(bu));
        }

        // One environment per branch, in DAG order (empty branches are skipped, not `continue`d).
        for (const branch of branchOrder) {
            const busInBranch = allBUNames
                .filter((bu) => targetBranchOfBU.get(bu) === branch)
                .map((bu) => buReferenceByName.get(bu))
                .filter(Boolean);
            if (busInBranch.length > 0) {
                const displayName = uniqueEnvironmentName(environmentNameFromBranch(branch) || branch, environmentBUs);
                environmentOrder.push(displayName);
                environmentBUs[displayName] = busInBranch;
                environmentBranches[displayName] = branch;
            }
        }

        if (environmentOrder.length === 0) {
            // No hops at all: land every BU in one environment so the user can still edit.
            warnings.push('No deployment hops were found, so all business units were placed in a single environment.');
            const soleName = 'DEV';
            environmentOrder.push(soleName);
            environmentBUs[soleName] = buReferenceByName.values().toArray();
        }
        return { envOrder: environmentOrder, envBUs: environmentBUs, envBranches: environmentBranches };
    }

    /**
     * Order the target branches so that a branch whose BUs deploy FROM another branch's BUs comes
     * after it. Uses the lineage parent of each branch's BUs to find its upstream branch, then walks
     * roots-first. Cyclic/broken links fall back to the branch-key insertion order (with a warning).
     * Pure.
     *
     * @param {Map<string, string>} targetBranchOfBU BU name → branch it targets
     * @param {{[childBU: string]: string}} lineage bare-BU child → parent map
     * @returns {string[]} branches in source→leaf order
     */
    function orderBranchesByLineage(targetBranchOfBU, lineage) {
        const branches = [...new Set(targetBranchOfBU.values())];
        // Upstream branch of a branch = the target-branch of the lineage parent of any of its BUs
        // (undefined when the parent is a root BU → that branch depends only on the source env).
        const upstreamOf = new Map();
        for (const branch of branches) {
            upstreamOf.set(branch, upstreamBranchOf(branch, targetBranchOfBU, lineage));
        }
        // Topological-ish walk: repeatedly emit branches whose upstream is already emitted (or root).
        const ordered = [];
        const emitted = new Set();
        let guard = branches.length + 1;
        while (ordered.length < branches.length && guard-- > 0) {
            const ready = branches.filter((branch) => {
                const upstream = upstreamOf.get(branch);
                return !emitted.has(branch) && (!upstream || emitted.has(upstream));
            });
            for (const branch of ready) {
                ordered.push(branch);
                emitted.add(branch);
            }
        }
        // Any left over (cycle) get appended in insertion order.
        for (const branch of branches) {
            if (!emitted.has(branch)) {
                ordered.push(branch);
            }
        }
        return ordered;
    }

    /**
     * Find the upstream branch of a target branch: the branch that the lineage parent of any of the
     * branch's BUs is itself a target under. Returns undefined when every parent is a root BU (so the
     * branch depends only on the synthesized source env). Pure.
     *
     * @param {string} branch the branch to resolve the upstream of
     * @param {Map<string, string>} targetBranchOfBU BU name → branch it targets
     * @param {{[childBU: string]: string}} lineage bare-BU child → parent map
     * @returns {(string|undefined)} the upstream branch key, or undefined
     */
    function upstreamBranchOf(branch, targetBranchOfBU, lineage) {
        for (const [bu, brnch] of targetBranchOfBU) {
            if (brnch !== branch) {
                continue;
            }
            const parent = lineage[bu];
            if (parent && targetBranchOfBU.has(parent)) {
                return targetBranchOfBU.get(parent);
            }
        }
        return;
    }

    /**
     * Name the synthesized source (root) environment. When the first branch's derived name implies a
     * conventional order we still use a stable `DEV` label unless that collides; a warning notes the
     * name was assumed since a vanilla config has no explicit source-env label. Pure.
     *
     * @param {string[]} branchOrder the ordered target branches (for collision context)
     * @param {string[]} warnings accumulator
     * @returns {string} the source environment display name
     */
    function sourceEnvironmentName(branchOrder, warnings) {
        warnings.push('The source (first) environment has no branch of its own, so it was named "DEV" — rename it if needed.');
        // Avoid colliding with a branch that also maps to "DEV".
        const taken = new Set(branchOrder.map((branch) => environmentNameFromBranch(branch)));
        if (!taken.has('DEV')) {
            return 'DEV';
        }
        return uniqueEnvironmentName('Source', {});
    }

    /**
     * Return a display name unique among the already-claimed environment names, appending ` 2`, ` 3`,
     * … on collision. Pure.
     *
     * @param {string} name the desired display name
     * @param {object} environmentBUs the environments claimed so far (keys are taken names)
     * @returns {string} a name not present in `environmentBUs`
     */
    function uniqueEnvironmentName(name, environmentBUs) {
        const base = name || 'Env';
        if (!Object.hasOwn(environmentBUs, base)) {
            return base;
        }
        let index = 2;
        while (Object.hasOwn(environmentBUs, base + ' ' + index)) {
            index++;
        }
        return base + ' ' + index;
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

    /**
     * Show the intake view. Core `render()` owns the step switch and calls this.
     *
     * @returns {void}
     */
    function renderIntake() {
        showOnly('intake');
    }

    /**
     * Wire dropzone / file-input / paste controls. Leftover `init()` calls this after `cacheDom()`.
     *
     * @returns {void}
     */
    function wireIntake() {
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
    }

    Object.assign(C, {
        classifyIntake: classifyIntake,
        looksLikeAuthFile: looksLikeAuthFile,
        isAuthFileName: isAuthFileName,
        acceptConfig: acceptConfig,
        wizardStateFromConfig: wizardStateFromConfig,
        inferWizardStateFromVanilla: inferWizardStateFromVanilla,
        isBranchMappingReliable: isBranchMappingReliable,
        detectMarketListAdoption: detectMarketListAdoption,
        resolveRichMarketForStub: resolveRichMarketForStub,
        renderIntake: renderIntake,
        wireIntake: wireIntake,
    });
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
