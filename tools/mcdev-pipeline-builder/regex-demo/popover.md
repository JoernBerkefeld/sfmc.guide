---
layout: page
title: 'Market Variables regex prototype: Popover'
description: 'Isolated UX prototype — draft popover editing, sample data only.'
permalink: /tools/mcdev-pipeline-builder/regex-demo/popover/
discoverable: false
---

<link rel="stylesheet" href="{{ '/assets/css/mcdev-pipeline-regex-demo.css' | relative_url }}">

<div class="mpb regex-demo" data-regex-demo data-variant="popover">
  <p><strong>Prototype only.</strong> Changes live in memory until reload. No saved sessions, uploads or generated configuration.</p>
  <nav aria-label="Regex prototype variants">
    <a href="../inline/">Inline</a> · <a href="../popover/" aria-current="page">Popover</a> · <a href="../panel/">Side panel</a>
  </nav>
  <p>Choose aA to draft a regex, or Edit beside .* to change one. Apply saves the draft; Cancel, Escape, clicking outside or switching cells discards it. The editor follows its control while scrolling and becomes a dialog on narrow screens.</p>
  <noscript>Enable JavaScript to view the sample Market Variables table.</noscript>
</div>

<script src="{{ '/assets/js/mcdev-pipeline-regex-demo.js' | relative_url }}" defer></script>
