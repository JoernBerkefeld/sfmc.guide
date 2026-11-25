---
layout: page
title: "Handlebars Helper Reference"
description: "The complete Handlebars helper catalog for Marketing Cloud Next — searchable and filterable, with the Core API version each helper became available in and its AMPscript equivalent where one exists."
parent: Next
parent_url: /next/
permalink: /next/handlebars/helpers/
platforms:
  - next
---

Handlebars is the templating language of Marketing Cloud Next. This page lists every helper the language catalog knows about, where it came from, which Core API version introduced it, and whether AMPscript can express the same thing.

{% include callout.html type="note" title="Rendered in a Marketing Cloud Next email" content="These rows come from the same language catalog that powers the SFMC Language Service and the ESLint rules. Every helper was tried in a Marketing Cloud Next email on 2026-11-22. Each name links to its page on this site, with the tested calls, what MCN actually rendered (or why the email could not be saved), and how that compares to the official Salesforce reference." %}

**Origin** tells you where a helper comes from: a *Marketing Cloud Next helper* is specific to the platform, a *Handlebars built-in* is part of the Handlebars language itself, and a *Marketing Cloud Next platform* entry is exposed by the runtime rather than by the templating layer.

## Spell helper names exactly as listed

Helper names in Marketing Cloud Next are case-sensitive. AMPscript forgives `propercase()` for `ProperCase()`, but Handlebars does not: a helper name whose letter case differs from the catalog is not found, and the email is rejected when you save it, reported as an unsupported helper. Nothing tells you that the only problem is the capitalisation.

{% include callout.html type="warning" title="Three names that look wrong but are right" content="`jsonpath` and `propercase` are written entirely in lowercase, and `timezoneConversion` has a lowercase *z*. Our tests on 2026-11-25 confirmed it: emails calling `jsonPath`, `properCase` or `timeZoneConversion` were refused at save, while the same calls in the spelling above saved and rendered." %}

Most other helpers use camelCase, such as `dateAdd`, `formatCurrency` or `isEmailAddress`. Never guess the capitalisation from the AMPscript function name. Copy it from the table below or from the helper's page.

The [SFMC Language extension for VS Code](/tools/vscode-sfmc-language/) flags a helper written in the wrong case and offers a quick fix with the correct spelling.

## All helpers

{% include handlebars-helper-index.html entries=site.data.handlebars_helpers
   show_amp=false show_mapping=true
   empty="No Handlebars helpers catalogued yet." %}

## Related

- [AMPscript function reference (Next)](/next/ampscript/functions/) — the AMPscript subset Next supports
- [Differs from official docs (Next)](/next/differs-from-docs/) — where runtime behaviour contradicts the official reference
