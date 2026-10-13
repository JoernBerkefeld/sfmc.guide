---
layout: page
title: 'Market Variables regex prototype: Side panel'
description: 'Isolated UX prototype — draft side-panel editing, sample data only.'
permalink: /tools/mcdev-pipeline-builder/regex-demo/panel/
discoverable: false
---

<link rel="stylesheet" href="{{ '/assets/css/mcdev-pipeline-regex-demo.css' | relative_url }}">

<div class="mpb regex-demo" data-regex-demo data-variant="panel">
  <p><strong>Prototype only.</strong> Changes live in memory until reload. No saved sessions, uploads or generated configuration.</p>
  <nav aria-label="Regex prototype variants">
    <a href="../inline/">Inline</a> · <a href="../popover/">Popover</a> · <a href="../panel/" aria-current="page">Side panel</a>
  </nav>
  <p>Choose aA to open a regex draft immediately. In regex mode, click the read-only market value or focus it and press Enter or Space to edit in the panel. Apply saves the draft; Cancel, Escape, clicking outside or switching cells discards it. Reopening the same field preserves its open draft. Choose .* to show a warning before switching to text: Cancel keeps the settings and any open draft; only Switch to text deletes the search pattern and template replacement. Narrow screens use a full-width dialog.</p>
  <noscript>Enable JavaScript to view the sample Market Variables table.</noscript>
</div>

<script src="{{ '/assets/js/mcdev-pipeline-regex-demo.js' | relative_url }}" defer></script>
