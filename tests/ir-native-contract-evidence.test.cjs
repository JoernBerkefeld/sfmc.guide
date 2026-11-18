'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(
  path.join(__dirname, '../next/data-cloud-devops/identity-resolution.md'),
  'utf8',
);
const operations = ['read', 'create', 'update', 'delete'];

for (const operation of operations) {
  test(`IR ${operation} retains native68-first API guidance and retained-route evidence`, () => {
    const api = page.split(`{% capture ${operation}_connect %}`)[1].split('{% endcapture %}')[0];
    assert.match(api, new RegExp(String.raw`^### Native API68 ${operation}\b`, 'm'));
    assert.match(api, /\/services\/data\/v68\.0\/ssot\/identity-resolutions/);
    // Native tabs carry no older routes; prose may still name the API version a finding came from.
    assert.doesNotMatch(api, /v6[57]\.0|mcp\/execute|^#{3} API 6[57]/m);
  });
}

test('IR native create and update tabs show the builder-shaped request bodies', () => {
  const body = (operation) =>
    JSON.parse(
      page
        .split(`{% capture ${operation}_connect %}`)[1]
        .split('{% endcapture %}')[0]
        .match(/```json\n([\s\S]*?)\n```/)[1],
    );
  const create = body('create');
  const update = body('update');
  assert.equal(create.configurationType, 'Individual');
  assert.equal(create.rulesetId, 'cust');
  assert.equal(create.dataSpaceName, 'default');
  assert.equal(create.secondaryDmo, 'ssot__Individual__dlm');
  for (const key of ['configurationType', 'rulesetId', 'dataSpaceName', 'secondaryDmo'])
    assert.equal(Object.hasOwn(update, key), false, key);
  for (const request of [create, update]) {
    assert.equal(request.reconciliationRules.length, 6);
    for (const rule of request.reconciliationRules)
      assert.deepEqual(Object.keys(rule), [
        'entityName',
        'ruleType',
        'shouldIgnoreEmptyValue',
        'sources',
        'fields',
      ]);
  }
  assert.equal(update.reconciliationRules[0].ruleType, 'MostFrequent');
});

test('IR plugin supplies bounded workflows for all four operations', () => {
  for (const operation of operations) {
    assert.ok(page.includes(`{% capture ${operation}_plugin %}`));
    const tab = page.split('\n').find((line) => line.includes(`id="ir-${operation}"`));
    assert.match(tab, /plugin_state="available"/);
    assert.ok(tab.includes(`plugin_body=${operation}_plugin`));
  }
  const deletion = page.split('\n').find((line) => line.includes('id="ir-delete"'));
  assert.match(deletion, /plugin_state="available"/);
  assert.match(deletion, /not terminal absence or physical cleanup/);
  assert.match(page, /^sf data360 delete --metadata identity-resolution:Individual_cust .* --data-space default --preview$/m);
  assert.match(page, /^sf data360 delete --metadata identity-resolution:Individual_cust .* --data-space default$/m);
  assert.doesNotMatch(page, /^sf data360 delete .*(--source-dir|--confirm-delete)/m);
  assert.match(page, /the delete takes no confirmation flag/);
  assert.match(page, /deletion-processing.*acknowledged-processing/);
  assert.match(page, /DELETING_OFFCORE/);
  assert.match(page, /latest installed run did not exercise that repeat/);
  assert.match(page, /Optional full preservation\/output accessibility checks were incomplete/);
  assert.match(page, /identityResolution\/Individual_cust\.identityResolution\.json/);
  assert.match(page, /--api-version 68\.0 --data-space default --allow-processing/);
});

test('IR plugin examples retain standalone fences and separate commands', () => {
  for (const operation of operations.slice(0, 3)) {
    const plugin = page.split(`{% capture ${operation}_plugin %}`)[1].split('{% endcapture %}')[0];
    const block = plugin.match(/^```sh\n([\s\S]*?)\n```$/m);
    assert.ok(block, `${operation} needs a standalone closing fence`);
    assert.doesNotMatch(plugin, /^.+```/m);
    const commands = block[1].split('\n');
    assert.equal(commands.length, operation === 'read' ? 1 : 2);
    for (const command of commands) {
      assert.match(command, /^sf data360 /);
      assert.equal(command.match(/\bsf data360 /g).length, 1);
    }
    if (operation !== 'read') {
      assert.match(commands[0], / --preview$/);
      assert.match(commands[1], / --allow-processing$/);
    }
  }
});

test('IR evidence preserves settlement, uncertain-write and deletion limits', () => {
  assert.match(page, /latest acceptance, which sent no PATCH/);
  assert.match(page, /not a mutating PATCH/);
  assert.match(page, /empty explicit field-override list resets fields to object inheritance/);
  assert.match(page, /Do not replay the write or attempt rollback/);
  assert.match(page, /Physical profile-row cleanup remains unproven/);
  assert.match(page, /both exact identities are not found/);
  assert.match(page, /no DMOs were manually deleted/);
  assert.doesNotMatch(
    page,
    /F:[/\\]Temp|00Daj|1iraj|equivalent native write endpoints and cross-org migration have not been verified/,
  );
});
