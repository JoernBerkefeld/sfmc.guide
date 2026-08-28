/**
 * mcdev Pipeline Builder — config builder (pure, DOM-free).
 *
 * Exposes a single pure function `buildConfig(wizardState, baseConfig)` that merges
 * tool-generated pipeline entries into an uploaded `.mcdevrc.json` object. Everything the
 * tool owns is namespaced with an `mpb_` prefix so regeneration is idempotent: on each run
 * all `mpb_`-prefixed keys are replaced wholesale and user-authored keys are left untouched.
 *
 * Authored as a classic browser script (IIFE + browser global) with a UMD-style footer so
 * the Node test can `require()` it. NOT an ES module.
 *
 * @typedef {object} WizardState
 * @property {number} version state schema version
 * @property {boolean} multiCred true when the source config held more than one credential
 * @property {string[]} envOrder ordered environment display names; index 0 is DEV (source of truth)
 * @property {{[env: string]: string[]}} envBUs env name -> BU refs (`<cred>/<BU>` when multiCred, else bare)
 * @property {{[env: string]: string}} envBranches env name -> git branch (user-editable; falls back to branchKey(env) when absent)
 * @property {{[childRef: string]: string}} lineage child-BU ref -> upstream-BU ref (one hop up the chain)
 * @property {string} separator suffix separator (default `_`)
 * @property {{[buRef: string]: string}} suffixes BU ref -> suffix (includes the separator, e.g. `_UAT`)
 * @property {{[buRef: string]: {[varName: string]: string}}} [marketVariables] BU ref -> extra market variables (merged into config.markets[name]; `suffix` is never stored here)
 * @property {string[]} prodBUs BU refs confirmed as production
 * @property {boolean} sharedDEs whether a shared-DE parent pipeline is used
 * @property {string[]} [selectedRules] validation rule ids the user picked (round-tripped)
 * @property {{[buRef: string]: string[]}} [prefixBlacklist] per-BU forbidden key/name prefixes (round-tripped)
 * @property {object} [retention] the sendable-DE retention policy object (round-tripped)
 */

/**
 * @param {Window|globalThis} global host object to attach the browser global to
 */
