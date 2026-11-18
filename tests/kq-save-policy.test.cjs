'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) =>
  fs.readFileSync(path.join(__dirname, '../next/data-cloud-cli', name), 'utf8');
const dlo = read('data-lake-object.md');
const dmo = read('data-model-object.md');
const pluginTab = (page) =>
  page.match(/{% capture read_plugin %}([\s\S]*?){% endcapture %}/)[1].replaceAll(/\s+/g, ' ');
const generatedSystemFields = ['DataSource__c', 'DataSourceObject__c', 'InternalOrganization__c'];

test('Retrieve plugin tabs explain lean authored files without deletion or mapping claims', () => {
  for (const page of [dlo, dmo]) {
    const tab = pluginTab(page);
    for (const term of [
      'authored fields',
      'KQ_Id__c',
      ...generatedSystemFields,
      'source context',
      'collisions',
      'CREATE',
      'field deletion',
      'mapping auto-pair',
      'Id__c',
      'Custom qualifiers',
      'keyQualifierName',
      'deploys back `unchanged`',
    ]) {
      assert.ok(tab.includes(term), term);
    }
    assert.match(tab, /raw API[\s\S]*?remain(?:s)? complete/);
    assert.doesNotMatch(tab, /omitting only|only the confirmed system-generated/);
  }
  const dloTab = pluginTab(dlo);
  for (const term of [
    'cdp_sys_SourceVersion__c',
    'cdp_sys_PartitionDate__c',
    'eventDateTimeFieldName',
  ])
    assert.ok(dloTab.includes(term), term);
  assert.match(pluginTab(dmo), /standard fields of a standard DMO/);
});

test('Qualifier enum spellings stay resource-specific', () => {
  assert.match(pluginTab(dlo), /definitionCreationType=System/);
  assert.match(pluginTab(dlo), /usageTag=KEY_QUALIFIER/);
  assert.match(pluginTab(dmo), /creationType=System/);
  assert.match(pluginTab(dmo), /usageTag=KeyQualifier/);
  assert.match(pluginTab(dmo), /Current default\/`auto` is API68/);
  const include = dmo.match(/{% include operation-tabs\.html id="dmo-read"[^\n]+/)[0];
  assert.match(include, /plugin_state="available"/);
  assert.match(include, /plugin_body=read_plugin/);
});

test('DMO plugin retrieval distinguishes admitted versions from mapping or ingestion qualification', () => {
  const tab = pluginTab(dmo);
  assert.match(tab, /sf data360 retrieve -m dmo:Customer__dlm -o SOURCE_ALIAS /);
  assert.doesNotMatch(tab, /--api-version/);
  assert.match(tab, /data360\/dmo\/Customer__dlm\.dmo-meta\.json/);
  assert.match(tab, /Current default\/`auto` is API68/);
  assert.match(tab, /not field deletion or proof of mapping auto-pair behavior/);
  assert.match(dmo, /not a complete ingestion\/mapping\/relationship export/);
  assert.doesNotMatch(tab, /sf data360 deploy|--api-version 68\.0/);
});

test('DLO portable JSON examples save authored fields only while historical Metadata retains the qualifier', () => {
  const definitions = [...dlo.matchAll(/```json\n([\s\S]*?)```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((value) => value.kind === 'dlo');
  assert.equal(definitions.length, 2);
  for (const value of definitions) {
    assert.deepEqual(
      value.spec.fields.map((field) => field.name),
      ['Id__c', 'Note__c'],
    );
    assert.ok(value.spec.fields.some((field) => field.name === 'Id__c' && field.isPrimaryKey));
  }
  assert.match(dlo, /<fullName>KQ_Id__c<\/fullName>/);
  assert.match(dlo, /complete readback counts, not saved-file counts/);
  assert.match(dlo, /not a separately live-accepted saved\s+file/);
});
