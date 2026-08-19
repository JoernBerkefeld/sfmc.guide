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
 * @property {{[childRef: string]: string}} lineage child-BU ref -> upstream-BU ref (one hop up the chain)
 * @property {string} separator suffix separator (default `_`)
 * @property {{[buRef: string]: string}} suffixes BU ref -> suffix (includes the separator, e.g. `_UAT`)
 * @property {string[]} prodBUs BU refs confirmed as production
 * @property {boolean} sharedDEs whether a shared-DE parent pipeline is used
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
     * Turn a suffix (e.g. `_DEV`) into a mcdev SQL-LIKE include pattern pair, writing the
     * separator underscore as a literal `[_]` per `Util.stringLike` semantics.
     *
     * @param {string} suffix full suffix including the leading separator
     * @param {string} separator suffix separator
     * @returns {string[]} two patterns: contained (`%…%`) and trailing (`%…`)
     */
    function likePatterns(suffix, separator) {
        // Escape every separator occurrence as a literal underscore for stringLike.
        const escaped = suffix.split(separator).join('[_]');
        // "%<suffix>%" catches keys with the suffix in the middle; "%<suffix>" catches trailing.
        return ['%' + escaped + '%', '%' + escaped];
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
     * @returns {object} marketList entry
     */
    function singleEnvironmentMarketList(environment, references, baseConfig) {
        const entry = {};
        const isSingle = references.length === 1;
        for (const reference of references) {
            entry[qualifiedReference(reference, baseConfig)] = marketName(environment, reference, isSingle);
        }
        return entry;
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

        // ── markets: one per env-BU. ──
        for (const environment of environmentOrder) {
            const references = environmentBUs[environment] || [];
            const isSingle = references.length === 1;
            for (const reference of references) {
                const name = marketName(environment, reference, isSingle);
                config.markets[name] = {
                    mpb_managed: true,
                    mpb_env: environment,
                    mpb_bu: splitReference(reference).bu,
                    suffix: suffixes[reference] || separator + slug(environment),
                };
            }
            // Parent market (shared DEs) reuses the child suffix band of this env.
            if (state.sharedDEs && references.length > 0) {
                const parentName = MPB + slug(environment) + '_parent';
                config.markets[parentName] = {
                    mpb_managed: true,
                    mpb_env: environment,
                    mpb_parent: true,
                    suffix: suffixes[references[0]] || separator + slug(environment),
                };
            }
        }

        // ── generic hotfix source/target scaffold. ──
        deployment.sourceTargetMapping[MPB + 'hotfix-source'] = MPB + 'hotfix-target';
        config.marketList[MPB + 'hotfix-source'] = singleEnvironmentMarketList(
            environmentOrder[0],
            environmentBUs[environmentOrder[0]] || [],
            baseConfig
        );
        const lastEnvironment = environmentOrder.at(-1);
        config.marketList[MPB + 'hotfix-target'] = singleEnvironmentMarketList(
            lastEnvironment,
            environmentBUs[lastEnvironment] || [],
            baseConfig
        );

        // ── per-hop child + optional parent pipelines. ──
        const mapping = [];
        for (let index = 1; index < environmentOrder.length; index++) {
            const sourceEnvironment = environmentOrder[index - 1];
            const tgtEnvironment = environmentOrder[index];
            const sourceReferences = environmentBUs[sourceEnvironment] || [];
            const tgtReferences = environmentBUs[tgtEnvironment] || [];
            const isSourceSingle = sourceReferences.length === 1;
            const isTgtSingle = tgtReferences.length === 1;
            const branch = branchKey(tgtEnvironment);
            deployment.branchSourceTargetMapping[branch] ||= {};
            const branchMap = deployment.branchSourceTargetMapping[branch];

            const sourceMlName = MPB + 'deployment-' + branch + '-source';
            const targetMlName = MPB + 'deployment-' + branch + '-target';

            const sourceMl = {};
            for (const reference of sourceReferences) {
                sourceMl[qualifiedReference(reference, baseConfig)] = marketName(
                    sourceEnvironment,
                    reference,
                    isSourceSingle
                );
            }
            const targetMl = {};
            for (const reference of tgtReferences) {
                targetMl[qualifiedReference(reference, baseConfig)] = marketName(
                    tgtEnvironment,
                    reference,
                    isTgtSingle
                );
            }
            config.marketList[sourceMlName] = sourceMl;
            config.marketList[targetMlName] = targetMl;
            branchMap[sourceMlName] = targetMlName;

            // Optional shared-DE parent pipeline for this hop.
            if (state.sharedDEs) {
                const parentSourceName = MPB + 'deployment-' + branch + '-parent-source';
                const parentTargetName = MPB + 'deployment-' + branch + '-parent-target';
                const upstreamSuffix = suffixes[sourceReferences[0]] || separator + slug(sourceEnvironment);
                const cred = credOf(sourceReferences[0] || tgtReferences[0] || '', baseConfig);
                const patterns = likePatterns(upstreamSuffix, separator);
                const parentSource = {
                    filter: { include: { key: { '*': patterns } } },
                    [cred + '/_ParentBU_']: MPB + slug(sourceEnvironment) + '_parent',
                };
                const parentTarget = {
                    [cred + '/_ParentBU_']: MPB + slug(tgtEnvironment) + '_parent',
                };
                config.marketList[parentSourceName] = parentSource;
                config.marketList[parentTargetName] = parentTarget;
                branchMap[parentSourceName] = parentTargetName;
            }

            // targetBranchBuMapping hop.
            const hop = {
                [branchKey(sourceEnvironment)]: qualifiedReference(sourceReferences[0] || '', baseConfig),
                [branch]: tgtReferences.map((reference) => qualifiedReference(reference, baseConfig)),
            };
            mapping.push(hop);
        }

        deployment.targetBranchBuMapping = mapping;

        // ── persisted wizard-state block for GUI round-trip. ──
        deployment.mpb_pipeline = {
            version: state.version || 1,
            envOrder: environmentOrder,
            envBUs: environmentBUs,
            lineage: state.lineage || {},
            separator: separator,
            suffixes: suffixes,
            prodBUs: state.prodBUs || [],
            sharedDEs: !!state.sharedDEs,
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
