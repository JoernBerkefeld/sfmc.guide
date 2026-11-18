'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(
  path.join(__dirname, '../next/data-cloud-devops/data-model-object.md'),
  'utf8',
);

test('DMO attributes its own native route to Connect REST, not Metadata API', () => {
  assert.match(page, /\*\*API family:\*\*[^]*\/services\/data\/vXX\.0\/ssot\/data-model-objects/);
  assert.match(page, /\*\*Data 360 Connect REST API\*\*/);
  assert.match(page, /not the SOAP-based Metadata API/);
  assert.match(page, /does not expand the tested versions or plugin qualification/);
  const cli = page.split('{% capture read_cli %}')[1].split('{% endcapture %}')[0];
  assert.match(cli, /\*\*Metadata API \(XML\):\*\*/);
  assert.match(cli, /separate from the native Connect REST JSON route/);
});

test('DMO CRUD badges and tabs match bounded native matrix evidence', () => {
  const grades = (cli, api, plugin) =>
    `methods: \\[cli, api, plugin\\], method_statuses: \\{ cli: "${cli}", api: "${api}", plugin: "${plugin}" \\} \\}`;
  assert.match(page, new RegExp(`read: \\{ status: "yes", ${grades('yes', 'yes', 'yes')}`));
  assert.match(page, new RegExp(`create: \\{ status: "yes", ${grades('yes', 'yes', 'yes')}`));
  // Plugin update/delete are partial: the plugin refuses platform-generated and namespaced DMOs.
  assert.match(page, new RegExp(`update: \\{ status: "yes", ${grades('yes', 'partial', 'partial')}`));
  assert.match(page, new RegExp(`delete: \\{ status: "yes", ${grades('yes', 'yes', 'partial')}`));
  for (const operation of ['read', 'create', 'update', 'delete']) {
    assert.match(
      page,
      new RegExp(`id="dmo-${operation}"[^\\n]+connect_state="available"[^\\n]+connect_body=`),
    );
  }
});

test('DMO matrix documents exact lower bound, shapes, echoes and preservation', () => {
  assert.match(
    page,
    /API `61\.0`–`68\.0`: POST returns `201`, GET `200`, PATCH `200` and DELETE `204`/,
  );
  assert.match(page, /API `60\.0` returns HTTP `404` for all four/);
  assert.match(page, /including for a DMO that exists/);
  assert.match(page, /not a universal minimum or a plugin guard/);
  assert.match(page, /Category input `Other` is returned as `OTHER`/);
  assert.match(page, /Responses use field `type` where requests use `dataType`/);
  assert.match(page, /pre-update state/);
  assert.match(page, /A separate GET, not that response, confirms persistence/);
  assert.match(page, /produces six fields/);
  assert.match(page, /Adding one field gives seven/);
  assert.match(page, /`label`, `labelOverride` and `masterLabel`/);
  assert.match(page, /existing object and field XML byte-identical/);
  assert.match(page, /Primary-index order `1` and key-qualifier attributes are kept/);
});

test('DMO guide states deletion and relationship reads as current facts', () => {
  assert.match(page, /GET returns `404`, and Metadata retrieval no longer finds the object/);
  assert.match(page, /API `61\.0`–`68\.0` return DELETE `204`/);
  assert.match(page, /relationship GET returns HTTP `204` \(API `67\.0`\)/);
  assert.match(page, /Cascade behavior and DMOs with dependencies/);
});

test('DMO page carries no history narrative, and API rules and SQL eligibility caveat are current', () => {
  assert.doesNotMatch(
    page,
    /historical|no longer keeps|previously|earlier|was limited to|LEGACY_DMO_ARTIFACT_UNSUPPORTED|was not tested|no extra live tests|Documentation update/i,
  );
  assert.equal(
    (page.match(/(?:October|November|December) \d{1,2}, \d{4}/g) || []).length,
    0,
    'the page carries no dated record',
  );
  assert.match(page, /`eventDateTimeFieldName` is refused with HTTP `400`/);
  assert.match(page, /Only `Profile`, `Engagement` and `Other` can be created/);
  assert.match(page, /returns HTTP `200`, but reads still show the original type/);
  assert.match(page, /visible about 28 seconds after the write/);
  assert.match(page, /SQLSTATE `42P01`/);
  assert.match(page, /GET `404` can also mean the caller cannot access/);
});

