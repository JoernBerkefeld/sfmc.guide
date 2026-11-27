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
  <span class="sqlc-copy-status" id="sqlc-share-status" role="status"></span>
  <button class="sqlc-btn" type="button" id="sqlc-share" title="Copies a link to exactly what you see right now, with every detail (SQL or code, platform, settings and the chosen tab), to share with a co-worker or keep as a bookmark."><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>Share</button>
  <select class="sqlc-select" id="sqlc-example" aria-label="Load an example"></select>
</div>
<div class="sqlc-settings" id="sqlc-settings" role="group" aria-label="Conversion settings">
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
    <span class="sqlc-hint">Only needed for SELECT *.</span>
  </div>
  <fieldset class="sqlc-field sqlc-radios" id="sqlc-data-source" data-only="mcn" hidden>
    <legend>Data source</legend>
    <span class="sqlc-radio-row">
      <label><input type="radio" name="sqlc-data-source" value="CRM" checked> CRM (Sales Cloud object)</label>
      <label><input type="radio" name="sqlc-data-source" value="MO"> MO (marketing object)</label>
      <label><input type="radio" name="sqlc-data-source" value="DG"> DG (DMO in the email's data graph)</label>
    </span>
    <span class="sqlc-hint">Marketing objects: exact-value filters joined with AND, no sorting. A filter that matches several records may return only one. Data graph: only the recipient's own rows of a DMO directly under the root of the graph bound to the email.</span>
  </fieldset>
</div>
<div class="sqlc-body">
  <div class="sqlc-lock" id="sqlc-lock" role="status" hidden>
    <span>This session is open in another tab, so it is read-only here and shows the changes made there.</span>
    <button class="sqlc-btn" type="button" id="sqlc-take-over" title="Edit this session in this tab; the other tab becomes read-only and can take it back.">Take over</button>
  </div>
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
        <textarea class="sqlc-code sqlc-input" id="sqlc-input" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="soft" aria-labelledby="sqlc-input-title" aria-describedby="sqlc-messages"></textarea>
      </div>
    </section>
    <div class="sqlc-swap-col">
      <button class="sqlc-swap" id="sqlc-swap" type="button" aria-label="Swap direction and use the output as input" title="Swap direction and use the output as input"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 9h14l-4-4M19 15H5l4 4"/></svg></button>
    </div>
    <section class="sqlc-pane" aria-label="Output">
      <div class="sqlc-pane-head">
        <div class="sqlc-tabs" id="sqlc-tabs" role="tablist" aria-label="Output method"></div>
      </div>
      <pre class="sqlc-code sqlc-output" id="sqlc-output" role="tabpanel" tabindex="0"></pre>
    </section>
  </div>
  <div class="sqlc-map" id="sqlc-map">
    <span class="sqlc-map-label" id="sqlc-map-label">Clause map</span>
    <ul class="sqlc-map-list" id="sqlc-map-list" aria-labelledby="sqlc-map-label"></ul>
  </div>
  <div class="sqlc-status">
    <span class="sqlc-chip" id="sqlc-roundtrip" hidden></span>
    <span class="sqlc-chip sqlc-chip--muted" id="sqlc-counts"></span>
    <span class="sqlc-toggle-wrap">
      <button class="sqlc-toggle" id="sqlc-map-toggle" type="button" aria-pressed="true" aria-controls="sqlc-map" aria-labelledby="sqlc-map-toggle-label"></button>
      <span id="sqlc-map-toggle-label">Show mapping</span>
    </span>
    <span>Converts as you type. Nothing leaves your browser; your last input and settings stay saved there.</span>
  </div>
</div>
<div class="sqlc-tip" id="sqlc-tip" role="tooltip" hidden></div>
<noscript><p class="sqlc-noscript">This converter runs in your browser and needs JavaScript. Turn on JavaScript to use it.</p></noscript>
</div>
<script type="module" src="{{ '/assets/js/sql-converter-ui.js' | relative_url | cache_bust }}"></script>
