'use strict';

/**
 * Node tests for the two pure mcdev Pipeline Builder modules.
 *
 * Covers (per maintain-test-cases.mdc + the plan's Verify section):
 *   - round-tripping the real sample .mcdevrc.json through buildConfig
 *   - the mpb_ marketList / filter / mapping shapes
 *   - idempotency: running buildConfig twice yields identical output
 *   - buildValidations emits parseable source with no client MIDs / brand names
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// The builders are authored as browser <script> includes under a "type": "module" package,
// so Node loads the .js files as ESM (module.exports is unavailable). They still attach their
// API to the global object, so we require() them for their side effect and read the global.
require('../assets/js/mcdev-pipeline-config-builder.js');
require('../assets/js/mcdev-pipeline-validations-builder.js');
const { buildConfig } = globalThis.mpbConfigBuilder;
const { buildValidations } = globalThis.mpbValidationsBuilder;

const SAMPLE_PATH = path.join(__dirname, '..', '..', 'mcdev-ssjs-validation', '.mcdevrc.json');
const sampleConfig = JSON.parse(fs.readFileSync(SAMPLE_PATH, 'utf8'));

/**
 * A representative full-pipeline wizard state derived from the sample config.
 * Two DEV BUs (child + regional), a shared-DE parent pipeline, multi-BU envs.
 *
 * @returns {object} wizard state
 */
function sampleWizardState() {
  return {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'SIT', 'QA', 'UAT', 'Prod'],
    envBUs: {
      DEV: ['DEV'],
      SIT: ['SIT'],
      QA: ['EUN_QA', 'EUS_QA'],
      UAT: ['EUN_UAT', 'EUS_UAT'],
      Prod: ['Randstad_EUN', 'Randstad_EUS'],
    },
    // Real per-hop lineage mirroring the gold config's structure: each target BU points at the
    // upstream (source) BU it deploys from. Single-BU hops (DEV->SIT, SIT->QA) stay single-source;
    // QA->UAT and UAT->Prod are multi-BU-source hops (EUN/EUS split into two pipelines each).
    lineage: {
      SIT: 'DEV',
      EUN_QA: 'SIT',
      EUS_QA: 'SIT',
      EUN_UAT: 'EUN_QA',
      EUS_UAT: 'EUS_QA',
      Randstad_EUN: 'EUN_UAT',
      Randstad_EUS: 'EUS_UAT',
    },
    separator: '_',
    suffixes: {
      DEV: '_DEV',
      SIT: '_SIT',
      EUN_QA: '_QAN',
      EUS_QA: '_QAS',
      EUN_UAT: '_UATN',
      EUS_UAT: '_UATS',
      Randstad_EUN: '_RSN',
      Randstad_EUS: '_RSS',
    },
    prodBUs: ['Randstad_EUN', 'Randstad_EUS'],
    sharedDEs: true,
  };
}

test('buildConfig preserves user-authored keys and credentials', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  // credentials untouched
  assert.deepEqual(out.credentials, sampleConfig.credentials);
  // user option preserved
  assert.equal(out.options.formatOnSave, sampleConfig.options.formatOnSave);
});

test('buildConfig emits mpb_ markets for every env-BU', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const marketNames = Object.keys(out.markets);
  // single-BU env -> mpb_<env> (slug preserves case)
  assert.ok(marketNames.includes('mpb_DEV'));
  assert.ok(marketNames.includes('mpb_SIT'));
  // multi-BU env -> mpb_<env>_<bu>
  assert.ok(marketNames.includes('mpb_QA_EUN_QA'));
  assert.ok(marketNames.includes('mpb_QA_EUS_QA'));
  // every generated market carries ONLY a real suffix (no mpb_managed/env/bu/parent markers)
  const generated = marketNames.filter((n) => n.startsWith('mpb_'));
  for (const name of generated) {
    assert.equal(typeof out.markets[name].suffix, 'string');
    assert.deepEqual(
      Object.keys(out.markets[name]),
      ['suffix'],
      `${name} must contain only a suffix key`,
    );
  }
});

test('buildConfig builds source/target marketLists per hop', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const mls = Object.keys(out.marketList);
  // Single-BU-source hop (DEV -> SIT) keeps the short back-compat names.
  assert.ok(mls.includes('mpb_deployment-sit-source'));
  assert.ok(mls.includes('mpb_deployment-sit-target'));
  // a source marketList has exactly one BU:market combo (+ optional filter);
  // the sit hop deploys FROM the upstream DEV BU
  const source = out.marketList['mpb_deployment-sit-source'];
  const nonFilterKeys = Object.keys(source).filter((k) => k !== 'filter');
  assert.equal(nonFilterKeys.length, 1);
  assert.equal(source['ssjs/DEV'], 'mpb_DEV');
  // the target marketList carries the SIT BU
  assert.equal(out.marketList['mpb_deployment-sit-target']['ssjs/SIT'], 'mpb_SIT');

  // Every generated source marketList maps EXACTLY ONE non-filter BU (mcdev requirement).
  for (const name of mls) {
    if (!(name.startsWith('mpb_deployment-') && name.endsWith('-source'))) {
      continue;
    }
    const keys = Object.keys(out.marketList[name]).filter((k) => k !== 'filter');
    assert.equal(keys.length, 1, `${name} must map exactly one BU`);
  }

  // Multi-BU-SOURCE hop (QA -> UAT): EUN_QA and EUS_QA are two distinct upstream BUs, so the hop
  // splits into two per-source pipelines, each named with the <sourceBuSlug> infix and 1 BU each.
  const uatSourceNames = mls.filter(
    (n) => n.startsWith('mpb_deployment-uat-') && n.endsWith('-source') && !n.includes('-parent-'),
  );
  assert.deepEqual(
    uatSourceNames.toSorted((a, b) => a.localeCompare(b)),
    ['mpb_deployment-uat-EUN_QA-source', 'mpb_deployment-uat-EUS_QA-source'],
    'a multi-source hop emits one <sourceBuSlug>-source marketList per upstream BU',
  );
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUN_QA-source'], {
    'ssjs/EUN_QA': 'mpb_QA_EUN_QA',
  });
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUS_QA-source'], {
    'ssjs/EUS_QA': 'mpb_QA_EUS_QA',
  });
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUN_QA-target'], {
    'ssjs/EUN_UAT': 'mpb_UAT_EUN_UAT',
  });
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUS_QA-target'], {
    'ssjs/EUS_UAT': 'mpb_UAT_EUS_UAT',
  });
});

test('buildConfig groups a multi-target-single-source hop into one source + multi-BU target', () => {
  // SIT -> QA: a single upstream BU (SIT) fans out to two QA BUs. One source marketList (1 BU),
  // one target marketList (2 BUs), short back-compat names because the source env is single-BU.
  const out = buildConfig(sampleWizardState(), sampleConfig);
  assert.deepEqual(out.marketList['mpb_deployment-qa-source'], { 'ssjs/SIT': 'mpb_SIT' });
  assert.deepEqual(out.marketList['mpb_deployment-qa-target'], {
    'ssjs/EUN_QA': 'mpb_QA_EUN_QA',
    'ssjs/EUS_QA': 'mpb_QA_EUS_QA',
  });
  const branchMap = out.options.deployment.branchSourceTargetMapping;
  assert.equal(branchMap.qa['mpb_deployment-qa-source'], 'mpb_deployment-qa-target');
});

test('buildConfig parent pipeline uses a stringLike include filter with [_] separators', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  // sampleWizardState() is a single-BU DEV→SIT hop, so the short parent names stay.
  const parentSource = out.marketList['mpb_deployment-sit-parent-source'];
  assert.ok(parentSource, 'parent-source marketList exists when sharedDEs is on');
  const patterns = parentSource.filter.include.key['*'];
  // Ends-only on the source BU's suffix (`_DEV` → `%[_]DEV`). No contained mid-key band.
  assert.deepEqual(patterns, ['%[_]DEV'], 'the include is ends-only on the source BU suffix');
  assert.equal(parentSource.filter.exclude, undefined, 'no redundant lower-env exclude band');
  // _ParentBU_ self-reference present, pointing at the source BU's parent market.
  const parentKey = Object.keys(parentSource).find((k) => k.endsWith('/_ParentBU_'));
  assert.ok(parentKey, 'parent-source keys on <cred>/_ParentBU_');
  assert.equal(
    parentSource[parentKey],
    'mpb_DEV_parent',
    'parent-source points at the source BU parent market',
  );
});

test('buildConfig parent bands follow each hop (QA→UAT hop bands on each source BU suffix)', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  // QA→UAT is two lineage groups (EUN_QA / EUS_QA), so two parent pairs, each 1:1.
  const eunSource = out.marketList['mpb_deployment-uat-EUN_QA-parent-source'];
  const eusSource = out.marketList['mpb_deployment-uat-EUS_QA-parent-source'];
  assert.ok(eunSource, 'a parent-source exists for the EUN_QA group');
  assert.ok(eusSource, 'a parent-source exists for the EUS_QA group');
  // Suffixes from sampleWizardState(): EUN_QA=_QAN, EUS_QA=_QAS.
  assert.deepEqual(eunSource.filter.include.key['*'], ['%[_]QAN']);
  assert.deepEqual(eusSource.filter.include.key['*'], ['%[_]QAS']);
  assert.equal(eunSource['ssjs/_ParentBU_'], 'mpb_QA_EUN_QA_parent');
  assert.equal(eusSource['ssjs/_ParentBU_'], 'mpb_QA_EUS_QA_parent');
  const eunTarget = out.marketList['mpb_deployment-uat-EUN_QA-parent-target'];
  const eusTarget = out.marketList['mpb_deployment-uat-EUS_QA-parent-target'];
  assert.equal(eunTarget['ssjs/_ParentBU_'], 'mpb_UAT_EUN_UAT_parent');
  assert.equal(eusTarget['ssjs/_ParentBU_'], 'mpb_UAT_EUS_UAT_parent');
  assert.equal(typeof eunTarget['ssjs/_ParentBU_'], 'string', '1:1 target stays a string');
  assert.equal(typeof eusTarget['ssjs/_ParentBU_'], 'string', '1:1 target stays a string');
});

test('buildConfig emits a { suffix }-only parent market per child BU when sharedDEs is on', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const expected = {
    mpb_DEV_parent: '_DEV',
    mpb_SIT_parent: '_SIT',
    mpb_QA_EUN_QA_parent: '_QAN',
    mpb_QA_EUS_QA_parent: '_QAS',
    mpb_UAT_EUN_UAT_parent: '_UATN',
    mpb_UAT_EUS_UAT_parent: '_UATS',
    mpb_Prod_Randstad_EUN_parent: '_RSN',
    mpb_Prod_Randstad_EUS_parent: '_RSS',
  };
  for (const [name, suffix] of Object.entries(expected)) {
    const parentMarket = out.markets[name];
    assert.ok(parentMarket, `${name} market exists`);
    assert.deepEqual(Object.keys(parentMarket), ['suffix'], `${name} carries only a suffix`);
    assert.equal(parentMarket.suffix, suffix, `${name} carries the child BU suffix`);
  }
  // No leftover env-level parent markets (one-per-env naming is gone).
  for (const leftover of ['mpb_QA_parent', 'mpb_UAT_parent', 'mpb_Prod_parent']) {
    assert.equal(out.markets[leftover], undefined, `${leftover} must not be emitted`);
  }
});

test('buildConfig nests each parent pair under the same target branch as its child pairs', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const branchMap = out.options.deployment.branchSourceTargetMapping;
  // DEV→SIT parent pair sits under `sit` alongside the child pair (short names: single-BU source).
  assert.equal(
    branchMap.sit['mpb_deployment-sit-parent-source'],
    'mpb_deployment-sit-parent-target',
    'the parent pair nests under the same branch as the hop it belongs to',
  );
  assert.equal(branchMap.sit['mpb_deployment-sit-source'], 'mpb_deployment-sit-target');
  // QA→UAT parent pairs sit under `uat` alongside each matching child pair.
  assert.equal(
    branchMap.uat['mpb_deployment-uat-EUN_QA-parent-source'],
    'mpb_deployment-uat-EUN_QA-parent-target',
  );
  assert.equal(
    branchMap.uat['mpb_deployment-uat-EUS_QA-parent-source'],
    'mpb_deployment-uat-EUS_QA-parent-target',
  );
  assert.equal(
    branchMap.uat['mpb_deployment-uat-EUN_QA-source'],
    'mpb_deployment-uat-EUN_QA-target',
  );
  assert.equal(
    branchMap.uat['mpb_deployment-uat-EUS_QA-source'],
    'mpb_deployment-uat-EUS_QA-target',
  );
});

test('buildConfig emits NO parent marketLists or markets when sharedDEs is off', () => {
  const state = sampleWizardState();
  state.sharedDEs = false;
  const out = buildConfig(state, sampleConfig);
  const parentMlNames = Object.keys(out.marketList).filter((n) => n.includes('-parent-'));
  assert.deepEqual(parentMlNames, [], 'no parent marketLists when sharedDEs is off');
  const parentMarketNames = Object.keys(out.markets).filter((n) => n.endsWith('_parent'));
  assert.deepEqual(parentMarketNames, [], 'no parent markets when sharedDEs is off');
  // No parent pair is nested under any branch either.
  const branchMap = out.options.deployment.branchSourceTargetMapping;
  const parentPairs = Object.values(branchMap)
    .flatMap((pairs) => Object.keys(pairs))
    .filter((n) => n.includes('-parent-'));
  assert.deepEqual(parentPairs, [], 'no parent pairs mapped when sharedDEs is off');
});

test('buildConfig sharedDEs:true survives a strip → inferWizardStateFromVanilla round-trip (WS4)', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  // Strip the persisted builder block so inference must reconstruct sharedDEs from the raw shape.
  delete out.options.deployment.mpb_pipeline;
  const { state } = controller.inferWizardStateFromVanilla(out);
  assert.equal(
    state.sharedDEs,
    true,
    'the _ParentBU_ convention lets WS4 re-detect sharedDEs from a WS5-built config',
  );
});

