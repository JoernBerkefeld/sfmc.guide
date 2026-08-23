# sfmc.guide

Technical architecture guide for Salesforce Marketing Cloud **Engagement** and **Marketing Cloud Next**.

Site: <https://sfmc.guide>

Sibling SSJS reference: <https://ssjs.guide>

## Local build

```powershell
bundle install
bundle exec jekyll build
bundle exec jekyll serve
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

| Fence | Contents |
|---|---|
| `ampscript` | AMPscript, optionally mixed with HTML and SSJS `<script runat="server">` blocks |
| `sfmc` | Marketing Cloud Next: Handlebars over AMPscript over HTML |

Both resolve function and helper names against `_plugins/sfmc_catalogs.rb`, which is generated from `ampscript-data` and `handlebars-data` — never edit it or inline a name list into a lexer. Token colours live in `_sass/_code.scss`.

`_plugins/` works because the deploy workflow runs `bundle exec jekyll build` with this repo's Gemfile. Stock GitHub Pages would ignore it.

### Why not Shiki

Shiki could consume `vscode-sfmc-language/syntaxes/*.tmLanguage.json` directly, giving one grammar for both the editor and the site instead of two that must be kept in step. It was not chosen because it needs a Node pass over the built HTML, which drops highlighting from `jekyll serve` previews, and a fresh colour palette. Worth revisiting if the lexers here start to visibly diverge from the extension.

## Deploy

GitHub Actions workflow `.github/workflows/jekyll.yml` builds with this repo’s Gemfile (Jekyll 4.3 + Dart Sass) and deploys to GitHub Pages.
