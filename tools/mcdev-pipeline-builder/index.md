---
layout: page
title: "SFMC DevTools Pipeline Builder"
description: "Client-side wizard that turns your .mcdevrc.json into a git-based mcdev deployment pipeline plus a matching .mcdev-validations.js — all in your browser."
parent: Tools
parent_url: /tools/
permalink: /tools/mcdev-pipeline-builder/
platforms:
  - engagement
---

<div class="mpb" id="mpb-app" aria-live="polite">

<!-- ══ Sticky builder sub-header (hidden on intake; hoisted into .layout-content in builder mode) ══
     The controller (`syncBuilderHeaderMount`) moves this node to be the first child of the tall
     `.layout-content` scroll container so `position:sticky` can pin it flush under the fixed
     site-header; on intake it is parked back here. Name + action slots are hydrated by
     `renderBuilderHeader`. -->
<div class="mpb-builder-header" id="mpb-builder-header">
  <div class="mpb-builder-header-identity">
    <svg class="mpb-builder-header-logo" viewBox="0 0 24 24" width="24" height="24"
         aria-hidden="true" focusable="false">
      <path d="M4 7h9M4 12h13M4 17h7" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round"/>
      <path d="m16 15 4 3-4 3" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="mpb-builder-header-title">SFMC DevTools Pipeline Builder</span>
  </div>
  <span id="mpb-builder-header-name" class="mpb-builder-header-name"></span>
  <div id="mpb-builder-header-actions" class="mpb-builder-header-actions"></div>
</div>

<div class="mpb-callout mpb-callout--scope" role="note">
  <strong>For SFMC DevTools (<code>mcdev</code>) pipelines only.</strong>
  This builder generates git-based deployment configuration
  (<code>createDeltaPkg</code> + <code>branchSourceTargetMapping</code>) for the
  <a href="/tools/mcdev/">mcdev</a> CLI. It does <em>not</em> apply to other SFMC
  deployment frameworks — their configuration models differ and the generated files
  will not work with them.
</div>

<div class="mpb-callout mpb-callout--version" role="note">
  <strong>Requires <code>mcdev</code> &ge; v8.3.0.</strong>
  The shared-DE parent pipeline relies on type-specific marketList
  <code>filter.include</code>/<code>filter.exclude</code> keys, first shipped in v8.3.0.
</div>

<p class="mpb-privacy text-sm text-muted">
  Everything runs locally in your browser. Your config is never uploaded to a server.
  Saved sessions live in this browser's <code>localStorage</code> only.
</p>

<!-- ── Persistent status banners (storage disabled / quota / tab-lock / external change) ── -->
<div id="mpb-banners" class="mpb-banners" aria-live="assertive"></div>

<!-- ════════════════════════ STEP: INTAKE ════════════════════════ -->
<section id="mpb-step-intake" class="mpb-step" data-step="intake" aria-labelledby="mpb-intake-h">
  <h2 id="mpb-intake-h">1. Load your <code>.mcdevrc.json</code></h2>

  <div class="mpb-intake-grid">
    <div id="mpb-dropzone" class="mpb-dropzone" role="button" tabindex="0"
         aria-describedby="mpb-dropzone-hint">
      <p>Drag &amp; drop your <code>.mcdevrc.json</code> here</p>
      <p id="mpb-dropzone-hint" class="text-sm text-muted">or use the button below</p>
      <label class="mpb-btn mpb-btn--secondary" for="mpb-file-input">
        Choose file…
      </label>
      <input type="file" id="mpb-file-input" accept=".json,application/json" hidden>
    </div>

    <div class="mpb-paste">
      <label for="mpb-paste-input">…or paste the JSON content</label>
      <textarea id="mpb-paste-input" rows="8" spellcheck="false"
                placeholder='{ "credentials": { … }, "options": { … } }'></textarea>
      <button type="button" id="mpb-paste-btn" class="mpb-btn mpb-btn--secondary">
        Use pasted JSON
      </button>
    </div>
  </div>

  <div id="mpb-intake-error" class="mpb-error" role="alert" hidden></div>

  <h3>Saved sessions in this browser</h3>
  <div id="mpb-saved-list" class="mpb-saved-list" aria-label="Saved sessions"></div>
  <div id="mpb-storage-gauge" class="mpb-storage-gauge" aria-hidden="true"></div>
</section>

<!-- ════════════════════════ STEP: MODE ════════════════════════ -->
<section id="mpb-step-mode" class="mpb-step" data-step="mode" hidden aria-labelledby="mpb-mode-h">
  <h2 id="mpb-mode-h">2. What do you want to generate?</h2>
  <div class="mpb-mode-grid">
    <button type="button" class="mpb-mode-card" id="mpb-mode-full" data-mode="full">
      <span class="mpb-mode-title">Full pipeline</span>
      <span class="mpb-mode-desc">Markets, marketLists, mappings <em>and</em> validations —
        the whole deployment setup.</span>
    </button>
    <button type="button" class="mpb-mode-card" id="mpb-mode-validations" data-mode="validations">
      <span class="mpb-mode-title">Validations only</span>
      <span class="mpb-mode-desc">Skip straight to the rule picker and emit just
        <code>.mcdev-validations.js</code>.</span>
    </button>
  </div>