test('buildConfig branchSourceTargetMapping nests every source->target pair (no targetBranchBuMapping)', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const deployment = out.options.deployment;
  const branchMap = deployment.branchSourceTargetMapping;
  // Single-BU hop nests one pair under its branch.
  assert.equal(branchMap.sit['mpb_deployment-sit-source'], 'mpb_deployment-sit-target');
  // Multi-BU-source hop (QA -> UAT) nests one pair PER upstream BU under the same target branch
  // (excluding the shared-DE parent pairs, which are a separate pair per lineage group).
  const uatPairs = Object.entries(branchMap.uat).filter(
    ([source]) => source.startsWith('mpb_deployment-uat-') && !source.includes('-parent-'),
  );
  assert.equal(
    uatPairs.length,
    2,
    'a two-source hop nests two source->target pairs under its branch',
  );
  assert.equal(
    branchMap.uat['mpb_deployment-uat-EUN_QA-source'],
    'mpb_deployment-uat-EUN_QA-target',
  );
  assert.equal(
    branchMap.uat['mpb_deployment-uat-EUS_QA-source'],
    'mpb_deployment-uat-EUS_QA-target',
  );
  // targetBranchBuMapping is no longer generated by the tool (superseded by mpb_pipeline): any value
  // present is the user's own, left byte-for-byte unchanged rather than tool-overwritten.
  assert.deepEqual(
    deployment.targetBranchBuMapping,
    sampleConfig.options.deployment.targetBranchBuMapping,
    'the tool must not generate or overwrite the user-authored targetBranchBuMapping',
  );
});

test('buildConfig nests a hop under the user-supplied envBranches branch (WS3)', () => {
  const state = sampleWizardState();
  // A custom branch for the Prod env: the UAT->Prod hop must nest under `production`, not `prod`.
  state.envBranches = { Prod: 'production' };
  const out = buildConfig(state, sampleConfig);
  const branchMap = out.options.deployment.branchSourceTargetMapping;
  assert.ok(branchMap.production, 'the hop is keyed under the custom branch');
  assert.equal(
    branchMap.production['mpb_deployment-production-EUN_UAT-source'],
    'mpb_deployment-production-EUN_UAT-target',
    'the pipeline pair nests under the custom branch',
  );
  // The user-authored `prod` branch survives untouched, but the tool must not add any mpb_ pipeline
  // pair under the derived `prod` slug when envBranches supplies `production` instead.
  const productionMpbPairs = Object.keys(branchMap.prod || {}).filter((source) =>
    source.startsWith('mpb_'),
  );
  assert.deepEqual(
    productionMpbPairs,
    [],
    'no mpb_ pair is nested under the derived branchKey() slug',
  );
});

test('buildConfig falls back to branchKey() when envBranches lacks the target env (WS3)', () => {
  const state = sampleWizardState();
  // No envBranches at all → every hop keeps its derived branchKey() slug (backward compatible).
  delete state.envBranches;
  const out = buildConfig(state, sampleConfig);
  const branchMap = out.options.deployment.branchSourceTargetMapping;
  assert.equal(branchMap.sit['mpb_deployment-sit-source'], 'mpb_deployment-sit-target');
  assert.ok(branchMap.uat, 'a target env without an envBranches entry falls back to branchKey()');
});

test('buildConfig persists envBranches in the mpb_pipeline block and round-trips it (WS3)', () => {
  const state = sampleWizardState();
  state.envBranches = { Prod: 'production', DEV: 'develop' };
  const out = buildConfig(state, sampleConfig);
  const block = out.options.deployment.mpb_pipeline;
  assert.deepEqual(block.envBranches, { Prod: 'production', DEV: 'develop' });
  // wizardStateFromConfig restores the persisted branch map from the block.
  const restored = controller.wizardStateFromConfig(out);
  assert.deepEqual(restored.envBranches, { Prod: 'production', DEV: 'develop' });
});

test('buildConfig with empty/partial lineage still emits valid single-BU sources (fallback)', () => {
  const state = sampleWizardState();
  // Wipe the lineage entirely: the fallback must still produce one 1-BU source marketList per group.
  state.lineage = {};
  const out = buildConfig(state, sampleConfig);
  for (const [name, entry] of Object.entries(out.marketList)) {
    if (!(name.startsWith('mpb_deployment-') && name.endsWith('-source'))) {
      continue;
    }
    const keys = Object.keys(entry).filter((k) => k !== 'filter');
    assert.equal(keys.length, 1, `${name} must map exactly one BU even without lineage`);
  }
  // Single-BU source envs (DEV, SIT) absorb their whole hop under the short name.
  assert.deepEqual(out.marketList['mpb_deployment-sit-source'], { 'ssjs/DEV': 'mpb_DEV' });
  assert.deepEqual(out.marketList['mpb_deployment-qa-source'], { 'ssjs/SIT': 'mpb_SIT' });
  // Multi-BU source hop (QA -> UAT) pairs by index when lineage is absent → two 1-BU sources.
  const uatSourceNames = Object.keys(out.marketList).filter(
    (n) => n.startsWith('mpb_deployment-uat-') && n.endsWith('-source') && !n.includes('-parent-'),
  );
  assert.equal(uatSourceNames.length, 2, 'index fallback still splits a multi-BU source hop');
  // Content check: the index fallback pairs QA→UAT source→target 1:1 in BU order (EUN_QA→EUN_UAT,
  // EUS_QA→EUS_UAT), not just the right COUNT. Guards a silent mis-pairing regression in the fallback.
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUN_QA-source'], {
    'ssjs/EUN_QA': 'mpb_QA_EUN_QA',
  });
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUN_QA-target'], {
    'ssjs/EUN_UAT': 'mpb_UAT_EUN_UAT',
  });
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUS_QA-source'], {
    'ssjs/EUS_QA': 'mpb_QA_EUS_QA',
  });
  assert.deepEqual(out.marketList['mpb_deployment-uat-EUS_QA-target'], {
    'ssjs/EUS_UAT': 'mpb_UAT_EUS_UAT',
  });
});

test('buildConfig persists the mpb_pipeline wizard-state block', () => {
  const state = sampleWizardState();
  const out = buildConfig(state, sampleConfig);
  const block = out.options.deployment.mpb_pipeline;
  assert.equal(block.version, 1);
  assert.deepEqual(block.envOrder, state.envOrder);
  assert.equal(block.sharedDEs, true);
});

test('buildConfig is idempotent (running twice yields identical output)', () => {
  const state = sampleWizardState();
  const once = buildConfig(state, sampleConfig);
  const twice = buildConfig(state, once);
  assert.deepEqual(twice, once);
});

test('buildConfig does not mutate the caller config', () => {
  const before = JSON.stringify(sampleConfig);
  buildConfig(sampleWizardState(), sampleConfig);
  assert.equal(JSON.stringify(sampleConfig), before);
});

test('buildConfig keeps BOTH pipelines when two source BUs slug-collide (no silent drop)', () => {
  // `EUN-QA` and `EUN_QA` are DISTINCT BUs that both slug() to `EUN_QA`. Before the fix they produced
  // the same mpb_deployment-uat-EUN_QA-source/-target names, so the second group OVERWROTE the first
  // in marketList AND branchMap — one whole source→target pipeline (and its target BU) vanished.
  const config = { credentials: { ssjs: {} } };
  const state = {
    version: 1,
    multiCred: false,
    envOrder: ['QA', 'UAT'],
    // Two upstream BUs differing only by punctuation → identical slug.
    envBUs: { QA: ['EUN-QA', 'EUN_QA'], UAT: ['EUN_UAT', 'EUS_UAT'] },
    // Distinct downstream target per source via explicit lineage.
    lineage: { EUN_UAT: 'EUN-QA', EUS_UAT: 'EUN_QA' },
    separator: '_',
    suffixes: {},
    prodBUs: [],
    sharedDEs: false,
  };
  const out = buildConfig(state, config);

  // BOTH source→target pairs must exist: the colliding sibling is disambiguated with a `-<n>` infix.
  const sourceNames = Object.keys(out.marketList)
    .filter((n) => n.startsWith('mpb_deployment-uat-') && n.endsWith('-source'))
    .toSorted((a, b) => a.localeCompare(b));
  assert.deepEqual(
    sourceNames,
    ['mpb_deployment-uat-EUN_QA-2-source', 'mpb_deployment-uat-EUN_QA-source'],
    'a slug collision disambiguates the second pair rather than overwriting the first',
  );

  // Each source marketList still maps EXACTLY ONE BU, and the two are the two DISTINCT source BUs.
  const sourceBUReferences = [];
  for (const name of sourceNames) {
    const keys = Object.keys(out.marketList[name]).filter((k) => k !== 'filter');
    assert.equal(keys.length, 1, `${name} must map exactly one BU`);
    sourceBUReferences.push(keys[0]);
  }
  assert.equal(sourceBUReferences.length, 2, 'exactly two 1-BU source marketLists');
  assert.ok(sourceBUReferences.includes('ssjs/EUN-QA'), 'the EUN-QA source BU survives');
  assert.ok(sourceBUReferences.includes('ssjs/EUN_QA'), 'the EUN_QA source BU survives');

  // Both pairs are nested in the branch map (nothing was clobbered there either).
  const branchMap = out.options.deployment.branchSourceTargetMapping.uat;
  assert.equal(branchMap['mpb_deployment-uat-EUN_QA-source'], 'mpb_deployment-uat-EUN_QA-target');
  assert.equal(
    branchMap['mpb_deployment-uat-EUN_QA-2-source'],
    'mpb_deployment-uat-EUN_QA-2-target',
  );

  // NO target BU was dropped: the two targets (EUN_UAT, EUS_UAT) are each covered exactly once.
  const coveredTargets = sourceNames
    .flatMap((name) => Object.keys(out.marketList[branchMap[name]]))
    .filter((k) => k !== 'filter')
    .toSorted((a, b) => a.localeCompare(b));
  assert.deepEqual(
    coveredTargets,
    ['ssjs/EUN_UAT', 'ssjs/EUS_UAT'],
    'every target BU is still covered — none was silently dropped',
  );

  // The disambiguated market name in the source marketList VALUE agrees with a real markets KEY.
  assert.deepEqual(out.markets['mpb_QA_EUN_QA_2'], { suffix: '_QA' });
  assert.equal(
    out.marketList['mpb_deployment-uat-EUN_QA-2-source']['ssjs/EUN_QA'],
    'mpb_QA_EUN_QA_2',
    'the source marketList value references the disambiguated market key (internally consistent)',
  );

  // Idempotency holds with collisions present: a second pass is byte-identical.
  assert.deepEqual(buildConfig(state, out), out, 'collision disambiguation stays idempotent');
});

test('buildConfig on the gold config splits QA→UAT into 3 single-BU sources (canonical fixture)', () => {
  // Load the real gold vanilla config and run its persisted wizard state straight through buildConfig.
  // This locks the highest-priority requirement — one 1-BU source marketList per upstream QA BU —
  // against the canonical fixture, including the exact generated name for the regional source.
  const gold = JSON.parse(fs.readFileSync(GOLD_PATH, 'utf8'));
  const state = gold.options.deployment.mpb_pipeline;
  const out = buildConfig(state, gold);

  const uatSourceNames = Object.keys(out.marketList)
    .filter(
      (n) =>
        n.startsWith('mpb_deployment-uat-') && n.endsWith('-source') && !n.includes('-parent-'),
    )
    .toSorted((a, b) => a.localeCompare(b));
  // QA holds three BUs (EUN_QA, EUS_QA, QA_Regional) → three per-source pipelines.
  assert.deepEqual(uatSourceNames, [
    'mpb_deployment-uat-EUN_QA-source',
    'mpb_deployment-uat-EUS_QA-source',
    'mpb_deployment-uat-QA_Regional-source',
  ]);
  // Each source marketList maps exactly one BU (mcdev createDeltaPkg requirement).
  for (const name of uatSourceNames) {
    const keys = Object.keys(out.marketList[name]).filter((k) => k !== 'filter');
    assert.equal(keys.length, 1, `${name} must map exactly one BU`);
  }
  // The exact regional source name resolves to the single QA_Regional BU.
  assert.deepEqual(out.marketList['mpb_deployment-uat-QA_Regional-source'], {
    'R1/QA_Regional': 'mpb_QA_QA_Regional',
  });
});

test('buildConfig on the gold config emits one parent pair per lineage group when sharedDEs is on', () => {
  const gold = JSON.parse(fs.readFileSync(GOLD_PATH, 'utf8'));
  const state = { ...gold.options.deployment.mpb_pipeline, sharedDEs: true };
  const out = buildConfig(state, gold);

  // QA→UAT: three child groups → three parent source MLs, each ends-only on that BU's suffix.
  const uatParentSources = [
    'mpb_deployment-uat-EUN_QA-parent-source',
    'mpb_deployment-uat-EUS_QA-parent-source',
    'mpb_deployment-uat-QA_Regional-parent-source',
  ];
  for (const name of uatParentSources) {
    const keys = Object.keys(out.marketList[name] || {}).filter((k) => k !== 'filter');
    assert.equal(keys.length, 1, `${name} must map exactly one _ParentBU_`);
  }
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-EUN_QA-parent-source'].filter.include.key['*'],
    ['%[_]QAN'],
  );
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-source'].filter.include.key['*'],
    ['%[_]QAS'],
  );
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-source'].filter.include.key['*'],
    ['%[_]QAR'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUN_QA-parent-target']['R1/_ParentBU_'],
    'mpb_UAT_EUN_UAT_parent',
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-target']['R1/_ParentBU_'],
    'mpb_UAT_EUS_UAT_parent',
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-target']['R1/_ParentBU_'],
    'mpb_UAT_UAT_Regional_parent',
  );

  // SIT→QA: SIT fans out to two QA BUs → parent target is an array of 2; regional is 1:1 string.
  const sitParentTarget = out.marketList['mpb_deployment-qa-SIT-parent-target'];
  assert.deepEqual(sitParentTarget['R1/_ParentBU_'], [
    'mpb_QA_EUN_QA_parent',
    'mpb_QA_EUS_QA_parent',
  ]);
  assert.equal(
    out.marketList['mpb_deployment-qa-SIT_Regional-parent-target']['R1/_ParentBU_'],
    'mpb_QA_QA_Regional_parent',
  );
  assert.deepEqual(out.marketList['mpb_deployment-qa-SIT-parent-source'].filter.include.key['*'], [
    '%[_]SIT',
  ]);
  assert.deepEqual(
    out.marketList['mpb_deployment-qa-SIT_Regional-parent-source'].filter.include.key['*'],
    ['%[_]SITR'],
  );
});

