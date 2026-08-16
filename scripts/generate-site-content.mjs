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

/**
 * Relabel fenced code blocks and/or wrap them in a Liquid `{% raw %}` guard.
 *
 * The Cookbook mirrors tag AMPscript snippets with generic languages
 * (`c++` / `java` / `javascript` / `html`) that Rouge cannot highlight as
 * AMPscript, and some blocks contain `{{ … }}` / `{% … %}`-like text that the
 * Jekyll Liquid pass would try to evaluate. Both fixes are applied positionally
 * so the generator reproduces the hand-corrected committed pages.
 *
 * @param {string} md - ported Markdown body (fences already present)
 * @param {(string|null)[]} [fenceLanguages] - target language per fenced block,
 *   in document order; `null`/`undefined` leaves that block's language as-is
 * @param {number[]} [rawWrapFences] - 0-based indices of fenced blocks to wrap
 *   in `{% raw %}` … `{% endraw %}`
 * @returns {string} the transformed Markdown
 */
function transformFences(md, fenceLanguages = [], rawWrapFences = []) {
  const rawSet = new Set(rawWrapFences);
  let index = 0;
  return md.replace(/^```([^\n]*)\n([\s\S]*?)^```/gm, (match, lang, code) => {
    const i = index++;
    const override = fenceLanguages[i];
    const newLang = override == null ? lang : override;
    let block = '```' + newLang + '\n' + code + '```';
    if (rawSet.has(i)) {
      block = '{% raw %}\n' + block + '\n{% endraw %}';
    }
    return block;
  });
}

function portPage({
  cookbookRel,
  outRel,
  title,
  description,
  permalink,
  cookbookUrlPath,
  body: bodyOverride,
  fenceLanguages,
  rawWrapFences,
}) {
  const src = path.join(COOKBOOK, cookbookRel);
  const date = cookbookDate(cookbookRel);
  const url = `https://joernberkefeld.github.io/SFMC-Cookbook/${cookbookUrlPath}`;
  const fm = `---
layout: page
title: "${title}"
description: "${description}"
parent: Engagement
parent_url: /engagement/
permalink: ${permalink}
platforms:
  - engagement
---

`;
  // A page may supply a hand-authored landing body instead of the full ported
  // cookbook chapter — used to trim pages whose detail now lives on dedicated
  // reference pages. The bodyOverride receives (provenanceCallout, cookbookUrl, date).
  if (typeof bodyOverride === 'function') {
    write(outRel, fm + bodyOverride({ provenance: provenance(url, date), url, date }));
    return;
  }
  let body = fs.readFileSync(src, 'utf8');
  body = stripH1(body);
  body = remapCookbookLinks(body);
  if (fenceLanguages || rawWrapFences) {
    body = transformFences(body, fenceLanguages, rawWrapFences);
  }
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
platforms:
  - engagement
---

Practical Engagement material ported from the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/), plus pointers to deeper language references.

{% include callout.html type="tip" title="SSJS lives on ssjs.guide" content="The Cookbook SSJS chapter is **not** duplicated here. Use [ssjs.guide](https://ssjs.guide) for Platform functions, Core Library, WSProxy, engine limits, and recipes." %}

## Guides

| Topic | What you will find |
|---|---|
| [General coding guidelines](/engagement/general/) | Environment, project layout, Data Extensions, business units |
| [AMPscript](/engagement/ampscript/) | Engagement AMPscript how-tos from the Cookbook |
| [AMPscript function reference](/engagement/ampscript/functions/) | Per-function pages proven on a live Engagement CloudPage — signature, edge cases, test script |
| [Differs from official docs](/engagement/differs-from-docs/) | AMPscript behaviour on Engagement that contradicts the official documentation |
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
  // Relabel the AMPscript/mixed-server snippets the Cookbook tags as
  // javascript/html/java so Rouge highlights them as AMPscript. The pure-SSJS
  // (mycode*.ssjs) and pure-HTML blocks keep their original language.
  fenceLanguages: [
    'ampscript', // %%= TreatAsContent(...loader.html)
    'ampscript', // loader.html (mixed AMPscript + SSJS)
    null, // mycode1.ssjs
    null, // mycode2.ssjs
    null, // mycode3.ssjs
    null, // console helper (html)
    null, // console usage (html)
    null, // model CloudPage layout (html)
    'ampscript', // initCore.ssjs (%%[ … ]%% + script)
    'ampscript', // myAMPscript.amp
    'ampscript', // mySSJS.ssjs (%%[ … ]%%)
  ],
});

