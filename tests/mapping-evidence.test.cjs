'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const directory = path.join(__dirname, '../next/data-cloud-devops');
const mapping = fs.readFileSync(path.join(directory, 'dlo-dmo-mapping.md'), 'utf8');
const evidence = mapping.split('<details markdown="1">')[1];

test('mapping attributes native routes to Connect REST without qualifying workflows', () => {
  assert.match(mapping, /\/services\/data\/vXX\.0\/ssot\/data-model-object-mappings/);
  assert.match(mapping, /\*\*Data 360 Connect REST API\*\*/);
  assert.match(mapping, /SOAP-based Metadata API/);
  assert.match(mapping, /https:\/\/developer\.salesforce\.com\/docs\/data\/connectapi\/guide\/dmo-use-case\.md/);
  assert.match(mapping, /This attribution alone does not qualify a native mapping workflow/);
  const cli = mapping.split('{% capture read_cli %}')[1].split('{% endcapture %}')[0];
  assert.match(cli, /\*\*Metadata API \(XML\):\*\*/);
  assert.match(cli, /`ObjectSourceTargetMap` definitions, not the native Connect REST JSON route/);
});

test('chapters start with captures and Evidence keeps the scoped restrictions', () => {
  for (const operation of ['Create', 'Read', 'Update', 'Delete']) {
    const section = mapping.split(`## ${operation}\n`)[1].split('\n## ')[0];
    assert.match(section.trimStart(), /^\{% capture /, operation);
    assert.ok(section.includes('{% include operation-tabs.html'));
  }
  assert.match(evidence, /001993463&language=en_US&type=1/);
});

test('mapping page carries no history, dated records or stale refusals', () => {
  assert.doesNotMatch(
    mapping,
    /NATIVE_INVENTORY_UNCONFIRMED|UNSUPPORTED_MAPPING_MULTI_PAIR_UPDATE|A sample (?:response |of the output |file )?is not in this guide yet|\*\*Timings:\*\*|API61–68 deletion admission|exact API ?61/i,
  );
  assert.doesNotMatch(mapping, /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 2026\b/);
  assert.doesNotMatch(mapping, /F:[/\\]Temp|\/aura|UNSAFE_SOURCE|deployable:false/i);
  assert.doesNotMatch(mapping, /### Installed API 61 create|7 → 6 → 5 pairs|HTTP `201` envelopes/);
  assert.doesNotMatch(mapping, /public lifecycle pending|INVALID_SELECTION|MAPPING_UNMAP_FIELD_POLICY_UNPROVEN|MAPPING_SURVIVOR_UNCONFIRMED|MAPPING_DELETE_SAFETY_HOLD/);
});

test('native create and update tabs show the names-only request bodies', () => {
  for (const [operation, file, pairs] of [
    ['create', 'mapping-create.json', ['Id__c', 'Alpha__c']],
    ['update', 'mapping-add-pair.json', ['Beta__c']],
  ]) {
    const api = mapping.split(`{% capture ${operation}_connect %}`)[1].split('{% endcapture %}')[0];
    assert.ok(api.includes(`@${file}`));
    const body = JSON.parse(api.match(/```json\n([\s\S]*?)\n```/)[1]);
    assert.deepEqual(Object.keys(body), [
      'sourceEntityDeveloperName',
      'targetEntityDeveloperName',
      'fieldMapping',
    ]);
    assert.equal(body.sourceEntityDeveloperName, 'CustomerSource__dll');
    assert.equal(body.targetEntityDeveloperName, 'Customer__dlm');
    assert.deepEqual(
      body.fieldMapping.map((pair) => Object.keys(pair).join()),
      pairs.map(() => 'sourceFieldDeveloperName,targetFieldDeveloperName'),
    );
    assert.deepEqual(body.fieldMapping.map((pair) => pair.sourceFieldDeveloperName), pairs);
  }
});

test('Read tabs show the plugin file shape and a Connect response excerpt', () => {
  const plugin = mapping.split('{% capture read_plugin %}')[1].split('{% endcapture %}')[0];
  assert.match(plugin, /sf data360 retrieve -m mapping:CustomerMapping/);
  assert.match(plugin, /The pairs Salesforce generates are left out/);
  assert.match(plugin, /data360\/mapping\/CustomerMapping\.mapping-meta\.json/);
  assert.match(plugin, /not an `ObjectSourceTargetMap` XML fallback/);
  const file = JSON.parse(plugin.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(file.kind, 'mapping');
  assert.deepEqual(Object.keys(file.spec), ['sourceEntityDeveloperName', 'targetEntityDeveloperName', 'fieldMappings']);
  assert.match(plugin, /`sf data360 retrieve -m mapping -o SOURCE_ALIAS` saves every mapping/);
  assert.match(plugin, /offline-tested/);
  const connect = mapping.split('{% capture read_connect %}')[1].split('{% endcapture %}')[0];
  const excerpt = JSON.parse(connect.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(excerpt.status, 'ACTIVE');
  assert.ok(excerpt.fieldMappings.every((pair) => pair.developerName));
});

test('mapping rename keeps canonical URL, redirect and legacy anchor', () => {
  assert.match(mapping, /^title: "DLO-DMO-mapping"$/m);
  assert.match(mapping, /^permalink: \/next\/data-cloud-devops\/dlo-dmo-mapping\/$/m);
  assert.match(mapping, /redirect_from:\n  - \/next\/data-cloud-cli\/dlo-dmo-mapping\/\n  - \/next\/data-cloud-cli\/object-source-target-map\//);
  assert.match(mapping, /id="dlo-to-dmo-mapping-objectsourcetargetmap"/);
});

test('mapping preserves standard CLI workflow, CRUD tabs and bounded write ratings', () => {
  assert.match(
    mapping,
    /sf project retrieve start --metadata ObjectSourceTargetMap:CustomerMapping --target-org SOURCE_ALIAS --api-version 65\.0/,
  );
  assert.equal((mapping.match(/include operation-tabs\.html/g) || []).length, 4);
  for (const operation of ['read', 'create', 'update', 'delete']) {
    assert.ok(mapping.includes(`id="mapping-${operation}"`));
  }
  assert.match(mapping, /read: \{ status: "yes", methods: \[cli, api, plugin\], method_statuses: \{ cli: "yes", api: "yes", plugin: "yes" \} \}/);
  assert.match(mapping, /create: \{ status: "yes", methods: \[cli, api, plugin\], method_statuses: \{ cli: "yes", api: "yes", plugin: "partial" \} \}/);
  assert.match(mapping, /update: \{ status: "partial", methods: \[cli, api, plugin\], method_statuses: \{ cli: "partial", api: "partial", plugin: "partial" \} \}/);
  assert.match(mapping, /delete: \{ status: "yes", methods: \[cli, api, plugin\], method_statuses: \{ cli: "partial", api: "partial", plugin: "yes" \} \}/);
  assert.match(mapping, /verification: verified/);
  assert.ok(mapping.indexOf('**Verification scope:**') > mapping.indexOf('<details markdown="1">'));
  for (const operation of ['read', 'create', 'update']) {
    assert.match(mapping, new RegExp(`id="mapping-${operation}"[^\\n]+connect_state="available"[^\\n]+plugin_state="available"[^\\n]+plugin_body=${operation}_plugin`));
  }
  assert.match(mapping, /id="mapping-delete"[^\n]+cli_state="available"[^\n]+cli_body=delete_cli[^\n]+connect_state="available"[^\n]+connect_body=delete_connect[^\n]+plugin_state="available"[^\n]+plugin_body=delete_plugin/);
});

test('plugin update shows the desired-state file, the pair DELETE route and offline-tested output', () => {
  const plugin = mapping.split('{% capture update_plugin %}')[1].split('{% endcapture %}')[0];
  assert.match(plugin, /Authored pairs left out of `fieldMappings` are removed/);
  assert.match(plugin, /one names-only PATCH/);
  assert.match(plugin, /Deleted field mappings: Note__c -> Note__c/);
  assert.match(plugin, /Added field mappings: Beta__c -> Beta__c/);
  assert.match(plugin, /`MAPPING_PROTECTED_PAIR_REQUIRED`/);
  assert.match(plugin, /Reconciliation runs from API `61\.0`/);
  const connect = mapping.split('{% capture update_connect %}')[1].split('{% endcapture %}')[0];
  assert.match(connect, /field-mappings\/Beta__c_fieldmap_Beta__c/);
  assert.match(connect, /method DELETE/);
  assert.match(connect, /`v64\.0`/);
});

test('evidence reports observed rows, plugin behaviour and unrecorded observations separately', () => {
  assert.match(evidence, /### Observed at API 68 unless noted/);
  assert.match(evidence, /### Plugin behaviour \(offline-tested\)/);
  // B3 sweep (2026-11-16): the unrecorded observations were retested live and recorded.
  assert.match(evidence, /### CLI, Metadata API and native retests at API 68\.0/);
  assert.match(evidence, /MISSING_ARGUMENT/);
  assert.match(evidence, /Pair add \(PATCH `200`\) and pair DELETE \(`204`\) work at API 64/);
  assert.match(evidence, /API 61 and at API 64/);
  assert.match(evidence, /`DEPENDENCY_EXISTS`/);
  assert.match(evidence, /non-last mapping took 48 seconds, and the only mapping of the standard DMO 25 and 28 seconds/);
  assert.match(evidence, /Numeric pins from `61\.0` are admitted for retrieve, deploy, pair reconciliation and whole-mapping deletion/);
  assert.match(evidence, /saved mapping names and selectors are not target identity/);
  assert.match(evidence, /do not combine both selection modes/);
  assert.match(evidence, /Is Valid Interface: false/);
  assert.doesNotMatch(evidence.split('### CLI, Metadata API and native retests')[0], /Is Valid Interface/);
});

test('plugin mapping deletion is one Metadata API deployment with a single refusal', () => {
  const section = mapping.split('## Delete\n')[1];
  const plugin = section.split('{% capture delete_plugin %}')[1].split('{% endcapture %}')[0];
  assert.match(plugin, /sf data360 delete --metadata dmo:Customer__dlm -o TARGET_ALIAS/);
  assert.match(plugin, /--keep-local-files/);
  assert.match(plugin, /`--preview` reads the mapping/);
  assert.ok(mapping.includes('sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0 --preview'));
  assert.ok(mapping.includes('sf data360 delete -m mapping:CustomerMapping -o TARGET_ALIAS --api-version 68.0\n'));
  assert.match(plugin, /no confirmation prompt or extra execution flag/);
  assert.match(evidence, /type `ObjectSourceTargetMap`, member the mapping developer name/);
  assert.match(evidence, /does not unmap pairs first and sends no native DELETE/);
  assert.match(evidence, /is the \*\*last mapping of a custom DMO\*\*/);
  assert.match(evidence, /last mapping of a \*\*standard\*\* DMO is deleted normally/);
  assert.match(evidence, /up to 6 reads, 5 seconds apart/);
  for (const code of [
    'MAPPING_LAST_MAPPING_DELETE_BLOCKED',
    'MAPPING_DELETE_FAILED',
    'MAPPING_DELETION_UNCONFIRMED',
    'MAPPING_DELETE_SIDE_EFFECT',
  ])
    assert.ok(evidence.includes('| `' + code + '` |'), code);
  assert.match(evidence, /LOCAL_FILE_REMOVAL_FAILED/);
  assert.match(mapping, /Salesforce does not delete the last mapping of a custom DMO/);
});
