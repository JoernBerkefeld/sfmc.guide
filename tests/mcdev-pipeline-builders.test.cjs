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
    lineage: {},
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
  // every generated market carries the mpb_managed marker + a real suffix
  const generated = marketNames.filter((n) => n.startsWith('mpb_'));
  for (const name of generated) {
    assert.equal(out.markets[name].mpb_managed, true);
    assert.equal(typeof out.markets[name].suffix, 'string');
  }
});

test('buildConfig builds source/target marketLists per hop', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const mls = Object.keys(out.marketList);
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
});

test('buildConfig parent pipeline uses a stringLike include filter with [_] separators', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const parentSource = out.marketList['mpb_deployment-sit-parent-source'];
  assert.ok(parentSource, 'parent-source marketList exists when sharedDEs is on');
  const patterns = parentSource.filter.include.key['*'];
  assert.ok(Array.isArray(patterns));
  // upstream env is DEV (suffix _DEV) -> separator underscore rendered literal [_]
  assert.ok(patterns.some((p) => p.includes('[_]DEV')));
  // _ParentBU_ self-reference present
  assert.ok(Object.keys(parentSource).some((k) => k.endsWith('/_ParentBU_')));
});

test('buildConfig branchSourceTargetMapping + targetBranchBuMapping wired', () => {
  const out = buildConfig(sampleWizardState(), sampleConfig);
  const branchMap = out.options.deployment.branchSourceTargetMapping;
  assert.equal(branchMap.sit['mpb_deployment-sit-source'], 'mpb_deployment-sit-target');
  const hops = out.options.deployment.targetBranchBuMapping;
  assert.equal(hops.length, 4); // 5 envs -> 4 hops
  // branch keys are derived from the env display names (DEV -> "dev", UAT -> "uat")
  assert.equal(hops[0].dev, 'ssjs/DEV');
  assert.deepEqual(hops[2].uat, ['ssjs/EUN_UAT', 'ssjs/EUS_UAT']);
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

test('buildValidations output parses as JavaScript', () => {
  const source = buildValidations(sampleValidationsState());
  // strip the ESM `export ` so we can compile with the classic-script parser
  const compilable = source.replace('export function validation', 'function validation');
  assert.doesNotThrow(() => new vm.Script(compilable), 'emitted validations source must parse');
});

test('buildValidations includes prodBUorNotMap only when a prod-scoped rule is selected', () => {
  const withProduction = buildValidations(sampleValidationsState());
  assert.ok(withProduction.includes('const prodBUorNotMap ='));
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
  assert.deepEqual(ids, ['env-order', 'bu-assign', 'lineage', 'suffixes', 'prod-confirm', 'rules']);
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
    // Both envs have a BU → hard gate passes. B has two BUs so the lineage step stays visible (a
    // single-BU-per-env pipeline auto-skips lineage). QA stays pooled → the soft gate applies.
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
    controller.isForwardJumpSoftBlocked('bu-assign', 'lineage'),
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
    controller.isForwardJumpSoftBlocked('bu-assign', 'lineage'),
    false,
    'a confirmed set no longer blocks the forward jump',
  );

  // With no unassigned BUs at all, the gate never applies (assign QA, clear the latch again).
  controller.setUnassignedConfirmed(false);
  controller.assignBUToEnvironment('QA', 'B');
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'lineage'),
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
  controller.jumpToStep('lineage');

  assert.equal(
    controller.state.step,
    stepBefore,
    'a blocked jump does not change the top-level view',
  );
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'lineage'),
    true,
    'the jump was blocked, not committed — the soft gate still holds',
  );

  // Confirm the set → the same forward jump is now permitted by the gate.
  controller.setUnassignedConfirmed(true);
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'lineage'),
    false,
    'after confirming, the forward jump is no longer soft-blocked',
  );
});

test('confirmUnassignedGoBack: dismissing the banner clears the pending stepper-jump stash (no navigation)', () => {
  seedSoftGateBoard();
  controller.persistence.currentId = null;
  const stepBefore = controller.state.step;

  // A soft-blocked forward jump stashes the target (the banner would normally be shown).
  controller.jumpToStep('lineage');
  assert.equal(
    controller.getPendingJumpTarget(),
    'lineage',
    'the blocked forward jump stashes its target',
  );

  // "Go back and assign" — the exact function the banner button invokes — must drop the stash and
  // NOT navigate. The user stays on bu-assign to finish assigning.
  controller.confirmUnassignedGoBack();
  assert.equal(controller.getPendingJumpTarget(), null, 'the pending jump stash is cleared');
  assert.equal(controller.state.step, stepBefore, 'dismissing the banner does not navigate');
  assert.equal(
    controller.isForwardJumpSoftBlocked('bu-assign', 'lineage'),
    true,
    'the soft gate still holds — nothing was confirmed',
  );
});

test('goBack: a Back navigation also clears a pending stepper-jump stash (defense-in-depth)', () => {
  seedSoftGateBoard();
  controller.persistence.currentId = null;

  // Stash a pending forward jump via the soft gate.
  controller.jumpToStep('lineage');
  assert.equal(controller.getPendingJumpTarget(), 'lineage', 'precondition: a jump is stashed');

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
    { id: 'lineage', title: 'Lineage' },
    { id: 'suffixes', title: 'Suffixes' },
  ];
  // All hard gates pass, but the soft gate is engaged (4th arg true) → no forward step is clickable.
  const blocked = controller.computeStepperStates(steps, 'bu-assign', gateAllOk, true);
  assert.equal(
    blocked[1].clickable,
    false,
    'lineage is not clickable while unassigned-BUs unconfirmed',
  );
  assert.equal(blocked[2].clickable, false, 'suffixes is not clickable either');

  // Same steps, soft gate cleared → forward steps become clickable again.
  const allowed = controller.computeStepperStates(steps, 'bu-assign', gateAllOk, false);
  assert.equal(allowed[1].clickable, true, 'lineage clickable once the soft gate clears');
  assert.equal(allowed[2].clickable, true, 'suffixes clickable once the soft gate clears');
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