portPage({
  cookbookRel: 'ampscript/README.md',
  outRel: 'engagement/ampscript/index.md',
  title: 'AMPscript',
  description: 'Engagement AMPscript guidance from the SFMC Cookbook.',
  permalink: '/engagement/ampscript/',
  cookbookUrlPath: 'ampscript/',
  // Landing stub: the Lookup-family snippets and the trackable-links lesson from
  // the original cookbook chapter are now covered by dedicated, runtime-proven
  // function reference pages. Only the general "Hide your code" authoring
  // guidance is unique, so it is retained here on the landing page.
  body: ({ provenance }) =>
    provenance +
    `{% include callout.html type="tip" title="Looking for a specific function?" content="This page collects general AMPscript authoring guidance. For per-function reference pages proven against a live CloudPage — signature, argument handling, edge cases, and the test script behind each claim — see the [AMPscript function reference](/engagement/ampscript/functions/)." %}

## Hide your code

When AMPscript is inserted into either an email or a CloudPage it usually clutters up the preview window with code. To avoid this, wrap your code in something that will not render:

\`\`\`ampscript
<div style="display:none">
%%[
// your code here
]%%
</div>
\`\`\`

Why not something that does not render out of the box, like \`<script>...</script>\` or \`<style>...</style>\`? SFMC strips every \`<script>\` tag out of emails without warning. Both tags might also trigger reformatting that silently breaks your code.

_Why?_ Non-developers just get distracted by the code.

_Why?_ Showing lots of code during a demo in the preview window distracts from the actual email content and costs you time explaining it again and again.

_Why?_ Hiding the code shrinks the content block to its minimum height, making the right block easier to select because scrolling happens less often.

## Data Extension lookups

The AMPscript \`Lookup\` family is documented individually, each proven against a live CloudPage:

- [Lookup](/engagement/ampscript/functions/lookup/) — single field of the first matching row, case-insensitive
- [LookupRows](/engagement/ampscript/functions/lookuprows/) — full rows, case-insensitive
- [LookupRowsCS](/engagement/ampscript/functions/lookuprowscs/) — full rows, case-sensitive
- [LookupOrderedRows](/engagement/ampscript/functions/lookuporderedrows/) — sorted full rows, case-insensitive
- [LookupOrderedRowsCS](/engagement/ampscript/functions/lookuporderedrowscs/) — sorted full rows, case-sensitive

## Dynamic trackable links

Building link URLs from variables has a tracking pitfall — use \`RedirectTo\` rather than a hand-built \`<a>\` tag. See [RedirectTo](/engagement/ampscript/functions/redirectto/#dynamic-trackable-links).

## Other resources

- [ampscript.guide](https://ampscript.guide/) — community AMPscript function reference
`,
});

portPage({
  cookbookRel: 'faq/README.md',
  outRel: 'engagement/faq/index.md',
  title: 'FAQ',
  description:
    'Frequently asked questions for Automations, CloudPages, emails, Journey Builder, and admin.',
  permalink: '/engagement/faq/',
  cookbookUrlPath: 'faq/',
  // Relabel the AMPscript snippet (tagged c++ in the Cookbook) to ampscript, and
  // guard the JSON payload block — it contains {{hostEndpoint}}/{{TriggeredSend}}
  // placeholders that Jekyll's Liquid pass would otherwise try to evaluate.
  fenceLanguages: [
    null, // JSON send payload
    'ampscript', // AMPscript solution (tagged c++)
    null, // SSJS solution (javascript)
  ],
  rawWrapFences: [0],
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