</section>

<!-- ════════════════════════ WIZARD SHELL (dynamic steps) ════════════════════════ -->
<div id="mpb-wizard" class="mpb-wizard" hidden>
  <nav class="mpb-stepper" id="mpb-stepper" aria-label="Wizard progress"></nav>
  <div id="mpb-step-host" class="mpb-step-host"></div>

  <div class="mpb-wizard-nav">
    <button type="button" id="mpb-back" class="mpb-btn mpb-btn--secondary">← Back</button>
    <button type="button" id="mpb-next" class="mpb-btn mpb-btn--primary">Next →</button>
  </div>
  <div id="mpb-step-error" class="mpb-error" role="alert" aria-live="assertive" hidden></div>
</div>

<!-- ════════════════════════ OUTPUT ════════════════════════ -->
<section id="mpb-step-output" class="mpb-step" data-step="output" hidden aria-labelledby="mpb-output-h">
  <h2 id="mpb-output-h">Download your files</h2>

  <div id="mpb-download-guard" class="mpb-error" role="alert" hidden></div>

  <div class="mpb-output-grid">
    <div class="mpb-output-card" id="mpb-output-config">
      <h3><code>.mcdevrc.json</code></h3>
      <div class="mpb-output-actions">
        <button type="button" id="mpb-dl-config" class="mpb-btn mpb-btn--primary">
          Download config
        </button>
        <button type="button" id="mpb-copy-config" class="mpb-btn mpb-btn--secondary">
          Copy
        </button>
      </div>
      <p class="mpb-dl-hint">Some browsers save this without the leading dot — rename it to <code>.mcdevrc.json</code> if needed.</p>
      <textarea id="mpb-config-fallback" class="mpb-code-fallback" rows="10" readonly
                aria-label="Generated .mcdevrc.json"></textarea>
    </div>

    <div class="mpb-output-card" id="mpb-output-validations">
      <h3><code>.mcdev-validations.js</code></h3>
      <div class="mpb-output-actions">
        <button type="button" id="mpb-dl-validations" class="mpb-btn mpb-btn--primary">
          Download validations
        </button>
        <button type="button" id="mpb-copy-validations" class="mpb-btn mpb-btn--secondary">
          Copy
        </button>
      </div>
      <p class="mpb-dl-hint">Some browsers save this without the leading dot — rename it to <code>.mcdev-validations.js</code> if needed.</p>
      <textarea id="mpb-validations-fallback" class="mpb-code-fallback" rows="10" readonly
                aria-label="Generated .mcdev-validations.js"></textarea>
    </div>
  </div>

  <div class="mpb-diagram-cta">
    <button type="button" id="mpb-open-diagramforce" class="mpb-btn mpb-btn--secondary">
      Open in Diagramforce ↗
    </button>
    <p class="text-sm text-muted">
      Opens the third-party <a href="https://diagramforce.com" rel="noopener">diagramforce.com</a>
      in a new tab and hands the pipeline shape over locally via <code>postMessage</code> —
      no server, no account. Your BU names are only used to draw the diagram in your own browser tab.
    </p>
    <div id="mpb-diagram-fallback" class="mpb-diagram-fallback" hidden>
      <p class="mpb-error" role="alert">Pop-up blocked. Allow pop-ups for this site, or copy the
        diagram JSON below and use <em>Load &amp; Import → Paste</em> in Diagramforce.</p>
      <textarea id="mpb-diagram-json" class="mpb-code-fallback" rows="8" readonly
                aria-label="Diagramforce diagram JSON"></textarea>
      <button type="button" id="mpb-copy-diagram" class="mpb-btn mpb-btn--secondary">Copy JSON</button>
    </div>
  </div>
</section>

</div>

<!-- SortableJS (UMD, attaches window.Sortable) powers the drag-and-drop BU-assignment board.
     Pinned to 1.15.7 with a Subresource-Integrity hash verified against cdnjs's published SRI.
     External CDN URL — NOT run through cache_bust. Loaded (defer) before the controller so
     window.Sortable is present when the board renders; the controller degrades gracefully to a
     dropdown-only board if this fails to load. -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.7/Sortable.min.js"
        integrity="sha512-ri8dokds012Oxz+iFzMs4KNJXVc+h7J1zq6unM1NTtzBLj4jD1R5BWiK6QycK0TdSdkt7zYcIcv6sUPhmYkbdQ=="
        crossorigin="anonymous" referrerpolicy="no-referrer" defer></script>
<script src="{{ '/assets/js/mcdev-pipeline-config-builder.js' | relative_url | cache_bust }}" defer></script>
<script src="{{ '/assets/js/mcdev-pipeline-validations-builder.js' | relative_url | cache_bust }}" defer></script>
<script src="{{ '/assets/js/mcdev-pipeline-builder.js' | relative_url | cache_bust }}" defer></script>
