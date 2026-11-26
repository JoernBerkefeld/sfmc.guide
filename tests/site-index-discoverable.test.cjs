'use strict';

/**
 * Skip predicates for discoverable / sitemap hiding on sfmc.guide.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const {
  shouldIndexPage,
  shouldListOnToolsIndex,
  navPathFromUrl,
  isNavUrlDiscoverable,
} = require('../scripts/lib/discoverable.cjs');

const SITE = path.join(__dirname, '..');
const DATA_CLOUD_SLUGS = [
  'data-stream-definition',
  'data-lake-object',
  'data-model-object',
  'dlo-dmo-mapping',
  'field-source-target-relationship',
  'data-source-object',
  'calculated-insights',
  'data-transforms',
  'segments',
  'segment-members',
  'data-graphs',
  'identity-resolution',
  'data-kit-object-template',
  'data-package-kit-definition',
  'data-package-kit-object',
];
const NAV_SLUGS = DATA_CLOUD_SLUGS;

const CRUD_OPERATIONS = ['read', 'create', 'update', 'delete'];
// Frontmatter key -> page anchor. The anchor matches the key.
const ANCHOR = { read: 'read', create: 'create', update: 'update', delete: 'delete' };
// This deliberately validates the small authored schema, not arbitrary YAML.
function crudSchema(raw) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  assert.ok(fm);
  const block = fm.match(/^crud:\n((?: {2}.+\n?)+)/m)?.[1];
  assert.ok(block, 'CRUD frontmatter exists');
  const entries = block
    .matchAll(
      /^ {2}(\w+): \{ status: "(yes|partial|unknown|no)", methods: \[([^\]]*)\](?:, method_statuses: \{ ([^{}]+) \})? \}$/gm,
    )
    .toArray();
  assert.equal(block.trimEnd().split('\n').length, 4);
  assert.deepEqual(
    entries.map((entry) => entry[1]),
    CRUD_OPERATIONS,
  );
  return entries.map((entry) => {
    const methods = entry[3] ? entry[3].split(', ') : [];
    assert.equal(new Set(methods).size, methods.length);
    assert.ok(methods.every((method) => ['cli', 'api', 'plugin'].includes(method)));
    assert.equal(methods.length > 0, ['yes', 'partial'].includes(entry[2]));
    if (entry[4] !== undefined) {
      const pairs = entry[4].split(', ');
      const grades = {};
      for (const pair of pairs) {
        const match = pair.match(/^(cli|api|plugin): "(yes|partial|unknown|no)"$/);
        assert.ok(match, 'Explicit method grade uses a supported method and status');
        assert.ok(!Object.hasOwn(grades, match[1]), 'No duplicate method grades');
        grades[match[1]] = match[2];
      }
      const values = new Set(['cli', 'api', 'plugin'].map((method) => grades[method] || 'unknown'));
      const best = values.has('yes')
        ? 'yes'
        : values.has('partial')
          ? 'partial'
          : values.has('unknown')
            ? 'unknown'
            : 'no';
      assert.equal(entry[2], best, 'Overall uses the best single explicitly graded route');
      assert.deepEqual(
        methods,
        ['cli', 'api', 'plugin'].filter((method) => ['yes', 'partial'].includes(grades[method])),
        'Methods retain every usable route, not only the winner',
      );
    }
    return `${entry[2]}:${methods.join(',')}`;
  });
}

test('Data Cloud CLI ratings require supplied Metadata workflows, not generic API transport', () => {
  const pages = new Map(
    DATA_CLOUD_SLUGS.map((slug) => [
      slug,
      fs.readFileSync(path.join(SITE, `next/data-cloud-devops/${slug}.md`), 'utf8'),
    ]),
  );
  const metadataCommand = /\bsf project (?:retrieve|deploy) start\b/u;
  // These existing kit panels explicitly link to a shared Metadata recipe.
  const sharedRecipes = {
    'data-package-kit-definition:read': ['data-package-kit-object', 'read'],
    'data-package-kit-object:create': ['data-package-kit-definition', 'create'],
    'data-package-kit-object:delete': ['data-package-kit-definition', 'delete'],
  };
  for (const slug of DATA_CLOUD_SLUGS) {
    const raw = pages.get(slug);
    crudSchema(raw);
    const panels = raw.matchAll(/\{% include operation-tabs\.html ([^\n]+) %\}/gu).toArray();
    assert.equal(panels.length, 4, `${slug}: all operations checked`);
    const cliPanels = panels.filter((panel) => panel[1].includes('cli_state="available"'));
    for (const panel of cliPanels) {
      const capture = panel[1].match(/cli_body=(\w+)/u)?.[1];
      assert.ok(capture, `${slug}: available CLI panel supplies a body`);
      let body = raw.match(
        new RegExp(String.raw`\{% capture ${capture} %\}([\s\S]*?)\{% endcapture %\}`, 'u'),
      )?.[1];
      assert.ok(body, `${slug}: CLI body exists`);
      const operation = capture.replace('_cli', '');
      const shared = sharedRecipes[`${slug}:${operation}`];
      if (shared) {
        assert.ok(
          body.includes(`/next/data-cloud-devops/${shared[0]}/#`),
          'Shared recipe is explicitly linked',
        );
        body = pages
          .get(shared[0])
          .match(
            new RegExp(
              String.raw`\{% capture ${shared[1]}_cli %\}([\s\S]*?)\{% endcapture %\}`,
              'u',
            ),
          )?.[1];
      }
      assert.match(
        body,
        metadataCommand,
        `${slug}/${operation}: supported Metadata recipe, not transport alone`,
      );
    }
  }
  // DMO update, mapping, CI and segment delete gained CLI ratings from destructive-deploy evidence.
  // DLO create/update/delete and DMO create/delete gained CLI ratings from API 68 deploy evidence.
  // B1 sweep: source object and kit pages gained 8 CLI ratings from API 68 deploy evidence.
  // B3 sweep: stream update gained a CLI rating from the API 68 label deploy.
  for (const slug of ['data-graphs', 'identity-resolution', 'segment-members']) {
    assert.doesNotMatch(
      pages.get(slug),
      /cli_state="available"|cli_body=/u,
      `${slug}: API-only panels`,
    );
    assert.match(
      pages.get(slug),
      /description: "API workflows using Salesforce CLI authentication and transport/u,
    );
  }
  for (const transport of [
    "sf api request rest '/services/data/v68.0/ssot/data-graphs' --body '@graph.json'",
    "Get-Content graph.json | sf api request rest '/ssot/mcp/execute' --body -",
    'sf api request soap --body @request.xml',
    'sf org login web',
  ]) {
    assert.doesNotMatch(
      transport,
      metadataCommand,
      'Generic transport/authentication is not a Metadata workflow',
    );
  }
  const overview = fs.readFileSync(path.join(SITE, 'next/data-cloud-devops/index.md'), 'utf8');
  assert.match(
    overview,
    /Using Salesforce CLI as a request runner does not make an API workflow standard resource-specific CLI support/u,
  );
  assert.match(
    overview,
    /`sf-plugin-data` commands `sf data360 retrieve\|deploy\|delete\|publish`/u,
  );
  assert.match(overview, /The plugin is only needed for the plugin examples/u);
});

function matrixChips(html) {
  return html
    .matchAll(/data-crud-op="(\w+)" data-crud-status="(\w+)"/g)

    .map((match) => `${match[1]}:${match[2]}`)
    .toArray();
}

function expectedChips(raw, tool) {
  return ['create', 'read', 'update', 'delete'].map((operation) => {
    const line = raw.match(new RegExp(`^  ${operation}: (.+)$`, 'm'))[1];
    const status = line.match(/status: "(\w+)"/)[1];
    const methods = line.match(/methods: \[([^\]]*)\]/)[1].split(/,\s*/);
    let grade = line.match(new RegExp(String.raw`method_statuses: \{[^}]*\b${tool}: "(\w+)"`))?.[1];
    if (!grade) {
      grade = methods.includes(tool) ? status : status === 'no' ? 'no' : 'none';
    }
    return `${operation}:${grade === 'unknown' ? 'none' : grade}`;
  });
}

