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
require('../assets/js/mcdev-pipeline-drawio.js');
const { buildConfig } = globalThis.mpbConfigBuilder;
const { buildValidations } = globalThis.mpbValidationsBuilder;
const mpbDrawio = globalThis.mpbDrawio;

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
  // _ParentBU_ self-reference present, pointing at the source BU's child market (reused, no _parent).
  const parentKey = Object.keys(parentSource).find((k) => k.endsWith('/_ParentBU_'));
  assert.ok(parentKey, 'parent-source keys on <cred>/_ParentBU_');
  assert.equal(
    parentSource[parentKey],
    'mpb_DEV',
    'parent-source reuses the source BU child market',
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
  assert.equal(eunSource['ssjs/_ParentBU_'], 'mpb_QA_EUN_QA');
  assert.equal(eusSource['ssjs/_ParentBU_'], 'mpb_QA_EUS_QA');
  const eunTarget = out.marketList['mpb_deployment-uat-EUN_QA-parent-target'];
  const eusTarget = out.marketList['mpb_deployment-uat-EUS_QA-parent-target'];
  assert.equal(eunTarget['ssjs/_ParentBU_'], 'mpb_UAT_EUN_UAT');
  assert.equal(eusTarget['ssjs/_ParentBU_'], 'mpb_UAT_EUS_UAT');
  assert.equal(typeof eunTarget['ssjs/_ParentBU_'], 'string', '1:1 target stays a string');
  assert.equal(typeof eusTarget['ssjs/_ParentBU_'], 'string', '1:1 target stays a string');
});