/**
 * Wizard state matching the user's gold-like hop examples (DEV+Regional, SIT fan-out, QA 1:1).
 *
 * @returns {object} wizard state
 */
function abcWizardState() {
  return {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'SIT', 'QA', 'UAT', 'Prod'],
    envBUs: {
      DEV: ['DEV', 'DEV_Regional'],
      SIT: ['SIT', 'SIT_Regional'],
      QA: ['EUN_QA', 'EUS_QA', 'QA_Regional'],
      UAT: ['EUN_UAT', 'EUS_UAT', 'UAT_Regional'],
      Prod: [
        'Randstad_EUN',
        'TempoTeam_EUN',
        'Randstad_EUS',
        'NL_RS',
        'NL_TT',
        'EMEA_RS',
        'EMEA_TT',
      ],
    },
    lineage: {
      SIT: 'DEV',
      SIT_Regional: 'DEV_Regional',
      EUN_QA: 'SIT',
      EUS_QA: 'SIT',
      QA_Regional: 'SIT_Regional',
      EUN_UAT: 'EUN_QA',
      EUS_UAT: 'EUS_QA',
      UAT_Regional: 'QA_Regional',
      Randstad_EUN: 'EUN_UAT',
      TempoTeam_EUN: 'EUN_UAT',
      Randstad_EUS: 'EUS_UAT',
      NL_RS: 'UAT_Regional',
      NL_TT: 'UAT_Regional',
      EMEA_RS: 'UAT_Regional',
      EMEA_TT: 'UAT_Regional',
    },
    separator: '_',
    suffixes: {
      DEV: '_DEV',
      DEV_Regional: '_RDEV',
      SIT: '_SIT',
      SIT_Regional: '_RSIT',
      EUN_QA: '_QA',
      EUS_QA: '_QAS',
      QA_Regional: '_RQA',
      EUN_UAT: '_UAT',
      EUS_UAT: '_UAS',
      UAT_Regional: '_RUAT',
      Randstad_EUN: '_RS',
      TempoTeam_EUN: '_TT',
      Randstad_EUS: '_RSS',
      NL_RS: '_NL_RS',
      NL_TT: '_NL_TT',
      EMEA_RS: '_ERS',
      EMEA_TT: '_ETT',
    },
    prodBUs: [
      'Randstad_EUN',
      'TempoTeam_EUN',
      'Randstad_EUS',
      'NL_RS',
      'NL_TT',
      'EMEA_RS',
      'EMEA_TT',
    ],
    sharedDEs: true,
  };
}

test('buildConfig parent pairs mirror child lineage groups (A/B/C hop shape)', () => {
  const out = buildConfig(abcWizardState(), sampleConfig);
  const parentKey = 'ssjs/_ParentBU_';

  // A) DEV→SIT — two parent pairs, each banding on that source BU's suffix.
  const sitDevelopment = out.marketList['mpb_deployment-sit-DEV-parent-source'];
  const sitReg = out.marketList['mpb_deployment-sit-DEV_Regional-parent-source'];
  assert.deepEqual(sitDevelopment.filter.include.key['*'], ['%[_]DEV']);
  assert.equal(sitDevelopment[parentKey], 'mpb_DEV_DEV_parent');
  assert.equal(
    out.marketList['mpb_deployment-sit-DEV-parent-target'][parentKey],
    'mpb_SIT_SIT_parent',
  );
  assert.deepEqual(sitReg.filter.include.key['*'], ['%[_]RDEV']);
  assert.equal(sitReg[parentKey], 'mpb_DEV_DEV_Regional_parent');
  assert.equal(
    out.marketList['mpb_deployment-sit-DEV_Regional-parent-target'][parentKey],
    'mpb_SIT_SIT_Regional_parent',
  );

  // B) SIT→QA — SIT fans out to two QA BUs (array); regional is 1:1 string.
  const qaSit = out.marketList['mpb_deployment-qa-SIT-parent-source'];
  assert.deepEqual(qaSit.filter.include.key['*'], ['%[_]SIT']);
  assert.equal(qaSit[parentKey], 'mpb_SIT_SIT_parent');
  assert.deepEqual(out.marketList['mpb_deployment-qa-SIT-parent-target'][parentKey], [
    'mpb_QA_EUN_QA_parent',
    'mpb_QA_EUS_QA_parent',
  ]);
  const qaReg = out.marketList['mpb_deployment-qa-SIT_Regional-parent-source'];
  assert.deepEqual(qaReg.filter.include.key['*'], ['%[_]RSIT']);
  assert.equal(
    out.marketList['mpb_deployment-qa-SIT_Regional-parent-target'][parentKey],
    'mpb_QA_QA_Regional_parent',
  );

  // C) QA→UAT — three 1:1 parent pairs.
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-EUN_QA-parent-source'].filter.include.key['*'],
    ['%[_]QA'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUN_QA-parent-target'][parentKey],
    'mpb_UAT_EUN_UAT_parent',
  );
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-source'].filter.include.key['*'],
    ['%[_]QAS'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-target'][parentKey],
    'mpb_UAT_EUS_UAT_parent',
  );
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-source'].filter.include.key['*'],
    ['%[_]RQA'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-target'][parentKey],
    'mpb_UAT_UAT_Regional_parent',
  );

  // UAT→PROD mirrors child groups: 2-market array, string, 4-market array.
  assert.deepEqual(out.marketList['mpb_deployment-prod-EUN_UAT-parent-target'][parentKey], [
    'mpb_Prod_Randstad_EUN_parent',
    'mpb_Prod_TempoTeam_EUN_parent',
  ]);
  assert.equal(
    out.marketList['mpb_deployment-prod-EUS_UAT-parent-target'][parentKey],
    'mpb_Prod_Randstad_EUS_parent',
  );
  assert.deepEqual(out.marketList['mpb_deployment-prod-UAT_Regional-parent-target'][parentKey], [
    'mpb_Prod_NL_RS_parent',
    'mpb_Prod_NL_TT_parent',
    'mpb_Prod_EMEA_RS_parent',
    'mpb_Prod_EMEA_TT_parent',
  ]);

  // Hotfix stays child-only: no parent-BU hotfix pair.
  assert.ok(out.marketList['mpb_hotfix-source']);
  assert.ok(out.marketList['mpb_hotfix-target']);
  assert.equal(out.marketList['mpb_hotfix-parent-source'], undefined);
  assert.equal(
    out.options.deployment.sourceTargetMapping['mpb_hotfix-source'],
    'mpb_hotfix-target',
  );
});

/**
 * A representative validations-only state exercising every rule shape.
 *
 * @returns {object} validations state
 */
function sampleValidationsState() {
  return {
    buSuffixMap: { DEV: '_DEV', SIT: '_SIT', QA_N: '_QAN', PROD_N: '_PRODN' },
    separator: '_',
    devBU: 'DEV',
    selectedRules: [
      'noGuidKeys',
      'properJourneyDeNameAndKey',
      'filterText',
      'noSharedAssets',
      'onlyCBbyKey',
      'noMultipartEmails',
      'payloadParameterDEsNoPrimaryKey',
      'noMidDependentCode',
      'filterPrefixByBu',
      'sendableDeRetention',
    ],
    prodMap: { DEV: false, PROD_N: true },
    mids: [510007949, 510008586],
    prefixBlacklist: { QA_N: ['acme_', 'demo_'], PROD_N: [] },
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 6,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: true,
      // sendableDeRetention scopes itself to its own selected BUs (bare-name -> true), not prodBUs.
      appliesToMap: { PROD_N: true },
    },
  };
}

test('buildValidations always emits buSuffixMap + keySuffix', () => {
  const source = buildValidations({
    buSuffixMap: { DEV: '_DEV' },
    separator: '_',
    selectedRules: [],
  });
  assert.ok(source.includes('const buSuffixMap ='));
  assert.ok(source.includes('keySuffix'));
});

test('keySuffix rule scopes to assets only (shared DEs live on the suffix-less parent BU)', () => {
  const source = buildValidations({
    buSuffixMap: { DEV: '_DEV' },
    separator: '_',
  });
  assert.ok(
    source.includes("definition.type !== 'asset'"),
    'keySuffix must only enforce the suffix on assets',
  );
  assert.ok(
    !source.includes('shared_dataextension'),
    'keySuffix must no longer reference shared data extensions',
  );
});

test('buildValidations output parses as JavaScript', () => {
  const source = buildValidations(sampleValidationsState());
  // strip the ESM `export ` so we can compile with the classic-script parser
  const compilable = source.replace('export function validation', 'function validation');
  assert.doesNotThrow(() => new vm.Script(compilable), 'emitted validations source must parse');
});

test('buildValidations never emits prodBUorNotMap while no rule is prod-scoped', () => {
  // sendableDeRetention now scopes itself via its own appliesTo map, so the sample (which selects it)
  // must NOT drag in the module-scope production map or the isProd local.
  const withRetention = buildValidations(sampleValidationsState());
  assert.ok(!withRetention.includes('prodBUorNotMap'), 'no rule forces the production map');
  assert.ok(!withRetention.includes('isProd'), 'no rule forces the isProd local');
  const withoutProduction = buildValidations({
    buSuffixMap: { DEV: '_DEV' },
    separator: '_',
    selectedRules: ['noGuidKeys'],
  });
  assert.ok(!withoutProduction.includes('prodBUorNotMap'));
});

test('buildValidations wires filterText dev-BU exemption to the real dev BU name', () => {
  const source = buildValidations(sampleValidationsState());
  assert.ok(source.includes('if (bu === "DEV")'));
});

test('buildValidations carries no client brand names or the sample client MID', () => {
  const source = buildValidations(sampleValidationsState()).toLowerCase();
  // the sample .mcdev-validations.js client MID must never appear
  assert.ok(!source.includes('510004860'));
  // no client brand names from the sample repo
  for (const brand of ['randstad', 'tempoteam']) {
    assert.ok(!source.includes(brand), `emitted source must not contain "${brand}"`);
  }
});

test('sendableDeRetention emits the mcdev c__retentionPolicy field (not c__retentionType)', () => {
  const source = buildValidations(sampleValidationsState());
  // mcdev's DataExtension model field is c__retentionPolicy (see
  // sfmc-devtools/lib/metadataTypes/DataExtension.js); the old c__retentionType was a no-op.
  assert.ok(
    source.includes('c__retentionPolicy:'),
    'expected object must key on c__retentionPolicy',
  );
  assert.ok(
    source.includes('item.c__retentionPolicy = this.expected.c__retentionPolicy'),
    'fix() must assign the mcdev c__retentionPolicy field',
  );
  assert.ok(
    source.includes('item.c__retentionPolicy === this.expected.c__retentionPolicy'),
    'passed() must compare the mcdev c__retentionPolicy field',
  );
  assert.ok(
    !source.includes('c__retentionType'),
    'the ignored c__retentionType field must not appear',
  );
  // the enum value spelling (mcdev's real, misspelled "individialRecords") is preserved verbatim.
  assert.ok(source.includes('individialRecords'));
});

test('sendableDeRetention scopes by its own appliesTo BU map, not production', () => {
  const source = buildValidations(sampleValidationsState());
  // the rule carries a self-contained bare-name -> true map and gates passed() on it.
  assert.ok(source.includes('appliesTo: {'), 'rule must emit its own appliesTo BU map');
  assert.ok(source.includes('"PROD_N": true'), 'the selected BU must be in the appliesTo map');
  assert.ok(
    source.includes(
      "if (!this.appliesTo[bu] || definition.type !== 'dataExtension' || !item.IsSendable)",
    ),
    'passed() must gate on the rule-local appliesTo map',
  );
  // no production coupling for this rule.
  assert.ok(!source.includes('isProd'), 'the retention rule must not reference isProd');
  assert.ok(
    !source.includes('prodBUorNotMap'),
    'the retention rule must not reference prodBUorNotMap',
  );
});

// deTypeScope generalises the passed() DE-type gate. Build a scoped retention rule for a given
// scope and return the emitted validations source.
/**
 * @param {('sendable'|'nonSendable'|'both'|undefined)} deTypeScope the scope to emit (omit for default)
 * @returns {string} the generated validations source
 */
function retentionSourceForScope(deTypeScope) {
  const retention = {
    c__retentionPolicy: 'individialRecords',
    DataRetentionPeriodLength: 3,
    c__dataRetentionPeriodUnitOfMeasure: 'Months',
    ResetRetentionPeriodOnImport: false,
    appliesToMap: { PROD_N: true },
  };
  if (deTypeScope !== undefined) {
    retention.deTypeScope = deTypeScope;
  }
  return buildValidations({
    buSuffixMap: { DEV: '_DEV', PROD_N: '_PRODN' },
    separator: '_',
    selectedRules: ['sendableDeRetention'],
    retention: retention,
  });
}

test("sendableDeRetention deTypeScope 'sendable' emits the !item.IsSendable guard", () => {
  const source = retentionSourceForScope('sendable');
  assert.ok(
    source.includes(
      "if (!this.appliesTo[bu] || definition.type !== 'dataExtension' || !item.IsSendable)",
    ),
    'sendable scope must skip non-sendable DEs via !item.IsSendable',
  );
});