function assertCrudCell(html, expected) {
  const [status, methodList] = expected.split(':', 2);
  assert.match(html, new RegExp(`data-crud-status="${status}"`));
  const icons = html.matchAll(/<img\b([^>]+)>/g).toArray();
  const methods = methodList ? methodList.split(',') : [];
  assert.equal(icons.length, methods.length);
  for (const [index, icon] of icons.entries()) {
    assert.ok(icon[1].includes(`src="/assets/icons/${methods[index]}.svg"`));
    const label = methods[index] === 'plugin' ? 'sf-plugin-data' : methods[index].toUpperCase();
    assert.ok(icon[1].includes(`alt="${label}"`));
    assert.ok(icon[1].includes(`title="${label}"`));
    assert.match(icon[1], /width="20"/);
    assert.match(icon[1], /height="20"/);
  }
  if (methods.length) {
    assert.ok(html.includes(`<div>${status === 'yes' ? 'Yes' : 'Partial'}</div>`));
  } else if (status === 'no') {
    assert.match(
      html,
      /<span class="crud-state crud-state--unsupported"[^>]*>Not supported<\/span>/,
    );
  } else {
    assert.match(html, /<span class="crud-state crud-state--untested"[^>]*>Not tested<\/span>/);
  }
}

test('actual CRUD Liquid template renders No distinctly from unknown and missing without icons', () => {
  // Render the production include with synthetic inputs; never change authored page ratings.
  const rendered = spawnSync(
    'ruby',
    [
      '-rbundler/setup',
      '-rliquid',
      '-rjson',
      '-e',
      `template = Liquid::Template.parse(STDIN.read)
inputs = [{ 'status' => 'no', 'methods' => ['cli', 'api', 'plugin'] },
          { 'status' => 'unknown', 'methods' => ['cli', 'api', 'plugin'] }, {}, nil]
puts JSON.generate(inputs.map { |capability| template.render!('include' => { 'capability' => capability }) })`,
    ],
    {
      cwd: SITE,
      input: fs.readFileSync(path.join(SITE, '_includes/crud-cell.html'), 'utf8'),
      encoding: 'utf8',
    },
  );
  assert.equal(rendered.status, 0, rendered.error?.message || rendered.stderr);
  const cells = JSON.parse(rendered.stdout);
  assert.equal(cells.length, 4);
  for (const [index, cell] of cells.entries()) {
    assertCrudCell(cell, ['no:', 'unknown:', ':', ':'][index]);
    assert.equal(
      cell.replaceAll(/<[^>]+>/g, '').trim(),
      index === 0 ? 'Not supported' : 'Not tested',
    );
  }
  const legend = fs
    .readFileSync(path.join(SITE, '_includes/crud-legend.html'), 'utf8')
    .replaceAll(/\s+/g, ' ');
  assert.match(legend, /Not supported<\/span>: tested in the stated scope and not supported\./);
  assert.match(legend, /Not tested<\/span>: nothing has been tested or researched here\./);
  assert.match(legend, /Neither\s+Not supported nor Not tested displays method icons\./);
  assert.match(
    legend,
    /The sf-plugin-data grade follows the plugin README's definition: a refusal or gap in the plugin itself is Partial; Salesforce limits, API-version and data-space limits and verification breadth are not\./,
  );
});

function dataCloudGuide() {
  return ['index', ...DATA_CLOUD_SLUGS]
    .map((slug) =>
      fs.readFileSync(path.join(SITE, 'next', 'data-cloud-devops', `${slug}.md`), 'utf8'),
    )
    .join('\n');
}

test('shouldIndexPage omits discoverable: false even when titled', () => {
  assert.equal(
    shouldIndexPage({
      title: 'Hidden draft',
      discoverable: 'false',
      permalink: '/drafts/hidden/',
    }),
    false,
  );
  assert.equal(
    shouldIndexPage({
      title: 'Hidden draft',
      discoverable: false,
    }),
    false,
  );
});

test('shouldIndexPage still omits sitemap: false', () => {
  assert.equal(
    shouldIndexPage({
      title: 'Privacy',
      sitemap: 'false',
      permalink: '/privacy/',
    }),
    false,
  );
});

test('shouldIndexPage includes a normal titled page', () => {
  assert.equal(
    shouldIndexPage({
      title: 'SFMC DevTools (mcdev)',
      permalink: '/tools/mcdev/',
    }),
    true,
  );
});

test('shouldIndexPage omits untitled pages', () => {
  assert.equal(shouldIndexPage({ permalink: '/no-title/' }), false);
  assert.equal(shouldIndexPage({}), false);
  assert.equal(shouldIndexPage(null), false);
});

test('privacy.md (sitemap: false) is omitted from the search index', () => {
  const raw = fs.readFileSync(path.join(SITE, 'privacy.md'), 'utf8');
  assert.match(raw, /^sitemap: false\s*$/m);
  assert.equal(shouldIndexPage({ title: 'Privacy & Cookie Policy', sitemap: 'false' }), false);
});