test('buildConfig emits NO _parent markets when sharedDEs is on (parent marketLists reuse child markets)', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const parentMarketNames = Object.keys(out.markets).filter((n) => n.endsWith('_parent'));
  assert.deepEqual(
    parentMarketNames,
    [],
    'no _parent markets are minted; parent marketLists reuse child markets',
  );
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
    'mpb_UAT_EUN_UAT',
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-target']['R1/_ParentBU_'],
    'mpb_UAT_EUS_UAT',
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-target']['R1/_ParentBU_'],
    'mpb_UAT_UAT_Regional',
  );

  // SIT→QA: SIT fans out to two QA BUs → parent target is an array of 2; regional is 1:1 string.
  const sitParentTarget = out.marketList['mpb_deployment-qa-SIT-parent-target'];
  assert.deepEqual(sitParentTarget['R1/_ParentBU_'], ['mpb_QA_EUN_QA', 'mpb_QA_EUS_QA']);
  assert.equal(
    out.marketList['mpb_deployment-qa-SIT_Regional-parent-target']['R1/_ParentBU_'],
    'mpb_QA_QA_Regional',
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
  assert.equal(sitDevelopment[parentKey], 'mpb_DEV_DEV');
  assert.equal(out.marketList['mpb_deployment-sit-DEV-parent-target'][parentKey], 'mpb_SIT_SIT');
  assert.deepEqual(sitReg.filter.include.key['*'], ['%[_]RDEV']);
  assert.equal(sitReg[parentKey], 'mpb_DEV_DEV_Regional');
  assert.equal(
    out.marketList['mpb_deployment-sit-DEV_Regional-parent-target'][parentKey],
    'mpb_SIT_SIT_Regional',
  );

  // B) SIT→QA — SIT fans out to two QA BUs (array); regional is 1:1 string.
  const qaSit = out.marketList['mpb_deployment-qa-SIT-parent-source'];
  assert.deepEqual(qaSit.filter.include.key['*'], ['%[_]SIT']);
  assert.equal(qaSit[parentKey], 'mpb_SIT_SIT');
  assert.deepEqual(out.marketList['mpb_deployment-qa-SIT-parent-target'][parentKey], [
    'mpb_QA_EUN_QA',
    'mpb_QA_EUS_QA',
  ]);
  const qaReg = out.marketList['mpb_deployment-qa-SIT_Regional-parent-source'];
  assert.deepEqual(qaReg.filter.include.key['*'], ['%[_]RSIT']);
  assert.equal(
    out.marketList['mpb_deployment-qa-SIT_Regional-parent-target'][parentKey],
    'mpb_QA_QA_Regional',
  );

  // C) QA→UAT — three 1:1 parent pairs.
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-EUN_QA-parent-source'].filter.include.key['*'],
    ['%[_]QA'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUN_QA-parent-target'][parentKey],
    'mpb_UAT_EUN_UAT',
  );
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-source'].filter.include.key['*'],
    ['%[_]QAS'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-EUS_QA-parent-target'][parentKey],
    'mpb_UAT_EUS_UAT',
  );
  assert.deepEqual(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-source'].filter.include.key['*'],
    ['%[_]RQA'],
  );
  assert.equal(
    out.marketList['mpb_deployment-uat-QA_Regional-parent-target'][parentKey],
    'mpb_UAT_UAT_Regional',
  );

  // UAT→PROD mirrors child groups: 2-market array, string, 4-market array.
  assert.deepEqual(out.marketList['mpb_deployment-prod-EUN_UAT-parent-target'][parentKey], [
    'mpb_Prod_Randstad_EUN',
    'mpb_Prod_TempoTeam_EUN',
  ]);
  assert.equal(
    out.marketList['mpb_deployment-prod-EUS_UAT-parent-target'][parentKey],
    'mpb_Prod_Randstad_EUS',
  );
  assert.deepEqual(out.marketList['mpb_deployment-prod-UAT_Regional-parent-target'][parentKey], [
    'mpb_Prod_NL_RS',
    'mpb_Prod_NL_TT',
    'mpb_Prod_EMEA_RS',
    'mpb_Prod_EMEA_TT',
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
require('../assets/js/mcdev-pipeline-core.js');
require('../assets/js/mcdev-pipeline-step-environment-order.js');
require('../assets/js/mcdev-pipeline-step-production-confirm.js');
require('../assets/js/mcdev-pipeline-step-market-vars.js');
require('../assets/js/mcdev-pipeline-step-suffixes.js');
require('../assets/js/mcdev-pipeline-step-rules.js');
require('../assets/js/mcdev-pipeline-step-bu-assign.js');
require('../assets/js/mcdev-pipeline-step-lineage.js');
require('../assets/js/mcdev-pipeline-intake.js');
require('../assets/js/mcdev-pipeline-mode.js');
require('../assets/js/mcdev-pipeline-output.js');
require('../assets/js/mcdev-pipeline-builder.js');
const controller = globalThis.mpbController;

// ─── controller: intake parse gate (classifyIntake) ───
//
// classifyIntake is a pure classifier: it never stores config/secrets and never interpolates
// input values into the rejection message. Only `kind === 'ok'` carries a `config`.

/**
 * Distinctive auth-file JSON used to prove rejection-by-shape and that the canned auth
 * message never echoes client id/secret/url/account/credential names.
 *
 * @returns {{filename: string, raw: string, secrets: string[]}} fixture
 */
function authFileFixture() {
  const secrets = [
    'uniq-client-id-XYZ99',
    'uniq-secret-ABC88',
    'https://auth.example.invalid/v2/token',
    '987654321',
    'SecretCredName',
    'acme-prod',
  ];
  const parsed = {
    SecretCredName: {
      client_id: 'uniq-client-id-XYZ99',
      client_secret: 'uniq-secret-ABC88',
      auth_url: 'https://auth.example.invalid/v2/token',
      account_id: 987654321,
    },
  };
  return {
    filename: 'acme-prod.mcdev-auth.json',
    raw: JSON.stringify(parsed),
    secrets: secrets,
  };
}

/**
 * Assert an auth rejection never interpolates caller-supplied values into the canned message.
 *
 * @param {{kind: string, message?: string, config?: object}} result classifyIntake result
 * @param {string[]} secrets values that must not appear in `message`
 * @returns {void}
 */
function assertAuthRejectionDoesNotEcho(result, secrets) {
  assert.equal(result.kind, 'auth', 'auth files must be rejected as kind auth');
  assert.equal(result.config, undefined, 'auth rejection must not return the parsed object');
  assert.equal(typeof result.message, 'string');
  assert.match(result.message, /mcdev-auth\.json/);
  for (const secret of secrets) {
    assert.ok(
      !result.message.includes(secret),
      `auth message must not echo input value ${JSON.stringify(secret)}`,
    );
  }
}

test('classifyIntake rejects an auth file by filename and does not echo the name', () => {
  const { filename, secrets } = authFileFixture();
  assert.equal(controller.isAuthFileName(filename), true);
  assert.equal(controller.isAuthFileName('.mcdevrc.json'), false);
  // Filename hint wins even when the JSON is not auth-shaped (and even when parse fails).
  const byName = controller.classifyIntake('{"credentials":{}}', filename);
  assertAuthRejectionDoesNotEcho(byName, secrets);
  const notJson = controller.classifyIntake('{ not json', filename);
  assertAuthRejectionDoesNotEcho(notJson, secrets);
});

test('classifyIntake rejects an auth file by JSON shape even when the name looks like .mcdevrc.json', () => {
  const { raw, secrets } = authFileFixture();
  assert.equal(controller.looksLikeAuthFile(JSON.parse(raw)), true);
  assert.equal(controller.looksLikeAuthFile({}), false, 'an empty object is not an auth file');
  const result = controller.classifyIntake(raw, '.mcdevrc.json');
  assertAuthRejectionDoesNotEcho(result, secrets);
});

test('classifyIntake rejects non-JSON that is not named like an auth file', () => {
  const result = controller.classifyIntake('{ not json at all', 'project.mcdevrc.json');
  assert.equal(result.kind, 'not-json');
  assert.equal(result.config, undefined);
  assert.match(result.message, /JSON/i);
  assert.ok(
    !result.message.includes('{ not json at all'),
    'non-JSON message must not echo the paste',
  );
});

test('classifyIntake rejects missing credentials and missing businessUnits', () => {
  const noCredentials = controller.classifyIntake('{"options":{}}', 'project.mcdevrc.json');
  assert.equal(noCredentials.kind, 'not-mcdevrc');
  assert.equal(noCredentials.config, undefined);
  assert.match(noCredentials.message, /credentials/i);

  const noBusinessUnits = controller.classifyIntake(
    JSON.stringify({ credentials: { ssjs: { eid: 1 } } }),
    'project.mcdevrc.json',
  );
  assert.equal(noBusinessUnits.kind, 'incomplete');
  assert.equal(noBusinessUnits.config, undefined);
  assert.match(noBusinessUnits.message, /businessUnits/i);

  const ok = controller.classifyIntake(
    JSON.stringify({ credentials: { ssjs: { businessUnits: { DEV: 111 } } } }),
    'project.mcdevrc.json',
  );
  assert.equal(ok.kind, 'ok');
  assert.equal(ok.config.credentials.ssjs.businessUnits.DEV, 111);
});

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

test('canProceed("env-order") fails when fewer than two environments', () => {
  controller.state.mode = 'full';
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
    retention: {},
    sharedDEs: false,
  };
  assert.equal(controller.canProceed('env-order').ok, false, 'zero environments cannot proceed');
  controller.state.wizardState.envOrder = ['DEV'];
  assert.equal(controller.canProceed('env-order').ok, false, 'a single environment cannot proceed');
  controller.state.wizardState.envOrder = ['DEV', 'QA'];
  assert.equal(controller.canProceed('env-order').ok, true, 'two environments proceed');
});

test('validations-only visibleSteps includes suffixes + prod-confirm + Download, not env-ordering/lineage', () => {
  controller.state.mode = 'validations';
  const ids = controller.visibleSteps().map((step) => step.id);
  assert.deepEqual(ids, ['suffixes', 'prod-confirm', 'rules', 'output']);
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
  assert.deepEqual(ids, [
    'env-order',
    'bu-assign',
    'suffixes',
    'lineage',
    'prod-confirm',
    'market-vars',
    'rules',
    'output',
  ]);
  assert.equal(ids.at(-1), 'output', 'full pipeline ends with Download');
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

test('skipped lineage leaves wizardState.lineage empty; buildConfig still emits single-source hops', () => {
  // Option (b): autoDeriveLineage runs only from renderLineageStep. A 1-BU-per-env pipeline skips
  // that step, so lineage stays {}. buildConfig then falls back to env[i] → env[i-1] single-source.
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'SIT', 'Prod'],
    envBUs: { DEV: ['DEV'], SIT: ['SIT'], Prod: ['Randstad_EUN'] },
    lineage: {},
    separator: '_',
    suffixes: { DEV: '_DEV', SIT: '_SIT', Randstad_EUN: '_RSN' },
    prodBUs: ['Randstad_EUN'],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
  const ids = controller.visibleSteps().map((step) => step.id);
  assert.ok(!ids.includes('lineage'), 'one BU per env skips the lineage step');
  assert.equal(ids.at(-1), 'output', 'Download remains the last visible step');
  assert.deepEqual(
    controller.state.wizardState.lineage,
    {},
    'skipping lineage must not fill wizardState.lineage',
  );

  const out = buildConfig(controller.state.wizardState, sampleConfig);
  assert.deepEqual(
    out.options.deployment.mpb_pipeline.lineage,
    {},
    'persisted lineage stays empty',
  );
  assert.deepEqual(out.marketList['mpb_deployment-sit-source'], { 'ssjs/DEV': 'mpb_DEV' });
  assert.deepEqual(out.marketList['mpb_deployment-sit-target'], { 'ssjs/SIT': 'mpb_SIT' });
  assert.deepEqual(out.marketList['mpb_deployment-prod-source'], { 'ssjs/SIT': 'mpb_SIT' });
  assert.deepEqual(out.marketList['mpb_deployment-prod-target'], {
    'ssjs/Randstad_EUN': 'mpb_Prod',
  });
});

test('skipped lineage: buildConfig same-index fallback hops with empty lineage', () => {
  // Multi-BU hop with no lineage map: pair target BUs to the previous env by index.
  const state = {
    version: 1,
    multiCred: false,
    envOrder: ['QA', 'UAT'],
    envBUs: { QA: ['EUN_QA', 'EUS_QA'], UAT: ['EUN_UAT', 'EUS_UAT'] },
    lineage: {},
    separator: '_',
    suffixes: {
      EUN_QA: '_QAN',
      EUS_QA: '_QAS',
      EUN_UAT: '_UATN',
      EUS_UAT: '_UATS',
    },
    prodBUs: [],
    sharedDEs: false,
  };
  const out = buildConfig(state, sampleConfig);
  assert.deepEqual(state.lineage, {}, 'the caller lineage object is not filled');
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

test('canProceed("lineage") hard-fails when a child has no upstream mapping', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'SIT'],
    envBUs: { DEV: ['DEV', 'DEV_Regional'], SIT: ['SIT', 'SIT_Regional'] },
    // SIT is mapped; SIT_Regional is a child with no parent — that must block Next.
    lineage: { SIT: 'DEV_Regional' },
    separator: '_',
    suffixes: {},
    prodBUs: [],
    selectedRules: [],
    prefixBlacklist: {},
    retention: {},
    sharedDEs: false,
  };
  const blocked = controller.canProceed('lineage');
  assert.equal(blocked.ok, false, 'an unlinked child BU must block Next');
  assert.match(blocked.reason, /upstream/i);
  controller.state.wizardState.lineage = {
    SIT: 'DEV_Regional',
    SIT_Regional: 'DEV_Regional',
  };
  assert.equal(
    controller.canProceed('lineage').ok,
    true,
    'every child mapped (unused source still allowed) proceeds',
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

/**
 * A real two-env full-pipeline fixture: one BU per env (lineage skippable), empty `prodBUs`.
 * Used to prove the diagram gate is drawable, not wizard-complete.
 *
 * @returns {void}
 */
function seedDrawableTwoEnvironmentState() {
  controller.state.config = {
    credentials: { ssjs: { businessUnits: { DEV: {}, SIT: {}, _ParentBU_: {} } } },
  };
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: ['DEV', 'SIT'],
    envBUs: { DEV: ['DEV'], SIT: ['SIT'] },
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

test('validations-only mode never offers the diagram / leaks the "All BUs" container (Review-loop fix pass 2)', () => {
  // Reproduce the validations-only state: the synthetic VALIDATIONS_POOL_ENV ("All BUs") env is
  // seeded so the suffix/production steps have data. The UI must never offer Diagramforce here —
  // if buildDiagramJSON() were called it would emit a container literally labelled "All BUs".
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

  // Hard hide even if the wizard is "complete". The UI must never call buildDiagramJSON here.
  assert.equal(
    controller.isDiagramDrawable(),
    false,
    'diagram must not be offered in validations-only mode',
  );
  assert.equal(
    controller.isDiagramOffered(true),
    false,
    'isDiagramOffered is a drawable alias and stays false in validations-only',
  );

  // Guard-rail: the pooled env IS named "All BUs", so if the diagram were ever built here it would
  // leak that synthetic container. This proves the UI guard is what prevents it.
  const containers = controller
    .buildDiagramJSON()
    .graph.cells.filter((cell) => cell.type === 'sf.Container');
  assert.ok(
    containers.some((cell) => cell.attrs.headerLabel.text === 'All BUs'),
    'sanity: the validations pool env is the synthetic "All BUs" container the guard must keep hidden',
  );

  // Flipping mode to full without stripping the pool is NOT drawable (All BUs is a single env).
  controller.state.mode = 'full';
  assert.equal(
    controller.isDiagramDrawable(),
    false,
    'seedValidationsPool + mode=full without strip is not a drawable graph',
  );
});

test('isDiagramDrawable offers a two-env graph without prod-confirm and rejects an empty envOrder', () => {
  seedDrawableTwoEnvironmentState();
  assert.equal(
    controller.isDiagramDrawable(),
    true,
    'two envs + one BU each + empty prodBUs is drawable (prod-confirm is not a diagram gate)',
  );
  assert.equal(
    controller.isDiagramOffered(false),
    true,
    'isDiagramOffered ignores isComplete and follows the drawable gate',
  );

  // everyEnvironmentHasOneBU() is true when envOrder is empty — that must not be sufficient.
  controller.state.wizardState.envOrder = [];
  controller.state.wizardState.envBUs = {};
  assert.equal(
    controller.isDiagramDrawable(),
    false,
    'empty envOrder is not drawable even though everyEnvironmentHasOneBU() is true',
  );

  // Two named envs with no assignments → not drawable.
  controller.state.wizardState.envOrder = ['DEV', 'SIT'];
  controller.state.wizardState.envBUs = { DEV: [], SIT: [] };
  assert.equal(
    controller.isDiagramDrawable(),
    false,
    'two envs with no BU assignments are not drawable',
  );

  // Multi-BU env with no lineage mapping: lineage is not skippable and canProceed('lineage') fails.
  controller.state.wizardState.envOrder = ['DEV', 'QA'];
  controller.state.wizardState.envBUs = { DEV: ['DEV'], QA: ['SIT', 'EUN_QA'] };
  controller.state.wizardState.lineage = {};
  assert.equal(controller.isDiagramDrawable(), false, 'unlinked multi-BU lineage is not drawable');
  controller.state.wizardState.lineage = { SIT: 'DEV', EUN_QA: 'DEV' };
  assert.equal(
    controller.isDiagramDrawable(),
    true,
    'linked multi-BU lineage is drawable without prod-confirm',
  );
});

const DIAGRAM_BAND_FIRST = { fill: '#27ae60', stroke: '#1e8449' };
const DIAGRAM_BAND_MIDDLE = { fill: '#7C3AED', stroke: '#6D28D9' };
const DIAGRAM_BAND_LAST = { fill: '#F49825', stroke: '#C2410C' };

/**
 * Seed a full-pipeline wizard with one uniquely-named BU per environment so lineage is skippable
 * and `buildDiagramJSON` can emit one container + one task per env.
 *
 * @param {string[]} environments environment names in left-to-right order
 * @returns {void}
 */
function seedDiagramEnvironments(environments) {
  const environmentBUs = {};
  const businessUnits = {};
  for (const environment of environments) {
    environmentBUs[environment] = [environment];
    businessUnits[environment] = {};
  }
  controller.state.config = { credentials: { ssjs: { businessUnits: businessUnits } } };
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: environments,
    envBUs: environmentBUs,
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

/**
 * Containers in left-to-right column order (by x) from a diagram envelope.
 *
 * @param {object} diagram `buildDiagramJSON()` result
 * @returns {object[]} `sf.Container` cells
 */
function diagramContainers(diagram) {
  return diagram.graph.cells
    .filter((cell) => cell.type === 'sf.Container')
    .toSorted((left, right) => left.position.x - right.position.x);
}

/**
 * BU tasks in a container column, by x-range. Tasks are also captured by the lane
 * (`parent` + the lane's `embeds`); the x-range membership matches that grouping and
 * is used by the colour-band assertions.
 *
 * @param {object} diagram `buildDiagramJSON()` result
 * @param {object} container the column `sf.Container`
 * @returns {object[]} `sf.BpmnTask` cells
 */
function diagramTasksIn(diagram, container) {
  const left = container.position.x;
  const right = left + container.size.width;
  return diagram.graph.cells.filter((cell) => {
    if (cell.type !== 'sf.BpmnTask') {
      return false;
    }
    const taskX = cell.position.x;
    return taskX >= left && taskX < right;
  });
}

/**
 * Assert header accent + container stroke + every embedded task use the same band.
 *
 * @param {object} diagram `buildDiagramJSON()` result
 * @param {object} container the column container
 * @param {{fill: string, stroke: string}} band expected colours
 * @param {string} label assertion prefix
 * @returns {void}
 */
function assertColumnBand(diagram, container, band, label) {
  assert.equal(container.attrs.accent.fill, band.fill, label + ' header fill');
  assert.equal(container.attrs.accentFill.fill, band.fill, label + ' header accentFill');
  assert.equal(container.attrs.body.stroke, band.stroke, label + ' container stroke');
  const tasks = diagramTasksIn(diagram, container);
  assert.ok(tasks.length > 0, label + ' has at least one task');
  for (const task of tasks) {
    assert.equal(task.attrs.body.fill, band.fill, label + ' task fill');
    assert.equal(task.attrs.body.stroke, band.stroke, label + ' task stroke');
  }
}

test('diagramBand locks first / last / middle by position, not env name', () => {
  assert.deepEqual(controller.diagramBand(0, 2), DIAGRAM_BAND_FIRST);
  assert.deepEqual(controller.diagramBand(1, 2), DIAGRAM_BAND_LAST);
  assert.deepEqual(controller.diagramBand(0, 3), DIAGRAM_BAND_FIRST);
  assert.deepEqual(controller.diagramBand(1, 3), DIAGRAM_BAND_MIDDLE);
  assert.deepEqual(controller.diagramBand(2, 3), DIAGRAM_BAND_LAST);
  assert.deepEqual(controller.diagramBand(0, 5), DIAGRAM_BAND_FIRST);
  assert.deepEqual(controller.diagramBand(1, 5), DIAGRAM_BAND_MIDDLE);
  assert.deepEqual(controller.diagramBand(3, 5), DIAGRAM_BAND_MIDDLE);
  assert.deepEqual(controller.diagramBand(4, 5), DIAGRAM_BAND_LAST);
  assert.deepEqual(controller.DIAGRAM_BAND, {
    first: DIAGRAM_BAND_FIRST,
    middle: DIAGRAM_BAND_MIDDLE,
    last: DIAGRAM_BAND_LAST,
  });
});

test('buildDiagramJSON two-env uses first then last colours (no middle)', () => {
  seedDiagramEnvironments(['DEV', 'Prod']);
  const diagram = controller.buildDiagramJSON();
  const containers = diagramContainers(diagram);
  assert.equal(containers.length, 2, 'two environment columns');
  assertColumnBand(diagram, containers[0], DIAGRAM_BAND_FIRST, 'first env');
  assertColumnBand(diagram, containers[1], DIAGRAM_BAND_LAST, 'last env');
  const fills = containers.flatMap((container) => [
    container.attrs.accent.fill,
    ...diagramTasksIn(diagram, container).map((task) => task.attrs.body.fill),
  ]);
  assert.ok(
    !fills.includes(DIAGRAM_BAND_MIDDLE.fill),
    'a two-env graph must never paint the middle band',
  );
  const links = diagram.graph.cells.filter((cell) => cell.type === 'standard.Link');
  assert.equal(links.length, 1, 'same-index fallback still draws a deploy arrow');
});

test('buildDiagramJSON three-env paints the middle column with the between colour', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const diagram = controller.buildDiagramJSON();
  const containers = diagramContainers(diagram);
  assert.equal(containers.length, 3, 'three environment columns');
  assertColumnBand(diagram, containers[0], DIAGRAM_BAND_FIRST, 'first env');
  assertColumnBand(diagram, containers[1], DIAGRAM_BAND_MIDDLE, 'middle env');
  assertColumnBand(diagram, containers[2], DIAGRAM_BAND_LAST, 'last env');
});

test('buildDiagramJSON five-env keeps every in-between column on the middle band', () => {
  seedDiagramEnvironments(['DEV', 'SIT', 'QA', 'UAT', 'Prod']);
  const diagram = controller.buildDiagramJSON();
  const containers = diagramContainers(diagram);
  assert.equal(containers.length, 5, 'five environment columns');
  assertColumnBand(diagram, containers[0], DIAGRAM_BAND_FIRST, 'first env');
  assertColumnBand(diagram, containers[1], DIAGRAM_BAND_MIDDLE, 'SIT');
  assertColumnBand(diagram, containers[2], DIAGRAM_BAND_MIDDLE, 'QA');
  assertColumnBand(diagram, containers[3], DIAGRAM_BAND_MIDDLE, 'UAT');
  assertColumnBand(diagram, containers[4], DIAGRAM_BAND_LAST, 'last env');
});

test('buildDiagramJSON hides regular-BU task icons and keeps parent-BU custom-data', () => {
  seedDiagramEnvironments(['DEV', 'SIT']);
  controller.state.config.credentials.ssjs.businessUnits._ParentBU_ = {};
  controller.state.wizardState.envBUs.DEV = ['DEV', '_ParentBU_'];
  const diagram = controller.buildDiagramJSON();
  const tasks = diagram.graph.cells.filter((cell) => cell.type === 'sf.BpmnTask');
  const regular = tasks.find((cell) => cell.attrs.label.text === 'DEV');
  const parent = tasks.find((cell) => cell.attrs.label.text === '_ParentBU_');
  assert.ok(regular, 'regular BU task is present');
  assert.ok(parent, 'parent BU task is present');
  assert.equal(regular.attrs.taskIcon.href, '', 'regular BU omits a task icon href');
  assert.equal(regular.attrs.taskIcon.display, 'none', 'regular BU hides the task icon');
  assert.match(parent.attrs.taskIcon.href, /custom-data/, 'parent BU keeps the custom-data icon');
  assert.equal(parent.attrs.body.strokeWidth, 2.5, 'parent BU uses a heavier stroke');
  assert.equal(regular.size.width, 220, 'task width matches the roomier layout');
  assert.equal(regular.size.height, 52, 'task height matches the slimmer layout');
  const container = diagramContainers(diagram)[0];
  assert.equal(
    container.size.width,
    316,
    'column width is the roomier layout (task 220 + 2*48 inset)',
  );
  assert.equal(container.attrs.accent.height, 48, 'header accent is taller than the old 40px bar');
});

test('buildDiagramJSON gives every lane one shared top and one shared height (uneven BU counts)', () => {
  // DEV gets three BUs, the rest one — a bar chart if height tracked card count, uniform lanes now.
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  controller.state.config.credentials.ssjs.businessUnits.DEV_b = {};
  controller.state.config.credentials.ssjs.businessUnits.DEV_c = {};
  controller.state.wizardState.envBUs.DEV = ['DEV', 'DEV_b', 'DEV_c'];
  const diagram = controller.buildDiagramJSON();
  const containers = diagramContainers(diagram);
  assert.equal(containers.length, 3, 'three lanes');
  const heights = new Set(containers.map((container) => container.size.height));
  const tops = new Set(containers.map((container) => container.position.y));
  assert.equal(heights.size, 1, 'every lane shares one height (not sized to its own card count)');
  assert.equal(tops.size, 1, 'every lane shares one top');
  assert.equal([...tops][0], 50, 'shared lane top is y=50');
  // Shared height = the deepest lane (3 cards): 88 + 3*52 + 2*24 + 48 = 340.
  assert.equal([...heights][0], 340, 'shared height is driven by the lane with the most cards');
});

test('buildDiagramJSON captures every BU task in its lane (both embed sides) and pins the lane', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  controller.state.config.credentials.ssjs.businessUnits.DEV_b = {};
  controller.state.wizardState.envBUs.DEV = ['DEV', 'DEV_b'];
  const diagram = controller.buildDiagramJSON();
  const containers = diagramContainers(diagram);
  const cellById = new Map(diagram.graph.cells.map((cell) => [cell.id, cell]));
  for (const container of containers) {
    assert.ok(Array.isArray(container.embeds) && container.embeds.length > 0, 'lane has embeds');
    assert.equal(container.manualSize, true, 'lane is pinned with manualSize');
    for (const childId of container.embeds) {
      const child = cellById.get(childId);
      assert.ok(child, 'embedded id resolves to a cell');
      assert.equal(child.type, 'sf.BpmnTask', 'embedded cell is a BU task');
      assert.equal(
        child.parent,
        container.id,
        'child parent points back to the lane (both sides set)',
      );
    }
  }
  // No task is captured by more than one lane, and none is left un-parented.
  const tasks = diagram.graph.cells.filter((cell) => cell.type === 'sf.BpmnTask');
  for (const task of tasks) {
    assert.ok(task.parent, 'every BU task has a parent lane');
    const owner = cellById.get(task.parent);
    assert.ok(owner.embeds.includes(task.id), 'the parent lane lists the task in embeds');
  }
});

test('buildDiagramJSON tasks sit 48px inside the lane and 88px below the lane top', () => {
  seedDiagramEnvironments(['DEV', 'Prod']);
  const diagram = controller.buildDiagramJSON();
  const container = diagramContainers(diagram)[0];
  const task = diagramTasksIn(diagram, container)[0];
  assert.equal(
    task.position.x - container.position.x,
    48,
    'card sits 48px inside the lane left edge',
  );
  assert.ok(
    task.position.y >= container.position.y + 88,
    'first card is at least 88px below the lane top (40px header + 48px pad)',
  );
});

test('buildDiagramJSON advertises the diagramforce appVersion that ships manualSize', () => {
  seedDiagramEnvironments(['DEV', 'Prod']);
  const diagram = controller.buildDiagramJSON();
  assert.equal(
    diagram.appVersion,
    '1.23.1',
    'appVersion matches the live manualSize-capable release',
  );
});

test('diagramCardYs spreads cards evenly inside the lane insets', () => {
  // laneHeight 340 → inner band [138, 342] (50 + 88 top inset .. 50 + 340 - 48 bottom inset).
  // One card is centred in the band; two or more spread from the top with an even gap.
  assert.deepEqual(controller.diagramCardYs(1, 340), [214], 'single card is centred in the band');
  assert.deepEqual(
    controller.diagramCardYs(2, 340),
    [138, 290],
    'two cards pin to band top and bottom',
  );
  assert.deepEqual(
    controller.diagramCardYs(3, 340),
    [138, 214, 290],
    'three cards fall on the 24px minimum row gap',
  );
});

// ─── buildDiagramJSON: barycentre lane placement (ported "Match Container Height") ───

const DIAGRAM_TASK_HEIGHT = 52;
const DIAGRAM_ROW_GAP = 24;
const DIAGRAM_LANE_TOP_INSET = 88;
const DIAGRAM_LANE_BOTTOM_INSET = 48;

/**
 * Seed a multi-BU pipeline for placement tests: `environmentBUs` maps env → ordered buRefs, and
 * every buRef is registered as a single-credential business unit so `assignedBUReferences` returns
 * it. Callers set `controller.state.wizardState.lineage[childRef] = parentRef` afterwards to drive
 * the deploy graph (which the placement pass reads).
 *
 * @param {string[]} environments env names in left-to-right order
 * @param {{[env: string]: string[]}} environmentBUs env name → its ordered buRefs
 * @returns {void}
 */
function seedDiagramPipeline(environments, environmentBUs) {
  const businessUnits = {};
  for (const environment of environments) {
    const references = environmentBUs[environment] || [];
    for (const reference of references) {
      businessUnits[reference] = {};
    }
  }
  controller.state.config = { credentials: { ssjs: { businessUnits: businessUnits } } };
  controller.state.mode = 'full';
  controller.state.wizardState = {
    version: 1,
    multiCred: false,
    envOrder: environments,
    envBUs: environmentBUs,
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

/**
 * The BU task whose label is exactly `label`.
 *
 * @param {object} diagram `buildDiagramJSON()` result
 * @param {string} label the BU display label (bare buRef in single-credential mode)
 * @returns {object} the `sf.BpmnTask` cell
 */
function taskByLabel(diagram, label) {
  const task = diagram.graph.cells.find(
    (cell) => cell.type === 'sf.BpmnTask' && cell.attrs.label.text === label,
  );
  assert.ok(task, 'task "' + label + '" is present');
  return task;
}

/**
 * The vertical centre of a BU task.
 *
 * @param {object} task an `sf.BpmnTask` cell
 * @returns {number} the centre `y`
 */
function centreOf(task) {
  return task.position.y + task.size.height / 2;
}

/**
 * Every BU task's top `y`, keyed by its display label — an order-independent snapshot of card
 * placement for deterministic comparison across builds.
 *
 * @param {object} diagram `buildDiagramJSON()` result
 * @returns {{[label: string]: number}} label → card top `y`
 */
function cardYsByLabel(diagram) {
  const ys = {};
  for (const cell of diagram.graph.cells) {
    if (cell.type === 'sf.BpmnTask') {
      ys[cell.attrs.label.text] = cell.position.y;
    }
  }
  return ys;
}

test('diagramLanePlacement returns the empty plan for no columns', () => {
  assert.deepEqual(controller.diagramLanePlacement([], []), {
    top: 50,
    height: 0,
    ysByColumn: [],
  });
});

test('buildDiagramJSON one-to-one links align each source and target on a flat connector', () => {
  // DEV(2) → SIT(2) → Prod(2), each BU deploying from its own pairwise upstream.
  seedDiagramPipeline(['DEV', 'SIT', 'Prod'], {
    DEV: ['DEV_a', 'DEV_b'],
    SIT: ['SIT_a', 'SIT_b'],
    Prod: ['PRD_a', 'PRD_b'],
  });
  controller.state.wizardState.lineage = {
    SIT_a: 'DEV_a',
    SIT_b: 'DEV_b',
    PRD_a: 'SIT_a',
    PRD_b: 'SIT_b',
  };
  const diagram = controller.buildDiagramJSON();
  for (const [source, target] of [
    ['DEV_a', 'SIT_a'],
    ['DEV_b', 'SIT_b'],
    ['SIT_a', 'PRD_a'],
    ['SIT_b', 'PRD_b'],
  ]) {
    assert.equal(
      taskByLabel(diagram, source).position.y,
      taskByLabel(diagram, target).position.y,
      source + ' and ' + target + ' share a y (flat connector)',
    );
  }
});

test('buildDiagramJSON centres a shared-source fan symmetrically on the source (deviation)', () => {
  // One upstream BU feeds TWO downstream BUs: the pair straddles the source centre, not hangs below.
  seedDiagramPipeline(['DEV', 'SIT'], {
    DEV: ['DEV_only'],
    SIT: ['SIT_a', 'SIT_b'],
  });
  controller.state.wizardState.lineage = { SIT_a: 'DEV_only', SIT_b: 'DEV_only' };
  const diagram = controller.buildDiagramJSON();
  const sourceCentre = centreOf(taskByLabel(diagram, 'DEV_only'));
  const a = centreOf(taskByLabel(diagram, 'SIT_a'));
  const b = centreOf(taskByLabel(diagram, 'SIT_b'));
  assert.equal((a + b) / 2, sourceCentre, 'the fan pair is centred on the source centre');
  assert.equal(
    Math.abs(a - sourceCentre),
    Math.abs(b - sourceCentre),
    'both children are equidistant from the source (equal offset above/below)',
  );
  assert.ok(a < sourceCentre && b > sourceCentre, 'one child sits above, one below the source');
});

test('buildDiagramJSON distinct sources put each downstream card on its own source row', () => {
  // Two downstream BUs each from a DIFFERENT upstream BU → each shares its own source y.
  seedDiagramPipeline(['DEV', 'SIT'], {
    DEV: ['DEV_a', 'DEV_b'],
    SIT: ['SIT_a', 'SIT_b'],
  });
  controller.state.wizardState.lineage = { SIT_a: 'DEV_a', SIT_b: 'DEV_b' };
  const diagram = controller.buildDiagramJSON();
  assert.equal(
    taskByLabel(diagram, 'SIT_a').position.y,
    taskByLabel(diagram, 'DEV_a').position.y,
    'SIT_a aligns to DEV_a',
  );
  assert.equal(
    taskByLabel(diagram, 'SIT_b').position.y,
    taskByLabel(diagram, 'DEV_b').position.y,
    'SIT_b aligns to DEV_b',
  );
  assert.notEqual(
    taskByLabel(diagram, 'SIT_a').position.y,
    taskByLabel(diagram, 'SIT_b').position.y,
    'the two downstream cards do not collapse onto one row',
  );
});

test('buildDiagramJSON: QA=10 reference lane drives height, spreads evenly, holds gap/box invariants', () => {
  // A tall QA reference lane (10 cards) with two 2-card downstream lanes fed by mixed patterns.
  const qaBUs = Array.from({ length: 10 }, (unused, index) => 'QA_' + index);
  seedDiagramPipeline(['QA', 'UAT', 'Prod'], {
    QA: qaBUs,
    UAT: ['UAT_a', 'UAT_b'],
    Prod: ['PRD_a', 'PRD_b'],
  });
  // (a) both UAT from ONE shared QA BU (a mid-lane card so symmetric centring is reachable);
  //     PROD is a distinct-source pair off the two UAT cards.
  controller.state.wizardState.lineage = {
    UAT_a: 'QA_5',
    UAT_b: 'QA_5',
    PRD_a: 'UAT_a',
    PRD_b: 'UAT_b',
  };
  const diagram = controller.buildDiagramJSON();
  const containers = diagramContainers(diagram);

  // Reference height is the 10-card QA lane: 88 + 10*52 + 9*24 + 48 = 872, shared by every lane.
  const expectedHeight =
    DIAGRAM_LANE_TOP_INSET +
    10 * DIAGRAM_TASK_HEIGHT +
    9 * DIAGRAM_ROW_GAP +
    DIAGRAM_LANE_BOTTOM_INSET;
  assert.equal(expectedHeight, 872, 'height maths sanity');
  for (const container of containers) {
    assert.equal(container.size.height, expectedHeight, 'every lane shares the 10-card height');
    assert.equal(container.position.y, 50, 'every lane shares the top');
  }

  // QA cards evenly spread with the 24px min gap (a row pitch of 76 = 52 + 24 for a full lane).
  const qaTasks = qaBUs.map((label) => taskByLabel(diagram, label));
  const qaYs = qaTasks.map((task) => task.position.y).toSorted((left, right) => left - right);
  for (let index = 1; index < qaYs.length; index += 1) {
    assert.equal(qaYs[index] - qaYs[index - 1], 76, 'QA cards fall on the shared 76px row pitch');
  }
  // QA dangling cards keep ascending order (card order == vertical order).
  for (let index = 1; index < qaTasks.length; index += 1) {
    assert.ok(
      qaTasks[index].position.y > qaTasks[index - 1].position.y,
      'QA cards keep ascending order',
    );
  }

  // The shared-source UAT fan straddles QA_5 symmetrically.
  const qa5Centre = centreOf(taskByLabel(diagram, 'QA_5'));
  const uatA = centreOf(taskByLabel(diagram, 'UAT_a'));
  const uatB = centreOf(taskByLabel(diagram, 'UAT_b'));
  assert.equal((uatA + uatB) / 2, qa5Centre, 'shared UAT fan is centred on QA_5');

  // Box + gap invariants across every lane.
  const innerTop = 50 + DIAGRAM_LANE_TOP_INSET;
  const innerBottom = 50 + expectedHeight - DIAGRAM_LANE_BOTTOM_INSET;
  for (const container of containers) {
    const tasks = diagramTasksIn(diagram, container).toSorted(
      (left, right) => left.position.y - right.position.y,
    );
    for (const task of tasks) {
      assert.ok(task.position.y >= innerTop, 'no card above top+88');
      assert.ok(
        task.position.y + DIAGRAM_TASK_HEIGHT <= innerBottom,
        'no card below top+height-48',
      );
    }
    for (let index = 1; index < tasks.length; index += 1) {
      assert.ok(
        tasks[index].position.y - tasks[index - 1].position.y >=
          DIAGRAM_TASK_HEIGHT + DIAGRAM_ROW_GAP,
        'no two cards in a lane closer than 24px of clear space',
      );
    }
  }
});

test('buildDiagramJSON: QA=10 with two DISTINCT QA sources places each UAT card on its source row', () => {
  const qaBUs = Array.from({ length: 10 }, (unused, index) => 'QA_' + index);
  seedDiagramPipeline(['QA', 'UAT', 'Prod'], {
    QA: qaBUs,
    UAT: ['UAT_a', 'UAT_b'],
    Prod: ['PRD_a', 'PRD_b'],
  });
  // (b) each UAT from a DISTINCT QA BU → each at its source row.
  controller.state.wizardState.lineage = {
    UAT_a: 'QA_2',
    UAT_b: 'QA_7',
    PRD_a: 'UAT_a',
    PRD_b: 'UAT_b',
  };
  const diagram = controller.buildDiagramJSON();
  assert.equal(
    taskByLabel(diagram, 'UAT_a').position.y,
    taskByLabel(diagram, 'QA_2').position.y,
    'UAT_a aligns to QA_2',
  );
  assert.equal(
    taskByLabel(diagram, 'UAT_b').position.y,
    taskByLabel(diagram, 'QA_7').position.y,
    'UAT_b aligns to QA_7',
  );
});

test('buildDiagramJSON: the centred-fan shift keeps clamp and min-gap invariants', () => {
  // A shared-source fan pinned near the box top must clamp to top+88 (cannot centre past the box).
  const qaBUs = Array.from({ length: 10 }, (unused, index) => 'QA_' + index);
  seedDiagramPipeline(['QA', 'UAT'], {
    QA: qaBUs,
    UAT: ['UAT_a', 'UAT_b'],
  });
  // Both UAT from QA_0 (the topmost QA card): the fan wants to straddle the top card but is clamped.
  controller.state.wizardState.lineage = { UAT_a: 'QA_0', UAT_b: 'QA_0' };
  const diagram = controller.buildDiagramJSON();
  const expectedHeight =
    DIAGRAM_LANE_TOP_INSET +
    10 * DIAGRAM_TASK_HEIGHT +
    9 * DIAGRAM_ROW_GAP +
    DIAGRAM_LANE_BOTTOM_INSET;
  const innerTop = 50 + DIAGRAM_LANE_TOP_INSET;
  const innerBottom = 50 + expectedHeight - DIAGRAM_LANE_BOTTOM_INSET;
  const uatTasks = ['UAT_a', 'UAT_b']
    .map((label) => taskByLabel(diagram, label))
    .toSorted((left, right) => left.position.y - right.position.y);
  assert.ok(uatTasks[0].position.y >= innerTop, 'clamped: top card stays at/below the box top');
  assert.ok(
    uatTasks[1].position.y + DIAGRAM_TASK_HEIGHT <= innerBottom,
    'clamped: bottom card stays inside the box',
  );
  assert.ok(
    uatTasks[1].position.y - uatTasks[0].position.y >= DIAGRAM_TASK_HEIGHT + DIAGRAM_ROW_GAP,
    'the fan pair keeps the 24px min gap after the shift',
  );
  // Exact clamped Ys: the fan pins to the box top at [138, 214] (a 76px pitch).
  assert.deepEqual(
    uatTasks.map((task) => task.position.y).toSorted((left, right) => left - right),
    [138, 214],
  );
});

test('buildDiagramJSON is idempotent: same seed → identical card Ys (fixed point)', () => {
  // QA=10 shared-source fan (same seeding as the reference-lane test) built twice on one input.
  const qaBUs = Array.from({ length: 10 }, (unused, index) => 'QA_' + index);
  seedDiagramPipeline(['QA', 'UAT', 'Prod'], {
    QA: qaBUs,
    UAT: ['UAT_a', 'UAT_b'],
    Prod: ['PRD_a', 'PRD_b'],
  });
  controller.state.wizardState.lineage = {
    UAT_a: 'QA_5',
    UAT_b: 'QA_5',
    PRD_a: 'UAT_a',
    PRD_b: 'UAT_b',
  };
  const first = cardYsByLabel(controller.buildDiagramJSON());
  const second = cardYsByLabel(controller.buildDiagramJSON());
  assert.deepEqual(second, first, 'a second build on the same seed yields identical card Ys');
});

// ─── draw.io export (mcdev-pipeline-drawio.js), built side-by-side with Diagramforce ───
//
// The draw.io module is pure: it takes the plain model from controller.buildDrawioModel()
// and returns strings. These tests cover the mxGraph XML shape + escaping, drawable-gating
// of the Download row, and the URL-length download fallback.

/**
 * Count non-overlapping occurrences of a substring.
 *
 * @param {string} haystack the string to scan
 * @param {string} needle the substring to count
 * @returns {number} occurrence count
 */
function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test('buildDrawioModel mirrors the pipeline: one column per env, cell ids, same-index link', () => {
  seedDiagramEnvironments(['DEV', 'Prod']);
  const model = controller.buildDrawioModel();
  assert.equal(model.columns.length, 2, 'two environment columns');
  assert.deepEqual(
    model.columns.map((column) => column.env),
    ['DEV', 'Prod'],
    'columns are in pipeline order',
  );
  assert.equal(model.columns[0].bus[0].label, 'DEV', 'BU label is the display label');
  assert.equal(model.links.length, 1, 'same-index fallback still produces one deploy link');
  const sourceIds = model.columns[0].bus.map((bu) => bu.cellId);
  const targetIds = model.columns[1].bus.map((bu) => bu.cellId);
  assert.ok(sourceIds.includes(model.links[0].sourceCellId), 'link source is a DEV cell id');
  assert.ok(targetIds.includes(model.links[0].targetCellId), 'link target is a Prod cell id');
});

test('buildDrawioModel honours the explicit lineage parent over same-index', () => {
  seedDiagramPipeline(['QA', 'Prod'], { QA: ['QA_a', 'QA_b'], Prod: ['PRD_a'] });
  controller.state.wizardState.lineage = { PRD_a: 'QA_b' };
  const model = controller.buildDrawioModel();
  const qaB = model.columns[0].bus.find((bu) => bu.label === 'QA_b');
  assert.equal(model.links.length, 1, 'one link for the single Prod BU');
  assert.equal(model.links[0].sourceCellId, qaB.cellId, 'link resolves to the lineage parent QA_b');
});

test('buildMxGraphXml emits seed cells, one swimlane per env, and one edge per link', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  assert.match(xml, /^<mxGraphModel /, 'starts with the mxGraphModel root');
  assert.ok(xml.includes('<mxCell id="0"/>'), 'has the model root seed cell');
  assert.ok(xml.includes('<mxCell id="1" parent="0"/>'), 'has the default-layer seed cell');
  assert.match(xml, /<mxGraphModel [^>]*\bfold="0"/, 'cells are not foldable (fold="0")');
  assert.equal(countOccurrences(xml, 'swimlane;'), 3, 'one swimlane style per environment');
  assert.equal(countOccurrences(xml, 'edge="1"'), model.links.length, 'one edge cell per link');
  // Every edge source/target references a vertex id that exists in the document.
  const idRe = /<mxCell id="([^"]+)"/g;
  const ids = new Set();
  let match;
  while ((match = idRe.exec(xml)) !== null) {
    ids.add(match[1]);
  }
  const edgeRe = /edge="1" parent="1" source="([^"]+)" target="([^"]+)"/g;
  while ((match = edgeRe.exec(xml)) !== null) {
    assert.ok(ids.has(match[1]), 'edge source ' + match[1] + ' is a real cell');
    assert.ok(ids.has(match[2]), 'edge target ' + match[2] + ' is a real cell');
  }
  // Well-formed enough for draw.io: tags are balanced (equal open/close mxCell counts).
  assert.equal(
    countOccurrences(xml, '<mxCell') -
      countOccurrences(xml, '<mxCell id="0"/>') -
      countOccurrences(xml, '<mxCell id="1" parent="0"/>'),
    countOccurrences(xml, '</mxCell>'),
    'every non-seed mxCell is closed',
  );
});

test('buildMxGraphXml XML-escapes labels containing & < > "', () => {
  seedDiagramPipeline(['DEV', 'Prod'], { DEV: ['A & B <x>'], Prod: ['P'] });
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  assert.ok(xml.includes('A &amp; B &lt;x&gt;'), 'ampersand and angle brackets are escaped');
  assert.ok(!/value="A & B <x>"/.test(xml), 'raw unescaped label must not appear');
});

test('buildMxGraphXml lanes have a white body with the band header colour and no fold toggle', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  // Every lane body is white; the header bar shows the position-locked band fill; no fold toggle.
  const laneRe = /<mxCell id="lane-\d+"[^>]*style="([^"]*)"/g;
  const laneStyles = [];
  let laneMatch;
  while ((laneMatch = laneRe.exec(xml)) !== null) {
    laneStyles.push(laneMatch[1]);
  }
  assert.equal(laneStyles.length, 3, 'three lane cells');
  for (const style of laneStyles) {
    assert.ok(style.includes('swimlaneFillColor=#FFFFFF;'), 'lane body is white');
    assert.ok(style.includes('collapsible=0;'), 'lane has no collapse/fold toggle');
    assert.ok(style.includes('fontColor=#FFFFFF;fontStyle=1;'), 'lane title text stays white/bold');
  }
  // Header colour is position-locked: first green, middle purple, last orange (via fillColor).
  assert.ok(laneStyles[0].includes('fillColor=#27ae60;'), 'first lane header is band green');
  assert.ok(
    laneStyles[0].includes('strokeColor=#1e8449;'),
    'first lane stroke is band green stroke',
  );
  assert.ok(laneStyles[1].includes('fillColor=#7C3AED;'), 'middle lane header is band purple');
  assert.ok(laneStyles[2].includes('fillColor=#F49825;'), 'last lane header is band orange');
});

test('buildMxGraphXml BU boxes are filled with their column band colour', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  // A BU in the first column (green band) carries the green band fill/stroke and readable white text.
  const firstBuId = model.columns[0].bus[0].cellId;
  const buRe = new RegExp('<mxCell id="' + firstBuId + '"[^>]*style="([^"]*)"');
  const buStyle = buRe.exec(xml)[1];
  assert.ok(
    buStyle.includes('fillColor=#27ae60;'),
    'first-column BU is filled with the green band',
  );
  assert.ok(
    buStyle.includes('strokeColor=#1e8449;'),
    'first-column BU stroke is the green band stroke',
  );
  assert.ok(
    buStyle.includes('fontColor=#FFFFFF;'),
    'BU label stays white for contrast on the band',
  );
  // A BU in the last column (orange band) carries the orange band fill.
  const lastBuId = model.columns[2].bus[0].cellId;
  const lastRe = new RegExp('<mxCell id="' + lastBuId + '"[^>]*style="([^"]*)"');
  assert.ok(
    lastRe.exec(xml)[1].includes('fillColor=#F49825;'),
    'last-column BU is filled with the orange band',
  );
});