(function (global) {
    'use strict';

    const MPB = 'mpb_';

    /**
     * Split a BU reference into its credential and bare BU name.
     *
     * @param {string} reference BU reference (`<cred>/<BU>` or bare `<BU>`)
     * @returns {{cred: (string|null), bu: string}} parsed parts
     */
    function splitReference(reference) {
        const slash = reference.indexOf('/');
        if (slash === -1) {
            return { cred: null, bu: reference };
        }
        return { cred: reference.slice(0, slash), bu: reference.slice(slash + 1) };
    }

    /**
     * Resolve the credential prefix used for internal references. When a config has a single
     * credential the refs are stored bare, so we look the credential name up from the config.
     *
     * @param {string} reference BU reference
     * @param {object} baseConfig uploaded `.mcdevrc.json`
     * @returns {string} credential name to prefix generated references with
     */
    function credOf(reference, baseConfig) {
        const parsed = splitReference(reference);
        if (parsed.cred) {
            return parsed.cred;
        }
        const creds = (baseConfig && baseConfig.credentials) || {};
        const names = Object.keys(creds);
        return names.length > 0 ? names[0] : 'default';
    }

    /**
     * Fully-qualified `<cred>/<BU>` reference for a stored BU ref.
     *
     * @param {string} reference BU reference (possibly bare)
     * @param {object} baseConfig uploaded `.mcdevrc.json`
     * @returns {string} `<cred>/<BU>` reference
     */
    function qualifiedReference(reference, baseConfig) {
        const parsed = splitReference(reference);
        return credOf(reference, baseConfig) + '/' + parsed.bu;
    }

    /**
     * The market name generated for a given env + BU ref.
     *
     * @param {string} environment environment display name
     * @param {string} reference BU reference
     * @param {boolean} single true when the env holds exactly one BU
     * @returns {string} `mpb_<env>[_<bu>]` market name
     */
    function marketName(environment, reference, single) {
        const bu = splitReference(reference).bu;
        const base = MPB + slug(environment);
        return single ? base : base + '_' + slug(bu);
    }

    /**
     * Build a per-env resolver of BU ref -> generated market name that guarantees uniqueness within
     * the env even when two distinct BU refs slug-collide (e.g. `EUN-QA` and `EUN_QA` both slug to
     * `EUN_QA`). The FIRST BU to claim a name keeps the plain `marketName()` value (so the normal,
     * non-colliding case is byte-identical); each subsequent colliding BU gets a stable `_<n>` counter
     * suffix in BU order. Because `environmentBUs[env]` is a stable ordered array, the same ref always
     * resolves to the same name across every call — keeping buildConfig idempotent.
     *
     * @param {string} environment env display name
     * @param {string[]} references the env's BU refs (order defines counter assignment)
     * @returns {Map<string, string>} BU ref -> unique market name
     */
    function marketNameMap(environment, references) {
        const isSingle = references.length === 1;
        const used = new Set();
        const resolved = new Map();
        for (const reference of references) {
            const base = marketName(environment, reference, isSingle);
            let name = base;
            let counter = 1;
            while (used.has(name)) {
                counter += 1;
                name = base + '_' + counter;
            }
            used.add(name);
            resolved.set(reference, name);
        }
        return resolved;
    }

    /**
     * Normalise a label into a key-safe slug (letters, digits, underscore).
     *
     * @param {string} value raw label
     * @returns {string} slug
     */
    function slug(value) {
        return String(value)
            .trim()
            .replaceAll(/[^a-zA-Z0-9]+/g, '_')
            .replaceAll(/^_+|_+$/g, '');
    }

    /**
     * Branch key derived from an environment name (lower-case, dash-separated).
     *
     * @param {string} environment environment display name
     * @returns {string} branch key
     */
    function branchKey(environment) {
        return String(environment)
            .trim()
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/g, '-')
            .replaceAll(/^-+|-+$/g, '');
    }

    /**
     * Resolve the git branch for an environment: prefer the user-editable `envBranches[env]` (WS3
     * env → branch mapping) when present and non-empty, otherwise fall back to the derived
     * `branchKey(env)`. Round-tripped or hand-authored configs that predate `envBranches` therefore
     * still key their pipeline pairs under the same slug as before.
     *
     * @param {string} environment environment display name
     * @param {{[env: string]: string}} environmentBranches env name -> git branch map (may be absent)
     * @returns {string} the branch key to nest this hop's source->target pairs under
     */
    function resolveBranch(environment, environmentBranches) {
        const mapped =
            environmentBranches && typeof environmentBranches === 'object' ? environmentBranches[environment] : '';
        const trimmed = typeof mapped === 'string' ? mapped.trim() : '';
        return trimmed || branchKey(environment);
    }

    /**
     * Escape SQL-LIKE wildcards so a suffix is matched as a literal (mcdev `Util.stringLike`).
     * `_` is "exactly one character" and `%` is "any run", so both must be bracket-escaped.
     *
     * @param {string} value raw suffix (includes the separator, e.g. `_DEV`)
     * @returns {string} suffix with `_` and `%` escaped
     */
    function likeEscape(value) {
        return String(value).replaceAll(/[_%]/g, (ch) => '[' + ch + ']');
    }

    /**
     * Ends-only LIKE pattern for a BU suffix: `%` + escaped suffix. Matches keys that end with
     * that suffix (e.g. `_DEV` → `%[_]DEV`) without a contained mid-key band.
     *
     * @param {string} suffix BU suffix including the separator
     * @returns {string} ends-only pattern
     */
    function suffixEndPattern(suffix) {
        return '%' + likeEscape(suffix);
    }

    /**
     * Return a shallow copy of an object without any `mpb_`-prefixed keys.
     *
     * @param {object} object object to prune
     * @returns {object} new object without tool keys
     */
    function withoutMpb(object) {
        if (!object || typeof object !== 'object') {
            return object;
        }
        const cleaned = {};
        for (const [key, value] of Object.entries(object)) {
            if (key.indexOf(MPB) !== 0) {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    /**
     * Deep clone a JSON-safe object.
     *
     * @param {object} value value to clone
     * @returns {object} deep clone
     */
    function deepClone(value) {
        return structuredClone(value);
    }

    // Keys that are never treated as pipeline "market variables" for coverage/key-set purposes.
    const RESERVED_MARKET_KEYS = new Set(['suffix', 'description']);

    /**
     * The effective suffix of a market's variables: the real `suffix` field when present and
     * non-empty, else the value of the user-designated `suffixKey` when that value is a non-empty
     * string, else `''` (= no effective suffix yet). Never fabricates or derives a value.
     *
     * Lives in config-builder.js (loaded first) so `analyzeExistingCoverage` — exercised by the
     * isolated top test block — can call it without depending on intake.js.
     *
     * @param {object} marketVariables a market's variable object (e.g. baseConfig.markets[name])
     * @param {string|null} [suffixKey] the variable key the user picked to act as the suffix source
     * @returns {string} the effective suffix, or `''` when none is available
     */
    function effectiveSuffix(marketVariables, suffixKey) {
        if (marketVariables && typeof marketVariables.suffix === 'string' && marketVariables.suffix !== '') {
            return marketVariables.suffix;
        }
        if (
            suffixKey &&
            marketVariables &&
            typeof marketVariables[suffixKey] === 'string' &&
            marketVariables[suffixKey] !== ''
        ) {
            return marketVariables[suffixKey];
        }
        return '';
    }

    /**
     * The non-reserved variable-key set of a market's variables (excludes `suffix`/`description`).
     * Used for the structural key-set presence check in coverage.
     *
     * @param {object} marketVariables a market's variable object
     * @returns {string[]} sorted non-reserved keys
     */
    function nonReservedKeys(marketVariables) {
        if (!marketVariables || typeof marketVariables !== 'object') {
            return [];
        }
        return Object.keys(marketVariables)
            .filter((key) => !RESERVED_MARKET_KEYS.has(key))
            .toSorted((a, b) => a.localeCompare(b));
    }

    /**
     * Compute child-BU refs grouped per pipeline from wizardState lineage/envBUs. Mirrors
     * childBUReferences/pipelinesByRoot locally because the builder is DOM-free and cannot call
     * core helpers. A "root" is a source BU that never appears as a lineage child; each pipeline
     * is the transitive chain of children hanging off that root.
     *
     * @param {WizardState} state wizard state
     * @returns {string[][]} array of pipelines, each an ordered list of BU refs (root first)
     */
    function pipelinesFromState(state) {
        const lineage = state.lineage || {};
        const environmentOrder = Array.isArray(state.envOrder) ? state.envOrder : [];
        const environmentBUs = state.envBUs || {};
        // All BU refs that appear in any env, in env order.
        const allReferences = [];
        for (const environment of environmentOrder) {
            const references = environmentBUs[environment] || [];
            for (const reference of references) {
                allReferences.push(reference);
            }
        }
        // Children -> parent (lineage). Roots are refs that are never a lineage key.
        const childReferences = new Set(Object.keys(lineage));
        const roots = allReferences.filter((reference) => !childReferences.has(reference));
        // Build the downstream adjacency (parent -> [children]) preserving env order.
        const childrenOf = new Map();
        for (const [child, parent] of Object.entries(lineage)) {
            if (!childrenOf.has(parent)) {
                childrenOf.set(parent, []);
            }
            childrenOf.get(parent).push(child);
        }
        // Walk the chain from a root, following the downstream adjacency breadth-first.
        const chainFromRoot = (root) => {
            const chain = [];
            const stack = [root];
            const seen = new Set();
            while (stack.length > 0) {
                const reference = stack.shift();
                if (!seen.has(reference)) {
                    seen.add(reference);
                    chain.push(reference);
                    const children = childrenOf.get(reference) || [];
                    for (const child of children) {
                        stack.push(child);
                    }
                }
            }
            return chain;
        };
        return roots.map((root) => chainFromRoot(root));
    }

    /**
     * Collect the ordered list of hop pairs (source env BUs -> target env BUs) across the pipeline
     * env order, so coverage can verify a marketList exists for every hop.
     *
     * @param {WizardState} state wizard state
     * @returns {Array<{sourceEnv: string, targetEnv: string, sourceRefs: string[], targetRefs: string[]}>} hops
     */
    function hopsFromState(state) {
        const environmentOrder = Array.isArray(state.envOrder) ? state.envOrder : [];
        const environmentBUs = state.envBUs || {};
        const hops = [];
        for (let index = 1; index < environmentOrder.length; index++) {
            hops.push({
                sourceEnv: environmentOrder[index - 1],
                targetEnv: environmentOrder[index],
                sourceRefs: environmentBUs[environmentOrder[index - 1]] || [],
                targetRefs: environmentBUs[environmentOrder[index]] || [],
            });
        }
        return hops;
    }

    /**
     * True when a non-`mpb_` marketList in `marketLists` contains an entry for the qualified
     * reference `qualified`. Meta keys (`filter`/`description`) are ignored.
     *
     * @param {object} marketLists baseConfig.marketList
     * @param {string} qualified `<cred>/<BU>` reference to look for
     * @returns {boolean} whether some existing marketList carries that ref
     */
    function someMarketListHasReference(marketLists, qualified) {
        const entries = Object.entries(marketLists || {});
        for (const [listName, list] of entries) {
            const isUserList = list && typeof list === 'object' && listName.indexOf(MPB) !== 0;
            if (isUserList && Object.prototype.hasOwnProperty.call(list, qualified)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Resolve the covering market for a BU straight from the user's EXISTING (non-`mpb_`) marketLists
     * — the authoritative `<cred>/<BU>: marketName` mapping the deployment pipeline already encodes.
     * The suffix/market-var steps guarantee the resolved market is the correct one, so coverage trusts
     * this mapping instead of re-guessing by suffix. Only string-valued 1:1 entries qualify (array /
     * `_ParentBU_` fan-out entries are not a single-BU market resolution); the named market must exist.
     * When several lists map the same ref, the FIRST existing market wins (stable object order).
     *
     * @param {object} marketLists baseConfig.marketList
     * @param {object} markets baseConfig.markets (existence check for the referenced market)
     * @param {string} qualified `<cred>/<BU>` reference to resolve
     * @returns {(string|null)} the covering market name, or `null` when no list resolves the ref
     */
    function resolveMarketFromLists(marketLists, markets, qualified) {
        const entries = Object.entries(marketLists || {});
        for (const [listName, list] of entries) {
            const isUserList = list && typeof list === 'object' && listName.indexOf(MPB) !== 0;
            if (!isUserList || !Object.prototype.hasOwnProperty.call(list, qualified)) {
                continue;
            }
            const value = list[qualified];
            if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(markets || {}, value)) {
                return value;
            }
        }
        return null;
    }

    /**
     * Find an existing non-`mpb_` market that covers a BU: matching effective suffix AND carrying the
     * full needed variable-key set. A market named after the BU is preferred over any other match.
     *
     * @param {object} markets baseConfig.markets
     * @param {string} bu bare BU name (preferred market name)
     * @param {string} want the needed effective suffix
     * @param {string[]} neededKeys the non-reserved variable keys that must all be present
     * @param {string|null} suffixKey the user-designated suffix key (for effective-suffix resolution)
     * @returns {string|null} the covering market name, or `null` when none matches
     */
    function findCoveringMarket(markets, bu, want, neededKeys, suffixKey) {
        const candidateNames = Object.keys(markets).filter((name) => name.indexOf(MPB) !== 0);
        // Prefer a market named after the BU, then a stable alphabetical order.
        const ordered = candidateNames.toSorted((a, b) =>
            a === bu ? -1 : b === bu ? 1 : a < b ? -1 : a > b ? 1 : 0
        );
        const matches = ordered.filter((name) => {
            if (effectiveSuffix(markets[name], suffixKey) !== want) {
                return false;
            }
            const haveKeys = nonReservedKeys(markets[name]);
            return neededKeys.every((key) => haveKeys.includes(key));
        });
        return matches.length > 0 ? matches[0] : null;
    }

    /**
     * Pure coverage analysis: can the user's EXISTING (non-`mpb_`) markets & marketLists already
     * express the whole pipeline, so the tool could adopt them instead of generating `mpb_` entries?
     *
     * A BU's covering market is resolved in two tiers:
     *   1. Preferred — the market the user's existing marketLists already map this BU to
     *      (`<cred>/<BU>: marketName`). This is authoritative: only `suffix` is a known attribute, every
     *      other market key is fully custom, so the pipeline's own list mapping — not a suffix guess —
     *      is what the suffix/market-var steps enforce as correct. Coverage trusts it (market must exist).
     *   2. Fallback (no list maps the BU) — the suffix + needed-variable-KEY-set heuristic
     *      (`findCoveringMarket`): a matching effective suffix AND the full needed key-set present.
     *
     * @param {WizardState} wizardState collected wizard answers (reads suffixKey + marketVariables)
     * @param {object} baseConfig uploaded `.mcdevrc.json`
     * @returns {{covered: boolean, missing: string[], marketNameByRef: {[buRef: string]: string}}} result
     */
    function analyzeExistingCoverage(wizardState, baseConfig) {
        const state = wizardState || {};
        const config = baseConfig || {};
        const suffixKey = state.suffixKey ?? null;
        const marketVariables = state.marketVariables || {};
        const suffixes = state.suffixes || {};
        const markets = config.markets || {};
        const marketLists = config.marketList || {};
        const missing = [];
        const marketNameByReference = {};

        // Every child BU ref across all pipelines (roots are sources, not "covered by a market" targets,
        // but we still resolve a market for each BU that participates in the pipeline).
        const pipelines = pipelinesFromState(state);
        const childReferences = [];
        for (const pipeline of pipelines) {
            for (const reference of pipeline) {
                if (!childReferences.includes(reference)) {
                    childReferences.push(reference);
                }
            }
        }

        // ── Per-BU market coverage. Preferred: the market the user's EXISTING marketLists already map
        // this BU to (authoritative — the suffix/market-var steps enforce it). Fallback (no list maps
        // the BU): the suffix + needed-key-set heuristic, which only then needs a resolved suffix. ──
        for (const reference of childReferences) {
            const bu = splitReference(reference).bu;
            const qualified = qualifiedReference(reference, config);
            const fromLists = resolveMarketFromLists(marketLists, markets, qualified);
            if (fromLists) {
                marketNameByReference[reference] = fromLists;
                continue;
            }
            // No existing marketList resolves this BU → fall back to the suffix heuristic. The user's
            // explicit suffix (suffix step) is the source of truth, matching how buildConfig generates
            // markets; fall back to the market-variable-derived effective suffix.
            const want =
                typeof suffixes[reference] === 'string' && suffixes[reference] !== ''
                    ? suffixes[reference]
                    : effectiveSuffix(marketVariables[reference], suffixKey);
            if (want === '') {
                // No suffix chosen in the suffix step and no literal/suffixKey suffix — not coverable.
                missing.push('Suffix not yet selected for ' + bu);
                continue;
            }
            const neededKeys = nonReservedKeys(marketVariables[reference]);
            const found = findCoveringMarket(markets, bu, want, neededKeys, suffixKey);
            if (found) {
                marketNameByReference[reference] = found;
            } else {
                missing.push('Missing market for ' + bu + ' (suffix ' + want + ')');
            }
        }

        // ── Per-hop marketList coverage: source + target lists, incl. _ParentBU_ when sharedDEs. ──
        const hops = hopsFromState(state);
        for (const hop of hops) {
            for (const reference of hop.sourceRefs) {
                const qualified = qualifiedReference(reference, config);
                if (!someMarketListHasReference(marketLists, qualified)) {
                    missing.push(
                        'Missing source market list for ' +
                            splitReference(reference).bu +
                            ' (' +
                            hop.sourceEnv +
                            ' → ' +
                            hop.targetEnv +
                            ')'
                    );
                }
            }
            for (const reference of hop.targetRefs) {
                const qualified = qualifiedReference(reference, config);
                if (!someMarketListHasReference(marketLists, qualified)) {
                    missing.push(
                        'Missing target market list for ' +
                            splitReference(reference).bu +
                            ' (' +
                            hop.sourceEnv +
                            ' → ' +
                            hop.targetEnv +
                            ')'
                    );
                }
            }
            // Shared-DE parent hops require a _ParentBU_ source + target marketList entry.
            if (state.sharedDEs && hop.sourceRefs.length > 0) {
                const cred = credOf(hop.sourceRefs[0], config);
                const parentQualified = cred + '/_ParentBU_';
                if (!someMarketListHasReference(marketLists, parentQualified)) {
                    missing.push(
                        'Missing parent market list for ' + hop.sourceEnv + ' → ' + hop.targetEnv + ' (shared DEs)'
                    );
                }
            }
        }

        return { covered: missing.length === 0, missing: missing, marketNameByRef: marketNameByReference };
    }

    /**
     * Build a single `BU: market` marketList entry for one env's BUs.
     *
     * @param {string} environment env name
     * @param {string[]} references BU refs in that env
     * @param {object} baseConfig uploaded config
     * @param {Map<string, string>} marketNames BU ref -> unique market name resolver for `environment`
     * @returns {object} marketList entry
     */
    function singleEnvironmentMarketList(environment, references, baseConfig, marketNames) {
        const entry = {};
        for (const reference of references) {
            entry[qualifiedReference(reference, baseConfig)] = marketNames.get(reference);
        }
        return entry;
    }

    /**
     * Group a hop's target BUs by the upstream (source) BU they deploy from. mcdev requires each
     * SOURCE marketList to map exactly one BU, so every distinct source BU becomes its own group.
     *
     * Grouping uses `state.lineage[tgtBuRef] === sourceBuRef`. When lineage is missing/incomplete
     * for this hop the fallback keeps things deterministic: a single-BU source env absorbs every
     * target BU; otherwise target BUs are paired to source BUs by index and any leftover targets
     * attach to the first source BU.
     *
     * @param {string[]} sourceReferences source-env BU refs
     * @param {string[]} tgtReferences target-env BU refs
     * @param {{[childRef: string]: string}} lineage child-BU ref -> upstream-BU ref
     * @returns {Array<{source: string, targets: string[]}>} ordered groups (source-BU order preserved)
     */
    function groupTargetsBySource(sourceReferences, tgtReferences, lineage) {
        const groups = new Map();
        // Seed one group per source BU so groups stay in source-env order and 1:1 hops are stable.
        for (const source of sourceReferences) {
            groups.set(source, []);
        }
        const unmatched = [];
        // Prefer the explicit lineage mapping when it points at a BU of this source env.
        for (const target of tgtReferences) {
            const mapped = lineage && lineage[target];
            if (mapped && groups.has(mapped)) {
                groups.get(mapped).push(target);
            } else {
                unmatched.push(target);
            }
        }
        // Deterministic fallback for targets without usable lineage.
        if (unmatched.length > 0) {
            if (sourceReferences.length === 1) {
                // Single-BU source env: everything deploys from that one BU.
                for (const target of unmatched) {
                    groups.get(sourceReferences[0]).push(target);
                }
            } else {
                // Pair by index; leftover targets attach to the first source BU.
                for (const target of unmatched) {
                    const index = tgtReferences.indexOf(target);
                    const source = sourceReferences[index] || sourceReferences[0];
                    groups.get(source).push(target);
                }
            }
        }
        // Only emit groups that actually received target BUs.
        const result = [];
        for (const [source, targets] of groups) {
            if (targets.length > 0) {
                result.push({ source: source, targets: targets });
            }
        }
        return result;
    }

    /**
     * Build the merged `.mcdevrc.json` object. Pure: never touches the DOM and deep-clones the
     * input so the caller's object is not mutated.
     *
     * @param {WizardState} wizardState collected wizard answers
     * @param {object} baseConfig uploaded `.mcdevrc.json`
     * @param {{stripForeign?: boolean, adoptExisting?: boolean}} [options] optional post-processing.
     *   `adoptExisting`: skip all `mpb_` market/marketList/mapping generation (keep the user's entries
     *   + the `mpb_pipeline` round-trip block). `stripForeign` (ignored when `adoptExisting`): after
     *   generating `mpb_` entries, drop every non-`mpb_` market & marketList. Omitting `options`
     *   (or passing `{}`) keeps the output byte-identical to the pre-options behavior.
     * @returns {object} merged config with regenerated `mpb_` entries
     */
    function buildConfig(wizardState, baseConfig, options) {
        const config = deepClone(baseConfig || {});
        const state = wizardState || {};
        const options_ = options || {};
        const separator = state.separator || '_';
        const environmentOrder = Array.isArray(state.envOrder) ? state.envOrder : [];
        const environmentBUs = state.envBUs || {};
        const environmentBranches = state.envBranches || {};
        const suffixes = state.suffixes || {};

        // Ensure the containers we write into exist without clobbering siblings.
        config.options ||= {};
        config.options.deployment ||= {};
        config.markets ||= {};
        config.marketList ||= {};

        const deployment = config.options.deployment;
        deployment.sourceTargetMapping ||= {};
        deployment.branchSourceTargetMapping ||= {};

        // ── Idempotency: drop every previously generated mpb_ entry before regenerating. ──
        config.markets = withoutMpb(config.markets);
        config.marketList = withoutMpb(config.marketList);
        deployment.sourceTargetMapping = withoutMpb(deployment.sourceTargetMapping);
        delete deployment.mpb_pipeline;
        deployment.branchSourceTargetMapping = pruneBranchMap(deployment.branchSourceTargetMapping);

        // ── adoptExisting: keep the user's existing markets/marketLists as the pipeline and skip
        // generating any mpb_ markets/marketLists/mappings. Still write the mpb_pipeline round-trip
        // block so the wizard state survives reopen. Return before the generation loops. ──
        if (options_.adoptExisting) {
            writePipelineBlock(deployment, state, environmentOrder, environmentBUs, environmentBranches, separator, suffixes);
            return config;
        }

        // Per-env BU-ref -> unique market name resolvers. Built once and reused by the markets loop
        // AND the per-hop marketList builders so a slug-collision disambiguation stays consistent
        // between a market's key and every marketList value that references it.
        const environmentMarketNames = {};
        for (const environment of environmentOrder) {
            environmentMarketNames[environment] = marketNameMap(environment, environmentBUs[environment] || []);
        }

        // ── markets: one per env-BU. Generated markets carry only { suffix };
        // idempotency prunes them by their mpb_ NAME prefix (see withoutMpb), not a marker field. ──
        for (const environment of environmentOrder) {
            const references = environmentBUs[environment] || [];
            const marketNames = environmentMarketNames[environment];
            for (const reference of references) {
                const name = marketNames.get(reference);
                const suffix = suffixes[reference] || separator + slug(environment);
                // suffix is always first; then merge the BU's extra market variables in
                // case-insensitive alphabetical order. Skip empty/whitespace-only values and any
                // accidental suffix/description keys; write kept values VERBATIM (no trim on emit).
                const market = { suffix: suffix };
                const variables = (state.marketVariables && state.marketVariables[reference]) || {};
                const variableNames = Object.keys(variables)
                    .filter((key) => key !== 'suffix' && key !== 'description')
                    .filter((key) => String(variables[key]).trim() !== '')
                    .toSorted((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));
                for (const key of variableNames) {
                    market[key] = variables[key];
                }
                config.markets[name] = market;
            }
        }

        // ── generic hotfix source/target scaffold. ──
        // hotfix-source must be a single 1:1 BU:market source (mcdev createDeltaPkg rejects
        // multi-BU sources), so it uses only the FIRST BU of the first env. The target may be multi-BU.
        deployment.sourceTargetMapping[MPB + 'hotfix-source'] = MPB + 'hotfix-target';
        const firstEnvironment = environmentOrder[0];
        const firstEnvironmentBUs = environmentBUs[firstEnvironment] || [];
        config.marketList[MPB + 'hotfix-source'] = singleEnvironmentMarketList(
            firstEnvironment,
            firstEnvironmentBUs.slice(0, 1),
            baseConfig,
            environmentMarketNames[firstEnvironment] || new Map()
        );
        const lastEnvironment = environmentOrder.at(-1);
        config.marketList[MPB + 'hotfix-target'] = singleEnvironmentMarketList(
            lastEnvironment,
            environmentBUs[lastEnvironment] || [],
            baseConfig,
            environmentMarketNames[lastEnvironment] || new Map()
        );

        // ── per-hop child + optional parent pipelines. ──
        for (let index = 1; index < environmentOrder.length; index++) {
            const sourceEnvironment = environmentOrder[index - 1];
            const tgtEnvironment = environmentOrder[index];
            const sourceReferences = environmentBUs[sourceEnvironment] || [];
            const tgtReferences = environmentBUs[tgtEnvironment] || [];
            const isSourceSingle = sourceReferences.length === 1;
            const sourceMarketNames = environmentMarketNames[sourceEnvironment] || new Map();
            const tgtMarketNames = environmentMarketNames[tgtEnvironment] || new Map();
            // WS3: the branch key comes from the user-editable env → branch map, falling back to the
            // derived branchKey() when the target env has no explicit branch (round-trip / vanilla).
            const branch = resolveBranch(tgtEnvironment, environmentBranches);
            deployment.branchSourceTargetMapping[branch] ||= {};
            const branchMap = deployment.branchSourceTargetMapping[branch];

            // Split the hop into one pipeline per distinct upstream (source) BU. mcdev requires each
            // source marketList to map exactly one BU, so a multi-source hop yields multiple pairs.
            const groups = groupTargetsBySource(sourceReferences, tgtReferences, state.lineage || {});
            // Back-compat short names when the whole hop is a single 1:1 source in a single-BU env.
            const shouldUseShortNames = groups.length === 1 && isSourceSingle;
            // Track the generated source ML names used in THIS hop so two source BUs whose slug
            // collides (e.g. `EUN-QA` vs `EUN_QA`) never produce the same pair — the first keeps the
            // plain name, each colliding sibling gets a stable `-<n>` counter in its infix.
            const usedSourceMlNames = new Set();

            for (const group of groups) {
                // Long names carry a <sourceBuSlug> infix so each per-source pipeline is unique.
                const baseInfix = shouldUseShortNames ? '' : '-' + slug(splitReference(group.source).bu);
                let infix = baseInfix;
                let counter = 1;
                while (usedSourceMlNames.has(MPB + 'deployment-' + branch + infix + '-source')) {
                    counter += 1;
                    infix = baseInfix + '-' + counter;
                }
                const sourceMlName = MPB + 'deployment-' + branch + infix + '-source';
                const targetMlName = MPB + 'deployment-' + branch + infix + '-target';
                usedSourceMlNames.add(sourceMlName);

                // Exactly ONE BU in the source marketList.
                const sourceMl = {
                    [qualifiedReference(group.source, baseConfig)]: sourceMarketNames.get(group.source),
                };
                // One or more BUs in the target marketList.
                const targetMl = {};
                for (const reference of group.targets) {
                    targetMl[qualifiedReference(reference, baseConfig)] = tgtMarketNames.get(reference);
                }
                config.marketList[sourceMlName] = sourceMl;
                config.marketList[targetMlName] = targetMl;
                branchMap[sourceMlName] = targetMlName;

                // Optional shared-DE parent pair for this lineage group (same infix / branch as the child).
                // Filter is ends-only on the source BU's suffix so each parent pair isolates that hop's
                // keys (e.g. `_DEV` → `%[_]DEV`) without a contained mid-key band or a lower-env exclude.
                if (state.sharedDEs) {
                    const parentSourceName = MPB + 'deployment-' + branch + infix + '-parent-source';
                    const parentTargetName = MPB + 'deployment-' + branch + infix + '-parent-target';
                    const cred = credOf(group.source, baseConfig);
                    const sourceSuffix = suffixes[group.source] || separator + slug(sourceEnvironment);
                    const parentSource = {
                        filter: { include: { key: { '*': [suffixEndPattern(sourceSuffix)] } } },
                        [cred + '/_ParentBU_']: sourceMarketNames.get(group.source),
                    };
                    const targetParentMarkets = Array.from(group.targets, reference => tgtMarketNames.get(reference));
                    const parentTarget = {
                        [cred + '/_ParentBU_']:
                            targetParentMarkets.length === 1 ? targetParentMarkets[0] : targetParentMarkets,
                    };
                    config.marketList[parentSourceName] = parentSource;
                    config.marketList[parentTargetName] = parentTarget;
                    branchMap[parentSourceName] = parentTargetName;
                }
            }
        }

        // ── persisted wizard-state block for GUI round-trip. ──
        writePipelineBlock(deployment, state, environmentOrder, environmentBUs, environmentBranches, separator, suffixes);

        // ── stripForeign (ignored when adoptExisting returned early above): drop every non-mpb_
        // market, marketList, and deployment mapping so only the tool-generated pipeline remains. ──
        if (options_.stripForeign) {
            config.markets = keepOnlyMpb(config.markets);
            config.marketList = keepOnlyMpb(config.marketList);
            deployment.sourceTargetMapping = keepOnlyMpb(deployment.sourceTargetMapping);
            deployment.branchSourceTargetMapping = keepOnlyMpbBranchMap(deployment.branchSourceTargetMapping);
        }

        return config;
    }

    /**
     * Write the `deployment.mpb_pipeline` round-trip block. `marketAdoption` and `suffixKey` are
     * emitted ONLY when non-empty/non-null so a fresh/default state keeps `buildConfig`'s output
     * byte-identical to the pre-options behavior.
     *
     * @param {object} deployment config.options.deployment (mutated in place)
     * @param {WizardState} state wizardState param of buildConfig
     * @param {string[]} environmentOrder ordered env display names
     * @param {object} environmentBUs env -> BU refs
     * @param {object} environmentBranches env -> git branch
     * @param {string} separator suffix separator
     * @param {object} suffixes BU ref -> suffix
     * @returns {void}
     */
    function writePipelineBlock(deployment, state, environmentOrder, environmentBUs, environmentBranches, separator, suffixes) {
        deployment.mpb_pipeline = {
            version: state.version || 1,
            envOrder: environmentOrder,
            envBUs: environmentBUs,
            envBranches: environmentBranches,
            lineage: state.lineage || {},
            separator: separator,
            suffixes: suffixes,
            // Persist the per-BU extra market variables so a reopened tool config restores them
            // (the merged values live under config.markets[...] but the wizard reads its state here).
            marketVariables: state.marketVariables && typeof state.marketVariables === 'object' ? state.marketVariables : {},
            prodBUs: state.prodBUs || [],
            sharedDEs: !!state.sharedDEs,
            // Persist the three validations-tab inputs so a re-opened tool config restores them
            // instead of losing them (they were previously derived only into generated output).
            selectedRules: Array.isArray(state.selectedRules) ? state.selectedRules : [],
            prefixBlacklist: state.prefixBlacklist && typeof state.prefixBlacklist === 'object' ? state.prefixBlacklist : {},
            retention: state.retention && typeof state.retention === 'object' ? state.retention : {},
        };
        // Conditional emit (byte-identity for fresh state): only add these keys when they carry data.
        if (state.marketAdoption && Object.keys(state.marketAdoption).length) {
            deployment.mpb_pipeline.marketAdoption = state.marketAdoption;
        }
        if (state.suffixKey != null) {
            deployment.mpb_pipeline.suffixKey = state.suffixKey;
        }
    }

    /**
     * Return a shallow copy of an object keeping only `mpb_`-prefixed keys (inverse of withoutMpb).
     *
     * @param {object} object object to prune
     * @returns {object} new object with only tool keys
     */
    function keepOnlyMpb(object) {
        if (!object || typeof object !== 'object') {
            return object;
        }
        const cleaned = {};
        for (const [key, value] of Object.entries(object)) {
            if (key.indexOf(MPB) === 0) {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }

    /**
     * Rebuild the branchSourceTargetMapping without any `mpb_` entries, dropping empty branches.
     *
     * @param {object} branchMapping existing branch -> {source: target} map
     * @returns {object} pruned map
     */
    function pruneBranchMap(branchMapping) {
        const cleaned = {};
        const entries = Object.entries(branchMapping || {});
        for (const [branch, value] of entries) {
            const kept = withoutMpb(value);
            if (Object.keys(kept).length > 0) {
                cleaned[branch] = kept;
            }
        }
        return cleaned;
    }

    /**
     * Rebuild the branchSourceTargetMapping keeping only `mpb_` entries, dropping empty branches
     * (inverse of pruneBranchMap). Used by stripForeign to remove foreign branch mappings.
     *
     * @param {object} branchMapping existing branch -> {source: target} map
     * @returns {object} pruned map with only tool entries
     */
    function keepOnlyMpbBranchMap(branchMapping) {
        const cleaned = {};
        const entries = Object.entries(branchMapping || {});
        for (const [branch, value] of entries) {
            const kept = keepOnlyMpb(value);
            if (Object.keys(kept).length > 0) {
                cleaned[branch] = kept;
            }
        }
        return cleaned;
    }

    const api = {
        buildConfig: buildConfig,
        analyzeExistingCoverage: analyzeExistingCoverage,
        effectiveSuffix: effectiveSuffix,
    };

    // Browser global.
    global.mpbConfigBuilder = api;

    // UMD-style footer for the Node test.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
