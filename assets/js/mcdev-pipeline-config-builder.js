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
     * Turn an environment name token (e.g. `QA`) into the mcdev SQL-LIKE band pattern pair the
     * shared-DE parent pipeline keys on, matching the gold config's `%[_]<UP>[_]%` / `%[_]<UP>`
     * shape. The separator is written as a literal `[_]` per `Util.stringLike` semantics (`_` means
     * "exactly one char", so a literal separator must be bracket-escaped), and the token is bounded
     * by a separator on BOTH sides in the "contained" variant so `_QA_` never matches `_QANEW`.
     *
     * @param {string} environment environment display name (slugged to the key token)
     * @param {string} separator suffix separator (typically `_`)
     * @returns {string[]} two patterns: contained (`%[_]<tok>[_]%`) and trailing (`%[_]<tok>`)
     */
    function environmentBandPatterns(environment, separator) {
        // The literal-separator escape for stringLike (a single `_` would otherwise be a wildcard).
        const separatorEscaped = separator === '_' ? '[_]' : separator;
        const token = slug(environment);
        // Contained: `%<sep><tok><sep>%` (a full mid-key segment); trailing: `%<sep><tok>` (key end).
        return ['%' + separatorEscaped + token + separatorEscaped + '%', '%' + separatorEscaped + token];
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
     * @returns {object} merged config with regenerated `mpb_` entries
     */
    function buildConfig(wizardState, baseConfig) {
        const config = deepClone(baseConfig || {});
        const state = wizardState || {};
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
                config.markets[name] = {
                    suffix: suffixes[reference] || separator + slug(environment),
                };
            }
            // Parent market (shared DEs) reuses the child suffix band of this env.
            if (state.sharedDEs && references.length > 0) {
                const parentName = MPB + slug(environment) + '_parent';
                config.markets[parentName] = {
                    suffix: suffixes[references[0]] || separator + slug(environment),
                };
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
            }

            // Optional shared-DE parent pipeline for this hop (one pair, keyed under the same branch).
            // The parent (source==target) marketList must isolate what the parent BU deploys to just
            // the UPSTREAM env's key band, so promoting e.g. "QA baseline → UAT" never re-picks earlier
            // SIT-era changes. We band on the upstream env NAME token (matching the gold config's
            // `%[_]<UP>[_]%` / `%[_]<UP>` include patterns). The include is self-isolating: `%[_]QA`
            // matches only keys carrying the `_QA` segment, never a lower env's `_SIT`/`_DEV` keys —
            // so, like the gold config, no separate lower-env exclude band is required.
            if (state.sharedDEs) {
                const parentSourceName = MPB + 'deployment-' + branch + '-parent-source';
                const parentTargetName = MPB + 'deployment-' + branch + '-parent-target';
                const cred = credOf(sourceReferences[0] || tgtReferences[0] || '', baseConfig);
                // Include: the upstream env's own name-token band (contained + trailing).
                const includePatterns = environmentBandPatterns(sourceEnvironment, separator);
                const parentSource = {
                    filter: { include: { key: { '*': includePatterns } } },
                    [cred + '/_ParentBU_']: MPB + slug(sourceEnvironment) + '_parent',
                };
                const parentTarget = {
                    [cred + '/_ParentBU_']: MPB + slug(tgtEnvironment) + '_parent',
                };
                config.marketList[parentSourceName] = parentSource;
                config.marketList[parentTargetName] = parentTarget;
                branchMap[parentSourceName] = parentTargetName;
            }
        }

        // ── persisted wizard-state block for GUI round-trip. ──
        deployment.mpb_pipeline = {
            version: state.version || 1,
            envOrder: environmentOrder,
            envBUs: environmentBUs,
            envBranches: environmentBranches,
            lineage: state.lineage || {},
            separator: separator,
            suffixes: suffixes,
            prodBUs: state.prodBUs || [],
            sharedDEs: !!state.sharedDEs,
            // Persist the three validations-tab inputs so a re-opened tool config restores them
            // instead of losing them (they were previously derived only into generated output).
            selectedRules: Array.isArray(state.selectedRules) ? state.selectedRules : [],
            prefixBlacklist: state.prefixBlacklist && typeof state.prefixBlacklist === 'object' ? state.prefixBlacklist : {},
            retention: state.retention && typeof state.retention === 'object' ? state.retention : {},
        };

        return config;
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

    const api = { buildConfig: buildConfig };

    // Browser global.
    global.mpbConfigBuilder = api;

    // UMD-style footer for the Node test.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