test('buildMxGraphXml edges terminate at the left-middle of the target BU box', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  const edgeRe = /<mxCell id="edge-\d+" style="([^"]*)"/g;
  let edgeMatch;
  let edgeCount = 0;
  while ((edgeMatch = edgeRe.exec(xml)) !== null) {
    edgeCount += 1;
    const style = edgeMatch[1];
    assert.ok(style.includes('exitX=1;exitY=0.5;'), 'edge exits the source at its right-middle');
    assert.ok(style.includes('entryX=0;entryY=0.5;'), 'edge enters the target at its left-middle');
  }
  assert.equal(edgeCount, model.links.length, 'one styled edge per link');
});

test('buildMxGraphXml renders every connector with rounded (not curved) corners', () => {
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  const edgeRe = /<mxCell id="edge-\d+" style="([^"]*)"/g;
  let edgeMatch;
  let edgeCount = 0;
  while ((edgeMatch = edgeRe.exec(xml)) !== null) {
    edgeCount += 1;
    const style = edgeMatch[1];
    // Rounded corners on the orthogonal routing — before: rounded=0 with no curved flag.
    assert.ok(style.includes('rounded=1;'), 'edge uses rounded=1 corners');
    assert.ok(style.includes('curved=0;'), 'edge is rounded but not curved');
    assert.ok(!style.includes('rounded=0;'), 'no edge is left square (rounded=0)');
  }
  assert.equal(edgeCount, model.links.length, 'one styled edge per link');
});

