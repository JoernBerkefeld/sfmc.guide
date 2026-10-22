---
layout: page
title: "sf-plugin-cms"
description: "Salesforce CLI plugin for bounded CMS inspection, retrieval, Draft deployment, and content lifecycle operations."
parent: Tools
parent_url: /tools/
permalink: /tools/sf-plugin-cms/
platforms:
  - next
---

Salesforce CLI (`sf cms`) plugin for inspecting Marketing Cloud CMS resources and working with supported Email, Email Template, Image, Document and Audio content. It is not a complete CMS backup or restore tool. See the repository for supported profiles and experimental limits.

{% include callout.html type="note" title="Released and unreleased capabilities" content="Version 0.20.0 includes bounded retrieval, Draft deployment and deletion for these five families, plus separate loose-image upload. Deploy executes by default; use --preview for read-only preflight. Existing Email/Template updates are HTML-only; media updates are bytes-only. Unreleased 0.21.0 adds bounded five-family metadata publish/unpublish, local-source safeguards, per-item outcomes and all-page workspace/channel lists. See the README for conservative runtime qualification labels and operation-specific limits; development-artifact evidence does not establish general-format or released-package qualification." %}

## Links

- [npm (released package)](https://www.npmjs.com/package/sf-plugin-cms)
- [GitHub](https://github.com/JoernBerkefeld/sf-plugin-cms)

[← All tools](/tools/)
