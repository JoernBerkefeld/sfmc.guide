---
layout: page
title: "Function Index"
description: "Entry point to the Marketing Cloud function references — the AMPscript function index on sfmc.guide, and the SSJS function index on ssjs.guide."
permalink: /function-index/
platforms:
  - engagement
  - next
---

Marketing Cloud gives you two server-side languages, so the function reference is split into two indexes. This page is the way in to both.

## AMPscript

[**AMPscript function index**](/engagement/ampscript/functions/) — the complete AMPscript catalog, searchable and filterable by category. Functions that have completed a runtime verification sweep link to a reference page proving how the function actually behaves on a live Marketing Cloud Engagement CloudPage; the rest are listed so the full language surface stays browsable.

Covers Marketing Cloud Engagement, and flags which functions are also available on Marketing Cloud Next.

## Server-Side JavaScript

[**SSJS function index**](https://ssjs.guide/function-index/) — the A–Z index of every SSJS function, method and object: Platform functions, the Core library, WSProxy, HTTP, and the ECMAScript built-ins as the SFMC engine actually implements them.

SSJS has its own dedicated site, [ssjs.guide](https://ssjs.guide). SSJS is deep enough — an ES3-era engine with its own broken built-ins, polyfills and API surface — to be worth a site of its own, so it gets one. sfmc.guide is the umbrella reference for the Marketing Cloud developer surface as a whole; ssjs.guide is the specialist reference for the language.

## Which one do you want?

| You are writing | Go to |
|---|---|
| AMPscript in an email, CloudPage or content block | [AMPscript function index](/engagement/ampscript/functions/) |
| Handlebars for Marketing Cloud Next | [AMPscript and Handlebars on Next](/next/ampscript-handlebars/) |
| SSJS in a script block, CloudPage or Automation | [SSJS function index](https://ssjs.guide/function-index/) |

## Related

- [Engagement](/engagement/) — the Marketing Cloud Engagement developer surface
- [Next](/next/) — Marketing Cloud Next, its AMPscript subset and Handlebars helpers
- [Differs from official docs (Engagement)](/engagement/differs-from-docs/) — where runtime behaviour contradicts the official reference
- [Tools](/tools/) — the language service, linters and formatters built on these catalogs
