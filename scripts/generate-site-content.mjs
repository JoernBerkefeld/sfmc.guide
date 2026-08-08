/**
 * One-shot / regenerable content helpers for sfmc.guide.
 * Run from workspace root or sfmc.guide:
 *   node sfmc.guide/scripts/generate-site-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, '..');
const ROOT = path.resolve(SITE, '..');
const COOKBOOK = path.join(ROOT, 'SFMC-Cookbook');

function write(rel, content) {
  const full = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const body = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  fs.writeFileSync(full, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
  console.log('wrote', rel);
}

/** Copy a Cookbook asset directory next to the engagement page (keeps relative img/ links working). */
function copyCookbookDir(fromRel, toRel) {
  const from = path.join(COOKBOOK, fromRel);
  const to = path.join(SITE, toRel);
  if (!fs.existsSync(from)) {
    console.warn('skip missing cookbook dir', fromRel);
    return;
  }
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name);
    const dest = path.join(to, name);
    if (fs.statSync(src).isDirectory()) {
      copyCookbookDir(path.join(fromRel, name), path.join(toRel, name));
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  console.log('copied', fromRel, '→', toRel);
}

function cookbookDate(rel) {
  try {
    const out = execSync(`git log --diff-filter=A --follow --format=%aI -- "${rel}"`, {
      cwd: COOKBOOK,
      encoding: 'utf8',
    })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    return out.at(-1)?.slice(0, 10) || '2019-02-16';
  } catch {
    return '2019-02-16';
  }
}

function provenance(url, date) {
  return `{% include callout.html type="note" title="Originally published" content="First published **${date}** in the [SFMC Cookbook](${url}). Ported here for sfmc.guide." %}\n\n`;
}

function stripH1(md) {
  return md.replace(/^#\s+.+\r?\n+/, '');
}

function remapCookbookLinks(md) {
  return md
    .replace(/\]\(\.\.\/ssjs\/?\)/g, '](https://ssjs.guide)')
    .replace(/\]\(\/ssjs\/?[^)]*\)/g, '](https://ssjs.guide)')
    .replace(/\]\(\.\.\/general\/?\)/g, '](/engagement/general/)')
    .replace(/\]\(\.\.\/ampscript\/?\)/g, '](/engagement/ampscript/)')
    .replace(/\]\(\.\.\/faq\/?\)/g, '](/engagement/faq/)')
    .replace(/\]\(\.\.\/encryption\/?\)/g, '](/engagement/encryption/)')
    .replace(/\]\(\.\.\/einstein\/recommendation\/?\)/g, '](/engagement/einstein/recommendation/)');
}

function portPage({ cookbookRel, outRel, title, description, permalink, cookbookUrlPath }) {
  const src = path.join(COOKBOOK, cookbookRel);
  let body = fs.readFileSync(src, 'utf8');
  body = stripH1(body);
  body = remapCookbookLinks(body);
  const date = cookbookDate(cookbookRel);
  const url = `https://joernberkefeld.github.io/SFMC-Cookbook/${cookbookUrlPath}`;
  const fm = `---
layout: page
title: "${title}"
description: "${description}"
parent: Engagement
parent_url: /engagement/
permalink: ${permalink}
---

`;
  write(outRel, fm + provenance(url, date) + body.trim() + '\n');
}

// ---- Engagement ----
write(
  'engagement/index.md',
  `---
layout: page
title: "Marketing Cloud Engagement"
description: "Architect-oriented guides for Salesforce Marketing Cloud Engagement — patterns, FAQ, AMPscript notes, Einstein, and encryption."
permalink: /engagement/
---

Practical Engagement material ported from the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/), plus pointers to deeper language references.

{% include callout.html type="tip" title="SSJS lives on ssjs.guide" content="The Cookbook SSJS chapter is **not** duplicated here. Use [ssjs.guide](https://ssjs.guide) for Platform functions, Core Library, WSProxy, engine limits, and recipes." %}

## Guides

| Topic | What you will find |
|---|---|
| [General coding guidelines](/engagement/general/) | Environment, project layout, Data Extensions, business units |
| [AMPscript](/engagement/ampscript/) | Engagement AMPscript how-tos from the Cookbook |
| [FAQ](/engagement/faq/) | Automations, CloudPages, emails, Journey Builder, admin |
| [Einstein Recommendations](/engagement/einstein/recommendation/) | Recommendation scenarios |
| [Encryption](/engagement/encryption/) | Crypto patterns in Engagement |

## Related

- [ssjs.guide](https://ssjs.guide) — Server-Side JavaScript reference
- [ampscript.guide](https://ampscript.guide) — AMPscript function reference
- [Tools](/tools/) — editor, CI, and ecosystem tooling
`,
);

portPage({
  cookbookRel: 'general/README.md',
  outRel: 'engagement/general/index.md',
  title: 'General coding guidelines',
  description:
    'Development environment, project setup, Data Extensions, and business units for SFMC Engagement.',
  permalink: '/engagement/general/',
  cookbookUrlPath: 'general/',
});

portPage({
  cookbookRel: 'ampscript/README.md',
  outRel: 'engagement/ampscript/index.md',
  title: 'AMPscript',
  description: 'Engagement AMPscript guidance from the SFMC Cookbook.',
  permalink: '/engagement/ampscript/',
  cookbookUrlPath: 'ampscript/',
});

portPage({
  cookbookRel: 'faq/README.md',
  outRel: 'engagement/faq/index.md',
  title: 'FAQ',
  description:
    'Frequently asked questions for Automations, CloudPages, emails, Journey Builder, and admin.',
  permalink: '/engagement/faq/',
  cookbookUrlPath: 'faq/',
});

portPage({
  cookbookRel: 'einstein/recommendation/README.md',
  outRel: 'engagement/einstein/recommendation/index.md',
  title: 'Einstein Recommendations',
  description: 'Working with Einstein Recommendations in Marketing Cloud Engagement.',
  permalink: '/engagement/einstein/recommendation/',
  cookbookUrlPath: 'einstein/recommendation/',
});

portPage({
  cookbookRel: 'encryption/README.md',
  outRel: 'engagement/encryption/index.md',
  title: 'Encryption',
  description: 'Encryption patterns for Salesforce Marketing Cloud Engagement.',
  permalink: '/engagement/encryption/',
  cookbookUrlPath: 'encryption/',
});

// Sibling img/ folders referenced as ![…](img/…) in the ported Markdown
copyCookbookDir('einstein/recommendation/img', 'engagement/einstein/recommendation/img');
copyCookbookDir('encryption/img', 'engagement/encryption/img');

console.log('engagement pages done');
