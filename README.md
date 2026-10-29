# sfmc.guide

Technical architecture guide for Salesforce Marketing Cloud **Engagement** and **Marketing Cloud Next**.

Site: <https://sfmc.guide>

Sibling SSJS reference: <https://ssjs.guide>

## Local build

```powershell
bundle install
npm run build --no-workspaces
npm run serve --no-workspaces
```

## Regenerators

From the monorepo root (needs local `ampscript-data` / `handlebars-data` / `SFMC-Cookbook`):

```powershell
npm run generate:all --prefix sfmc.guide
node sfmc.guide/scripts/generate-site-content.mjs
node sfmc.guide/scripts/generate-tools.mjs
```

`generate:all` rebuilds `_data/ampscript_functions.yml`, `_data/handlebars_helpers.yml`, `site-index.json` and the Rouge catalogs. The two `_data` files back the function and helper index tables on `/engagement/ampscript/functions/`, `/next/ampscript/functions/` and `/next/handlebars/helpers/` — regenerate them whenever `ampscript-data` or `handlebars-data` changes. The pre-commit hook runs all four for you, so running them by hand is only needed to preview the result.

`generate-site-content.mjs` and `generate-tools.mjs` are **not** part of the hook and overwrite tracked pages under `engagement/` and `tools/` from `../SFMC-Cookbook` and a catalog inside the script. Run them only when you intend to re-scaffold those pages, and review the diff — they will revert hand-edits.

## Data Cloud sidebar navigation

Under **Next**, **Data Cloud with Salesforce CLI** links to the overview and groups all 14 resource pages as nested children in `_data/navigation.yml`. Its chevron expands or collapses the list without navigating; clicking the title opens the overview. The list opens automatically on the overview or any resource page and starts collapsed on unrelated pages, using the existing sidebar behavior.

## Data Cloud CRUD summaries

Each detail page's `crud` frontmatter is the canonical source for `retrieve`, `create`, `update` and `delete` ratings. Each operation has a quoted `status` (`"yes"`, `"partial"`, `"unknown"` or `"no"`) and a `methods` array. Positive ratings (`"yes"` / `"partial"`) require a nonempty array of unique `cli` / `api` values; `"unknown"` / `"no"` require `methods: []` and display no method icons.

Ratings describe usable **supplied, scoped workflows**, not universal capability. **Yes** means a usable scoped workflow; **Partial** means a usable bounded or combined workflow. Observations alone or an unsupplied integration do not qualify as Partial. An incomplete asynchronous workflow qualifies as Partial only when it is usable within documented bounds and its terminal-state limitations are clearly explained. **No** means proven unavailable in the explicit scope; **?** means unknown, untested or no usable workflow supplied. Keep that visible distinction. API-led requests and facades remain `api` even when invoked through Salesforce CLI; `cli` means dedicated CLI commands. Summary qualification is separate from operation-tab availability: an available tab may explain an illustrative mechanism without supplying a usable summary workflow.

Place `{% include crud-summary.html %}` immediately before `## Retrieve`, after shared context and safety warnings, as in `next/data-cloud-cli/calculated-insights.md`. The include reads `page.crud` directly and includes the shared legend; it takes no arguments.

The overview's `crud_rows` in `next/data-cloud-cli/index.md` contains only `path`, `label`, `anchor` and `scope`; never duplicate ratings there. Its table resolves each detail page by `path` and renders that page's `crud` through `crud-cell.html`. Keep scope notes, target anchors and the expected ratings/method mapping in `tests/site-index-discoverable.test.cjs` synchronized with justified changes. Use the fresh-build and rendered-verification sequence in **Data Cloud operation tabs** below after editing.

## Data Cloud operation tabs

For pages using `_includes/operation-tabs.html`, set `operation_tabs: true` in page frontmatter to load the script once. Keep operation headings, shared prerequisites and safety warnings outside the include. Capture each available method's **complete Markdown workflow** with Liquid `capture` / `endcapture`: prose, payloads, commands, responses, warnings and verification steps belong together, not just code fences.

