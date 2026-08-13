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

{% include callout.html type="note" title="Catalogued, not runtime-proven" content="These rows come from the same language catalog that powers the SFMC Language Service and the ESLint rules. Unlike the [Engagement AMPscript reference](/engagement/ampscript/functions/), no helper here has been through a runtime sweep yet &mdash; each name links to the official Salesforce reference instead of to a page on this site." %}

**Origin** tells you where a helper comes from: a *Marketing Cloud Next helper* is specific to the platform, a *Handlebars built-in* is part of the Handlebars language itself, and a *Marketing Cloud Next platform* entry is exposed by the runtime rather than by the templating layer.

## All helpers

{% include handlebars-helper-index.html entries=site.data.handlebars_helpers
   show_amp=false show_mapping=true
   empty="No Handlebars helpers catalogued yet." %}

## Related

- [AMPscript function reference (Next)](/next/ampscript/functions/) — the AMPscript subset Next supports
- [Differs from official docs (Next)](/next/differs-from-docs/) — where runtime behaviour contradicts the official reference