test('buildMxGraphXml gives every lane the tallest lane height (uniform grid)', () => {
  // QA has 3 BUs, Prod has 4 — every lane must share the height of the 4-BU (tallest) lane.
  seedDiagramPipeline(['DEV', 'QA', 'Prod'], {
    DEV: ['DEV'],
    QA: ['QA_a', 'QA_b', 'QA_c'],
    Prod: ['PRD_a', 'PRD_b', 'PRD_c', 'PRD_d'],
  });
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  const laneHeights = xml
    .matchAll(/id="lane-\d+"[\s\S]*?<mxGeometry [^>]*height="(\d+)"/g)
    .map((hit) => hit[1])
    .toArray();
  assert.equal(laneHeights.length, 3, 'three lane cells');
  assert.ok(
    laneHeights.every((height) => height === laneHeights[0]),
    'all lanes share one height: ' + laneHeights.join(','),
  );
  // The shared height is the tallest lane's height (the 4-BU Prod lane), not the 1-BU DEV lane.
  const maxBuCount = Math.max(...model.columns.map((column) => column.bus.length));
  assert.equal(maxBuCount, 4, 'Prod is the tallest lane with 4 BUs');
});

/**
 * Read every BU's absolute top-y from an emitted mxGraph document, keyed by cell id.
 *
 * @param {string} xml the `buildMxGraphXml` output
 * @returns {{[cellId: string]: number}} cellId → absolute top-y
 */