test("sendableDeRetention deTypeScope 'nonSendable' emits the item.IsSendable guard", () => {
  const source = retentionSourceForScope('nonSendable');
  assert.ok(
    source.includes(
      "if (!this.appliesTo[bu] || definition.type !== 'dataExtension' || item.IsSendable)",
    ),
    'nonSendable scope must skip sendable DEs via item.IsSendable',
  );
  assert.ok(
    !source.includes('!item.IsSendable'),
    'nonSendable scope must not keep the sendable-only guard',
  );
});

test("sendableDeRetention deTypeScope 'both' emits no IsSendable guard", () => {
  const source = retentionSourceForScope('both');
  assert.ok(
    source.includes("if (!this.appliesTo[bu] || definition.type !== 'dataExtension')"),
    'both scope must gate only on appliesTo + DE type',
  );
  assert.ok(!source.includes('IsSendable'), 'both scope must not reference IsSendable at all');
});

test('sendableDeRetention defaults to sendable scope when deTypeScope is absent', () => {
  const source = retentionSourceForScope();
  assert.ok(
    source.includes(
      "if (!this.appliesTo[bu] || definition.type !== 'dataExtension' || !item.IsSendable)",
    ),
    'an absent deTypeScope must behave as sendable-only',
  );
});

test('sendableDeRetention is dropped when its appliesTo map is empty', () => {
  // Selected but with no BU scope -> the emitter must not produce the rule body at all. The caller
  // (deriveValidationsState) drops the rule from selectedRules, mirrored here by omitting it.
  const withoutScope = buildValidations({
    buSuffixMap: { DEV: '_DEV', PROD_N: '_PRODN' },
    separator: '_',
    selectedRules: [],
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
      appliesToMap: {},
    },
  });
  assert.ok(
    !withoutScope.includes('"sendableDeRetention":'),
    'a rule with no selected BU must not emit a rule body',
  );
});

// ─── controller: validations-only BU collection (Review-loop fix pass 1, MUST-FIX 2) ───

// The controller is a browser IIFE that reads global.document at load. It early-returns from init()
// when there is no #mpb-app, so a minimal stub (no #mpb-app, non-loading readyState) lets us load it
// headlessly and drive its pure derive/seed helpers without a real DOM.
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  writable: true,
  value: {
    readyState: 'complete',
    querySelector: () => null,
    addEventListener: () => {},
  },
});
require('../assets/js/mcdev-pipeline-builder.js');
const controller = globalThis.mpbController;

// ─── controller: env → git-branch slug helper (WS3) ───

test('autoBranchFromEnvName lower-cases, trims and dashes spaces/odd chars', () => {
  const auto = controller.autoBranchFromEnvName;
  assert.equal(auto('Prod'), 'prod');
  assert.equal(auto('  UAT  '), 'uat', 'leading/trailing whitespace is trimmed');
  assert.equal(auto('Pre Prod'), 'pre-prod', 'a space becomes a single dash');
  assert.equal(auto('QA / EUN'), 'qa-eun', 'runs of non-alnum collapse to one dash');
  assert.equal(auto('__Dev__'), 'dev', 'leading/trailing dashes are stripped');
  assert.equal(auto(''), '', 'an empty name yields an empty slug');
  // Mirrors the config builder's branchKey() so the auto-filled UI value and the fallback agree.
  assert.equal(auto('Pre Prod'), 'pre-prod');
});

test('env-order render seeds an empty git branch from the name (stored || auto, never overwrite)', () => {
  // environmentOrderRow needs a live DOM (makeElement → document.createElement) that the headless
  // stub does not provide, so assert the pure seeding rule the row builder applies at the state level:
  // an empty/absent branch falls back to autoBranchFromEnvName and is persisted, a stored branch is
  // never overwritten, and a name with no usable chars leaves the branch unset (no empty key).
  const auto = controller.autoBranchFromEnvName;
  /**
   * Reproduce the row builder's seeding step for a single env: mutate envBranches exactly as
   * environmentOrderRow does and return the effective branch value it would bind to the input.
   *
   * @param {object} branches the current envBranches map (mutated to the cloned/persisted result)
   * @param {string} name the env display name (envBranches key)
   * @returns {{branches: object, effective: string}} the persisted map and the effective branch value
   */
  function seedBranch(branches, name) {
    const stored = branches[name] || '';
    let effective = stored;
    let next = branches;
    if (!stored) {
      const slug = auto(name);
      if (slug) {
        next = { ...branches, [name]: slug };
        effective = slug;
      }
    }
    return { branches: next, effective: effective };
  }

  // Empty branch → seeded from the name and persisted under the display-name key.
  const seeded = seedBranch({}, 'Pre Prod');
  assert.equal(seeded.effective, 'pre-prod', 'an empty branch is seeded from the name slug');
  assert.equal(
    seeded.branches['Pre Prod'],
    'pre-prod',
    'the seeded slug is persisted into envBranches',
  );

  // A stored branch is never overwritten by the auto slug.
  const kept = seedBranch({ Prod: 'production' }, 'Prod');
  assert.equal(kept.effective, 'production', 'a stored branch is used as-is');
  assert.equal(kept.branches.Prod, 'production', 'a stored branch is never overwritten');

  // A name with no usable chars yields no slug → the branch stays unset (no empty key stored).
  const empty = seedBranch({}, '///');
  assert.equal(empty.effective, '', 'a name with no usable chars leaves the branch empty');
  assert.ok(!Object.hasOwn(empty.branches, '///'), 'no empty envBranches key is stored');
});

test('validations-only mode collects each BU’s suffix into a populated buSuffixMap', () => {
  // Drive the same path selectMode('validations') takes: seed the pooled synthetic environment from
  // the config, seed default suffixes, then derive the validationsState the output step would build.
  controller.state.config = sampleConfig;
  controller.state.mode = 'validations';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: [],
    envBUs: {},
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: ['sendableDeRetention'],
    prefixBlacklist: {},
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
    },
    sharedDEs: false,
  };
  controller.seedValidationsPool();
  controller.seedSuffixes();

  const derived = controller.deriveValidationsState();
  const suffixKeys = Object.keys(derived.buSuffixMap);
  // Before the fix, validations mode never collected BUs -> buSuffixMap was empty.
  assert.ok(suffixKeys.length > 0, 'buSuffixMap must be populated in validations-only mode');
  // Every collected BU carries a non-empty suffix that starts with the separator.
  for (const bu of suffixKeys) {
    assert.equal(typeof derived.buSuffixMap[bu], 'string');
    assert.ok(derived.buSuffixMap[bu].startsWith('_'), `${bu} suffix must include the separator`);
  }
  // devBU resolves to a real pooled BU (the first one), not an empty string.
  assert.ok(derived.devBU.length > 0, 'devBU must resolve from the pooled BUs');
});

// ─── controller: sendableDeRetention rule-specific BU scope (decoupled from production) ───

/**
 * Load the controller into validations-only mode over the sample config, select sendableDeRetention,
 * and set the rule's own `retention.appliesTo` to the given buRefs (whatever real pooled BUs exist).
 *
 * @param {string[]} appliesTo the buRefs the retention rule applies to
 * @returns {object} the derived validationsState
 */
function deriveRetentionState(appliesTo) {
  controller.state.config = sampleConfig;
  controller.state.mode = 'validations';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: [],
    envBUs: {},
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: ['sendableDeRetention'],
    prefixBlacklist: {},
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
      appliesTo: appliesTo,
    },
    sharedDEs: false,
  };
  controller.seedValidationsPool();
  controller.seedSuffixes();
  return controller.deriveValidationsState();
}

test('deriveValidationsState keeps sendableDeRetention when a BU is selected and builds a bare-name map', () => {
  // Discover a real pooled buRef, then scope the rule to it.
  const pooledReferences = Object.keys(deriveRetentionState([]).buSuffixMap);
  assert.ok(pooledReferences.length > 0, 'the sample must pool at least one BU');
  const derived = deriveRetentionState([pooledReferences[0]]);
  // Note: buSuffixMap keys are bare names; appliesTo stores buRefs, but for the sample (single cred)
  // the bare name equals the buRef, so the first pooled key is a valid appliesTo selection.
  assert.ok(
    derived.selectedRules.includes('sendableDeRetention'),
    'a scoped retention rule must survive the drop filter',
  );
  assert.deepEqual(
    derived.retention.appliesToMap,
    { [pooledReferences[0]]: true },
    'appliesToMap must be a bare-name -> true map of only the selected BUs',
  );
  // An absent deTypeScope in wizardState is filled from emptyRetention(), whose new-config default
  // is 'both'. (The emitter separately keeps an absent-value back-compat fallback of 'sendable'.)
  assert.equal(
    derived.retention.deTypeScope,
    'both',
    'deTypeScope defaults to both (new-config default) when the wizardState retention omits it',
  );
  // The emitter turns that into a rule body with no production coupling.
  const source = buildValidations(derived);
  assert.ok(source.includes('"sendableDeRetention":'), 'rule body must be emitted');
  assert.ok(!source.includes('isProd'), 'no production gating for this rule');
});

test('deriveValidationsState drops sendableDeRetention when no BU is selected', () => {
  const derived = deriveRetentionState([]);
  assert.ok(
    !derived.selectedRules.includes('sendableDeRetention'),
    'an unscoped retention rule must be dropped from selectedRules',
  );
  assert.deepEqual(
    derived.retention.appliesToMap,
    {},
    'appliesToMap is empty when nothing is selected',
  );
  const source = buildValidations(derived);
  assert.ok(!source.includes('"sendableDeRetention":'), 'dropped rule must not emit a body');
});

// ─── controller: retention mini-wizard (SFMC "Retention Setting" GUI) ───

test('updateRetention merges a patch into the stored retention policy and re-renders safely', () => {
  controller.state.step = null;
  controller.state.config = null;
  controller.state.wizardState.retention = {
    c__retentionPolicy: 'allRecords',
    DataRetentionPeriodLength: 3,
    c__dataRetentionPeriodUnitOfMeasure: 'Months',
    ResetRetentionPeriodOnImport: true,
    appliesTo: [],
  };
  controller.updateRetention({ DataRetentionPeriodLength: 7 });
  const policy = controller.retentionPolicy();
  assert.equal(policy.DataRetentionPeriodLength, 7, 'the patched field is stored');
  assert.equal(policy.c__retentionPolicy, 'allRecords', 'untouched fields are preserved');
});

test('switching to individialRecords forces ResetRetentionPeriodOnImport off', () => {
  controller.state.step = null;
  controller.state.config = null;
  controller.state.wizardState.retention = {
    c__retentionPolicy: 'allRecords',
    DataRetentionPeriodLength: 3,
    c__dataRetentionPeriodUnitOfMeasure: 'Months',
    // A previously-on reset value that must NOT leak into individialRecords.
    ResetRetentionPeriodOnImport: true,
    appliesTo: [],
  };
  // The radio handler applies exactly this patch when individialRecords is chosen: the type plus a
  // forced reset-off so the stored (and later emitted) value can never carry reset-on-import true.
  controller.updateRetention({
    c__retentionPolicy: 'individialRecords',
    ResetRetentionPeriodOnImport: false,
  });
  const policy = controller.retentionPolicy();
  assert.equal(policy.c__retentionPolicy, 'individialRecords');
  assert.equal(
    policy.ResetRetentionPeriodOnImport,
    false,
    'individialRecords must clear a previously-on reset-on-import value',
  );
});

test('the emitter carries reset-on-import off for individialRecords (UI forces it false)', () => {
  // The emitter emits whatever it is given; the UI guarantees reset is false for individialRecords.
  // This asserts the resulting rule body reflects that off state end-to-end.
  const derived = deriveRetentionState(
    Object.keys(deriveRetentionState([]).buSuffixMap).slice(0, 1),
  );
  derived.retention.ResetRetentionPeriodOnImport = false;
  derived.retention.c__retentionPolicy = 'individialRecords';
  const source = buildValidations(derived);
  assert.ok(source.includes('"sendableDeRetention":'), 'rule body must be emitted');
  assert.ok(
    source.includes('ResetRetentionPeriodOnImport: false'),
    'individialRecords rule must emit reset-on-import false',
  );
});

// ─── controller: rule catalogue (Chunk 3 — removed rule + keySuffix always-on) ───

test('RULE_CATALOG no longer offers payloadParameterDEsNoPrimaryKey', () => {
  const ids = controller.RULE_CATALOG.map((rule) => rule.id);
  assert.ok(
    !ids.includes('payloadParameterDEsNoPrimaryKey'),
    'removed rule must be gone from the catalogue',
  );
});

test('RULE_CATALOG models keySuffix as an always-on rule', () => {
  const keySuffix = controller.RULE_CATALOG.find((rule) => rule.id === 'keySuffix');
  assert.ok(keySuffix, 'keySuffix must appear in the catalogue');
  assert.equal(keySuffix.alwaysOn, true, 'keySuffix must carry the alwaysOn flag');
  // The derived always-on set is the single source of truth the toggle guard reads.
  assert.ok(controller.ALWAYS_ON_RULES.has('keySuffix'), 'ALWAYS_ON_RULES must include keySuffix');
});

test('toggleRule ignores always-on rules (keySuffix never enters selectedRules)', () => {
  // Keep render() on the null-DOM-safe intake branch when the guard returns early.
  controller.state.step = 'intake';
  controller.state.wizardState = { selectedRules: [] };
  controller.toggleRule('keySuffix', true);
  assert.deepEqual(
    controller.state.wizardState.selectedRules,
    [],
    'keySuffix must not be stored as a selected rule',
  );
});

test('keySuffix is emitted exactly once even when also present in selectedRules', () => {
  // Defensive: even if a legacy save carried keySuffix, the builder must not double-emit it.
  const source = buildValidations({
    buSuffixMap: { DEV: '_DEV' },
    separator: '_',
    selectedRules: ['keySuffix', 'noGuidKeys'],
  });
  const occurrences = (source.match(/"keySuffix":/g) || []).length;
  assert.equal(occurrences, 1, 'keySuffix rule body must be emitted exactly once');
});

