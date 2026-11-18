'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = fs.readFileSync(path.join(__dirname, '../next/data-cloud-devops/segments.md'), 'utf8');
const overview = fs.readFileSync(path.join(__dirname, '../next/data-cloud-devops/index.md'), 'utf8');

for (const operation of ['read', 'create', 'update', 'delete']) {
  test(`Segment ${operation} supplies a bounded native JSON plugin workflow`, () => {
    const body = page.split(`{% capture ${operation}_plugin %}`)[1]?.split('{% endcapture %}')[0];
    assert.ok(body);
    assert.match(body, /API68/);
    assert.match(body, /```sh\nsf data360 /);
    assert.match(body, /data360\/segments\/OwnedSegment\.segment\.json/);
    const tab = page.split('\n').find((line) => line.includes(`id="segments-${operation}"`));
    assert.match(tab, /plugin_state="available"/);
    assert.ok(tab.includes(`plugin_body=${operation}_plugin`));
  });
}

test('Segment documentation records the JSON plus SQL files and the live API68 receipts', () => {
  assert.match(page, /OwnedSegment\.segment\.OwnedSegment\.sql/);
  assert.match(page, /`<Name>\.segment\.<model>\.sql`/);
  assert.match(page, /fully qualified/);
  assert.match(page, /"Expected a fully qualified column name"/);
  assert.match(page, /"Need api name of DMO"/);
  assert.doesNotMatch(page, /SQL_DEPENDENCIES_UNQUALIFIED|"dependencies": \[/);
  assert.match(page, /SEGMENT_UPDATE_UNCONFIRMED/);
  assert.match(page, /not completed computation/);
  assert.match(page, /physical storage and credit cleanup remain unproven/);
  assert.doesNotMatch(page, /--confirm-delete/);
  assert.match(page, /^sf data360 delete --target-org SOURCE_ALIAS --metadata segment:OwnedSegment --api-version 68\.0$/m);
  assert.match(page, /a segment the org does not have reports `unchanged`/);
  assert.match(page, /every `OwnedSegment\.segment\.\*\.sql` beside it/);
  assert.match(page, /API 65 Metadata \(XML\) workflows in the CLI tabs remain separate evidence/);
  assert.doesNotMatch(page, /F:[/\\]Temp|Individual_c648|00Daj/);
});

const models = '"includeDbt": {\n    "models": {\n      "models": [{ "name": "ActiveCustomers", "sql": "SELECT UnifiedCustomer__dlm.CustomerKey__c FROM UnifiedCustomer__dlm WHERE 1 = 0" }]\n    }\n  }';

test('Segment Connect tabs use only the native API68 route with the plugin request bodies', () => {
  const connect = Object.fromEntries(['read', 'create', 'update', 'delete'].map((operation) => [
    operation,
    page.split(`{% capture ${operation}_connect %}`)[1].split('{% endcapture %}')[0],
  ]));
  for (const [operation, body] of Object.entries(connect)) {
    assert.equal((body.match(new RegExp(`^### Native API68 ${operation}$`, 'gm')) || []).length, 1);
    assert.ok(body.indexOf('### Native API68') < body.indexOf('sf api request rest'));
    assert.match(body, /sf api request rest .*\/services\/data\/v68\.0\/ssot\/segments/);
    // API68 fully replaces the older runtime route in every Connect tab.
    assert.doesNotMatch(body, /v6[57]\.0\/ssot|### API 6/);
    const tab = page.split('\n').find((line) => line.includes(`id="segments-${operation}"`));
    assert.match(tab, /connect_state="available" connect_reason="Native API68 /);
  }
  assert.ok(connect.create.includes(`"developerName": "ActiveCustomers",\n  "displayName": "Active Customers",`));
  assert.ok(connect.create.includes(`"segmentType": "Dbt",\n  ${models},\n  "publishSchedule": "NoRefresh"\n}`));
  assert.match(connect.create, /HTTP 409 with `ENTITY_SAVE_ERROR`/);
  assert.ok(connect.update.includes(`"segmentOnApiName": "UnifiedCustomer__dlm",\n  ${models}\n}`));
  assert.doesNotMatch(connect.update, /"publishSchedule"/);
  assert.match(connect.update, /leaves out `segmentOnApiName` and `segmentMembershipDmo`/);
  assert.match(connect.delete, /"url": "\/services\/data\/v68\.0\/ssot\/segments\/ActiveCustomers", "method": "DELETE"/);
  assert.match(connect.delete, /HTTP 204 without a body\. That alone does not prove absence/);
  assert.match(connect.read, /Segment not found: ActiveCustomers/);
  const headings = page.match(/^#{2,3} .+$/gm);
  assert.equal(new Set(headings).size, headings.length);
});

// B2 sweep: every segment, segment-member and calculated-insight tab state is resolved by a live test.
test('B2 sweep leaves no unknown tab states and records live-segment definition limits', () => {
  const dir = path.join(__dirname, '../next/data-cloud-devops');
  for (const name of ['segments', 'segment-members', 'calculated-insights']) {
    const raw = fs.readFileSync(path.join(dir, `${name}.md`), 'utf8');
    assert.doesNotMatch(raw, /_state="unknown"|status: "unknown"|not a verified step|no verification-database row/u, name);
  }
  const members = fs.readFileSync(path.join(dir, 'segment-members.md'), 'utf8');
  assert.match(members, /"url": "\/services\/data\/v68\.0\/ssot\/segments\/MARKET_SEGMENT_ID\/actions\/publish", "method": "POST", "body": \{ "mode": "raw", "raw": "" \}/u);
  assert.match(members, /METHOD_NOT_ALLOWED/u);
  assert.match(page, /DEPENDENCY_EXISTS/u);
  assert.match(page, /keeps the old `displayName`/u);
});