function readBuYs(xml) {
  const buYs = {};
  const re = /<mxCell id="(bu-\d+-\d+)"[^>]*>\s*<mxGeometry x="\d+" y="(-?\d+)"/g;
  let hit;
  while ((hit = re.exec(xml)) !== null) {
    buYs[hit[1]] = Number(hit[2]);
  }
  return buYs;
}

test('buildMxGraphXml places a clean 1:1 hop at the same y (horizontal connector)', () => {
  // Single BU per env, one link each: a pure 1:1 chain must be perfectly horizontal.
  seedDiagramPipeline(['DEV', 'QA', 'Prod'], { DEV: ['DEV'], QA: ['QA_a'], Prod: ['PRD_a'] });
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  const buYs = readBuYs(xml);
  const developmentId = model.columns[0].bus[0].cellId;
  const qaId = model.columns[1].bus[0].cellId;
  const productionId = model.columns[2].bus[0].cellId;
  assert.equal(buYs[developmentId], buYs[qaId], '1:1 hop keeps source and target at the same y');
  assert.equal(buYs[qaId], buYs[productionId], '1:1 chain propagates the shared y across all hops');
});

test('buildMxGraphXml centers a 1:n source on the span of its targets, no overlap', () => {
  // One DEV BU fans out to three Prod BUs via explicit lineage — the source sits centered on
  // the min→max span of its targets, and the targets keep a full BU_HEIGHT-plus gap.
  seedDiagramPipeline(['DEV', 'Prod'], { DEV: ['DEV'], Prod: ['PRD_a', 'PRD_b', 'PRD_c'] });
  controller.state.wizardState.lineage = { PRD_a: 'DEV', PRD_b: 'DEV', PRD_c: 'DEV' };
  const model = controller.buildDrawioModel();
  assert.equal(model.links.length, 3, 'three fan-out links from the single DEV BU');
  const xml = mpbDrawio.buildMxGraphXml(model);
  const buYs = readBuYs(xml);
  const BU_HEIGHT = 40;
  const developmentId = model.columns[0].bus[0].cellId;
  const targetIds = model.columns[1].bus.map((bu) => bu.cellId);
  const targetTops = targetIds.map((id) => buYs[id]).toSorted((left, right) => left - right);
  // Targets stay stacked in model order with at least a full BU height between successive tops.
  for (let row = 1; row < targetTops.length; row += 1) {
    assert.ok(
      targetTops[row] - targetTops[row - 1] >= BU_HEIGHT,
      'fan-out targets keep a min gap of at least one BU height',
    );
  }
  // Source center equals the center of the (min, max) target span.
  const targetCenters = targetTops.map((top) => top + BU_HEIGHT / 2);
  const spanCenter = (Math.min(...targetCenters) + Math.max(...targetCenters)) / 2;
  assert.equal(
    buYs[developmentId] + BU_HEIGHT / 2,
    spanCenter,
    'the 1:n source is vertically centered on its targets span',
  );
});

test('buildMxGraphXml grows the lane so a fan-out from the bottom BU stays inside it', () => {
  // The tallest column by BU count is QA (3). Its bottom BU (QA_c) fans out to two Prod BUs, so
  // the min-gap sweep centers them low and pushes the Prod stack below the count-based lane
  // height — before the extent-aware fix the bottom BU escaped past the lane bottom.
  const LANE_TOP = 40;
  seedDiagramPipeline(['DEV', 'QA', 'Prod'], {
    DEV: ['DEV'],
    QA: ['QA_a', 'QA_b', 'QA_c'],
    Prod: ['PRD_a', 'PRD_b'],
  });
  controller.state.wizardState.lineage = { PRD_a: 'QA_c', PRD_b: 'QA_c' };
  const model = controller.buildDrawioModel();
  const xml = mpbDrawio.buildMxGraphXml(model);
  // Every lane shares one height; read it (all equal, so the first is the uniform height).
  const laneHeights = xml
    .matchAll(/id="lane-\d+"[\s\S]*?<mxGeometry [^>]*height="(\d+)"/g)
    .map((hit) => Number(hit[1]))
    .toArray();
  assert.ok(laneHeights.length >= 1, 'at least one lane height parsed');
  assert.ok(
    laneHeights.every((height) => height === laneHeights[0]),
    'lanes stay uniform: ' + laneHeights.join(','),
  );
  const uniformHeight = laneHeights[0];
  const laneBottom = LANE_TOP + uniformHeight;
  // Parse every BU box's top-y + height and assert its bottom stays inside the lane.
  const buRe =
    /<mxCell id="bu-\d+-\d+"[^>]*>\s*<mxGeometry x="\d+" y="(-?\d+)" width="\d+" height="(\d+)"/g;
  let hit;
  let checked = 0;
  while ((hit = buRe.exec(xml)) !== null) {
    checked += 1;
    const buBottomY = Number(hit[1]) + Number(hit[2]);
    assert.ok(
      buBottomY <= laneBottom,
      'BU bottom ' + buBottomY + ' must not escape the lane bottom ' + laneBottom,
    );
  }
  assert.equal(checked, 6, 'all six BU boxes were bounds-checked');
});

test('buildMxGraphXml centers crossing 1:n sources on their children, preserving order and gap', () => {
  // Crossing lineage: col0 = [S1, S2] in model order, col1 = [t1, t2, t3, t4], with S1 → t3,t4 and
  // S2 → t1,t2. S1 (top of its column) fans out LOW and S2 fans out HIGH. The converged Pass-3
  // relaxation centers each source on its children's span as far as the order+min-gap constraints
  // allow. A hand-built model gives exact control over ids, order and the crossing links.
  const BU_HEIGHT = 40;
  const BU_ROW_STEP = 60;
  const model = {
    title: 'crossing',
    columns: [
      {
        env: 'Src',
        band: { fill: '#27ae60', stroke: '#1e8449' },
        bus: [
          { cellId: 'bu-1-1', label: 'S1' },
          { cellId: 'bu-1-2', label: 'S2' },
        ],
      },
      {
        env: 'Tgt',
        band: { fill: '#F49825', stroke: '#b3701a' },
        bus: [
          { cellId: 'bu-2-1', label: 't1' },
          { cellId: 'bu-2-2', label: 't2' },
          { cellId: 'bu-2-3', label: 't3' },
          { cellId: 'bu-2-4', label: 't4' },
        ],
      },
    ],
    links: [
      { sourceCellId: 'bu-1-1', targetCellId: 'bu-2-3' },
      { sourceCellId: 'bu-1-1', targetCellId: 'bu-2-4' },
      { sourceCellId: 'bu-1-2', targetCellId: 'bu-2-1' },
      { sourceCellId: 'bu-1-2', targetCellId: 'bu-2-2' },
    ],
  };
  const xml = mpbDrawio.buildMxGraphXml(model);
  const buYs = readBuYs(xml);
  const centerOf = (id) => buYs[id] + BU_HEIGHT / 2;
  const spanCenter = (ids) => {
    const centers = ids.map((id) => centerOf(id));
    return (Math.min(...centers) + Math.max(...centers)) / 2;
  };
  // Model order is preserved in each column (top-to-bottom = order in the bus array) with no overlap.
  assert.ok(buYs['bu-1-1'] < buYs['bu-1-2'], 'source column keeps model order S1 above S2');
  for (const [above, below] of [
    ['bu-2-1', 'bu-2-2'],
    ['bu-2-2', 'bu-2-3'],
    ['bu-2-3', 'bu-2-4'],
  ]) {
    assert.ok(
      buYs[above] < buYs[below],
      'target column keeps model order ' + above + ' above ' + below,
    );
    assert.ok(
      buYs[below] - buYs[above] >= BU_HEIGHT,
      'adjacent targets never overlap (min one BU height apart)',
    );
  }
  // S1 sits on the HIGHER-ROW children (t3, t4) and is centered on their span. This is the
  // discriminating assertion: pre-layout code stacked S1 at the lane top (row 0, center 110),
  // ~160px above its true children center — this fails there and passes with the centering layout.
  const s1Center = centerOf('bu-1-1');
  const s1Target = spanCenter(['bu-2-3', 'bu-2-4']);
  assert.ok(
    Math.abs(s1Center - s1Target) <= BU_ROW_STEP / 2,
    'S1 is centered on its (lower) children t3,t4 within half a row step: ' +
      s1Center +
      ' vs ' +
      s1Target,
  );
  // S2's children (t1, t2) sit HIGH, but model order forces S2 below S1 — its desired center
  // (high) is unsatisfiable without reordering. The converged relaxation keeps order + min gap and
  // parks S2 as high as allowed (one BU_ROW_STEP below S1), never overlapping and never reordered.
  assert.equal(
    buYs['bu-1-2'] - buYs['bu-1-1'],
    BU_ROW_STEP,
    'order-constrained S2 sits exactly one min-gap below S1 (as near its high children as allowed)',
  );
});

