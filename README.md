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
```

## Deploy

GitHub Actions workflow `.github/workflows/jekyll.yml` builds with this repo’s Gemfile (Jekyll 4.3 + Dart Sass) and deploys to GitHub Pages.
