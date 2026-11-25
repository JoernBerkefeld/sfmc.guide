---
layout: page
title: "SQL Converter"
description: "Turn a SQL query into SSJS, AMPscript or Handlebars lookup code for Marketing Cloud Engagement and Next, and lookup code back into SQL, in your browser."
parent: Tools
parent_url: /tools/
permalink: /tools/sql-converter/
platforms:
  - engagement
  - next
---

<script>document.documentElement.classList.add('sqlc-page');</script>
<div class="sqlc" id="sqlc-app">
<div class="sqlc-toolbar">
  <span class="sqlc-title">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>
    SQL Converter
  </span>
  <span class="sqlc-seg" role="group" aria-label="Platform" id="sqlc-platform">
    <button type="button" data-platform="mce" aria-pressed="true">Engagement</button>
    <button type="button" data-platform="mcn" aria-pressed="false">Next</button>
  </span>
  <span class="sqlc-spacer"></span>
  <select class="sqlc-select" id="sqlc-example" aria-label="Load an example"></select>
  <span class="sqlc-pop-wrap">
    <button class="sqlc-btn" type="button" id="sqlc-settings-button" aria-expanded="false" aria-controls="sqlc-settings">Settings</button>
    <div class="sqlc-popover" id="sqlc-settings" role="group" aria-label="Conversion settings" hidden>
      <div class="sqlc-field" data-only="mce">
        <label for="sqlc-de-name">Data Extension name</label>
        <input type="text" id="sqlc-de-name" spellcheck="false" autocomplete="off" placeholder="From the FROM clause">
        <span class="sqlc-hint">Leave empty to use the name in FROM.</span>
      </div>
      <div class="sqlc-field" data-only="mce">
        <label for="sqlc-de-key">Data Extension external key</label>
        <input type="text" id="sqlc-de-key" spellcheck="false" autocomplete="off" placeholder="Same as the name">
        <span class="sqlc-hint">WSProxy and Rows.Retrieve need the external key; SQL only names the Data Extension.</span>
      </div>
      <div class="sqlc-field" data-only="mce">
        <label for="sqlc-columns">Columns for SELECT *</label>
        <input type="text" id="sqlc-columns" spellcheck="false" autocomplete="off" placeholder="SubscriberKey, Email, …">
        <span class="sqlc-hint">Only needed for SELECT *; this panel opens by itself then.</span>
      </div>
      <div class="sqlc-field" data-only="mcn" hidden>
        <label for="sqlc-data-source">Data source</label>
        <select class="sqlc-select" id="sqlc-data-source">
          <option value="CRM">CRM (Sales Cloud object)</option>
          <option value="MO">MO (marketing object)</option>
        </select>
        <span class="sqlc-hint">Sorting with sortBy works on CRM objects only.</span>
      </div>
    </div>
  </span>
</div>
<div class="sqlc-body">
  <ul class="sqlc-msgs" id="sqlc-messages" aria-live="polite" aria-label="Messages" hidden></ul>
  <div class="sqlc-grid">
    <section class="sqlc-pane" aria-labelledby="sqlc-input-title">
      <div class="sqlc-pane-head">
        <div>
          <div class="sqlc-pane-title" id="sqlc-input-title">SQL query</div>
          <div class="sqlc-pane-sub" id="sqlc-input-sub"></div>
        </div>
      </div>
      <div class="sqlc-editor">
        <div class="sqlc-code sqlc-backdrop" id="sqlc-backdrop" aria-hidden="true"></div>
        <textarea class="sqlc-code sqlc-input" id="sqlc-input" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-labelledby="sqlc-input-title" aria-describedby="sqlc-messages"></textarea>
      </div>
    </section>
    <div class="sqlc-swap-col">
      <button class="sqlc-swap" id="sqlc-swap" type="button" aria-label="Swap direction and use the output as input" title="Swap direction and use the output as input"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 9h14l-4-4M19 15H5l4 4"/></svg></button>
    </div>
    <section class="sqlc-pane" aria-label="Output">
      <div class="sqlc-pane-head">
        <div class="sqlc-tabs" id="sqlc-tabs" role="tablist" aria-label="Output method"></div>
        <span class="sqlc-spacer"></span>
        <span class="sqlc-copy-status" id="sqlc-copy-status" role="status"></span>
        <button class="sqlc-btn" type="button" id="sqlc-copy">Copy</button>
      </div>
      <pre class="sqlc-code sqlc-output" id="sqlc-output" role="tabpanel" tabindex="0"></pre>
    </section>
  </div>
  <div class="sqlc-map" id="sqlc-map" hidden>
    <span class="sqlc-map-label" id="sqlc-map-label">Clause map</span>
    <ul class="sqlc-map-list" id="sqlc-map-list" aria-labelledby="sqlc-map-label"></ul>
  </div>
  <div class="sqlc-status">
    <span class="sqlc-chip" id="sqlc-roundtrip" hidden></span>
    <span class="sqlc-chip sqlc-chip--muted" id="sqlc-counts"></span>
    <span class="sqlc-toggle-wrap">
      <button class="sqlc-toggle" id="sqlc-map-toggle" type="button" aria-pressed="false" aria-controls="sqlc-map" aria-labelledby="sqlc-map-toggle-label"></button>
      <span id="sqlc-map-toggle-label">Show mapping</span>
    </span>
    <span>Converts as you type. Nothing leaves your browser.</span>
  </div>
</div>
<noscript><p class="sqlc-noscript">This converter runs in your browser and needs JavaScript. Turn on JavaScript to use it.</p></noscript>
</div>
<script type="module" src="{{ '/assets/js/sql-converter-ui.js' | relative_url | cache_bust }}"></script>
