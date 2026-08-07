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
node sfmc.guide/scripts/generate-site-content.mjs
node sfmc.guide/scripts/generate-mcn-ampscript-table.mjs
node sfmc.guide/scripts/generate-tools.mjs
node sfmc.guide/scripts/generate-rouge-lexer-data.mjs
```

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