// ─── controller: in-place nav gate reacts to simulated text-input edits (focus/scroll fix) ───
//
// The suffix / separator / env-name inputs no longer full-render on every keystroke (which blurred
// the focused field and scrolled to the top). They update state in place and re-check the nav gate
// via canProceed(wizardStep). Focus/scroll can't be asserted under the node document stub, but the
// gate logic those handlers depend on is pure and IS asserted here.

test('canProceed("suffixes") flips to false when a keystroke makes two BUs share a suffix', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'QA'],
    envBUs: { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] },
    lineage: {},
    separator: '_',
    suffixes: { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAS' },
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
  // Distinct suffixes → the step passes its gate.
  assert.equal(controller.canProceed('suffixes').ok, true, 'distinct suffixes proceed');
  // Simulate the suffix input handler storing a duplicate value (EUS_QA typed to match EUN_QA).
  controller.state.wizardState.suffixes = {
    ...controller.state.wizardState.suffixes,
    EUS_QA: '_QAN',
  };
  assert.equal(
    controller.canProceed('suffixes').ok,
    false,
    'a duplicate suffix must disable proceeding',
  );
  // Simulate clearing the required suffix entirely.
  controller.state.wizardState.suffixes = {
    ...controller.state.wizardState.suffixes,
    EUS_QA: '_',
  };
  assert.equal(
    controller.canProceed('suffixes').ok,
    false,
    'an empty suffix body must disable proceeding',
  );
  // Simulate fixing it back to a distinct value → gate re-enables.
  controller.state.wizardState.suffixes = {
    ...controller.state.wizardState.suffixes,
    EUS_QA: '_QAS',
  };
  assert.equal(controller.canProceed('suffixes').ok, true, 'a fixed suffix re-enables proceeding');
});

test('canProceed("env-order") flips as a simulated env-name keystroke edits the order', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'QA'],
    envBUs: { DEV: ['DEV'], QA: ['QA'] },
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
  assert.equal(controller.canProceed('env-order').ok, true, 'two distinct names proceed');
  // Simulate the name input handler clearing a required name.
  controller.state.wizardState.envOrder = ['DEV', ''];
  assert.equal(
    controller.canProceed('env-order').ok,
    false,
    'an empty environment name must disable proceeding',
  );
  // Simulate typing a duplicate of the first name.
  controller.state.wizardState.envOrder = ['DEV', 'DEV'];
  assert.equal(
    controller.canProceed('env-order').ok,
    false,
    'a duplicate environment name must disable proceeding',
  );
  // Simulate fixing it to a distinct name → gate re-enables.
  controller.state.wizardState.envOrder = ['DEV', 'QA'];
  assert.equal(
    controller.canProceed('env-order').ok,
    true,
    'a distinct name re-enables proceeding',
  );
});

test('validations-only visibleSteps includes suffixes + prod-confirm, not env-ordering/lineage', () => {
  controller.state.mode = 'validations';
  const ids = controller.visibleSteps().map((step) => step.id);
  assert.deepEqual(ids, ['suffixes', 'prod-confirm', 'rules']);
  assert.ok(!ids.includes('env-order'), 'env-ordering stays out of validations-only mode');
  assert.ok(!ids.includes('lineage'), 'lineage stays out of validations-only mode');
});

// ─── controller: merged env-order step + "All BUs" leak guard ───

test('full-pipeline visibleSteps drops the removed standalone env-names step', () => {
  // Naming was merged into env-order; the separate "Names" step must no longer exist.
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    // Multi-BU env keeps the lineage step visible so we see the full ordered list.
    envOrder: ['DEV', 'QA'],
    envBUs: { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] },
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
    },
    sharedDEs: false,
  };
  const ids = controller.visibleSteps().map((step) => step.id);
  assert.ok(!ids.includes('env-names'), 'the standalone env-names step id must be gone');
  assert.deepEqual(ids, ['env-order', 'bu-assign', 'suffixes', 'lineage', 'prod-confirm', 'rules']);
});

test('parentBandNodes is empty when sharedDEs is off and lists assigned BUs with stored suffixes when on', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'QA'],
    envBUs: { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] },
    lineage: { EUN_QA: 'DEV', EUS_QA: 'DEV' },
    separator: '_',
    suffixes: { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAS' },
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
  assert.deepEqual(controller.parentBandNodes(), [], 'no Parent BU overlay when sharedDEs is off');
  controller.state.wizardState.sharedDEs = true;
  assert.deepEqual(controller.parentBandNodes(), [
    { environment: 'DEV', nodes: [{ reference: 'DEV', suffix: '_DEV' }] },
    {
      environment: 'QA',
      nodes: [
        { reference: 'EUN_QA', suffix: '_QAN' },
        { reference: 'EUS_QA', suffix: '_QAS' },
      ],
    },
  ]);
});

test('setSharedDEs flips wizardState.sharedDEs', () => {
  // Keep render() on the null-DOM-safe intake branch (the toggle remounts the lineage step).
  controller.state.step = 'intake';
  controller.state.wizardState.sharedDEs = false;
  controller.setSharedDEs(true);
  assert.equal(controller.state.wizardState.sharedDEs, true, 'checkbox on writes sharedDEs true');
  controller.setSharedDEs(false);
  assert.equal(
    controller.state.wizardState.sharedDEs,
    false,
    'checkbox off writes sharedDEs false',
  );
});

test('unusedLineageBUs flags assigned BUs that are neither source nor target', () => {
  // Screenshot fixture: DEV is assigned but nothing deploys from it; DEV_Regional fans out to
  // SIT + SIT_Regional, so it is used as a source. SIT / SIT_Regional are used as targets.
  const environmentBUs = {
    DEV: ['DEV', 'DEV_Regional'],
    SIT: ['SIT', 'SIT_Regional'],
  };
  const lineage = {
    SIT: 'DEV_Regional',
    SIT_Regional: 'DEV_Regional',
  };
  const unused = controller.unusedLineageBUs(environmentBUs, lineage);
  assert.deepEqual(unused, ['DEV'], 'DEV is assigned but unused in the lineage');
  assert.ok(!unused.includes('DEV_Regional'), 'DEV_Regional is used as a source');
  assert.equal(
    controller.unusedLineageNoteText(unused),
    'DEV is not linked in the lineage, so it will not appear in generated pipelines.',
  );
});

test('unusedLineageBUs flags a downstream BU with an empty deploys-from', () => {
  const environmentBUs = { DEV: ['DEV'], SIT: ['SIT'] };
  assert.deepEqual(
    controller.unusedLineageBUs(environmentBUs, {}),
    ['DEV', 'SIT'],
    'neither BU appears as a source or a target',
  );
  assert.deepEqual(
    controller.unusedLineageBUs(environmentBUs, { SIT: 'DEV' }),
    [],
    'a complete mapping leaves no unused BUs',
  );
});

test('canProceed("lineage") stays ok when a source BU is unused', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'SIT'],
    envBUs: { DEV: ['DEV', 'DEV_Regional'], SIT: ['SIT', 'SIT_Regional'] },
    lineage: { SIT: 'DEV_Regional', SIT_Regional: 'DEV_Regional' },
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
  assert.equal(
    controller.canProceed('lineage').ok,
    true,
    'an unused source-env BU must not block Next',
  );
});

test('full-pipeline mode never carries the synthetic "All BUs" env in envOrder', () => {
  // Reproduce re-opening a config that was saved in validations-only mode: its persisted envOrder is
  // exactly ['All BUs']. The mode-aware guard must strip it so the first real env shows a real name.
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['All BUs'],
    envBUs: { 'All BUs': ['DEV', 'SIT'] },
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
    },
    sharedDEs: false,
  };
  controller.stripValidationsPoolEnvironment();
  assert.ok(
    !controller.state.wizardState.envOrder.includes('All BUs'),
    'the synthetic pool env must never appear in a full-mode envOrder',
  );
  assert.ok(
    !Object.hasOwn(controller.state.wizardState.envBUs, 'All BUs'),
    'the synthetic pool env must be removed from envBUs too',
  );
  // Stripping the only env re-seeds the suggested defaults so no blank first row is shown.
  assert.ok(
    controller.state.wizardState.envOrder.length >= 2,
    'removal that empties envOrder re-seeds the suggested default environments',
  );
});

test('validations-only mode never offers the diagram / leaks the "All BUs" container (Review-loop fix pass 2)', () => {
  // Reproduce the validations-only state: the synthetic VALIDATIONS_POOL_ENV ("All BUs") env is
  // seeded so the suffix/production steps have data. Before the fix, renderDiagramPreview was gated
  // only by isComplete, so the diagram CTA showed and buildDiagramJSON() emitted a container literally
  // labelled "All BUs".
  controller.state.config = sampleConfig;
  controller.state.mode = 'validations';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: [],
    envBUs: {},
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
    },
    sharedDEs: false,
  };
  controller.seedValidationsPool();

  // The visibility decision is false in validations mode even when the wizard is "complete".
  assert.equal(
    controller.isDiagramOffered(true),
    false,
    'diagram must not be offered in validations-only mode',
  );

  // Guard-rail: the pooled env IS named "All BUs", so if the diagram were ever built here it would
  // leak that synthetic container. This proves the guard (diagramIsOffered=false) is what prevents it.
  const containers = controller
    .buildDiagramJSON()
    .graph.cells.filter((cell) => cell.type === 'sf.Container');
  assert.ok(
    containers.some((cell) => cell.attrs.headerLabel.text === 'All BUs'),
    'sanity: the validations pool env is the synthetic "All BUs" container the guard must keep hidden',
  );

  // Contrast: in full-pipeline mode a complete wizard DOES offer the diagram.
  controller.state.mode = 'full';
  assert.equal(
    controller.isDiagramOffered(true),
    true,
    'diagram is still offered in full-pipeline mode when complete',
  );
  assert.equal(
    controller.isDiagramOffered(false),
    false,
    'diagram is not offered in full-pipeline mode when incomplete',
  );
});

// ─── controller: strict single-assignment BU-assign board ───

/**
 * Seed a two-env full-pipeline wizard state whose config carries the two BUs used below, so the
 * board helpers (pooled / unassigned / assign) resolve against real data.
 *
 * @returns {void}
 */
function seedBoardState() {
  controller.state.config = {
    credentials: { ssjs: { businessUnits: { DEV: {}, SIT: {}, _ParentBU_: {} } } },
  };
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['A', 'B'],
    envBUs: { A: ['DEV'], B: [] },
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {
      c__retentionPolicy: 'individialRecords',
      DataRetentionPeriodLength: 3,
      c__dataRetentionPeriodUnitOfMeasure: 'Months',
      ResetRetentionPeriodOnImport: false,
    },
    sharedDEs: false,
  };
}

test('assignBUToEnvironment enforces the single-assignment invariant (moving A→B leaves it only in B)', () => {
  seedBoardState();
  // Precondition: DEV is in env A.
  assert.deepEqual(controller.state.wizardState.envBUs.A, ['DEV']);
  // Reassign DEV to env B.
  controller.assignBUToEnvironment('DEV', 'B');
  assert.deepEqual(
    controller.state.wizardState.envBUs.A,
    [],
    'DEV must be removed from its old env',
  );
  assert.deepEqual(
    controller.state.wizardState.envBUs.B,
    ['DEV'],
    'DEV must now live only in env B',
  );
  // Un-assign it back to the pool (targetEnv === null).
  controller.assignBUToEnvironment('DEV', null);
  assert.deepEqual(controller.state.wizardState.envBUs.A, []);
  assert.deepEqual(
    controller.state.wizardState.envBUs.B,
    [],
    'null target un-assigns the BU entirely',
  );
});

// ─── controller: bu-assign soft-confirm gate (leave-BUs-unassigned warning) ───

test('shouldConfirmUnassigned warns only on bu-assign with unassigned BUs, and clears after confirming', () => {
  seedBoardState();
  // On bu-assign with SIT still unassigned and no prior confirmation → warn.
  controller.setWizardStep('bu-assign');
  controller.setUnassignedConfirmed(false);
  assert.ok(controller.unassignedBUReferences().includes('SIT'), 'precondition: SIT is unassigned');
  assert.equal(
    controller.shouldConfirmUnassigned(),
    true,
    'must warn when a BU is unassigned and not yet confirmed',
  );

  // After the user clicks "Continue anyway" (latch set) → no more warning.
  controller.setUnassignedConfirmed(true);
  assert.equal(
    controller.shouldConfirmUnassigned(),
    false,
    'must not re-warn once the current set is confirmed',
  );

  // The prompt is bu-assign-only: even with an unassigned BU, other steps never warn.
  controller.setUnassignedConfirmed(false);
  controller.setWizardStep('suffixes');
  assert.equal(
    controller.shouldConfirmUnassigned(),
    false,
    'the confirmation prompt must never appear on other steps',
  );
});

test('assignBUToEnvironment resets the soft-confirm latch so a changed set re-warns', () => {
  seedBoardState();
  controller.setWizardStep('bu-assign');
  // Simulate a prior "Continue anyway": the latch is set.
  controller.setUnassignedConfirmed(true);
  assert.equal(controller.shouldConfirmUnassigned(), false, 'confirmed set does not warn');

  // Any board change (here: re-assigning DEV) invalidates the confirmation → warn again about the
  // still-unassigned SIT.
  controller.assignBUToEnvironment('DEV', 'B');
  assert.ok(controller.unassignedBUReferences().includes('SIT'), 'SIT is still unassigned');
  assert.equal(
    controller.shouldConfirmUnassigned(),
    true,
    'a board change must reset the latch and re-warn',
  );
});

test('assigning the last unassigned BU stops the warning without needing a confirmation', () => {
  seedBoardState();
  controller.setWizardStep('bu-assign');
  controller.setUnassignedConfirmed(false);
  assert.equal(controller.shouldConfirmUnassigned(), true, 'SIT unassigned → warn');

  // Assign the last unassigned BU: the length check alone now suppresses the prompt.
  controller.assignBUToEnvironment('SIT', 'B');
  assert.deepEqual(controller.unassignedBUReferences(), [], 'no BU left unassigned');
  assert.equal(
    controller.shouldConfirmUnassigned(),
    false,
    'nothing unassigned → Next advances with no stale prompt',
  );
});