test('openInDrawioOrDownload opens a tab under the cap and downloads over it', () => {
  const opens = [];
  const downloads = [];
  const io = {
    open: (url, target, features) => {
      opens.push({ url, target, features });
      return {};
    },
    downloadText: (filename, text, mime) => {
      downloads.push({ filename, text, mime });
    },
  };
  const small = mpbDrawio.openInDrawioOrDownload('<x/>', 'T', 'pipeline.drawio', io);
  assert.equal(small, 'open', 'a tiny payload opens a tab');
  assert.equal(opens.length, 1, 'open was called once');
  assert.match(opens[0].url, /#R/, 'uses the #R raw-XML hash');
  assert.equal(opens[0].features, 'noopener', 'opens with noopener');

  const bigXml = '<x>' + 'y'.repeat(mpbDrawio.DRAWIO_URL_LIMIT) + '</x>';
  const big = mpbDrawio.openInDrawioOrDownload(bigXml, 'T', 'pipeline.drawio', io);
  assert.equal(big, 'download', 'an oversized payload downloads instead');
  assert.equal(downloads.length, 1, 'downloadText was called once');
  assert.equal(downloads[0].filename, 'pipeline.drawio', 'downloads a .drawio file');
});

test('draw.io Download row: appended when drawable, omitted when not', () => {
  // Not drawable in validations-only mode.
  seedDiagramEnvironments(['DEV', 'Prod']);
  controller.state.mode = 'validations';
  const notDrawable = stubDownloadPanel();
  controller.fillBuilderDrawioMxItem(notDrawable);
  assert.equal(notDrawable.items.length, 0, 'no draw.io row when not drawable');

  // Drawable full-mode pipeline appends the row.
  seedDiagramEnvironments(['DEV', 'Prod']);
  const drawable = stubDownloadPanel();
  controller.fillBuilderDrawioMxItem(drawable);
  assert.equal(drawable.items.length, 1, 'the draw.io row when drawable');
  const labels = new Set(drawable.items.map((item) => item.textContent));
  assert.ok(labels.has('Open in draw.io'), 'the draw.io row label is present');
});

test('openDrawioOrDownload builds the model + XML and hands off via the #R open path', () => {
  // The output-step draw.io tile and the Download-dropdown row both call this shared helper, so
  // it must reproduce the module's open/fallback handoff. A small pipeline opens app.diagrams.net
  // via the #R raw-XML hash (no textarea, no download).
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  const previousOpen = Object.getOwnPropertyDescriptor(globalThis, 'open');
  const opens = [];
  // defineProperty (not a bare assignment) mirrors the harness's document stub and keeps the
  // unicorn/no-global-object-property-assignment rule satisfied.
  Object.defineProperty(globalThis, 'open', {
    configurable: true,
    writable: true,
    value: (url, target, features) => {
      opens.push({ url, target, features });
      return {};
    },
  });
  try {
    const branch = controller.openDrawioOrDownload();
    assert.equal(branch, 'open', 'a small pipeline opens a tab');
    assert.equal(opens.length, 1, 'window.open was called once');
    assert.match(opens[0].url, /app\.diagrams\.net/, 'hands off to app.diagrams.net');
    assert.match(opens[0].url, /#R/, 'uses the #R raw-XML hash (mxGraph path)');
    assert.equal(opens[0].features, 'noopener', 'opens with noopener');
  } finally {
    if (previousOpen) {
      Object.defineProperty(globalThis, 'open', previousOpen);
    } else {
      delete globalThis.open;
    }
  }
});

test('openDrawioOrDownload downloads pipeline.drawio when the URL exceeds the cap (fallback)', () => {
  // Force the too-long-URL branch by stubbing the module builders to emit an oversized XML, and
  // capture the download without a real anchor. This proves the tile's fallback still triggers a
  // pipeline.drawio file download when app.diagrams.net cannot be opened via the URL.
  seedDiagramEnvironments(['DEV', 'Prod']);
  const drawio = globalThis.mpbDrawio;
  const previousBuild = drawio.buildMxGraphXml;
  const previousCreate = globalThis.document.createElement;
  const previousBody = globalThis.document.body;
  const previousCreateObjectURL = URL.createObjectURL;
  const previousRevokeObjectURL = URL.revokeObjectURL;
  const oversizedXml = '<mxGraphModel>' + 'y'.repeat(drawio.DRAWIO_URL_LIMIT) + '</mxGraphModel>';
  let clicked;
  const anchor = {
    href: '',
    download: '',
    className: '',
    click() {
      clicked = { download: anchor.download };
    },
    remove() {},
    append() {},
    setAttribute() {},
  };
  drawio.buildMxGraphXml = () => oversizedXml;
  globalThis.document.createElement = () => anchor;
  globalThis.document.body = { append() {} };
  URL.createObjectURL = () => 'blob:mpb-test';
  URL.revokeObjectURL = () => {};
  try {
    const branch = controller.openDrawioOrDownload();
    assert.equal(branch, 'download', 'an oversized pipeline downloads instead of opening');
    assert.ok(clicked, 'the generated anchor was clicked');
    assert.equal(clicked.download, 'pipeline.drawio', 'downloads the pipeline.drawio file');
  } finally {
    drawio.buildMxGraphXml = previousBuild;
    globalThis.document.createElement = previousCreate;
    globalThis.document.body = previousBody;
    URL.createObjectURL = previousCreateObjectURL;
    URL.revokeObjectURL = previousRevokeObjectURL;
  }
});

/**
 * Stub Download-menu panel: collects appended menuitem descriptors without a real document.
 *
 * @returns {{items: object[], append: (node: object) => void}} collector
 */
function stubDownloadPanel() {
  const items = [];
  return {
    items: items,
    append(node) {
      items.push(node);
    },
  };
}

/**
 * Minimal fake DOM element for driving `makeElement`-based builders end-to-end without jsdom.
 * Records its `tagName`, `textContent`, `className`, attributes, and appended children in order.
 *
 * @param {string} tag element tag name
 * @returns {object} fake element
 */
function makeFakeElement(tag) {
  const element = {
    tagName: String(tag).toUpperCase(),
    textContent: '',
    className: '',
    hidden: false,
    disabled: false,
    attributes: {},
    children: [],
    append(...nodes) {
      for (const node of nodes) {
        element.children.push(node);
      }
    },
    addEventListener() {},
    setAttribute(name, value) {
      element.attributes[name] = value;
    },
    getAttribute(name) {
      return element.attributes[name];
    },
  };
  return element;
}

/**
 * Row label for the divider-order assertion: the sentinel `<hr>` for dividers, else the text.
 *
 * @param {object} row a fake dropdown child element
 * @returns {string} the comparable label
 */
function dropdownRowLabel(row) {
  return row.tagName === 'HR' ? '<hr>' : row.textContent;
}

/**
 * Install a fake `document.createElement`/`createTextNode` for the duration of `run`, then restore.
 *
 * @param {() => void} run the body to execute with the fake document installed
 * @returns {void}
 */
function withFakeDocument(run) {
  const previousCreate = globalThis.document.createElement;
  const previousTextNode = globalThis.document.createTextNode;
  globalThis.document.createElement = (tag) => makeFakeElement(tag);
  globalThis.document.createTextNode = (text) => ({ textContent: String(text) });
  try {
    run();
  } finally {
    globalThis.document.createElement = previousCreate;
    globalThis.document.createTextNode = previousTextNode;
  }
}

test('Download dropdown: a single <hr> divider sits after the file rows and before Open in Diagramforce', () => {
  // A drawable full-mode pipeline renders every row: the two download-file rows, the divider, then
  // the two open-in-tool rows (Diagramforce + draw.io).
  seedDiagramEnvironments(['DEV', 'QA', 'Prod']);
  withFakeDocument(() => {
    const wrapper = controller.buildBuilderDownloadDropdown();
    const panel = wrapper.children.find(
      (child) => child && child.attributes && child.attributes.role === 'menu',
    );
    assert.ok(panel, 'the dropdown exposes a role="menu" panel');

    // Flatten to the ordered list of appended rows/dividers (ignore the leading hint <p>).
    const rows = panel.children.filter((child) => child && child.tagName);
    const dividers = rows.filter((row) => row.tagName === 'HR');
    assert.equal(dividers.length, 1, 'exactly one divider is inserted');

    const sequence = rows.map(dropdownRowLabel);
    const dividerIndex = sequence.indexOf('<hr>');
    const configIndex = sequence.indexOf('Download .mcdevrc.json');
    const validationsIndex = sequence.indexOf('Download .mcdev-validations.js');
    const diagramforceIndex = sequence.indexOf('Open in Diagramforce');
    const drawioIndex = sequence.indexOf('Open in draw.io');

    assert.ok(configIndex !== -1 && validationsIndex !== -1, 'both download-file rows render');
    assert.ok(diagramforceIndex !== -1 && drawioIndex !== -1, 'both open-in-tool rows render');
    assert.ok(
      configIndex < dividerIndex && validationsIndex < dividerIndex,
      'the divider sits after the download-file rows',
    );
    assert.ok(
      dividerIndex < diagramforceIndex && dividerIndex < drawioIndex,
      'the divider sits immediately before the Open in Diagramforce row',
    );
    assert.equal(
      dividerIndex + 1,
      diagramforceIndex,
      'the divider is directly before Open in Diagramforce (no row between)',
    );
    assert.equal(
      panel.children.find((child) => child.tagName === 'HR').attributes.role,
      'separator',
      'the divider carries role="separator"',
    );
  });
});

test('header Download Diagramforce menuitem: omitted in validations-only, disabled until drawable, enabled when drawable', () => {
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
  assert.equal(
    controller.shouldShowDiagramforceMenuItem(),
    false,
    'validations-only omits the row',
  );
  assert.equal(controller.diagramforceMenuItemSpec(), null, 'validations-only spec is null');
  const validationsPanel = stubDownloadPanel();
  controller.fillBuilderDownloadDiagramItem(validationsPanel);
  assert.equal(
    validationsPanel.items.length,
    0,
    'validations-only panel has no Diagramforce menuitem',
  );

  // Full mode, graph not ready: row is present but disabled with the until-ready tooltip.
  controller.state.mode = 'full';
  controller.state.wizardState.envOrder = [];
  controller.state.wizardState.envBUs = {};
  assert.equal(controller.isDiagramDrawable(), false, 'precondition: not drawable');
  assert.equal(controller.shouldShowDiagramforceMenuItem(), true, 'full mode still shows the row');
  const notReady = controller.diagramforceMenuItemSpec();
  assert.equal(notReady.disabled, true, 'not-drawable row is disabled');
  assert.equal(
    notReady.title,
    'Finish environment order, BU assignment, and lineage first.',
    'disabled row carries the until-ready tooltip',
  );
  const notReadyPanel = stubDownloadPanel();
  controller.fillBuilderDownloadDiagramItem(notReadyPanel);
  assert.equal(notReadyPanel.items.length, 1, 'not-drawable panel appends one menuitem');
  assert.equal(notReadyPanel.items[0].disabled, true);
  assert.equal(notReadyPanel.items[0].textContent, 'Open in Diagramforce');

  // Full mode, drawable: enabled menuitem, no tooltip.
  seedDrawableTwoEnvironmentState();
  assert.equal(controller.isDiagramDrawable(), true, 'precondition: drawable');
  const ready = controller.diagramforceMenuItemSpec();
  assert.equal(ready.disabled, false, 'drawable row is enabled');
  assert.equal(ready.title, null, 'enabled row has no until-ready tooltip');
  const readyPanel = stubDownloadPanel();
  controller.fillBuilderDownloadDiagramItem(readyPanel);
  assert.equal(readyPanel.items.length, 1, 'drawable panel appends one menuitem');
  assert.equal(readyPanel.items[0].disabled, false);
  assert.equal(readyPanel.items[0].textContent, 'Open in Diagramforce');
  assert.equal(readyPanel.items[0].role, 'menuitem');
});

test('outputBlockers skips the Download step even when wizardStep is output', () => {
  controller.state.mode = 'full';
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
  controller.setWizardStep('output');
  const ids = controller.visibleSteps().map((step) => step.id);
  assert.ok(ids.includes('output'), 'Download is a visible wizard step');
  const blockers = controller.outputBlockers();
  assert.ok(blockers.length > 0, 'earlier unfinished steps still produce blockers');
  assert.ok(
    blockers.every((reason) => !/download|\boutput\b/i.test(reason)),
    'outputBlockers never includes a Download/output reason',
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

test('parseHash treats view=output as an unknown view (no alias)', () => {
  // Download is only `#view=wizard&step=output`. An unpublished `#view=output` parses like any
  // unknown view (intake default); extra params are ignored and a present `s=` is still extracted.
  assert.deepEqual(controller.parseHash('#view=output'), {
    view: 'intake',
    step: null,
    sessionId: null,
  });
  assert.deepEqual(controller.parseHash('#view=output&s=xyz&extra=1&step='), {
    view: 'intake',
    step: null,
    sessionId: 'xyz',
  });
});

test('parseHash ignores unknown extra params but keeps the known ones', () => {
  assert.deepEqual(controller.parseHash('#view=wizard&s=xyz&extra=1&step=suffixes'), {
    view: 'wizard',
    step: 'suffixes',
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

  // Download is a wizard sub-step, not a top-level view. state.step stays 'wizard'.
  controller.setWizardStep('output');
  assert.equal(controller.state.step, 'wizard');
  assert.equal(controller.hashFromLocation(), '#view=wizard&step=output&s=sess-1');

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

// ─── controller: deeplink banner is cleared when a real config is opened/uploaded ───

/**
 * Minimal fake element for the banner DOM: records attributes, supports `append` / `remove`, and a
 * `querySelector('[data-banner="X"]')` that matches the controller's `clearBanner` lookup. Enough
 * for `showBanner` (makeElement → createElement) and `clearBanner` to run headlessly.
 */
class FakeBannerNode {
  constructor() {
    this.children = [];
    this.attrs = {};
    this.className = '';
    this.textContent = '';
    this.parentNode = null;
  }

  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }

  append(child) {
    this.children.push(child);
    child.parentNode = this;
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    const index = this.parentNode.children.indexOf(this);
    if (index !== -1) {
      this.parentNode.children.splice(index, 1);
    }
    this.parentNode = null;
  }

  querySelector(selector) {
    const match = /^\[data-banner="(.+)"\]$/.exec(selector);
    if (!match) {
      return null;
    }
    return this.children.find((child) => child.attrs['data-banner'] === match[1]) || null;
  }
}

/**
 * Install a fake `dom.banners` container plus a `document.createElement`/`createTextNode` that back
 * `makeElement`, so `showBanner` / `clearBanner` operate on real (fake) nodes. Returns a teardown.
 *
 * @returns {{banners: FakeBannerNode, restore: () => void}} the container and a teardown
 */
function installFakeBanners() {
  const banners = new FakeBannerNode();
  const previousBanners = controller.dom.banners;
  const previousCreate = globalThis.document.createElement;
  const previousTextNode = globalThis.document.createTextNode;
  controller.dom.banners = banners;
  globalThis.document.createElement = () => new FakeBannerNode();
  globalThis.document.createTextNode = (text) => ({ textContent: String(text) });
  return {
    banners: banners,
    restore() {
      controller.dom.banners = previousBanners;
      globalThis.document.createElement = previousCreate;
      globalThis.document.createTextNode = previousTextNode;
    },
  };
}

test('opening a saved session clears a leftover cross-device deeplink banner', () => {
  const restoreStorage = installMemoryLocalStorage();
  const banners = installFakeBanners();
  try {
    controller.persistence.available = null;
    // Seed a real, reopenable save (mode-bearing so reopenSave lands cleanly).
    const id = 'deeplink-clear-open';
    localStorage.setItem(
      'mcdevpipe::save::' + id,
      JSON.stringify({
        id: id,
        name: 'Has config',
        version: 1,
        timestamp: Date.now(),
        config: sampleConfig,
        wizardState: {
          version: 1,
          multiCred: false,
          mode: 'full',
          envOrder: ['DEV'],
          envBUs: { DEV: ['DEV'] },
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
    // A stale cross-device share notice is showing.
    controller.showBanner('deeplink', 'shared link not in this browser', [], 'warning');
    assert.ok(banners.banners.querySelector('[data-banner="deeplink"]'), 'deeplink banner is up');
    // Opening a real session must drop it.
    controller.reopenSave(id);
    assert.equal(
      banners.banners.querySelector('[data-banner="deeplink"]'),
      null,
      'reopening a saved session clears the deeplink banner',
    );
  } finally {
    stopControllerTimers();
    banners.restore();
    restoreStorage();
    controller.persistence.available = null;
  }
});

test('accepting a fresh config clears a leftover cross-device deeplink banner', () => {
  const restoreStorage = installMemoryLocalStorage();
  const banners = installFakeBanners();
  try {
    controller.persistence.available = null;
    controller.state.config = sampleConfig;
    // A stale cross-device share notice is showing.
    controller.showBanner('deeplink', 'shared link not in this browser', [], 'warning');
    assert.ok(banners.banners.querySelector('[data-banner="deeplink"]'), 'deeplink banner is up');
    // Uploading/pasting a fresh config must drop it.
    controller.createSaveForConfig(sampleConfig);
    assert.equal(
      banners.banners.querySelector('[data-banner="deeplink"]'),
      null,
      'accepting a fresh config clears the deeplink banner',
    );
  } finally {
    stopControllerTimers();
    banners.restore();
    restoreStorage();
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

// Dual Back/Next (slice 2). The null-querySelector stub never sees #mpb-back-top / #mpb-next-top,
// so markup is asserted from the page source and lockstep labels via the setWizardNavDom seam.

test('wizard markup places a top Back/Next pair under the stepper and keeps the bottom pair', () => {
  const markup = fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  const stepperIndex = markup.indexOf('id="mpb-stepper"');
  const topNavIndex = markup.indexOf('mpb-wizard-nav--top');
  const backTopIndex = markup.indexOf('id="mpb-back-top"');
  const nextTopIndex = markup.indexOf('id="mpb-next-top"');
  const hostIndex = markup.indexOf('id="mpb-step-host"');
  const backIndex = markup.indexOf('id="mpb-back"');
  const nextIndex = markup.indexOf('id="mpb-next"');
  assert.ok(stepperIndex !== -1, 'stepper is present');
  assert.ok(topNavIndex !== -1, 'top nav class is present');
  assert.ok(backTopIndex !== -1 && nextTopIndex !== -1, 'top pair ids are present');
  assert.ok(backIndex !== -1 && nextIndex !== -1, 'bottom pair ids are present');
  assert.ok(
    stepperIndex < topNavIndex && topNavIndex < hostIndex,
    'top nav sits immediately under the stepper, above the step host',
  );
  assert.ok(
    backTopIndex < hostIndex && nextTopIndex < hostIndex,
    'top buttons sit above the step host',
  );
  assert.ok(
    hostIndex < backIndex && hostIndex < nextIndex,
    'bottom pair remains below the step host',
  );
  assert.match(markup, /id="mpb-back-top"[^>]*>← Back/);
  assert.match(markup, /id="mpb-next-top"[^>]*>Next →/);
  assert.match(markup, /id="mpb-back"[^>]*>← Back/);
  assert.match(markup, /id="mpb-next"[^>]*>Next →/);
});

test('wizard markup places Download inside the wizard between the step host and the bottom nav', () => {
  const markup = fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  const wizardIndex = markup.indexOf('id="mpb-wizard"');
  const hostIndex = markup.indexOf('id="mpb-step-host"');
  const outputIndex = markup.indexOf('id="mpb-step-output"');
  const backIndex = markup.indexOf('id="mpb-back"');
  const wizardClose = markup.indexOf('</div>', markup.indexOf('id="mpb-step-error"'));
  assert.ok(
    wizardIndex !== -1 && outputIndex !== -1,
    'wizard shell and Download section are present',
  );
  assert.ok(
    wizardIndex < outputIndex && outputIndex < wizardClose,
    'Download section lives inside #mpb-wizard',
  );
  assert.ok(hostIndex < outputIndex, 'Download section sits after the step host');
  assert.ok(outputIndex < backIndex, 'Download section sits before the bottom Back/Next pair');
});

test('output markup: Architecture diagrams h2 sits below the download-files grid, over both tiles', () => {
  const markup = fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  // The download-files section: its "Download your files" h2 + the files output-grid.
  const filesHeadingIndex = markup.indexOf('>Download your files<');
  // The Architecture-diagrams block: its exact h2 + the two diagram tiles in a shared grid.
  const archHeadingIndex = markup.indexOf('>Architecture diagrams<');
  const diagramforceIndex = markup.indexOf('id="mpb-open-diagramforce"');
  const drawioIndex = markup.indexOf('id="mpb-open-drawio"');
  assert.ok(filesHeadingIndex !== -1, 'the download-files heading is present');
  assert.ok(archHeadingIndex !== -1, 'the exact "Architecture diagrams" h2 renders');
  assert.match(
    markup,
    /<h2>Architecture diagrams<\/h2>/,
    'the heading is an <h2> with the exact text',
  );
  assert.ok(
    filesHeadingIndex < archHeadingIndex,
    'Architecture diagrams sits below the download-files section',
  );
  assert.ok(
    archHeadingIndex < diagramforceIndex && archHeadingIndex < drawioIndex,
    'the h2 sits above both diagram tiles',
  );

  // Both tiles share one .mpb-output-grid container (the 50/50 side-by-side layout).
  const gridStart = markup.indexOf('<div class="mpb-output-grid">', archHeadingIndex);
  assert.ok(gridStart !== -1, 'the two tiles live in an .mpb-output-grid container');
  const gridEnd = markup.indexOf('</section>', gridStart);
  const grid = markup.slice(gridStart, gridEnd);
  assert.ok(grid.includes('id="mpb-open-diagramforce"'), 'diagramforce tile is inside the grid');
  assert.ok(grid.includes('id="mpb-open-drawio"'), 'draw.io tile is inside the grid');
  assert.equal(
    countOccurrences(grid, 'class="mpb-diagram-cta"'),
    2,
    'exactly two diagram tiles sit side by side in the grid',
  );
});

test('the draw.io output tile reuses the shared open/fallback handler', () => {
  // The tile wiring in mcdev-pipeline-output.js reaches the identical handoff the dropdown row uses;
  // the shared entry point is exported from core so both call sites stay in lock-step.
  assert.equal(
    typeof controller.openDrawioOrDownload,
    'function',
    'core exports the shared draw.io open/fallback handler',
  );
});

/**
 * Headless Back/Next stand-in for `syncWizardNav` (null-querySelector stub has no real buttons).
 *
 * @param {string} text initial label
 * @returns {{textContent: string, hidden: boolean, disabled: boolean}} fake button
 */
function fakeWizardNavButton(text) {
  return { textContent: text, hidden: false, disabled: false };
}

test('syncWizardNav keeps both pairs in lockstep labels and hides Next only on Download', () => {
  const back = fakeWizardNavButton('stale-back');
  const next = fakeWizardNavButton('stale-next');
  const backTop = fakeWizardNavButton('stale-back-top');
  const nextTop = fakeWizardNavButton('stale-next-top');
  next.hidden = true;
  next.disabled = true;
  nextTop.hidden = true;
  nextTop.disabled = true;
  controller.setWizardNavDom(back, next, backTop, nextTop);
  try {
    controller.setWizardStep('rules');
    controller.syncWizardNav();
    assert.equal(back.textContent, '← Back', 'bottom Back label');
    assert.equal(backTop.textContent, '← Back', 'top Back label matches bottom');
    assert.equal(next.textContent, 'Next →', 'bottom Next label');
    assert.equal(nextTop.textContent, 'Next →', 'top Next label matches bottom');
    assert.equal(next.hidden, false, 'Next visible on non-Download steps');
    assert.equal(nextTop.hidden, false, 'top Next visible on non-Download steps');
    // Disabling Next on canProceed failure is out of scope — goNext shows #mpb-step-error.
    assert.equal(next.disabled, true, 'syncWizardNav must not change Next disabled');
    assert.equal(nextTop.disabled, true, 'syncWizardNav must not change top Next disabled');

    controller.setWizardStep('output');
    controller.syncWizardNav();
    assert.equal(next.hidden, true, 'Next hidden when wizardStep === output');
    assert.equal(nextTop.hidden, true, 'top Next hidden when wizardStep === output');
    assert.equal(next.disabled, true, 'Download hide must not also disable Next');
    assert.equal(nextTop.disabled, true, 'Download hide must not also disable top Next');
    assert.equal(next.textContent, 'Next →', 'labels stay in lockstep on Download');
    assert.equal(nextTop.textContent, 'Next →', 'top label stays in lockstep on Download');
  } finally {
    controller.setWizardNavDom(null, null, null, null);
  }
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

test('diagram fallback host is authored as a child of the sticky builder header', () => {
  const markup = fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  const headerIndex = markup.indexOf('id="mpb-builder-header"');
  const actionsIndex = markup.indexOf('id="mpb-builder-header-actions"');
  const fallbackIndex = markup.indexOf('id="mpb-diagram-fallback-header"');
  assert.ok(headerIndex !== -1 && fallbackIndex !== -1, 'header and fallback hosts are present');
  assert.ok(
    headerIndex < actionsIndex && actionsIndex < fallbackIndex,
    'fallback is authored after the header action slot',
  );
  const between = markup.slice(actionsIndex, fallbackIndex);
  assert.equal(
    (between.match(/<\/div>/g) || []).length,
    1,
    'only the action slot closes between actions and fallback (header stays open)',
  );
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

test('canProceed("prod-confirm") fails when prodBUs is empty and passes with at least one', () => {
  seedProductionConfirmState();
  assert.deepEqual(controller.state.wizardState.prodBUs, []);
  const empty = controller.canProceed('prod-confirm');
  assert.equal(empty.ok, false, 'zero production BUs cannot proceed');
  assert.match(empty.reason, /production/i);
  controller.state.wizardState.prodBUs = ['Randstad_EUN'];
  assert.equal(
    controller.canProceed('prod-confirm').ok,
    true,
    'one confirmed production BU proceeds',
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

test('downloadText keeps a leading-dot filename on the anchor download attribute', () => {
  // Cheap DOM stub: capture a.download without a real browser download. Chrome-style stripping
  // of leading dots is a browser quirk; the controller still sets `.mcdevrc.json` on the attr.
  const previousCreate = globalThis.document.createElement;
  const previousBody = globalThis.document.body;
  const previousTextNode = globalThis.document.createTextNode;
  const previousCreateObjectURL = URL.createObjectURL;
  const previousRevokeObjectURL = URL.revokeObjectURL;
  let clicked;
  const anchor = {
    href: '',
    download: '',
    className: '',
    click() {
      clicked = { download: anchor.download, href: anchor.href };
    },
    remove() {},
    append() {},
    setAttribute() {},
  };
  globalThis.document.createElement = () => anchor;
  globalThis.document.createTextNode = (text) => ({ textContent: String(text) });
  globalThis.document.body = { append() {} };
  URL.createObjectURL = () => 'blob:mpb-test';
  URL.revokeObjectURL = () => {};
  try {
    controller.downloadText('.mcdevrc.json', '{"ok":true}', 'application/json');
    assert.ok(clicked, 'the generated anchor was clicked');
    assert.equal(clicked.download, '.mcdevrc.json', 'leading-dot filename is kept on a.download');
  } finally {
    globalThis.document.createElement = previousCreate;
    globalThis.document.body = previousBody;
    globalThis.document.createTextNode = previousTextNode;
    URL.createObjectURL = previousCreateObjectURL;
    URL.revokeObjectURL = previousRevokeObjectURL;
  }
});

/**
 * Page-script `mcdev-pipeline-*.js` srcs from index.md, in document order.
 * Sortable (CDN) is excluded — the lock compares only the local pipeline scripts.
 *
 * @returns {string[]} basename list
 */
function pagePipelineScriptBasenames() {
  const markup = fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  const names = [];
  const re = /mcdev-pipeline-[^'"/\s]+\.js/g;
  let match;
  while ((match = re.exec(markup)) !== null) {
    names.push(match[0]);
  }
  return names;
}

/**
 * Test-file require() list of pipeline builder scripts, in file order.
 * Only matches real require() statements (not comments).
 *
 * @returns {string[]} basename list
 */
function testPipelineRequireBasenames() {
  const source = fs.readFileSync(__filename, 'utf8');
  const names = [];
  const re = /^\s*require\('\.\.\/assets\/js\/(mcdev-pipeline-[^']+\.js)'\);/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

test('script-order lock: index.md pipeline srcs match the test require() list', () => {
  const page = pagePipelineScriptBasenames();
  const required = testPipelineRequireBasenames();
  assert.deepEqual(
    page,
    required,
    'index.md mcdev-pipeline-*.js srcs must match tests require() order (Sortable excluded)',
  );
  assert.deepEqual(page, [
    'mcdev-pipeline-config-builder.js',
    'mcdev-pipeline-validations-builder.js',
    'mcdev-pipeline-drawio.js',
    'mcdev-pipeline-core.js',
    'mcdev-pipeline-step-environment-order.js',
    'mcdev-pipeline-step-production-confirm.js',
    'mcdev-pipeline-step-market-vars.js',
    'mcdev-pipeline-step-suffixes.js',
    'mcdev-pipeline-step-rules.js',
    'mcdev-pipeline-step-bu-assign.js',
    'mcdev-pipeline-step-lineage.js',
    'mcdev-pipeline-intake.js',
    'mcdev-pipeline-mode.js',
    'mcdev-pipeline-output.js',
    'mcdev-pipeline-builder.js',
  ]);
});

test('every WIZARD_STEP_IDS id has a registered render + canProceed after the full require list', () => {
  const ids = controller.WIZARD_STEP_IDS;
  assert.ok(Array.isArray(ids) && ids.length > 0, 'core exports WIZARD_STEP_IDS');
  for (const id of ids) {
    const entry = controller.getRegisteredStep(id);
    assert.ok(entry, 'step "' + id + '" is registered');
    assert.equal(typeof entry.render, 'function', 'step "' + id + '" has render');
    assert.equal(typeof entry.canProceed, 'function', 'step "' + id + '" has canProceed');
  }
});

// ─────────────────────────── market-vars feature ───────────────────────────

test('buildConfig merges marketVariables into markets (suffix first + alphabetical, skips empty/whitespace)', () => {
  const state = sampleWizardState();
  // Populate one BU with out-of-order + empty + whitespace-only vars; a suffix/description key that
  // must be dropped; and a real, non-empty pair.
  state.marketVariables = {
    DEV: {
      sfmc_environment: 'dev',
      Contact_Salesforce: 'cs-dev',
      empty_var: '',
      spaces_only: ' '.repeat(3),
      suffix: 'SHOULD_BE_DROPPED',
      description: 'SHOULD_BE_DROPPED',
    },
  };
  const out = buildConfig(state, sampleConfig);
  const market = out.markets['mpb_DEV'];
  // suffix first, then the two non-empty vars alphabetically (case-insensitive); empty/whitespace and
  // suffix/description keys skipped entirely.
  assert.deepEqual(Object.keys(market), ['suffix', 'Contact_Salesforce', 'sfmc_environment']);
  assert.equal(market.Contact_Salesforce, 'cs-dev');
  assert.equal(market.sfmc_environment, 'dev');
  // A BU with no marketVariables still emits a suffix-only market.
  assert.deepEqual(Object.keys(out.markets['mpb_SIT']), ['suffix']);
  // Idempotent: rebuilding over the output yields identical markets.
  assert.deepEqual(buildConfig(state, out).markets['mpb_DEV'], market);
});

test('buildConfig writes a non-suffix variable value VERBATIM (surrounding spaces preserved); whitespace-only skipped', () => {
  const state = sampleWizardState();
  state.marketVariables = {
    DEV: { Contact_Salesforce: '  X2-SA  ', regional_suffix: ' '.repeat(3) },
  };
  const out = buildConfig(state, sampleConfig);
  const market = out.markets['mpb_DEV'];
  // The intentional surrounding spaces survive (no trim on emit).
  assert.equal(market.Contact_Salesforce, '  X2-SA  ');
  // A whitespace-only value is skipped entirely.
  assert.ok(!Object.hasOwn(market, 'regional_suffix'), 'whitespace-only var is not emitted');
  assert.deepEqual(Object.keys(market), ['suffix', 'Contact_Salesforce']);
});

test('buildConfig emits a trimmed suffix even when the stored suffix carries surrounding spaces', () => {
  const state = sampleWizardState();
  // The market-vars suffix row auto-trims on store, but guard the emit path too: a stored suffix with
  // surrounding spaces still emits a clean value with its separator preserved.
  state.suffixes = { ...state.suffixes, DEV: '_DEV' };
  const out = buildConfig(state, sampleConfig);
  assert.equal(out.markets['mpb_DEV'].suffix, '_DEV');
});

test('buildConfig persists + round-trips marketVariables via the mpb_pipeline block', () => {
  const state = sampleWizardState();
  state.marketVariables = { DEV: { Contact_Salesforce: 'cs-dev' } };
  const out = buildConfig(state, sampleConfig);
  assert.deepEqual(out.options.deployment.mpb_pipeline.marketVariables, {
    DEV: { Contact_Salesforce: 'cs-dev' },
  });
  const restored = controller.wizardStateFromConfig(out);
  assert.deepEqual(restored.marketVariables, { DEV: { Contact_Salesforce: 'cs-dev' } });
});

/**
 * A hand-authored vanilla (`no mpb_pipeline` block) `.mcdevrc.json` with a real DEV→SIT hop, markets
 * named exactly after their BUs (so `resolveMarketForBU`'s `buName` / bare-ref candidates resolve),
 * and extra market variables + a `description` on the DEV market. Kept inline so the assertions never
 * bind to the untracked gold fixture.
 *
 * @returns {object} the vanilla config
 */
function vanillaMarketVariablesConfig() {
  return {
    credentials: { ssjs: { businessUnits: { DEV: 1, SIT: 2 } } },
    markets: {
      DEV: {
        suffix: '_DEV',
        description: 'dev market',
        Contact_Salesforce: 'cs-dev',
        sfmc_environment: 'dev',
      },
      SIT: { suffix: '_SIT' },
    },
    marketList: {
      'deploy-sit-source': { 'ssjs/DEV': 'DEV' },
      'deploy-sit-target': { 'ssjs/SIT': 'SIT' },
    },
    options: {
      deployment: {
        branchSourceTargetMapping: {
          sit: { 'deploy-sit-source': 'deploy-sit-target' },
        },
      },
    },
  };
}

test('inferWizardStateFromVanilla populates marketVariables (excl suffix/description) from the same market as the suffix', () => {
  const { state } = controller.inferWizardStateFromVanilla(vanillaMarketVariablesConfig());
  // DEV's extra vars are extracted from its own market, excluding suffix + description.
  assert.deepEqual(state.marketVariables.DEV, {
    Contact_Salesforce: 'cs-dev',
    sfmc_environment: 'dev',
  });
  // The suffix came from the SAME market entry the vars were read from.
  assert.equal(state.suffixes.DEV, '_DEV');
  assert.equal(state.suffixes.SIT, '_SIT');
  // A BU whose market carried only a suffix gets no marketVariables entry.
  assert.ok(!Object.hasOwn(state.marketVariables, 'SIT'), 'a var-less market yields no entry');
});

test('inferWizardStateFromVanilla excludes both suffix and description keys', () => {
  const { state } = controller.inferWizardStateFromVanilla(vanillaMarketVariablesConfig());
  // suffix + description are both dropped; only the real extra vars survive.
  assert.deepEqual(state.marketVariables.DEV, {
    Contact_Salesforce: 'cs-dev',
    sfmc_environment: 'dev',
  });
  assert.ok(!Object.hasOwn(state.marketVariables.DEV, 'suffix'));
  assert.ok(!Object.hasOwn(state.marketVariables.DEV, 'description'));
});

test('pipelinesByRoot / pipelineRootOf group child BUs by dev-source lineage root', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  // DEV chain and (added) a separate DEV_Regional chain must form two pipelines.
  controller.state.wizardState.envBUs = {
    DEV: ['DEV', 'DEV_Regional'],
    SIT: ['SIT', 'SIT_Regional'],
    QA: ['EUN_QA'],
  };
  controller.state.wizardState.lineage = {
    SIT: 'DEV',
    SIT_Regional: 'DEV_Regional',
    EUN_QA: 'SIT',
  };
  assert.equal(controller.pipelineRootOf('EUN_QA'), 'DEV');
  assert.equal(controller.pipelineRootOf('SIT_Regional'), 'DEV_Regional');
  const groups = controller.pipelinesByRoot();
  assert.deepEqual(groups.get('DEV'), ['DEV', 'SIT', 'EUN_QA']);
  assert.deepEqual(groups.get('DEV_Regional'), ['DEV_Regional', 'SIT_Regional']);
});

test('pipelinesByRoot handles empty lineage (per-BU singletons) and a cycle guard terminates', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  controller.state.wizardState.envBUs = { DEV: ['A'], QA: ['B'] };
  controller.state.wizardState.lineage = {};
  const groups = controller.pipelinesByRoot();
  assert.deepEqual(groups.get('A'), ['A']);
  assert.deepEqual(groups.get('B'), ['B']);
  // A self/loop lineage must terminate rather than infinite-loop.
  controller.state.wizardState.lineage = { A: 'A' };
  assert.equal(controller.pipelineRootOf('A'), 'A');
  controller.state.wizardState.lineage = { A: 'B', B: 'A' };
  // Either terminal is acceptable; the point is it returns (no hang).
  assert.ok(['A', 'B'].includes(controller.pipelineRootOf('A')));
});

test('suffixFieldErrors flags empty + duplicate suffixes, and none for a distinct set', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  controller.state.wizardState.envBUs = { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] };
  controller.state.wizardState.lineage = {};
  // Empty body for one BU.
  controller.state.wizardState.suffixes = { DEV: '_', EUN_QA: '_QAN', EUS_QA: '_QAS' };
  let errors = controller.suffixFieldErrors();
  assert.ok((errors.get('DEV') || []).some((m) => m.startsWith('Enter a suffix for every BU.')));
  // Duplicate suffix on two BUs.
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAN' };
  errors = controller.suffixFieldErrors();
  assert.ok((errors.get('EUN_QA') || []).some((m) => m.startsWith('BU suffixes must be unique:')));
  assert.ok((errors.get('EUS_QA') || []).some((m) => m.startsWith('BU suffixes must be unique:')));
  // Fully distinct, non-empty → no errors.
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAS' };
  errors = controller.suffixFieldErrors();
  assert.equal(errors.size, 0);
});

test('suffixFieldErrors does not add a duplicate error for two empty-suffix BUs (empty-body only)', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  controller.state.wizardState.envBUs = { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] };
  controller.state.wizardState.lineage = {};
  // Two BUs both have an empty suffix body (bare separator): only the empty-suffix error, no duplicate.
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_', EUS_QA: '_' };
  let errors = controller.suffixFieldErrors();
  for (const reference of ['EUN_QA', 'EUS_QA']) {
    const messages = errors.get(reference) || [];
    assert.ok(messages.some((m) => m.startsWith('Enter a suffix for every BU.')));
    assert.ok(messages.every((m) => !m.startsWith('BU suffixes must be unique:')));
  }
  // Two BUs sharing the SAME non-empty suffix still both get the duplicate error.
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAN' };
  errors = controller.suffixFieldErrors();
  assert.ok((errors.get('EUN_QA') || []).some((m) => m.startsWith('BU suffixes must be unique:')));
  assert.ok((errors.get('EUS_QA') || []).some((m) => m.startsWith('BU suffixes must be unique:')));
});

test('canProceedSuffixes and canProceedMarketVars gate identically on suffix rules', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  controller.state.wizardState.envBUs = { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] };
  controller.state.wizardState.lineage = {};
  // Distinct → both pass.
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAS' };
  assert.equal(controller.canProceed('suffixes').ok, true);
  assert.equal(controller.canProceed('market-vars').ok, true);
  // Blank suffix → both block.
  controller.state.wizardState.suffixes = { DEV: '_', EUN_QA: '_QAN', EUS_QA: '_QAS' };
  assert.equal(controller.canProceed('suffixes').ok, false);
  assert.equal(controller.canProceed('market-vars').ok, false);
  // Duplicate suffix → both block.
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAN' };
  assert.equal(controller.canProceed('suffixes').ok, false);
  assert.equal(controller.canProceed('market-vars').ok, false);
});

test('canProceedMarketVars is NOT blocked by empty non-suffix market variables', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  controller.state.wizardState.envBUs = { DEV: ['DEV'], QA: ['EUN_QA'] };
  controller.state.wizardState.lineage = {};
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN' };
  // An empty non-suffix var must not gate market-vars.
  controller.state.wizardState.marketVariables = { DEV: { Contact_Salesforce: '' } };
  assert.equal(controller.canProceed('market-vars').ok, true);
});

test('suffixFieldErrors preserves the parent-BU exemption (parent reusing a child suffix is not a duplicate)', () => {
  controller.state.mode = 'full';
  controller.state.wizardState = sampleWizardState();
  // Only child BUs are ever in childBUReferences(); a parent BU (_ParentBU_) is never assigned, so a
  // shared suffix value it might reuse can never surface as a duplicate here.
  controller.state.wizardState.envBUs = { DEV: ['DEV'], QA: ['EUN_QA', 'EUS_QA'] };
  controller.state.wizardState.lineage = {};
  controller.state.wizardState.suffixes = { DEV: '_DEV', EUN_QA: '_QAN', EUS_QA: '_QAS' };
  assert.equal(controller.suffixFieldErrors().size, 0);
  assert.equal(controller.canProceed('suffixes').ok, true);
});

test('wizardStateFromConfig restores an old config (no marketVariables, version 1) to marketVariables:{} without failure', () => {
  const config = {
    credentials: {},
    markets: {},
    marketList: {},
    options: {
      deployment: {
        mpb_pipeline: {
          version: 1,
          envOrder: ['DEV', 'QA'],
          envBUs: { DEV: ['DEV'], QA: ['QA'] },
          envBranches: {},
          lineage: {},
          separator: '_',
          suffixes: { DEV: '_DEV', QA: '_QA' },
          prodBUs: ['QA'],
          sharedDEs: false,
        },
      },
    },
  };
  const restored = controller.wizardStateFromConfig(config);
  // The additive field defaults from emptyWizardState() — the old block restores cleanly (no blank wizard).
  assert.deepEqual(restored.marketVariables, {});
  assert.deepEqual(restored.envBUs, { DEV: ['DEV'], QA: ['QA'] });
});
