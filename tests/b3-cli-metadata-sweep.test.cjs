'use strict';

// B3 sweep (2026-11-16): CLI and Metadata API retests on Cli… probes at API 68.0 for streams,
// mappings, relationships, DLOs and DMOs. Pins the tab states and the evidence they rest on.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', 'next', 'data-cloud-devops');
const read = (slug) => fs.readFileSync(path.join(DIR, `${slug}.md`), 'utf8');
const tab = (page, id) =>
  page.match(new RegExp(String.raw`{% include operation-tabs\.html id="${id}"[^\n]*%}`))[0];
const SWEPT = [
  'data-stream-definition',
  'dlo-dmo-mapping',
  'field-source-target-relationship',
  'data-lake-object',
  'data-model-object',
];

test('B3 pages have no untested CLI or Metadata API tab left', () => {
  for (const slug of SWEPT) {
    const page = read(slug);
    assert.doesNotMatch(page, /(?:cli|metadata)_state="unknown"/, slug);
    assert.doesNotMatch(page, /no verification-database row records a live PATCH/, slug);
  }
});

test('stream: CLI and Metadata API change the label; create and delete are blocked', () => {
  const page = read('data-stream-definition');
  for (const id of ['stream-definition-create', 'stream-definition-delete']) {
    assert.match(tab(page, id), /cli_state="blocked"/);
    assert.match(tab(page, id), /metadata_state="blocked"/);
  }
  const update = tab(page, 'stream-definition-update');
  assert.match(update, /cli_state="available"[^%]*cli_body=update_cli/);
  assert.match(update, /metadata_state="available"[^%]*metadata_body=update_metadata/);
  assert.match(page, /no MktDataTranObject named … found/);
  assert.match(page, /`DEPENDENCY_EXISTS` and the same text/);
  assert.match(page, /A live PATCH at API 68\.0/);
});

test('mapping: Metadata API create, update and delete are graded with their limits', () => {
  const page = read('dlo-dmo-mapping');
  assert.match(tab(page, 'mapping-create'), /metadata_state="available"/);
  assert.match(tab(page, 'mapping-update'), /cli_reason="Partial: changes the label and adds pairs/);
  assert.match(tab(page, 'mapping-update'), /metadata_reason="Partial: updateMetadata/);
  assert.match(tab(page, 'mapping-delete'), /metadata_reason="Partial\. deleteMetadata/);
  assert.match(page, /A pair left out of the file is not removed\./);
  assert.match(page, /DMO is mapped to only one DLO/);
});

test('relationship: the CLI update matches the Metadata API on ACTIVE relationships', () => {
  const page = read('field-source-target-relationship');
  const update = tab(page, 'relationship-update');
  assert.match(update, /cli_reason="Partial: [^"]*INACTIVE and ACTIVE relationships\. A changed target object or owner is refused\."/);
  assert.doesNotMatch(update, /not tested/i);
  assert.match(page, /'ManyToMany' is not a valid value for the enum 'RelationshipCardinality'/);
  assert.match(page, /\*\*CLI deploys to an `ACTIVE` relationship, API 68\.0/);
});

test('DLO and DMO: definition mapping, stream-owned writes, field removal and DMO deletes', () => {
  const dlo = read('data-lake-object');
  assert.match(dlo, /Such a definition cannot feed a mapping/);
  assert.match(dlo, /\*\*Stream-owned DLO \(same run\)\.\*\*/);
  assert.match(dlo, /`DELETE_FAILED` "setup object in use"/);
  const dmo = read('data-model-object');
  assert.match(dmo, /Such a DMO can be mapped/);
  assert.match(tab(dmo, 'dmo-delete'), /unmapped and mapped/);
  assert.match(dmo, /referenced by the following lookup fields/);
});