test('the hard bu-assign gate (every env ≥1 BU) is unchanged by the soft gate', () => {
  seedBoardState();
  // Env B has zero BUs in the seed → the hard gate must still fail (real requirement, no confirm).
  const gate = controller.canProceedBUAssign();
  assert.equal(gate.ok, false, 'an env with zero BUs must still hard-block');
  assert.ok(/\bB\b/.test(gate.reason), 'the reason names the empty env');

  // Once every env has a BU, the hard gate passes (soft gate is layered on top, not replacing it).
  controller.assignBUToEnvironment('SIT', 'B');
  assert.equal(
    controller.canProceedBUAssign().ok,
    true,
    'hard gate passes once every env has a BU',
  );
});

test('unassignedBUReferences excludes assigned buRefs and never lists _ParentBU_', () => {
  seedBoardState();
  // DEV is assigned to A; SIT is not assigned anywhere; _ParentBU_ is filtered from the pool.
  let unassigned = controller.unassignedBUReferences();
  assert.ok(!unassigned.includes('DEV'), 'an assigned buRef must not appear in Unassigned');
  assert.ok(unassigned.includes('SIT'), 'an unassigned buRef must appear in Unassigned');
  assert.ok(
    !unassigned.includes('_ParentBU_'),
    'the mcdev-internal parent placeholder is never pooled',
  );
  // Assigning SIT too empties the Unassigned column.
  controller.assignBUToEnvironment('SIT', 'B');
  unassigned = controller.unassignedBUReferences();
  assert.deepEqual(unassigned, [], 'assigning every pooled BU leaves Unassigned empty');
});

// ─── controller: hash deep-linking / reload-restore ───

test('parseHash reads view + step + session id from a full wizard hash', () => {
  assert.deepEqual(controller.parseHash('#view=wizard&step=suffixes&s=abc'), {
    view: 'wizard',
    step: 'suffixes',
    sessionId: 'abc',
  });
});

test('parseHash returns the intake default for empty / malformed / non-string input', () => {
  const intakeDefault = { view: 'intake', step: null, sessionId: null };
  assert.deepEqual(controller.parseHash(''), intakeDefault);
  assert.deepEqual(controller.parseHash('#'), intakeDefault);
  // Unknown view + stray params are ignored gracefully (view falls back to intake).
  assert.deepEqual(controller.parseHash('#view=bogus&foo=bar'), intakeDefault);
  // A non-string (e.g. undefined location.hash) never throws.
  assert.deepEqual(controller.parseHash(), intakeDefault);
  assert.deepEqual(controller.parseHash(null), intakeDefault);
});

test('parseHash ignores unknown extra params but keeps the known ones', () => {
  assert.deepEqual(controller.parseHash('#view=output&s=xyz&extra=1&step='), {
    view: 'output',
    step: null,
    sessionId: 'xyz',
  });
});

test('hashFromLocation builds the expected string for each top-level view', () => {
  const savedStep = controller.state.step;
  const savedId = controller.persistence ? controller.persistence.currentId : undefined;

  // Intake: no session segment, even if one is technically open.
  controller.state.step = 'intake';
  assert.equal(controller.hashFromLocation(), '#view=intake');

  controller.state.step = 'mode';
  controller.setWizardStep('suffixes');
  controller.setCurrentId('sess-1');
  assert.equal(controller.hashFromLocation(), '#view=mode&s=sess-1');

  // Wizard carries the active sub-step + the session id.
  controller.state.step = 'wizard';
  assert.equal(controller.hashFromLocation(), '#view=wizard&step=suffixes&s=sess-1');

  controller.state.step = 'output';
  assert.equal(controller.hashFromLocation(), '#view=output&s=sess-1');

  // Restore state we borrowed for the assertions.
  controller.state.step = savedStep;
  controller.setCurrentId(savedId === undefined ? null : savedId);
});

test('hash round-trip: build from a state then parse it back yields the same fields', () => {
  controller.state.step = 'wizard';
  controller.setWizardStep('prod-confirm');
  controller.setCurrentId('round-trip-id');
  const built = controller.hashFromLocation();
  const parsed = controller.parseHash(built);
  assert.equal(parsed.view, 'wizard');
  assert.equal(parsed.step, 'prod-confirm');
  assert.equal(parsed.sessionId, 'round-trip-id');
  controller.setCurrentId(null);
});

test('restoring a hash that names a session absent from this browser lands on intake (no throw)', () => {
  // No such session exists in the (stubbed) storage → must not crash, must land on intake.
  controller.setCurrentId(null);
  assert.doesNotThrow(() => {
    controller.applyHashDescriptor({
      view: 'wizard',
      step: 'suffixes',
      sessionId: 'does-not-exist',
    });
  });
  assert.equal(controller.state.step, 'intake', 'a missing-session deep link falls back to intake');
  // The DOM/banner path is a no-op under the node stub (dom.banners is null), so we only assert the
  // navigation outcome here; the banner wiring is covered manually in the browser.
});

test('wizardStateFromConfig dedupes a buRef that a saved config lists in two envs', () => {
  // A config predating the strict model whose persisted block places DEV in BOTH envs.
  const config = {
    credentials: { ssjs: { businessUnits: { DEV: {}, SIT: {} } } },
    options: {
      deployment: {
        mpb_pipeline: {
          version: 1,
          envOrder: ['A', 'B'],
          envBUs: { A: ['DEV', 'SIT'], B: ['DEV'] },
          lineage: {},
          separator: '_',
          suffixes: {},
          prodBUs: [],
        },
      },
    },
  };
  const restored = controller.wizardStateFromConfig(config);
  // DEV is claimed by the first env (A) in envOrder and dropped from B.
  assert.deepEqual(restored.envBUs.A, ['DEV', 'SIT']);
  assert.deepEqual(restored.envBUs.B, [], 'the duplicate DEV must be removed from the later env');
  // Invariant: no buRef appears in more than one env after restore.
  const seen = new Set();
  for (const list of Object.values(restored.envBUs)) {
    for (const reference of list) {
      assert.ok(!seen.has(reference), `${reference} must appear in exactly one env`);
      seen.add(reference);
    }
  }
});

// ─── controller: persisted mode round-trips through save → reopen (Fix 1) ───

/**
 * Clear the persistence timers the controller starts on reopen/render (the lock heartbeat
 * `setInterval` and the debounced autosave `setTimeout`). Without this the open interval keeps the
 * Node event loop alive and `node --test` never exits.
 *
 * @returns {void}
 */
function stopControllerTimers() {
  if (controller.persistence.heartbeatTimer) {
    clearInterval(controller.persistence.heartbeatTimer);
    controller.persistence.heartbeatTimer = null;
  }
  if (controller.persistence.autosaveTimer) {
    clearTimeout(controller.persistence.autosaveTimer);
    controller.persistence.autosaveTimer = null;
  }
}

/**
 * Install a minimal in-memory localStorage on globalThis so the persistence layer (readSaveBlob /
 * writeSaveBlob / lock / reopenSave) works headlessly. Returns a restore function.
 *
 * @returns {() => void} restores the previous global.localStorage
 */
function installMemoryLocalStorage() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = new Map();
  const memory = {
    get length() {
      return store.size;
    },
    key(index) {
      return store.keys().toArray()[index] ?? null;
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: memory,
  });
  return () => {
    if (previous) {
      Object.defineProperty(globalThis, 'localStorage', previous);
    } else {
      delete globalThis.localStorage;
    }
  };
}

/**
 * Minimal fake DOM node for the builder-header mount test: tracks its children and supports
 * `firstChild` + a `prepend` that re-parents the child (matching the real controller's mount logic)
 * so hoist/park behaviour is observable under the headless stub.
 */
class FakeNode {
  constructor() {
    this.children = [];
  }

  get firstChild() {
    return this.children.at(0) || null;
  }

  prepend(child) {
    if (child.parentNode) {
      const index = child.parentNode.children.indexOf(child);
      if (index !== -1) {
        child.parentNode.children.splice(index, 1);
      }
    }
    this.children.unshift(child);
    child.parentNode = this;
  }
}

test('persisted mode round-trips: a wizard-mode save reopens into the wizard (not the mode picker)', () => {
  const restore = installMemoryLocalStorage();
  try {
    // Force the storage probe to re-run against the fresh in-memory store.
    controller.persistence.available = null;

    // 1. A freshly-accepted full-pipeline config, mode chosen via selectMode (which persists it).
    controller.state.config = sampleConfig;
    controller.state.wizardState = {
      version: 1,
      multiCred: false,
      mode: null,
      envOrder: ['DEV', 'QA'],
      envBUs: { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] },
      lineage: {},
      separator: '_',
      suffixes: {},
      prodBUs: [],
      selectedRules: [],
      prefixBlacklist: {},
      retention: {
        c__retentionPolicy: 'individialRecords',
        DataRetentionPeriodLength: 3,
        c__dataRetentionPeriodUnitOfMeasure: 'Months',
        ResetRetentionPeriodOnImport: false,
      },
      sharedDEs: false,
    };
    controller.selectMode('full');
    // selectMode persists the mode into the wizardState that the save blob serializes verbatim.
    assert.equal(controller.state.wizardState.mode, 'full', 'selectMode must persist the mode');

    // 2. Persist the current state under a save id (mimics the autosave the tool runs on every render).
    const id = 'fix1-round-trip';
    localStorage.setItem(
      'mcdevpipe::save::' + id,
      JSON.stringify({
        id: id,
        name: 'Fix1',
        version: 1,
        timestamp: Date.now(),
        config: controller.state.config,
        wizardState: controller.state.wizardState,
      }),
    );

    // 3. Simulate a reload: clear the live mode, then reopen the saved session.
    controller.state.mode = null;
    controller.reopenSave(id);

    // The restored mode drives the landing: wizard, not the mode picker.
    assert.equal(controller.state.mode, 'full', 'reopen must restore the persisted mode');
    assert.equal(
      controller.state.step,
      'wizard',
      'a mode-bearing save reopens straight into the wizard',
    );
  } finally {
    stopControllerTimers();
    restore();
    controller.persistence.available = null;
  }
});

test('backward compatible: a save with no persisted mode still reopens on the mode picker', () => {
  const restore = installMemoryLocalStorage();
  try {
    controller.persistence.available = null;
    const id = 'fix1-legacy';
    // An older save blob whose wizardState predates mode persistence (no `mode` field).
    localStorage.setItem(
      'mcdevpipe::save::' + id,
      JSON.stringify({
        id: id,
        name: 'Legacy',
        version: 1,
        timestamp: Date.now(),
        config: sampleConfig,
        wizardState: {
          version: 1,
          multiCred: false,
          envOrder: ['DEV', 'QA'],
          envBUs: { DEV: ['DEV'], QA: ['EUN_QA'] },
          lineage: {},
          separator: '_',
          suffixes: {},
          prodBUs: [],
          selectedRules: [],
          prefixBlacklist: {},
          retention: {},
          sharedDEs: false,
        },
      }),
    );
    controller.state.mode = 'full';
    controller.reopenSave(id);
    assert.equal(controller.state.mode, null, 'a mode-less save restores a null mode');
    assert.equal(
      controller.state.step,
      'mode',
      'a mode-less save keeps the original mode-picker landing',
    );
  } finally {
    stopControllerTimers();
    restore();
    controller.persistence.available = null;
  }
});

// ─── controller: stepper reachability logic (Fix 4) ───

/**
 * A three-step visible-step list used to exercise the stepper reachability classifier without a
 * rendered DOM. Ids are arbitrary; the classifier only cares about order + the gate results.
 *
 * @returns {{id: string, title: string}[]} the visible steps
 */
function stepperSteps() {
  return [
    { id: 's1', title: 'One' },
    { id: 's2', title: 'Two' },
    { id: 's3', title: 'Three' },
  ];
}

/**
 * A gate stub where every step id except `s1` passes — used to prove an incomplete earlier step is
 * still clickable (back is always allowed) but is not colour-coded as done.
 *
 * @param {string} id the step id
 * @returns {{ok: boolean, reason: string}} the gate result
 */
function gateAllButS1(id) {
  return { ok: id !== 's1', reason: '' };
}

/**
 * A gate stub where only `s1` passes — used to prove forward reachability stops at the first failing
 * gate (s2), so s3 is unreachable from s1.
 *
 * @param {string} id the step id
 * @returns {{ok: boolean, reason: string}} the gate result
 */
function gateOnlyS1(id) {
  return { ok: id === 's1', reason: 'blocked at ' + id };
}

/**
 * A gate stub where every step passes.
 *
 * @returns {{ok: boolean, reason: string}} the gate result
 */
function gateAllOk() {
  return { ok: true, reason: '' };
}

test('computeStepperStates: steps before the current one are done (gate ok) + always clickable', () => {
  const steps = stepperSteps();
  // Current is the last step; both earlier steps pass their gate → done + clickable, current inert.
  const states = controller.computeStepperStates(steps, 's3', gateAllOk);
  assert.deepEqual(
    states[0],
    { current: false, done: true, clickable: true },
    's1 done + clickable',
  );
  assert.deepEqual(
    states[1],
    { current: false, done: true, clickable: true },
    's2 done + clickable',
  );
  assert.deepEqual(
    states[2],
    { current: true, done: false, clickable: false },
    's3 current, not a target',
  );
});

test('computeStepperStates: an earlier step failing its gate is clickable but not marked done', () => {
  const steps = stepperSteps();
  // s1's gate fails; it is still clickable (going back is always allowed) but not "done".
  const states = controller.computeStepperStates(steps, 's3', gateAllButS1);
  assert.equal(
    states[0].clickable,
    true,
    'going back is always allowed even if the step is incomplete',
  );
  assert.equal(states[0].done, false, 'an incomplete earlier step is not colour-coded as done');
});