Pass a unique page-local `id`, an operation `label`, and explicit `cli_state`, `cli_reason`, `api_state` and `api_reason` values. States are `available` (a documented workflow is supplied), `blocked` (a known limitation prevents it), or `unknown` (undocumented, untested or not implemented). Availability does not expand the workflow's verification scope. Supply captured `cli_body` / `api_body` only for available methods; the include renders those bodies with `markdownify`. Keep detailed negative evidence outside the panels so it remains visible when a method is disabled. The `sf-plugin-data` method is hardcoded disabled/unknown; there is no plugin body or author override.

Preserve existing operation and legacy heading anchors, and give new internal headings unique explicit IDs. See `next/data-cloud-cli/calculated-insights.md` for complete dual-method captures and `segment-members.md` for API-only/all-disabled operations. Available workflows remain labeled and readable without JavaScript.

After editing, run lint autofix, zero-warning lint, a fresh build, then the full suite with rendered checks enabled (PowerShell, from this folder):

```powershell
npm run lint:fix --no-workspaces
npm run lint --no-workspaces
npm run build --no-workspaces
$env:OPERATION_TABS_RENDERED = '1'
try { npm test --no-workspaces } finally { Remove-Item Env:OPERATION_TABS_RENDERED }
```

`OPERATION_TABS_RENDERED=1` enables checks against freshly generated `_site` HTML; without it, rendered checks are skipped. Do not hand-edit `_site`. For a no-watch preview on port 4002, use `npm run serve --no-workspaces`; stop it with `npm run serve:stop --no-workspaces`.

## Hidden / draft pages

To keep a page **built and deep-linkable** but out of search, the sitemap, the sidebar, and the tools index, set:

```yaml
discoverable: false
```

That is the only required author switch. Jekyll fills `sitemap: false` via `_plugins/discoverable.rb` if the key is omitted. The layout (`_includes/head.html`) emits `<meta name="robots" content="noindex, nofollow">` if `robots:` is omitted; authors may still set `robots:` themselves to override that default. Search/Lunr already skips on `discoverable: false` alone — do not add `sitemap: false` just for search. Do **not** use `published: false` (that drops the page from the build). There is no `status:` field and no on-page Draft/Beta banner.

Sidebar and the tools index skip any page with `discoverable: false` even if its URL is still listed in `_data/navigation.yml` or the tools catalog. Do not rely on remembering to delete the YAML entry.

AMPscript / Handlebars / SSJS function-index catalogs are not filtered in this pass.

## Syntax highlighting

Rouge lexers in `_plugins/` highlight the SFMC languages. Fence a block with:

| Fence       | Contents                                                                        |
| ----------- | ------------------------------------------------------------------------------- |
| `ampscript` | AMPscript, optionally mixed with HTML and SSJS `<script runat="server">` blocks |
| `sfmc`      | Marketing Cloud Next: Handlebars over AMPscript over HTML                       |

Both resolve function and helper names against `_plugins/sfmc_catalogs.rb`, which is generated from `ampscript-data` and `handlebars-data` — never edit it or inline a name list into a lexer. Token colours live in `_sass/_code.scss`.

`_plugins/` works because the deploy workflow runs `bundle exec jekyll build` with this repo's Gemfile. Stock GitHub Pages would ignore it.

### Why not Shiki

Shiki could consume `vscode-sfmc-language/syntaxes/*.tmLanguage.json` directly, giving one grammar for both the editor and the site instead of two that must be kept in step. It was not chosen because it needs a Node pass over the built HTML, which drops highlighting from `jekyll serve` previews, and a fresh colour palette. Worth revisiting if the lexers here start to visibly diverge from the extension.

## Deploy

GitHub Actions workflow `.github/workflows/jekyll.yml` builds with this repo’s Gemfile (Jekyll 4.3 + Dart Sass) and deploys to GitHub Pages.