test('DMO Plugin CRUD is visible and bounded separately from version admission', () => {
  for (const operation of ['read', 'create', 'update', 'delete']) {
    assert.match(page, new RegExp(`capture ${operation}_plugin`));
    assert.match(page, new RegExp(`id="dmo-${operation}"[^\\n]+plugin_state="available"[^\\n]+plugin_body=${operation}_plugin`));
  }
  assert.match(page, /The plugin keeps no local allowlists/);
  assert.match(page, /Default and `auto` select API\s+`68\.0`; explicit numeric versions from `61\.0` are kept as given/);
  assert.match(page, /admitting a\s+version is not a live test of it/);
  assert.match(page, /UNSUPPORTED_DMO_FIELD_CHANGE/);
  assert.match(page, /UNSUPPORTED_DMO_FIELD_ADDITION/);
  assert.match(page, /UNSUPPORTED_DMO_TARGET/);
  assert.match(page, /does not broaden standalone DMO CRUD or its tested versions/);
  assert.doesNotMatch(page, /acceptance is a separate pending gate/);
  assert.doesNotMatch(page, /plugin remains API65\/default only/);
  assert.match(
    page,
    /Salesforce removes the DMO's mapping with it; the DLO stays\. After a confirmed deletion the plugin removes the local `data360\/dmo\/<Name>\.dmo-meta\.json`/,
  );
  assert.match(page, /`--keep-local-files` keeps it/);
  assert.match(page, /LOCAL_FILE_REMOVAL_FAILED/);
  assert.doesNotMatch(page, /does not cascade or delete the local JSON/);
});

test('DMO API links use only the reference and validated operation pages', () => {
  assert.match(
    page,
    /https:\/\/developer\.salesforce\.com\/docs\/data\/connectapi\/references\/spec/,
  );
  assert.match(page, /request\/lxdbfg4\/create-data-model-object/);
  assert.match(page, /request\/rschuxv\/update-data-model-object/);
  assert.doesNotMatch(page, /\?meta=/);
});

test('DMO standalone portability and no-op remain bounded and read-only', () => {
  assert.match(page, /a retrieved file deploys into another org as `unchanged`/);
  assert.match(page, /outcome: "unchanged"/);
  assert.match(page, /mutation: "not-attempted"/);
  assert.match(page, /comparison sends no POST or PATCH/);
  assert.match(page, /Preservation and unsupported-addition checks still run first/);
  assert.match(page, /unchanged-source export comparison across API versions is not verified/);
});

test('DMO mapped-field removal: Salesforce drops the pairs with the field, checked before and after', () => {
  const update = page.split('{% capture update_plugin %}')[1].split('{% endcapture %}')[0];
  assert.match(update, /drops that field's mapping pairs itself/);
  assert.match(update, /`removedFields` and `droppedPairs`/);
  assert.match(update, /find those pairs already gone/);
  assert.match(update, /about 29 seconds/);
  assert.match(update, /about 28 seconds/);
  assert.match(update, /DMO_FIELD_REMOVAL_SIDE_EFFECT/);
  assert.match(update, /MAPPING_UNMAP_PERSISTENCE_UNCONFIRMED/);
  const remove = page.split('{% capture delete_plugin %}')[1].split('{% endcapture %}')[0];
  assert.match(remove, /one Metadata API destructive change/);
  assert.match(remove, /MAPPING_UNMAP_PLAN_CHANGED/);
  assert.match(remove, /`removedFields` and\s+`unmappedPairs`/);
  assert.match(remove, /about 28 seconds/);
  assert.doesNotMatch(page, /11 minutes|much slower|about 30 seconds|stay removed and the result says so/);
});
