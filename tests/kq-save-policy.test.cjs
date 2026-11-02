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
  page.match(/{% capture retrieve_plugin %}([\s\S]*?){% endcapture %}/)[1];

test('Retrieve plugin tabs explain the narrow qualifier omission without deletion or mapping claims', () => {
  for (const page of [dlo, dmo]) {
    const tab = pluginTab(page);
    for (const term of [
      'KQ_Id__c',
      'source context',
      'collisions',
      'CREATE',
      'PATCH',
      'field deletion',
      'mapping auto-pair',
      'Id__c',
      'custom qualifiers',
      'keyQualifierName',
    ]) {
      assert.ok(tab.includes(term), term);
    }
    assert.match(tab, /raw API[\s\S]*?remain(?:s)? complete/);
    assert.match(tab, /not new live plugin/);
  }
});

test('API68 counts and qualifier enum spellings stay resource-specific', () => {
  assert.match(pluginTab(dlo), /seven raw fields → six saved[\s\S]*eight raw → seven saved/);
  assert.match(pluginTab(dlo), /definitionCreationType=System/);
  assert.match(pluginTab(dlo), /usageTag=KEY_QUALIFIER/);
  assert.match(pluginTab(dmo), /six raw fields\s*→ five saved[\s\S]*seven raw → six saved/);
  assert.match(pluginTab(dmo), /creationType=System/);
  assert.match(pluginTab(dmo), /usageTag=KeyQualifier/);
  assert.match(pluginTab(dmo), /plugin remains API65\/default only/);
  const include = dmo.match(/{% include operation-tabs\.html id="dmo-retrieve"[^\n]+/)[0];
  assert.match(include, /plugin_state="available"/);
  assert.match(include, /plugin_body=retrieve_plugin/);
});

test('DMO plugin retrieval stays exact API65/default without mapping or ingestion qualification', () => {
  const tab = pluginTab(dmo);
  assert.match(tab, /sf data360 retrieve -m dmo:Customer__dlm -o SOURCE_ALIAS --api-version 65\.0/);
  assert.match(tab, /data360\/dmo\/Customer__dlm\.dmo-meta\.json/);
  assert.match(tab, /plugin remains API65\/default only/);
  assert.match(tab, /not field deletion or proof of mapping auto-pair behavior/);
  assert.match(dmo, /not a complete ingestion\/mapping\/relationship export/);
  assert.doesNotMatch(tab, /sf data360 deploy|--api-version 68\.0/);
});

test('DLO portable JSON examples save six fields while historical Metadata retains the qualifier', () => {
  const definitions = [...dlo.matchAll(/```json\n([\s\S]*?)```/g)]
    .map((match) => JSON.parse(match[1]))
    .filter((value) => value.kind === 'dlo');
  assert.equal(definitions.length, 2);
  for (const value of definitions) {
    assert.equal(value.spec.fields.length, 6);
    assert.ok(!value.spec.fields.some((field) => field.name === 'KQ_Id__c'));
    assert.ok(value.spec.fields.some((field) => field.name === 'Id__c' && field.isPrimaryKey));
    assert.ok(value.spec.fields.some((field) => field.name === 'DataSource__c'));
  }
  assert.match(dlo, /<fullName>KQ_Id__c<\/fullName>/);
  assert.match(dlo, /historical complete readback counts, not current saved-file counts/);
  assert.match(dlo, /not a newly live-accepted saved file/);
});