test('shouldListOnToolsIndex skips discoverable: false and keeps listed tools', () => {
  assert.equal(shouldListOnToolsIndex({ slug: 'hidden', discoverable: false }), false);
  assert.equal(shouldListOnToolsIndex({ slug: 'hidden', discoverable: 'false' }), false);
  assert.equal(shouldListOnToolsIndex({ slug: 'mcdev' }), true);
  assert.equal(
    shouldListOnToolsIndex({ slug: 'mcdev-pipeline-builder', discoverable: false }),
    false,
  );
  assert.equal(shouldListOnToolsIndex(null), false);
});

test('nav helper strips hash and hides only mapped paths', () => {
  assert.equal(navPathFromUrl('/tools/#own-tools'), '/tools/');
  assert.equal(isNavUrlDiscoverable('/drafts/hidden/', { '/drafts/hidden/': true }), false);
  assert.equal(isNavUrlDiscoverable('/tools/mcdev-pipeline-builder/', {}), true);
  assert.equal(isNavUrlDiscoverable('https://diagramforce.com/', { '/x/': true }), true);
  assert.equal(isNavUrlDiscoverable('/tools/mcdev-pipeline-builder/', null), true);
});

test('pipeline builder page is discoverable and listed in nav and Lunr', () => {
  const page = fs.readFileSync(
    path.join(SITE, 'tools', 'mcdev-pipeline-builder', 'index.md'),
    'utf8',
  );
  // The page was intentionally restored to the public site — it must NOT carry a discoverable: false
  // (or any other hiding) flag, and it must appear in nav and the Lunr search index.
  assert.doesNotMatch(page, /^discoverable:\s*false\s*$/m);
  assert.equal(
    shouldIndexPage({
      title: 'SFMC DevTools Pipeline Builder',
      permalink: '/tools/mcdev-pipeline-builder/',
    }),
    true,
  );
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  assert.match(nav, /\/tools\/mcdev-pipeline-builder\//);
  const lunr = fs.readFileSync(path.join(SITE, 'site-index.json'), 'utf8');
  assert.match(lunr, /\/tools\/mcdev-pipeline-builder\//);
});

test('tools index lists the pipeline builder card', () => {
  const index = fs.readFileSync(path.join(SITE, 'tools', 'index.md'), 'utf8');
  assert.match(index, /href="\/tools\/mcdev-pipeline-builder\/"/);
  assert.match(index, /SFMC DevTools Pipeline Builder/);
});

test('CMS tool page is discoverable and lists every type without version history', () => {
  const page = fs.readFileSync(path.join(SITE, 'tools', 'sf-plugin-cms', 'index.md'), 'utf8');
  assert.doesNotMatch(page, /^discoverable:\s*false\s*$/m);
  for (const type of [
    'email',
    'email-template',
    'email-fragment',
    'image',
    'document',
    'audio',
    'brand',
  ]) {
    assert.match(page, new RegExp(`\\| \`${type}\` \\|`));
  }
  assert.match(page, /--preview/);
  assert.doesNotMatch(page, /\b0\.\d+\.\d+\b|qualification|Unreleased/);
  assert.match(page, /https:\/\/github\.com\/JoernBerkefeld\/sf-plugin-cms/);
  const index = fs.readFileSync(path.join(SITE, 'tools', 'index.md'), 'utf8');
  assert.match(index, /href="\/tools\/sf-plugin-cms\/"/);
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  assert.match(nav, /\/tools\/sf-plugin-cms\//);
  const lunr = JSON.parse(fs.readFileSync(path.join(SITE, 'site-index.json'), 'utf8'));
  assert.match(JSON.stringify(lunr), /\/tools\/sf-plugin-cms\//);
});

test('MobilePush setup page is discoverable from Engagement overview, nav and search', () => {
  const page = fs.readFileSync(path.join(SITE, 'engagement', 'mobilepush', 'index.md'), 'utf8');
  assert.match(page, /^permalink: \/engagement\/mobilepush\/$/m);
  assert.match(page, /^parent_url: \/engagement\/$/m);
  assert.doesNotMatch(page, /^discoverable:\s*false\s*$/m);
  const overview = fs.readFileSync(path.join(SITE, 'engagement', 'index.md'), 'utf8');
  assert.match(overview, /\]\(\/engagement\/mobilepush\/\)/);
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  assert.match(nav, /url: \/engagement\/mobilepush\/$/m);
  const index = JSON.parse(fs.readFileSync(path.join(SITE, 'site-index.json'), 'utf8'));
  assert.equal(index.filter((entry) => entry.url === '/engagement/mobilepush/').length, 1);
});

test('Next Data Cloud CLI guide is discoverable without promising general CRUD', () => {
  const page = dataCloudGuide();
  assert.match(page, /^permalink: \/next\/data-cloud-devops\/\s*$/m);
  const overview = fs.readFileSync(
    path.join(SITE, 'next', 'data-cloud-devops', 'index.md'),
    'utf8',
  );
  assert.match(overview, /^title: "Data Cloud DevOps"$/m);
  const overviewHtml = fs.readFileSync(
    path.join(SITE, '_site', 'next', 'data-cloud-devops', 'index.html'),
    'utf8',
  );
  assert.equal(overviewHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].trim(), 'Data Cloud DevOps');
  assert.match(page, /^parent_url: \/next\/\s*$/m);
  assert.doesNotMatch(page, /^discoverable:\s*false\s*$/m);
  assert.match(page, /Standard CLI, API 65\.0 and the default dataspace/);
  assert.match(page, /own still-existing Data Lake Object instance/);
  assert.match(page, /<fullName>CustomerLookup__c<\/fullName>/);
  assert.match(page, /Stale-source|stale-source/);
  assert.match(page, /separate invocations/);
  assert.match(page, /are not self-contained workflows/);
  assert.match(page, /objects\/Customer__dlm\/fields\/Id__c\.field-meta\.xml/);
  assert.doesNotMatch(
    DATA_CLOUD_SLUGS.filter(
      (slug) =>
        ![
          'data-stream-definition',
          'data-lake-object',
          'data-model-object',
          'dlo-dmo-mapping',
          'calculated-insights',
          'data-graphs',
          'segments',
        ].includes(slug),
    )
      .map((slug) => {
        const resource = fs.readFileSync(
          path.join(SITE, 'next/data-cloud-devops', `${slug}.md`),
          'utf8',
        );
        // This bounded IR caveat is guidance, not an embedded evidence diary.
        return slug === 'identity-resolution'
          ? resource.replace('bounded historical raw API evidence', 'bounded raw API evidence')
          : resource;
      })
      .join('\n'),
    /McpMapping|McpRel|MVP_DevOps|20261027|0Aff|0gj|fixture|probe|historical|receipt|timeline/i,
  );
  for (const slug of DATA_CLOUD_SLUGS) {
    const resource = fs.readFileSync(
      path.join(SITE, 'next', 'data-cloud-devops', `${slug}.md`),
      'utf8',
    );
    assert.deepEqual(
      resource
        .matchAll(/^## (Read|Create|Update|Delete)(?: \{#\w+\})?$/gm)

        .map((match) => match[1])
        .toArray(),
      // Every page lists its chapters Read, Create, Update, Delete.
      ['Read', 'Create', 'Update', 'Delete'],
      `${slug}: one logical resource with four main operations`,
    );
    const title = resource.match(/^title: "([^"|]+)"$/m)?.[1];
    assert.ok(title, `${slug}: short resource title`);
    assert.ok(!title.includes('Data Cloud DevOps'), `${slug}: no title suffix`);
    const html = fs.readFileSync(
      path.join(SITE, '_site', 'next', 'data-cloud-devops', slug, 'index.html'),
      'utf8',
    );
    assert.equal(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].trim(), title);
    const documentTitle = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    assert.ok(documentTitle?.includes(title), `${slug}: rendered document title`);
    assert.ok(!documentTitle.includes('Data Cloud DevOps'), `${slug}: no rendered suffix`);
    assert.doesNotMatch(resource, /^title: "Operational|^title: "[^"\n]*: /m);
  }
  assert.match(page, /separate asynchronous Connect deployment/);
  const metadataSegment = fs.readFileSync(
    path.join(SITE, 'next', 'data-cloud-devops', 'segments.md'),
    'utf8',
  );
  assert.match(
    metadataSegment,
    /The XML create and delete are verification-database rows at API 65/,
  );
  assert.match(metadataSegment, /&lt;DbtPipeline xmlns=""&gt;/);
  assert.match(metadataSegment, /CustomerDefinition\.marketSegmentDefinition-meta\.xml/);
  assert.match(metadataSegment, /--source-dir force-app --target-org SOURCE_ALIAS/);
  assert.match(metadataSegment, /Unchanged is not zero writes/);
  assert.match(metadataSegment, /<name>MarketSegmentDefinition<\/name>/);
  assert.match(metadataSegment, /Require independent inventory absence/);
  assert.match(metadataSegment, /UI retrieval example/);
  assert.doesNotMatch(
    metadataSegment,
    /Creation and a safe noncomputing deployment route are not qualified/,
  );
  assert.match(page, /^title: "Identity Resolution"$/m);
  assert.doesNotMatch(page, /d360_ir_|d360_data_graph_/);
  assert.match(page, /v68\.0\/ssot\/identity-resolutions/);
  assert.match(page, /`PUBLISHING` even with `doesRunAutomatically: false`/);
  assert.match(page, /MostFrequent/);
  assert.match(page, /ssot\/identity-resolutions\/Individual_cust/);
  assert.match(page, /absent \*\*or inaccessible\*\*/);
  assert.match(page, /not expose canonical kit creation/);
  assert.match(page, /^title: "Data Graphs"$/m);
  assert.match(page, /v68\.0\/ssot\/data-graphs' --method POST/);
  assert.match(page, /v68\.0\/ssot\/data-graphs\/CustomerGraph' --method PUT/);
  assert.match(page, /v68\.0\/ssot\/data-graphs\/CustomerGraph' --method DELETE/);
  assert.match(page, /ssot__LastName__c/);
  assert.doesNotMatch(page, /ssot\/mcp\/execute/);
  assert.match(page, /"draft": false, "publishScheduleInterval": "SystemManaged"/);
  assert.match(page, /"mode": "raw", "raw": ""/);
  assert.match(page, /API `67\.0`/);
  assert.match(page, /query-sql\/QUERY_ID\/rows\?offset=1&rowLimit=1/);
  assert.match(page, /query-sql\/QUERY_ID\/rows\?offset=0&rowLimit=1/);
  assert.match(page, /IS NOT DISTINCT FROM/);
  assert.match(page, /"rowLimit": 1/);
  assert.match(page, /LIMIT 2/);
  // B2 sweep live-qualified --stream-to-file for the member read.
  assert.match(page, /`--stream-to-file` wrote the plain response body to the file/);
  assert.doesNotMatch(page, /(?:\.\.\/|\.\/)docs\//);
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  const landing = fs.readFileSync(path.join(SITE, 'next', 'index.md'), 'utf8');
  assert.match(nav, /\/next\/data-cloud-devops\//);
  assert.match(landing, /\/next\/data-cloud-devops\//);
  const index = JSON.parse(fs.readFileSync(path.join(SITE, 'site-index.json'), 'utf8'));
  assert.equal(index.filter((entry) => entry.url === '/next/data-cloud-devops/').length, 1);
});

test('Data Cloud CLI onboarding precedes commands that assume a configured project', () => {
  const page = dataCloudGuide();
  const firstRetrieve = page.indexOf('sf project retrieve start');
  assert.ok(firstRetrieve > 0);
  const onboarding = page.slice(0, firstRetrieve);
  for (const prerequisite of [
    'sf --version',
    'sf org login web --instance-url',
    '--alias data-practice',
    'sf org list',
    'sfdx-project.json',
    'force-app/main/default/',
  ]) {
    assert.ok(onboarding.includes(prerequisite), `Missing prerequisite: ${prerequisite}`);
  }
  assert.match(onboarding, /terminal/i);
  assert.match(onboarding, /placeholders/i);
  assert.match(onboarding, /permission/i);
  assert.match(onboarding, /Standard CLI/);
  assert.match(onboarding, /sf-plugin-data/);
  assert.match(onboarding, /sf data360 retrieve/);
  assert.match(onboarding, /JSON/);
  assert.match(onboarding, /XML/);
  assert.ok(page.indexOf('**Polling**') < page.indexOf('title: "Calculated insights"'));
  assert.ok(page.indexOf('**Pagination**') < page.indexOf('title: "Segment members"'));
  assert.ok(page.indexOf('**SOQL**') < page.indexOf('sf data query'));
  assert.ok(page.indexOf('**stdin**') < page.indexOf("Get-Content -Raw -LiteralPath './"));
  assert.ok(page.indexOf('**Stdout**') < page.indexOf('--stream-to-file'));
});

test('Data Cloud CLI caveats distinguish rejected changes from untested operations', () => {
  const page = dataCloudGuide();
  for (const caveat of [
    'We tried replacing `APPROX_COUNT_DISTINCT` with `COUNT`',
    'Salesforce rejected that change because it changed how the existing measure can be aggregated',
    'Separate reads confirmed that the original SQL and field definitions were unchanged',
    'This does not mean that every SQL edit will fail',
    'so `ACTIVE` is not computation evidence',
    'later settlement does not make that command successful',
    'Do not replay an update with an unknown outcome',
    'A generated VALUE DMO was still readable after its graph was deleted',
    'This example was tested in the default dataspace in the source org',
  ]) {
    assert.ok(page.includes(caveat), `Missing tested limitation: ${caveat}`);
  }
  assert.match(page, /sf project retrieve start/);
  assert.match(page, /sf api request rest/);
  assert.doesNotMatch(
    page,
    /identity\.logicalName|development artifact|unpublished implementation/,
  );
  const unqualifiedResources = DATA_CLOUD_SLUGS.filter(
    (slug) =>
      ![
        'data-stream-definition',
        'data-lake-object',
        'data-model-object',
        'dlo-dmo-mapping',
        'field-source-target-relationship',
        'calculated-insights',
        'data-transforms',
        'data-graphs',
        'identity-resolution',
        'segments',
      ].includes(slug),
  )
    .map((slug) => fs.readFileSync(path.join(SITE, 'next/data-cloud-devops', `${slug}.md`), 'utf8'))
    .join('\n');
  assert.doesNotMatch(unqualifiedResources, /sf data360 (?:retrieve|deploy)/);
});

test('all Data Cloud CLI introductory navigation fragments resolve in the built page', () => {
  // Build first: this deliberately checks Jekyll output, not an approximation of heading slugs.
  const html = fs.readFileSync(
    path.join(SITE, '_site', 'next', 'data-cloud-devops', 'index.html'),
    'utf8',
  );
  const intro = html.slice(0, html.indexOf('id="before-you-start"'));
  const tables = intro.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g).toArray();
  assert.equal(tables.length, 1);
  const table = tables[0][1];
  const headers = table
    .matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)

    .map((match) => match[1].trim())
    .toArray();
  assert.deepEqual(headers, ['Type', 'Standard CLI', 'API', 'Plugin', 'Verified failures']);
  const expectedFragments = [
    'data-stream-configuration-datastreamdefinition',
    'data-lake-object-dlo-customobject-dll',
    'data-model-object-dmo-customobject-dlm',
    'dlo-to-dmo-mapping-objectsourcetargetmap',
    'field-relationship-fieldsrctrgtrelationship',
    'source-object-configuration-datasourceobject',
    'read',
    'read',
    'read',
    'segment-members-runtime-data-not-metadata',
    'operational-data-graphs',
    'operational-identity-resolution',
    'kit-template-datakitobjecttemplate',
    'kit-definition-datapackagekitdefinition',
    'kit-membership-datapackagekitobject',
  ];
  const rows = table
    .matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)
    .toArray()
    .slice(1);
  assert.equal(rows.length, expectedFragments.length);
  const fragments = [];
  for (const [rowIndex, row] of rows.entries()) {
    const cells = row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g).toArray();
    assert.equal(cells.length, 5);
    const links = cells[0][1].matchAll(/href="([^"#]+)#([^"]+)"/g).toArray();
    assert.equal(links.length, 1);
    assert.equal(links[0][1], `/next/data-cloud-devops/${DATA_CLOUD_SLUGS[rowIndex]}/`);
    const targetHtml = fs.readFileSync(
      path.join(
        SITE,
        '_site',
        'next',
        'data-cloud-devops',
        DATA_CLOUD_SLUGS[rowIndex],
        'index.html',
      ),
      'utf8',
    );
    for (const operation of CRUD_OPERATIONS) {
      const isMappingRestriction =
        DATA_CLOUD_SLUGS[rowIndex] === 'dlo-dmo-mapping' &&
        ['update', 'delete'].includes(operation);
      const isStreamRetrieve =
        DATA_CLOUD_SLUGS[rowIndex] === 'data-stream-definition' && operation === 'read';
      const sharedParagraph = isMappingRestriction
        ? String.raw`\s*<p class="mapping-shared-restriction">[\s\S]*?</p>`
        : isStreamRetrieve
          ? String.raw`\s*<p>The plugin’s implemented exact-name selector is <code[^>]*>data-stream:API_NAME</code>[\s\S]*?</p>`
          : '';
      assert.match(
        targetHtml,
        new RegExp(
          String.raw`<h2 id="${ANCHOR[operation]}">${operation === 'read' ? 'Read' : operation[0].toUpperCase() + operation.slice(1)}</h2>${sharedParagraph}\s*<div class="operation-tabs"`,
        ),
        `${DATA_CLOUD_SLUGS[rowIndex]} ${operation}: only mapping Update/Delete and stream Retrieve allow their specific shared paragraph`,
      );
    }
    const fragment = links[0][2];
    fragments.push(fragment);
    const raw = fs.readFileSync(
      path.join(SITE, 'next/data-cloud-devops', `${DATA_CLOUD_SLUGS[rowIndex]}.md`),
      'utf8',
    );
    // The overview matrix shows one chip per tool and operation, read from the page's grades.
    for (const [toolIndex, cell] of cells.slice(1, 4).entries()) {
      assert.deepEqual(
        matrixChips(cell[1]),
        expectedChips(raw, ['cli', 'api', 'plugin'][toolIndex]),
      );
    }
    const schema = crudSchema(raw);
    if (
      ['data-model-object', 'dlo-dmo-mapping', 'data-source-object'].includes(
        DATA_CLOUD_SLUGS[rowIndex],
      )
    ) {
      assert.match(
        raw,
        /\{% include crud-summary\.html %\}\n\n\*\*(?:Plugin qualification|Partial Plugin coverage)/,
      );
    } else {
      assert.match(
        raw,
        /\{% include crud-summary\.html %\}\n\n(?:\{% capture read_plugin %\}|## (?:Read|Documented native API contracts|Native API contracts)|\*\*Plugin qualification|### Why use a native API plugin workflow\?)/,
      );
    }
    const summary = targetHtml.match(/<table class="crud-summary">([\s\S]*?)<\/table>/)?.[1];
    assert.ok(summary, 'Each detail has a horizontal summary');
    const summaryHeaders = summary.matchAll(/<th scope="col">([\s\S]*?)<\/th>/g).toArray();
    assert.equal(summaryHeaders.length, 4);
    for (const [operationIndex, header] of summaryHeaders.entries()) {
      const operation = CRUD_OPERATIONS[operationIndex];
      const label = operation === 'read' ? 'Read' : operation[0].toUpperCase() + operation.slice(1);
      assert.equal(header[1], `<a href="#${ANCHOR[operation]}">${label}</a>`);
      assert.equal(
        targetHtml
          .matchAll(/\bid="([^"]+)"/g)

          .filter((match) => match[1] === ANCHOR[operation])
          .toArray().length,
        1,
        `${DATA_CLOUD_SLUGS[rowIndex]}: unique ${operation} target`,
      );
      assert.ok(targetHtml.includes(`<h2 id="${ANCHOR[operation]}">${label}</h2>`));
    }
    const summaryCells = summary.matchAll(/<td>([\s\S]*?)<\/td>/g).toArray();
    assert.equal(summaryCells.length, 4);
    for (const [operationIndex, cell] of summaryCells.entries()) {
      assertCrudCell(cell[1], schema[operationIndex]);
    }
    const methodTable = targetHtml.match(/<table class="crud-methods">([\s\S]*?)<\/table>/)?.[1];
    if (
      [
        'data-stream-definition',
        'data-lake-object',
        'data-model-object',
        'dlo-dmo-mapping',
        'field-source-target-relationship',
        'data-source-object',
        'calculated-insights',
        'data-transforms',
        'segments',
        'segment-members',
        'data-graphs',
        'identity-resolution',
        'data-kit-object-template',
        'data-package-kit-definition',
        'data-package-kit-object',
      ].includes(DATA_CLOUD_SLUGS[rowIndex])
    ) {
      assert.ok(methodTable, 'Explicit method grades render separately from overall');
      const methodRows = methodTable
        .matchAll(/<tr><th scope="row">([^<]+)<\/th>([\s\S]*?)<\/tr>/g)
        .toArray();
      assert.deepEqual(
        methodRows.map((row) => row[1]),
        ['CLI', 'API', 'sf-plugin-data'],
      );
      for (const [methodIndex, row] of methodRows.entries()) {
        const tool = ['cli', 'api', 'plugin'][methodIndex];
        const grades = CRUD_OPERATIONS.map(
          (operation) =>
            raw
              .match(new RegExp(`^  ${operation}: (.+)$`, 'm'))[1]
              .match(new RegExp(String.raw`\b${tool}: "(\w+)"`))?.[1] || 'unknown',
        );
        const gradeCells = row[2].matchAll(/<td>([\s\S]*?)<\/td>/g).toArray();
        assert.equal(gradeCells.length, 4);
        for (const [index, cell] of gradeCells.entries()) {
          assert.match(cell[1], new RegExp(`data-crud-status="${grades[index]}"`));
          assert.doesNotMatch(cell[1], /<img/);
          assert.equal(
            cell[1].replaceAll(/<[^>]+>/g, '').trim(),
            grades[index] === 'unknown'
              ? 'Not tested'
              : grades[index] === 'yes'
                ? 'Yes'
                : grades[index] === 'no'
                  ? 'Not supported'
                  : 'Partial',
          );
        }
      }
    } else {
      assert.equal(methodTable, undefined, 'Legacy aggregates do not fabricate method tables');
    }
    assert.ok(cells[4][1].trim(), `Missing scope for #${fragment}`);
    assert.equal(
      targetHtml
        .matchAll(/\bid="([^"]+)"/g)

        .filter((match) => match[1] === fragment)
        .toArray().length,
      1,
      `Missing or ambiguous introductory target: #${fragment}`,
    );
  }
  assert.deepEqual(fragments, expectedFragments);
  assert.equal(new Set(DATA_CLOUD_SLUGS).size, rows.length);
});

test('CRUD schema rejects invalid ratings and methods and reserves iconless unknown/no', () => {
  // Schema rejection must not depend on a resource retaining historical capability ratings.
  const raw = `---
crud:
  read: { status: "yes", methods: [cli] }
  create: { status: "unknown", methods: [] }
  update: { status: "partial", methods: [api] }
  delete: { status: "no", methods: [] }
---
`;
  assert.deepEqual(crudSchema(raw), ['yes:cli', 'unknown:', 'partial:api', 'no:']);
  for (const invalid of [
    raw.replace('status: "yes"', 'status: yes'),
    raw.replace('status: "yes"', 'status: "maybe"'),
    raw.replace('methods: [cli]', 'methods: [unsupported]'),
    raw.replace('methods: [cli]', 'methods: [cli, cli]'),
    raw.replace('methods: [cli]', 'methods: []'),
    raw.replace('status: "unknown", methods: []', 'status: "unknown", methods: [api]'),
    raw.replace('status: "unknown", methods: []', 'status: "no", methods: [api]'),
  ]) {
    assert.notEqual(invalid, raw, 'Each negative fixture must actually mutate the schema');
    assert.throws(() => crudSchema(invalid), { name: 'AssertionError' });
  }
  assert.equal(crudSchema(raw.replace('status: "unknown"', 'status: "no"'))[1], 'no:');
  assert.equal(
    crudSchema(raw.replace('methods: [cli]', 'methods: [cli, api, plugin]'))[0],
    'yes:cli,api,plugin',
  );
  assert.equal(crudSchema(raw.replace('methods: [api]', 'methods: [plugin]'))[2], 'partial:plugin');
  const cell = fs.readFileSync(path.join(SITE, '_includes/crud-cell.html'), 'utf8');
  assert.match(cell, /if status == 'yes' or status == 'partial'/);
  assert.ok(cell.indexOf('<img ') < cell.indexOf('{%- else -%}'));
  assert.doesNotMatch(cell.split('{%- else -%}', 2)[1], /<img/);
  for (const method of ['cli', 'api', 'plugin']) {
    const icon = fs.readFileSync(path.join(SITE, 'assets/icons', `${method}.svg`), 'utf8');
    assert.match(icon, /viewBox="0 0 64 64"/);
    assert.ok(icon.includes({ cli: '#0284c7', api: '#8b5cf6', plugin: '#d97706' }[method]));
    assert.doesNotMatch(icon, /<script|onload=/);
  }
  const cliIcon = fs.readFileSync(path.join(SITE, 'assets/icons/cli.svg'), 'utf8');
  const pluginIcon = fs.readFileSync(path.join(SITE, 'assets/icons/plugin.svg'), 'utf8');
  assert.equal(
    pluginIcon,
    cliIcon.replace('#0284c7', '#d97706'),
    'Same CLI geometry, distinct plugin amber',
  );
});

function explicitCrudPage(status, methods, map) {
  return `---\ncrud:\n${CRUD_OPERATIONS.map((operation) => `  ${operation}: { status: "${status}", methods: [${methods}], method_statuses: { ${map} } }`).join('\n')}\n---\n`;
}

test('explicit method maps validate best single route without changing legacy aggregates', () => {
  for (const [status, methods, map] of [
    ['yes', 'cli, api', 'cli: "partial", api: "yes", plugin: "unknown"'],
    ['partial', 'api', 'cli: "unknown", api: "partial", plugin: "no"'],
    ['unknown', '', 'cli: "no", api: "unknown", plugin: "no"'],
    ['no', '', 'cli: "no", api: "no", plugin: "no"'],
    ['unknown', '', 'cli: "no"'],
  ]) {
    assert.deepEqual(
      crudSchema(explicitCrudPage(status, methods, map)),
      CRUD_OPERATIONS.map(() => `${status}:${methods.replaceAll(' ', '')}`),
    );
  }
  for (const raw of [
    explicitCrudPage('yes', 'cli, api', 'cli: "partial", api: "partial", plugin: "no"'),
    explicitCrudPage('no', '', 'cli: "no"'),
    explicitCrudPage('yes', 'api', 'cli: "partial", api: "yes"'),
    explicitCrudPage('yes', 'api', 'api: "yes", api: "yes"'),
    explicitCrudPage('yes', 'api', 'api: "available"'),
    explicitCrudPage('yes', 'api', 'other: "yes"'),
  ]) {
    assert.throws(() => crudSchema(raw), { name: 'AssertionError' });
  }
});

test('CRUD overview preserves curated order and hides only explicit hidden targets', () => {
  const raw = fs.readFileSync(path.join(SITE, 'next/data-cloud-devops/index.md'), 'utf8');
  const rows = raw
    .matchAll(
      /^ {2}- path: next\/data-cloud-devops\/([^\n]+)\.md\n {4}label: ([^\n]+)\n {4}anchor: ([^\n]+)\n {4}failures: '([^\n]+)'$/gm,
    )
    .toArray();
  assert.deepEqual(
    rows.map((row) => row[1]),
    DATA_CLOUD_SLUGS,
  );
  assert.deepEqual(
    rows.map((row) => row[2]),
    [
      'Data Streams',
      'DLOs',
      'DMOs',
      'DLO-DMO-mapping',
      'Relationships',
      'Source object definitions',
      'Calculated insights',
      'Data Transforms',
      'Segments',
      'Segment members',
      'Data Graphs',
      'Identity Resolution',
      'Kit templates',
      'Kit definitions',
      'Kit membership',
    ],
  );
  const matrix = fs.readFileSync(path.join(SITE, '_includes/crud-tool-matrix.html'), 'utf8');
  assert.match(raw, /\{% include crud-tool-matrix\.html %\}/);
  assert.match(
    matrix,
    /unless resource.discoverable == false or resource.discoverable == 'false' or resource.sitemap == false or resource.sitemap == 'false' or site.data.undiscoverable_urls\[resource.url\]/,
  );
  assert.doesNotMatch(matrix, /if resource.discoverable|discoverable == true/);
  const html = fs.readFileSync(path.join(SITE, '_site/next/data-cloud-devops/index.html'), 'utf8');
  const renderedRows = html
    .matchAll(/<td><a href="\/next\/data-cloud-devops\/[^"]+">[\s\S]*?<\/tr>/g)
    .toArray();
  assert.equal(renderedRows.length, 15, 'Absent discoverable flags remain visible');
  for (const [index, row] of rows.entries()) {
    const cells = renderedRows[index][0].matchAll(/<td>([\s\S]*?)<\/td>/g).toArray();
    const text = cells[4][1].replaceAll(/<[^>]+>/g, '').trim();
    assert.equal(text, row[4].replaceAll('`', ''), 'Scope prose is preserved');
  }
});

test('sidebar and plugin honor the undiscoverable lookup', () => {
  const sidebar = fs.readFileSync(path.join(SITE, '_includes', 'sidebar.html'), 'utf8');
  assert.match(sidebar, /site\.data\.undiscoverable_urls/);
  const plugin = fs.readFileSync(path.join(SITE, '_plugins', 'discoverable.rb'), 'utf8');
  assert.match(plugin, /item\.data\['sitemap'\] = false/);
  assert.match(plugin, /:post_read/);
});

test('Data Cloud sidebar nests all resources and expands only for its current pages', () => {
  const nav = fs.readFileSync(path.join(SITE, '_data', 'navigation.yml'), 'utf8');
  const branch = nav.match(
    /^ {4}- title: Data Cloud DevOps\n {6}url: \/next\/data-cloud-devops\/\n {6}children:\n((?: {8}.+\n)+)/m,
  );
  assert.ok(branch, 'Clickable Data Cloud parent has nested children');
  assert.deepEqual(
    branch[1]
      .matchAll(/^ {10}url: \/next\/data-cloud-devops\/([^/]+)\/$/gm)

      .map((match) => match[1])
      .toArray(),
    NAV_SLUGS,
  );
  assert.equal(nav.matchAll(/url: \/next\/data-cloud-devops\//g).toArray().length, 16);
  for (const slug of ['index', ...NAV_SLUGS, '../index']) {
    const html = fs.readFileSync(
      path.join(
        SITE,
        '_site',
        'next',
        slug === '../index' ? '' : 'data-cloud-devops',
        NAV_SLUGS.includes(slug) ? slug : '',
        'index.html',
      ),
      'utf8',
    );
    const sidebar = html.match(/<nav class="sidebar"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(sidebar, `${slug}: sidebar exists`);
    const parent = sidebar.match(
      /<li class="([^"]*)">\s*<a href="\/next\/data-cloud-devops\/"\s*class="([^"]*)">([\s\S]*?)<ul class="([^"]*)">([\s\S]*?)<\/ul>/,
    );
    assert.ok(parent, `${slug}: nested clickable parent exists`);
    assert.ok(parent[2].includes('sidebar-link--parent'));
    assert.match(parent[3], /Data Cloud DevOps[\s\S]*sidebar-chevron/);
    const isExpanded = slug !== '../index';
    assert.equal(parent[1].includes('is-expanded'), isExpanded, `${slug}: parent expansion`);
    assert.equal(parent[4].includes('is-open'), isExpanded, `${slug}: child list expansion`);
    assert.equal(parent[2].includes('is-active'), slug === 'index', `${slug}: parent active`);
    const links = parent[5].matchAll(/<a href="([^"]+)"\s*class="([^"]*)">/g).toArray();
    assert.deepEqual(
      links.map((match) => match[1]),
      NAV_SLUGS.map((child) => `/next/data-cloud-devops/${child}/`),
      `${slug}: all 15 child links`,
    );
    assert.deepEqual(
      links.filter((match) => match[2].includes('is-active')).map((match) => match[1]),
      NAV_SLUGS.includes(slug) ? [`/next/data-cloud-devops/${slug}/`] : [],
      `${slug}: only the current child is active`,
    );
  }
});

test('Data Cloud split pages retain search discovery, scoped verification and cross-page links', () => {
  const directory = path.join(SITE, 'next', 'data-cloud-devops');
  assert.deepEqual(
    fs.readdirSync(directory).toSorted((a, b) => a.localeCompare(b)),
    ['index', ...DATA_CLOUD_SLUGS]
      .map((slug) => slug + '.md')
      .toSorted((a, b) => a.localeCompare(b)),
  );
  const index = JSON.parse(fs.readFileSync(path.join(SITE, 'site-index.json'), 'utf8'));
  const main = fs.readFileSync(path.join(directory, 'index.md'), 'utf8');
  assert.ok(main.includes("The plugin's `delete` command needs no manifest."));
  assert.match(main, /^## Data Spaces$/m);
  assert.ok(main.trimEnd().endsWith('is on the [Data Spaces](/next/data-spaces/) page.'));
  assert.match(main, /^## Which tool works for which type$/m);
  assert.match(main, /^### Behaviour worth knowing$/m);
  assert.match(main, /^### What this means for the plugin$/m);
  const spaces = fs.readFileSync(path.join(SITE, 'next/data-spaces/index.md'), 'utf8');
  assert.match(spaces, /^permalink: \/next\/data-spaces\/$/m);
  assert.match(spaces, /^## Uniqueness inside and across data spaces$/m);
  assert.match(spaces, /^## How each route treats the data space$/m);
  assert.ok(spaces.includes('{"members":{"members":[{"memberName":"Example__dll"}]}}'));
  assert.doesNotMatch(main, /^## Data Model Object/m);
  assert.match(main, /all linked type-page details/);
  assert.match(main, /^crud_rows:$/m);
  assert.match(
    fs.readFileSync(path.join(SITE, '_includes/crud-tool-matrix.html'), 'utf8'),
    /site\.pages \| where: 'path', row\.path \| first/,
  );
  assert.doesNotMatch(main, /^\| \[DMOs\]/m);
  assert.doesNotMatch(main, /^crud:$/m);
  for (const slug of ['index', ...DATA_CLOUD_SLUGS]) {
    const raw = fs.readFileSync(path.join(directory, slug + '.md'), 'utf8');
    const url = '/next/data-cloud-devops/' + (slug === 'index' ? '' : slug + '/');
    assert.match(raw, /^verification: verified$/m);
    // The overview carries this limit in the verification badge title only; type pages also state it.
    assert.match(
      raw,
      slug === 'index'
        ? /does not establish general CRUD support/
        : /badge does not verify untested writes or general CRUD support/,
    );
    assert.equal(index.filter((entry) => entry.url === url).length, 1);
    const html = fs.readFileSync(path.join(SITE, '_site', url, 'index.html'), 'utf8');
    assert.match(html, /Runtime verified/);
    assert.match(
      html,
      /title="Live Data Cloud reads and only the bounded operations described here were verified; this does not establish general CRUD support\."/,
    );
    assert.doesNotMatch(html, /Every claim on this page was proven/);
    if (slug !== 'index') {
      assert.match(raw, /^parent_url: \/next\/data-cloud-devops\/$/m);
      assert.match(html, /href="\/next\/data-cloud-devops\/"/);
    }
    for (const link of raw.matchAll(/\]\((\/next\/data-cloud-devops\/[^)#]*)(?:#([^)]*))?\)/g)) {
      const target = fs.readFileSync(path.join(SITE, '_site', link[1], 'index.html'), 'utf8');
      if (link[2]) {
        assert.ok(target.includes('id="' + link[2] + '"'), 'Missing target: ' + link[0]);
      }
    }
  }
  const defaultHtml = fs.readFileSync(
    path.join(SITE, '_site/engagement/ampscript/functions/base64decode/index.html'),
    'utf8',
  );
  assert.match(
    defaultHtml,
    /Every claim on this page was proven by running the function on a live Marketing Cloud Engagement CloudPage/,
  );
  const dmo = fs.readFileSync(path.join(directory, 'data-model-object.md'), 'utf8');
  assert.match(dmo, /"fields":\[\{"name":"UpdateNote","label":"Update Note","dataType":"Text"\}\]/);
  for (const text of [
    'about 28 seconds',
    'entire runtime object and entire Metadata object',
    // B3 sweep (2026-11-16): mapped DMOs and the relationship refusal are now tested.
    'Not verified:** Populated DMOs. Related DMOs beyond the relationship refusal above.',
    'mutation echo',
  ]) {
    assert.ok(dmo.includes(text), text);
  }
  for (const slug of ['index', ...DATA_CLOUD_SLUGS]) {
    const bytes = fs.readFileSync(path.join(directory, `${slug}.md`));
    assert.notEqual(bytes.subarray(0, 3).toString('hex'), 'efbbbf', `${slug}: no BOM`);
    assert.ok(!bytes.includes(13), `${slug}: LF only`);
  }
  for (const slug of ['calculated-insight-definition', 'segment-definition']) {
    assert.ok(!fs.existsSync(path.join(directory, `${slug}.md`)));
    assert.ok(index.every((entry) => entry.url !== `/next/data-cloud-devops/${slug}/`));
  }
  const graph = fs.readFileSync(path.join(directory, 'data-graphs.md'), 'utf8');
  const graphBody = (operation) =>
    JSON.parse(
      graph
        .split(`{% capture ${operation}_connect %}`)[1]
        .split('{% endcapture %}', 1)[0]
        .match(/```json\n([\s\S]*?)\n```/)[1],
    );
  const create = graphBody('create');
  const update = graphBody('update');
  assert.equal(create.name, 'CustomerGraph');
  for (const key of [
    'idDmoName',
    'valuesDmoName',
    'dayZeroMappingDevName',
    'dayZeroTransformDevName',
  ]) {
    assert.ok(!Object.hasOwn(create, key), `create omits generated ${key}`);
  }
  assert.ok(Object.hasOwn(update, 'valuesDmoName'), 'update keeps generated names');
  assert.match(JSON.stringify(update), /ssot__LastName__c/);
  assert.doesNotMatch(graph, /paramsJson|mcp\/execute/);
  const membership = fs.readFileSync(path.join(directory, 'data-package-kit-object.md'), 'utf8');
  assert.match(membership, /### Moving a kit is not installing it/);
  assert.match(
    membership,
    /A missing dedicated CLI command does not mean the underlying API operation is unavailable/,
  );
});
