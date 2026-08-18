---
layout: page
title: "AMPscript Function Reference (Next)"
description: "The subset of AMPscript that Marketing Cloud Next supports — searchable and filterable, with the Core API version each function became available in and its Handlebars equivalent."
parent: Next
parent_url: /next/
permalink: /next/ampscript/functions/
redirect_from:
  - /next/ampscript-handlebars/
platforms:
  - next
---

Marketing Cloud Next runs a **subset** of the AMPscript surface that Engagement offers. This page lists only the functions the catalog marks as available on Next, together with the Core API version they arrived in and the Handlebars helper that covers the same job.

{% include callout.html type="note" title="Availability is catalogued, behaviour is proven on Engagement" content="The **API version** column comes from the language catalog that also powers the SFMC Language Service and the ESLint rules. The **Verified** badge, however, means a runtime sweep on a live *Engagement* CloudPage — those linked pages document Engagement behaviour and have not been re-run on Next. Treat them as a strong indication, not as proof for Next." %}

## Supported functions

{% include ampscript-function-index.html entries=site.data.ampscript_functions
   mcn_only=true show_mcn=true show_handlebars=false show_mapping=true
   empty="No Marketing Cloud Next AMPscript functions catalogued yet." %}

## Related

- [Handlebars helper reference](/next/handlebars/helpers/) — the full helper catalog, including the ones with no AMPscript counterpart
- [Differs from official docs (Next)](/next/differs-from-docs/) — where runtime behaviour contradicts the official reference
- [Full AMPscript catalog (Engagement)](/engagement/ampscript/functions/) — every function, including the ones Next does not support
