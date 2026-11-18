'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const directory = path.join(__dirname, '../next/data-cloud-devops');
const ci = fs.readFileSync(path.join(directory, 'calculated-insights.md'), 'utf8');
const overview = fs.readFileSync(path.join(directory, 'index.md'), 'utf8');
const evidence = ci.split('**Native API 68 Connect routes:**')[1].split('**Deletion routes:**')[0];
const panels = Object.fromEntries(['read', 'create', 'update', 'delete'].map((operation) => [operation,
  ci.split(`{% capture ${operation}_plugin %}`)[1].split('{% endcapture %}')[0],
]));
const connect = Object.fromEntries(['read', 'create', 'update', 'delete'].map((operation) => [operation,
  ci.split(`{% capture ${operation}_connect %}`)[1].split('{% endcapture %}')[0],
]));
const native = Object.values(panels).join('\n').replace(/\s+/g, ' ');
const commandSource = Object.values(panels).join('\n');

test('native CI plugin scope is API68 only and uses the JSON plus SQL files', () => {
  assert.match(native, /API-led plugin operations, not\s+out-of-the-box Salesforce CLI commands/);
  assert.match(native, /uses API 68 only: the default `--api-version auto` selects it, an explicit `68\.0` pin is optional, and any other version is refused with `INVALID_SCOPE`/);
  assert.match(native, /No plugin request goes through the Metadata API/);
  assert.doesNotMatch(ci, /legacy65|legacy API 65/);
  assert.doesNotMatch(commandSource, /ci-pair|mktCalcInsightObjectDefs|calculatedInsight\.json|--allow-processing/);
  const commands = [...commandSource.matchAll(/^sf data360 .+$/gm)].map((match) => match[0]);
  assert.equal(commands.length, 9);
  for (const command of commands) {
    assert.doesNotMatch(command, /--json|--api-version 65/);
  }
  assert.match(panels.read, /sf data360 retrieve .*calculated-insight:CustomerActivity__cio/);
  assert.match(panels.read, /data360\/calculatedInsights\/CustomerActivity__cio\.calculatedInsight-meta\.json/);
  assert.match(panels.read, /data360\/calculatedInsights\/CustomerActivity__cio\.calculatedInsight-meta\.sql/);
  assert.match(panels.create, /^sf data360 deploy .*-m calculated-insight:CustomerActivity__cio --draft --preview$/m);
  assert.match(panels.create, /^sf data360 deploy .*-m calculated-insight:CustomerActivity__cio --draft$/m);
  assert.match(panels.update, /^sf data360 deploy .*-m calculated-insight:CustomerActivity__cio --preview$/m);
  for (const command of commands.filter((line) => / publish /.test(line))) {
    assert.match(command, /-d data360\/calculatedInsights\/CustomerActivity__cio\.calculatedInsight-meta\.json/);
  }
  for (const command of commands.filter((line) => / delete /.test(line))) {
    assert.match(command, /-m calculated-insight:CustomerActivity__cio/);
    assert.doesNotMatch(command, /--source-dir|-d |--confirm-delete/);
  }
  assert.match(panels.update, /publish .*--preview/);
  assert.match(panels.update, /Deploy never publishes/);
  assert.match(panels.delete, /^sf data360 delete .*calculated-insight:CustomerActivity__cio --preview$/m);
  assert.match(panels.delete, /The delete takes no confirmation flag/);
  assert.match(native, /Salesforce decides/);
  assert.match(native, /Preview is read-only/);
  assert.doesNotMatch(ci, /McpMapping|McpRel|MVP_DevOps|20261027|0Aff|0gj|F:[/\\]Temp/i);
});