test('computeStepperStates: forward steps are clickable only as far as the gates allow', () => {
  const steps = stepperSteps();
  // Current is s1. s1 passes → s2 reachable. s2 fails → s3 is NOT reachable.
  const states = controller.computeStepperStates(steps, 's1', gateOnlyS1);
  assert.deepEqual(states[0], { current: true, done: false, clickable: false }, 's1 is current');
  assert.equal(states[1].clickable, true, 's2 is reachable because s1 passes');
  assert.equal(states[2].clickable, false, 's3 is unreachable because s2 fails');
});

test('computeStepperStates: all forward steps clickable when every intermediate gate passes', () => {
  const steps = stepperSteps();
  const states = controller.computeStepperStates(steps, 's1', gateAllOk);
  assert.equal(states[1].clickable, true, 's2 reachable');
  assert.equal(states[2].clickable, true, 's3 reachable (all gates pass)');
});

// ─── controller: lineage drag-to-connect (Refinement B) ───

test('isValidLineageDrag: only an adjacent left→right drop (env +1) is valid', () => {
  // Valid: dragging a lower-env node onto the node one column to the right.
  assert.equal(controller.isValidLineageDrag(0, 1), true, 'DEV → SIT (adjacent) is valid');
  assert.equal(controller.isValidLineageDrag(2, 3), true, 'QA → UAT (adjacent) is valid');
  // Invalid: onto itself, backwards (rightward node onto a lower-index column), or skipping columns.
  assert.equal(controller.isValidLineageDrag(1, 1), false, 'onto its own column is invalid');
  assert.equal(controller.isValidLineageDrag(2, 1), false, 'right→left (backwards) is invalid');
  assert.equal(controller.isValidLineageDrag(0, 2), false, 'skipping a column is invalid');
  assert.equal(controller.isValidLineageDrag(0, 3), false, 'two+ columns over is invalid');
});

test('setLineageMapping: a valid drop sets lineage[child] = parent with the correct direction', () => {
  // The dragged node is the parent/source (lower env); the drop target is the child (higher env).
  // So dropping DEV onto SIT records "SIT deploys from DEV" → lineage[SIT-child] = DEV-parent.
  controller.state.mode = 'full';
  controller.state.wizardState = { lineage: {} };
  // Keep the autosave path a no-op (no currentId) so the test never arms a timer.
  controller.persistence.currentId = null;
  // A tiny board stub: querySelector('#<child-node-id>') resolves the child node, whose own
  // querySelector('.mpb-lineage-select') resolves the keyboard-fallback <select> to keep in sync.
  const select = { value: '' };
  const childNode = { querySelector: () => select };
  const board = { querySelector: () => childNode };

  controller.setLineageMapping('SIT_BU', 'DEV_BU', board);

  assert.equal(
    controller.state.wizardState.lineage.SIT_BU,
    'DEV_BU',
    'child (higher env) deploys from parent (lower env)',
  );
  assert.equal(select.value, 'DEV_BU', 'the fallback <select> is synced to the dragged mapping');
});

// ─── controller: stepper forward-jump honours the bu-assign soft-confirm gate (Fix 4 must-fix) ───

/**
 * Seed a full-pipeline board on `bu-assign` where the HARD gate passes (every env has ≥1 BU) but a
 * third BU (`QA`) is left in the Unassigned pool, so the SOFT confirmation gate applies. Starts with
 * the confirmation latch cleared.
 *
 * @returns {void}
 */
function seedSoftGateBoard() {
  controller.state.config = {
    credentials: {
      ssjs: { businessUnits: { DEV: {}, SIT: {}, EXTRA: {}, QA: {}, _ParentBU_: {} } },
    },
  };
  controller.state.mode = 'full';
  // Top-level view is the wizard; the blocked jump must leave it here (never advance to 'output').
  controller.state.step = 'wizard';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['A', 'B'],
    // Both envs have a BU → hard gate passes. B has two BUs so the lineage step stays visible after
    // suffixes (a single-BU-per-env pipeline auto-skips lineage). QA stays pooled → the soft gate applies.
    envBUs: { A: ['DEV'], B: ['SIT', 'EXTRA'] },
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
  };
  controller.setWizardStep('bu-assign');
  controller.setUnassignedConfirmed(false);
}

test('isForwardJumpSoftBlocked: a forward jump off bu-assign is soft-blocked until confirmed; back is never blocked', () => {
  seedSoftGateBoard();
  assert.ok(controller.unassignedBUReferences().includes('QA'), 'precondition: QA is unassigned');

  // Forward off bu-assign with an unassigned BU and no confirmation → blocked.
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'suffixes'),
    true,
    'a forward jump must be soft-blocked while BUs are unassigned',
  );
  // Backward is never blocked by this gate.
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'env-order'),
    false,
    'going back is always allowed',
  );

  // Once the user confirms (latch set), the forward jump is no longer blocked.
  controller.setUnassignedConfirmed(true);
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'suffixes'),
    false,
    'a confirmed set no longer blocks the forward jump',
  );

  // With no unassigned BUs at all, the gate never applies (assign QA, clear the latch again).
  controller.setUnassignedConfirmed(false);
  controller.assignBUToEnvironment('QA', 'B');
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'suffixes'),
    false,
    'no unassigned BUs → no soft block',
  );
});

test('jumpToStep: a soft-blocked forward jump is a no-op (shows the banner, never navigates)', () => {
  seedSoftGateBoard();
  // Keep autosave/persist a no-op (no currentId) so nothing arms a timer.
  controller.persistence.currentId = null;
  // wizardStep is private; the blocked path returns BEFORE render()/goToStep, so state.step (the
  // top-level view, set by goToStep) must stay 'wizard'/unchanged and never become 'output'.
  const stepBefore = controller.state.step;

  // A forward jump while unconfirmed must NOT navigate — the confirm banner is shown instead.
  controller.jumpToStep('suffixes');

  assert.equal(
    controller.state.step,
    stepBefore,
    'a blocked jump does not change the top-level view',
  );
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'suffixes'),
    true,
    'the jump was blocked, not committed — the soft gate still holds',
  );

  // Confirm the set → the same forward jump is now permitted by the gate.
  controller.setUnassignedConfirmed(true);
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'suffixes'),
    false,
    'after confirming, the forward jump is no longer soft-blocked',
  );
});

test('confirmUnassignedGoBack: dismissing the banner clears the pending stepper-jump stash (no navigation)', () => {
  seedSoftGateBoard();
  controller.persistence.currentId = null;
  const stepBefore = controller.state.step;

  // A soft-blocked forward jump stashes the target (the banner would normally be shown).
  controller.jumpToStep('suffixes');
  assert.equal(
    controller.getPendingJumpTarget(),
    'suffixes',
    'the blocked forward jump stashes its target',
  );

  // "Go back and assign" — the exact function the banner button invokes — must drop the stash and
  // NOT navigate. The user stays on bu-assign to finish assigning.
  controller.confirmUnassignedGoBack();
  assert.equal(controller.getPendingJumpTarget(), null, 'the pending jump stash is cleared');
  assert.equal(controller.state.step, stepBefore, 'dismissing the banner does not navigate');
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'suffixes'),
    true,
    'the soft gate still holds — nothing was confirmed',
  );
});

test('goBack: a Back navigation also clears a pending stepper-jump stash (defense-in-depth)', () => {
  seedSoftGateBoard();
  controller.persistence.currentId = null;

  // Stash a pending forward jump via the soft gate.
  controller.jumpToStep('suffixes');
  assert.equal(controller.getPendingJumpTarget(), 'suffixes', 'precondition: a jump is stashed');

  // Pressing Back must never resume a stashed forward jump → the stash is dropped.
  controller.goBack();
  assert.equal(
    controller.getPendingJumpTarget(),
    null,
    'Back clears the pending forward-jump stash',
  );
});

test('computeStepperStates: forward steps are not clickable while the bu-assign soft gate holds', () => {
  const steps = [
    { id: 'bu-assign', title: 'Assign BUs' },
    { id: 'suffixes', title: 'Suffixes' },
    { id: 'lineage', title: 'Lineage' },
  ];
  // All hard gates pass, but the soft gate is engaged (4th arg true) → no forward step is clickable.
  const blocked = controller.computeStepperStates(steps, 'bu-assign', gateAllOk, true);
  assert.equal(
    blocked[1].clickable,
    false,
    'suffixes is not clickable while unassigned-BUs unconfirmed',
  );
  assert.equal(blocked[2].clickable, false, 'lineage is not clickable either');

  // Same steps, soft gate cleared → forward steps become clickable again.
  const allowed = controller.computeStepperStates(steps, 'bu-assign', gateAllOk, false);
  assert.equal(allowed[1].clickable, true, 'suffixes clickable once the soft gate clears');
  assert.equal(allowed[2].clickable, true, 'lineage clickable once the soft gate clears');
});

// ─── sticky builder sub-header ──────────────────────────────────────────────

test('isConfigDownloadAvailable: config download only in full mode with a complete pipeline', () => {
  // Full mode + no blockers → the config file may be downloaded.
  assert.equal(controller.isConfigDownloadAvailable('full', []), true);
  // Full mode but an unfinished step → not available.
  assert.equal(
    controller.isConfigDownloadAvailable('full', ['Suffixes: two BUs share a suffix']),
    false,
  );
  // Validations-only mode never emits a config, even when complete.
  assert.equal(controller.isConfigDownloadAvailable('validations', []), false);
});

test('currentConfigDisplayName returns the active save’s stored name', () => {
  const restore = installMemoryLocalStorage();
  try {
    controller.persistence.available = null;
    const id = 'hdr-name';
    localStorage.setItem(
      'mcdevpipe::save::' + id,
      JSON.stringify({
        id: id,
        name: 'My Pipeline',
        version: 1,
        timestamp: Date.now(),
        config: sampleConfig,
        wizardState: sampleWizardState(),
      }),
    );
    controller.setCurrentId(id);
    assert.equal(controller.currentConfigDisplayName(), 'My Pipeline');
  } finally {
    stopControllerTimers();
    controller.setCurrentId(null);
    restore();
    controller.persistence.available = null;
  }
});

test('cloneSave returns the new id; the header New-version flow switches the active session to the v2 clone', () => {
  const restore = installMemoryLocalStorage();
  try {
    controller.persistence.available = null;
    // Seed a mode-bearing save so reopenSave lands cleanly (needs a persisted mode + wizardState).
    const id = 'hdr-clone';
    const wizardState = Object.assign(sampleWizardState(), { mode: 'full' });
    localStorage.setItem(
      'mcdevpipe::save::' + id,
      JSON.stringify({
        id: id,
        name: 'Base config',
        version: 1,
        timestamp: Date.now(),
        config: sampleConfig,
        wizardState: wizardState,
      }),
    );
    controller.setCurrentId(id);

    // The exact header "New version" flow: clone, then reopen the clone.
    const cloneId = controller.cloneSave(id);
    assert.equal(typeof cloneId, 'string', 'cloneSave returns the new clone id');
    assert.notEqual(cloneId, id, 'the clone gets a fresh id');

    controller.reopenSave(cloneId);
    assert.equal(
      controller.persistence.currentId,
      cloneId,
      'the active session moves to the clone',
    );
    assert.equal(controller.currentConfigDisplayName(), 'Base config v2', 'the clone is named v2');

    // cloneSave on a missing source returns null (never throws).
    assert.equal(controller.cloneSave('no-such-id'), null);
  } finally {
    stopControllerTimers();
    controller.setCurrentId(null);
    restore();
    controller.persistence.available = null;
  }
});

test('syncBuilderModeClass toggles the root class from state.step (isBuilderMode)', () => {
  // Attach a fake root with a classList to the document stub so the toggle is observable headlessly.
  const classes = new Set();
  const fakeRoot = {
    classList: {
      toggle(name, on) {
        if (on) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
      },
    },
  };
  const previousRoot = globalThis.document.documentElement;
  globalThis.document.documentElement = fakeRoot;
  const previousStep = controller.state.step;
  try {
    // On intake → not builder mode → class removed.
    controller.state.step = 'intake';
    assert.equal(controller.isBuilderMode(), false);
    controller.syncBuilderModeClass();
    assert.equal(classes.has('mpb-builder-mode'), false, 'intake clears the builder-mode class');

    // Any other step → builder mode → class added.
    controller.state.step = 'wizard';
    assert.equal(controller.isBuilderMode(), true);
    controller.syncBuilderModeClass();
    assert.equal(
      classes.has('mpb-builder-mode'),
      true,
      'leaving intake sets the builder-mode class',
    );
  } finally {
    globalThis.document.documentElement = previousRoot;
    controller.state.step = previousStep;
  }
});

test('syncBuilderHeaderMount hoists the header into .layout-content in builder mode and parks it on intake', () => {
  const header = { parentNode: null };
  const home = new FakeNode();
  const layoutContent = new FakeNode();
  // Authored start: the header lives under its home (#mpb-app).
  home.prepend(header);
  controller.setBuilderHeaderDom(header, layoutContent, home);
  const previousStep = controller.state.step;
  try {
    // Builder mode → hoisted to be the first child of .layout-content.
    controller.state.step = 'wizard';
    controller.syncBuilderHeaderMount();
    assert.equal(layoutContent.firstChild, header, 'header hoisted into .layout-content');
    assert.equal(header.parentNode, layoutContent);

    // Idempotent: a second call must not churn the DOM (still first child, still there once).
    controller.syncBuilderHeaderMount();
    assert.equal(layoutContent.children.length, 1, 'hoist is idempotent');
    assert.equal(layoutContent.firstChild, header);

    // Back on intake → parked back under its authored home.
    controller.state.step = 'intake';
    controller.syncBuilderHeaderMount();
    assert.equal(home.firstChild, header, 'header parked back into #mpb-app on intake');
    assert.equal(header.parentNode, home);
  } finally {
    controller.setBuilderHeaderDom(null, null, null);
    controller.state.step = previousStep;
  }
});

