---
layout: page
title: "SSJS Function Reference"
description: "The Server-Side JavaScript function reference for Marketing Cloud Engagement lives on ssjs.guide — the A–Z index of Platform functions, the Core library, WSProxy, HTTP and the ECMAScript built-ins as the SFMC engine implements them."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/ssjs/functions/
platforms:
  - engagement
---

The Server-Side JavaScript function reference lives on **[ssjs.guide](https://ssjs.guide)**, the specialist site for the language.

[**Open the SSJS function index →**](https://ssjs.guide/function-index/)

## Why SSJS has its own site

sfmc.guide is the umbrella reference for the Marketing Cloud developer surface — Engagement, Next, AMPscript, Handlebars, and the tooling around them. SSJS earns a site of its own because it is a language runtime rather than a template syntax: an ES3-era engine with its own missing and broken built-ins, its own polyfill catalog, and an API surface spanning Platform functions, the Core library, WSProxy and HTTP. Documenting that properly takes a full site, so it gets one.

Same authors, same runtime-verification discipline — both sites prove behaviour by running code on a live tenant rather than restating the official documentation.

## What you will find there

| Section | What it covers |
|---|---|
| [Function index](https://ssjs.guide/function-index/) | A–Z listing of every documented function, method and object |
| [Platform Functions](https://ssjs.guide/platform-functions/) | The `Platform.Function.*` surface |
| [Core Library](https://ssjs.guide/core-library/) | The object model loaded via `Platform.Load` |
| [WSProxy](https://ssjs.guide/wsproxy/) | SOAP API access from SSJS |
| [ECMAScript Built-ins](https://ssjs.guide/ecmascript-builtins/) | What the engine actually implements, and what silently misbehaves |
| [Engine Limitations](https://ssjs.guide/engine-limitations/) | The polyfills and workarounds the runtime needs |

## Related

- [AMPscript function index](/engagement/ampscript/functions/) — the AMPscript half of the reference, here on sfmc.guide
- [Function Index](/function-index/) — entry point to both indexes
- [Engagement](/engagement/) — the wider Marketing Cloud Engagement developer surface