test('CI Connect tabs lead with native API68 sections and the plugin request bodies', () => {
  for (const operation of ['read', 'create', 'update', 'delete']) {
    const body = connect[operation];
    assert.equal((body.match(new RegExp(`^### Native API68 ${operation}$`, 'gm')) || []).length, 1);
    assert.ok(body.indexOf('### Native API68') < body.indexOf('sf api request rest'));
    assert.match(body, /sf api request rest .*\/services\/data\/v68\.0\/ssot\/calculated-insights/);
    const tab = ci.split('\n').find((line) => line.includes(`id="ci-${operation}"`));
    assert.match(tab, /connect_state="available" connect_reason="Native API68 /);
  }
  // Read, create and delete are fully covered natively; no older route remains in those tabs.
  for (const operation of ['read', 'create', 'delete'])
    assert.doesNotMatch(connect[operation], /v6[57]\.0\/ssot|mcp\/execute|d360_ci_create/);
  assert.match(
    connect.create,
    /"apiName": "CustomerActivity__cio",\n {2}"displayName": "Customer Activity",\n {2}"expression": "SELECT APPROX_COUNT_DISTINCT[^"]+WHERE 1 = 0 GROUP BY [^"]+",\n {2}"definitionType": "CalculatedMetric",\n {2}"dataSpaceName": "default",\n {2}"draft": true\n/,
  );
  assert.match(connect.create, /--method POST --body '@ci-create\.json'/);
  const [nativeUpdate, legacyUpdate] = connect.update.split('### API 65 update route');
  assert.match(nativeUpdate, /\{ "displayName": "Customer Activity", "draft": false, "publishScheduleInterval": "NotScheduled" \}/);
  assert.match(nativeUpdate, /\{ "expression": "SELECT [^"]+WHERE 1 = 0 AND [^"]+ IS NOT NULL GROUP BY [^"]+" \}/);
  assert.match(nativeUpdate, /adds `"draft": true` to the same body/);
  assert.doesNotMatch(nativeUpdate, /v6[57]\.0/);
  // Label/schedule changes and the SystemManaged publish have no native API68 equivalent.
  assert.match(legacyUpdate, /v65\.0\/ssot\/calculated-insights/);
  assert.match(legacyUpdate, /SystemManaged/);
  assert.match(connect.delete, /"url": "\/services\/data\/v68\.0\/ssot\/calculated-insights\/CustomerActivity__cio", "method": "DELETE"/);
  assert.match(connect.delete, /`ITEM_NOT_FOUND`/);
  assert.match(connect.read, /calculatedInsightStatus/);
  const headings = ci.match(/^#{2,3} .+$/gm);
  assert.equal(new Set(headings).size, headings.length);
});

test('CI evidence records native API68 Connect results without computation claims', () => {
  assert.match(evidence, /`lastRunStatus` stayed null in the runs above, so `ACTIVE` is not computation evidence/);
  assert.match(evidence, /skip the unnecessary PATCH yourself/);
  assert.match(evidence, /not an automatic no-op or identical-repeat guarantee from the API/);
  assert.match(ci, /\*\*API 65 expression check:\*\*[^\n]+not tried on API 68/);
  assert.doesNotMatch(ci, /Separate target-bound check|API 67 MCP route creates/);
  assert.doesNotMatch(evidence, /sf data360|sf-plugin-data|F:[/\\]Temp|\/aura/i);
  assert.match(ci, /\*\*Plugin evidence \(API 68, one org\):\*\*/);
  assert.match(ci, /`CI_DELETION_UNCONFIRMED` while removal was still running/);
});

test('CI retains partial writes, four operation tabs and synchronized overview limits', () => {
  assert.match(ci, /verification: verified/);
  assert.equal((ci.match(/include operation-tabs\.html/g) || []).length, 4);
  assert.ok(ci.indexOf('**Verification scope:**') < ci.indexOf('A calculated insight computes'));
  assert.equal((overview.match(/^  - path: next\/data-cloud-devops\//gm) || []).length, 15);
});

test('every Data Cloud DevOps page still answers at its old data-cloud-cli URL', () => {
  const pages = fs.readdirSync(directory).filter((name) => name.endsWith('.md'));
  assert.equal(pages.length, 16);
  for (const name of pages) {
    const page = fs.readFileSync(path.join(directory, name), 'utf8');
    const permalink = /^permalink: (\/next\/data-cloud-devops\/\S*)$/m.exec(page);
    assert.ok(permalink, name);
    const old = permalink[1].replace('/data-cloud-devops/', '/data-cloud-cli/');
    assert.ok(page.includes(`redirect_from:\n  - ${old}\n`), name);
  }
});