// ─── prod-confirm: per-environment "select all" production column logic ───
//
// The prod-confirm step now renders one column per environment (lineage visual) with a column
// "select all" checkbox. `isEnvironmentAllProduction` is the pure predicate driving that box's
// checked state; `setEnvironmentProduction` is its bulk toggle. Both operate on wizardState.prodBUs,
// the same store the per-BU checkboxes use, so the column box and the individual boxes stay in sync.

/**
 * Seed a two-env full-pipeline wizard state with a multi-BU environment, so the prod-confirm
 * column select-all helpers resolve against real assigned BUs.
 *
 * @returns {void}
 */
function seedProductionConfirmState() {
  controller.state.config = sampleConfig;
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'Prod'],
    envBUs: { DEV: ['DEV'], Prod: ['Randstad_EUN', 'Randstad_EUS'] },
    lineage: {},
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
}

test('isEnvironmentAllProduction reflects the all/some/none states of an env’s BUs', () => {
  seedProductionConfirmState();
  const wizardState = controller.state.wizardState;
  // None of Prod's BUs are production yet → not all-production.
  assert.equal(isEnvironmentAllProduction('Prod'), false, 'none selected → false');
  // Only one of two → still not all-production.
  wizardState.prodBUs = ['Randstad_EUN'];
  assert.equal(isEnvironmentAllProduction('Prod'), false, 'some-but-not-all → false');
  // Both selected → all-production.
  wizardState.prodBUs = ['Randstad_EUN', 'Randstad_EUS'];
  assert.equal(isEnvironmentAllProduction('Prod'), true, 'all selected → true');
  // A single-BU env: selecting its only BU makes it all-production.
  wizardState.prodBUs = ['DEV'];
  assert.equal(
    isEnvironmentAllProduction('DEV'),
    true,
    'single-BU env all-production when its BU is selected',
  );
  // An env with no assigned BUs is never "all production" (there is nothing to confirm).
  wizardState.envBUs.Empty = [];
  assert.equal(isEnvironmentAllProduction('Empty'), false, 'empty env is never all-production');

  /**
   * Shorthand for the predicate against the live wizard state.
   *
   * @param {string} environment env name
   * @returns {boolean} whether every BU in the env is production
   */
  function isEnvironmentAllProduction(environment) {
    return controller.isEnvironmentAllProduction(environment, controller.state.wizardState);
  }
});

test('setEnvironmentProduction bulk-marks then clears every BU in an env (column select-all toggle)', () => {
  seedProductionConfirmState();
  const wizardState = controller.state.wizardState;
  // Select-all when unchecked → every BU in Prod becomes production (order-independent).
  controller.setEnvironmentProduction('Prod', true);
  assert.deepEqual(
    wizardState.prodBUs.toSorted((a, b) => a.localeCompare(b)),
    ['Randstad_EUN', 'Randstad_EUS'],
    'checking select-all marks all env BUs production',
  );
  assert.equal(
    controller.isEnvironmentAllProduction('Prod', wizardState),
    true,
    'the column box now reads all-production',
  );
  // Select-all when checked → every BU in Prod is cleared.
  controller.setEnvironmentProduction('Prod', false);
  assert.deepEqual(wizardState.prodBUs, [], 'unchecking select-all clears all env BUs');
  assert.equal(
    controller.isEnvironmentAllProduction('Prod', wizardState),
    false,
    'the column box now reads not-all-production',
  );
});

test('setEnvironmentProduction leaves other environments’ production selections untouched', () => {
  seedProductionConfirmState();
  const wizardState = controller.state.wizardState;
  // DEV pre-selected as production; toggling Prod must not disturb it.
  wizardState.prodBUs = ['DEV'];
  controller.setEnvironmentProduction('Prod', true);
  assert.ok(wizardState.prodBUs.includes('DEV'), 'DEV stays production while Prod is bulk-marked');
  assert.ok(wizardState.prodBUs.includes('Randstad_EUN'));
  assert.ok(wizardState.prodBUs.includes('Randstad_EUS'));
  // Clearing Prod must not remove DEV.
  controller.setEnvironmentProduction('Prod', false);
  assert.deepEqual(wizardState.prodBUs, ['DEV'], 'clearing Prod leaves DEV production');
});

test('checking the last unchecked BU makes the env all-production (column box auto-checks)', () => {
  seedProductionConfirmState();
  const wizardState = controller.state.wizardState;
  // Toggle the two Prod BUs on individually (the per-BU checkbox path).
  controller.toggleProductionBU('Randstad_EUN', true);
  assert.equal(
    controller.isEnvironmentAllProduction('Prod', wizardState),
    false,
    'one of two on → column box not yet all-checked',
  );
  controller.toggleProductionBU('Randstad_EUS', true);
  assert.equal(
    controller.isEnvironmentAllProduction('Prod', wizardState),
    true,
    'checking the last BU flips the column box to all-checked',
  );
  // Unchecking any one BU un-checks the column box again.
  controller.toggleProductionBU('Randstad_EUN', false);
  assert.equal(
    controller.isEnvironmentAllProduction('Prod', wizardState),
    false,
    'unchecking any BU un-checks the column box',
  );
});

test('seedProductionBUs still auto-selects the LAST environment’s BUs by default', () => {
  seedProductionConfirmState();
  // No prior prodBUs → the last env (Prod) is auto-selected.
  controller.state.wizardState.prodBUs = [];
  controller.seedProductionBUs();
  assert.deepEqual(
    controller.state.wizardState.prodBUs.toSorted((a, b) => a.localeCompare(b)),
    ['Randstad_EUN', 'Randstad_EUS'],
    'the last environment’s BUs are the default production set',
  );
  // The default therefore reports the last env as all-production.
  assert.equal(
    controller.isEnvironmentAllProduction('Prod', controller.state.wizardState),
    true,
    'the default selection makes the last env’s column box all-checked',
  );
});

// ─── controller: WS4 vanilla reverse-inference (inferWizardStateFromVanilla) ───

// A real gold-standard vanilla config with a full hand-built multi-BU pipeline and NO mpb_pipeline
// block. We load it once and strip the tool block so inference works from the raw pipeline shape.
const GOLD_PATH = path.join(__dirname, '..', '..', 'tmp-date-ns', 'mcdevrc.json');

/**
 * The gold vanilla config with its `mpb_pipeline` block removed (deep-cloned per call so a test can
 * mutate its copy freely).
 *
 * @returns {object} the stripped gold config
 */
function strippedGoldConfig() {
  const gold = JSON.parse(fs.readFileSync(GOLD_PATH, 'utf8'));
  delete gold.options.deployment.mpb_pipeline;
  return gold;
}

test('inferWizardStateFromVanilla reconstructs the gold multi-BU pipeline', () => {
  const { state, warnings } = controller.inferWizardStateFromVanilla(strippedGoldConfig());

  // ── BU set: every credential BU except the _ParentBU_ sentinel is present exactly once. ──
  const allBUs = Object.values(state.envBUs)
    .flat()
    .toSorted((a, b) => a.localeCompare(b));
  const expectedBUs = [
    'DEV',
    'DEV_Regional',
    'SIT',
    'SIT_Regional',
    'EUN_QA',
    'EUS_QA',
    'QA_Regional',
    'EUN_UAT',
    'EUS_UAT',
    'UAT_Regional',
    'Randstad_EUN',
    'Randstad_EUS',
    'TempoTeam_EUN',
    'NL_RS',
    'NL_TT',
    'EMEA_RS',
    'EMEA_TT',
  ].toSorted((a, b) => a.localeCompare(b));
  assert.deepEqual(allBUs, expectedBUs, 'all assignable BUs are grouped, _ParentBU_ excluded');
  assert.ok(!allBUs.includes('_ParentBU_'), '_ParentBU_ is never an assignable BU');

  // ── envOrder length + roots→leaves order (DEV first, PROD last). ──
  assert.equal(state.envOrder.length, 5, 'five environments were reconstructed');
  assert.equal(state.envOrder[0], 'DEV', 'the root (source) env is first');
  assert.equal(state.envOrder.at(-1), 'PROD', 'the leaf env is last');
  // DEV before SIT before QA before UAT before PROD.
  const orderIndex = (name) => state.envOrder.indexOf(name);
  assert.ok(orderIndex('DEV') < orderIndex('SIT'), 'DEV precedes SIT');
  assert.ok(orderIndex('SIT') < orderIndex('QA'), 'SIT precedes QA');
  assert.ok(orderIndex('QA') < orderIndex('UAT'), 'QA precedes UAT');
  assert.ok(orderIndex('UAT') < orderIndex('PROD'), 'UAT precedes PROD');

  // ── at least the DEV→SIT edge and a multi-BU hop edge are present in the lineage. ──
  assert.equal(state.lineage.SIT, 'DEV', 'DEV→SIT single-BU lineage edge present');
  assert.equal(
    state.lineage.EUN_QA,
    'SIT',
    'SIT→EUN_QA (multi-BU target hop) lineage edge present',
  );
  assert.equal(
    state.lineage.EUS_QA,
    'SIT',
    'SIT→EUS_QA (multi-BU target hop) lineage edge present',
  );

  // ── separator, sharedDEs, envBranches. ──
  assert.equal(state.separator, '_', 'separator defaults to underscore');
  assert.equal(state.sharedDEs, true, 'the _ParentBU_ marketLists flip sharedDEs on');
  assert.deepEqual(
    state.envBranches,
    { SIT: 'sit', QA: 'qa', UAT: 'uat', PROD: 'prod' },
    'envBranches map each target env display name back to its source branch key',
  );

  // ── suffixes populated from the markets map. ──
  assert.equal(state.suffixes.DEV, '_DEV', 'DEV suffix read from markets.DEV.suffix');
  assert.equal(state.suffixes.SIT, '_SIT', 'SIT suffix read from markets.SIT.suffix');

  // ── warnings: never empty (heuristic reconstruction always advises review). ──
  assert.ok(warnings.length > 0, 'reconstruction always emits at least one review warning');
});

test('inferWizardStateFromVanilla → buildConfig round-trip yields valid single-BU sources', () => {
  const stripped = strippedGoldConfig();
  const { state } = controller.inferWizardStateFromVanilla(stripped);
  let out;
  assert.doesNotThrow(() => {
    out = buildConfig(state, stripped);
  }, 'building a config from the inferred state must not throw');
  // Every generated source marketList maps exactly one BU (mcdev createDeltaPkg requirement).
  for (const [name, entry] of Object.entries(out.marketList)) {
    if (!(name.startsWith('mpb_deployment-') && name.endsWith('-source'))) {
      continue;
    }
    const keys = Object.keys(entry).filter((k) => k !== 'filter' && k !== 'description');
    assert.equal(keys.length, 1, `${name} must map exactly one BU`);
  }
  // Re-inference of the freshly built (now mpb_pipeline-bearing) config restores the same envOrder,
  // proving the round-trip is stable through the persisted block.
  const restored = controller.wizardStateFromConfig(out);
  assert.deepEqual(
    restored.envOrder,
    state.envOrder,
    're-opening the built config restores envOrder',
  );
});

test('selectedRules / prefixBlacklist / retention survive a buildConfig → wizardStateFromConfig round-trip', () => {
  const state = sampleWizardState();
  state.selectedRules = ['keySuffix', 'noGuidKeys'];
  state.prefixBlacklist = { 'R1/SIT': ['TEMP_', 'WIP_'] };
  state.retention = {
    c__retentionPolicy: 'allRecordsAndDataextension',
    DataRetentionPeriodLength: 6,
    c__dataRetentionPeriodUnitOfMeasure: 'Weeks',
    ResetRetentionPeriodOnImport: true,
    // the rule's own BU scope must ride along inside the persisted `retention` object.
    appliesTo: ['R1/SIT'],
  };
  const out = buildConfig(state, sampleConfig);
  const block = out.options.deployment.mpb_pipeline;
  assert.deepEqual(block.selectedRules, ['keySuffix', 'noGuidKeys'], 'selectedRules persisted');
  assert.deepEqual(
    block.prefixBlacklist,
    { 'R1/SIT': ['TEMP_', 'WIP_'] },
    'prefixBlacklist persisted',
  );
  assert.deepEqual(block.retention, state.retention, 'retention persisted');
  const restored = controller.wizardStateFromConfig(out);
  assert.deepEqual(restored.selectedRules, ['keySuffix', 'noGuidKeys'], 'selectedRules restored');
  assert.deepEqual(
    restored.prefixBlacklist,
    { 'R1/SIT': ['TEMP_', 'WIP_'] },
    'prefixBlacklist restored',
  );
  assert.deepEqual(restored.retention, state.retention, 'retention restored');
});

test('inferWizardStateFromVanilla degrades gracefully: credentials but no marketLists', () => {
  const minimal = {
    credentials: {
      MyCred: { businessUnits: { DEV: 111, PROD: 222 } },
    },
  };
  let result;
  assert.doesNotThrow(() => {
    result = controller.inferWizardStateFromVanilla(minimal);
  }, 'a config with no pipeline must never throw');
  const { state, warnings } = result;
  // Usable state: both BUs land somewhere the user can edit.
  const allBUs = Object.values(state.envBUs)
    .flat()
    .toSorted((a, b) => a.localeCompare(b));
  assert.deepEqual(allBUs, ['DEV', 'PROD'], 'both BUs are present in the fallback state');
  assert.ok(state.envOrder.length >= 1, 'at least one environment is produced');
  // With no marketLists every BU is a "root", so they land in the synthesized source env; the run
  // still emits a review warning (never silent) even though it never throws.
  assert.ok(warnings.length > 0, 'a fallback review warning is surfaced');
});

test('wizardStateFromConfig infers a vanilla config (no mpb_pipeline block)', () => {
  // The whole intake path: a vanilla config yields an inferred (non-empty) wizard state, not blank.
  const state = controller.wizardStateFromConfig(strippedGoldConfig());
  assert.ok(state.envOrder.length > 1, 'a vanilla config produces a real multi-env wizard state');
  assert.equal(state.lineage.SIT, 'DEV', 'the inferred lineage reaches the wizard state');
});
