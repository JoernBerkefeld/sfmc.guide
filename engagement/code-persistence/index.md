---
layout: page
title: "Where AMPscript, SSJS and JavaScript Can Be Saved"
description: "Which Content Builder and CloudPages types keep AMPscript, SSJS and client-side JavaScript on save, by API and in the editor, tested live on Engagement."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/code-persistence/
platforms:
  - engagement
---

You paste code into an email, a content block or a CloudPage and press Save. The save succeeds, but is your code still there? Marketing Cloud Engagement removes some code without telling you. This page shows, for each content type, which kinds of code survive a save. It covers saving through the REST API and saving in the editor.

{% include callout.html type="note" title="What was tested" content="Only what gets **stored**. Whether the code runs when an email is sent or a page is published is a separate question and is not covered here. All results come from a live test on one business unit on 26 November 2026." %}

## The short answer

- **AMPscript is kept.** All three forms are stored unchanged in every type tested, by API and in every code editor: the `%%[ … ]%%` block, the `%%= … =%%` inline form and `<script runat="server" language="ampscript">`. The one exception is typing into a rich text editor (see the last point).
- **SSJS is kept.** `<script runat="server">` is stored unchanged in every type tested, by API and in every code editor, with the same rich text exception.
- **A client-side `<script>` is removed.** Plain `<script>…</script>` disappears from emails, content blocks and templates. The save still reports success. No error, no warning.
- **Landing pages keep everything,** including a client-side `<script>`.
- **CloudPages code resources depend on how you save.** In the CloudPages editor a client-side `<script>` is kept. Through the API the same text is removed.
- **Rich text editors turn tags into text.** If you type `<script …>` into the Content tab of a free form or text block, it is stored as escaped text (`&lt;script…`), so it never runs. AMPscript in `%%` delimiters is not affected.

## Results

<p class="crud-legend"><span class="crud-chip crud-chip--yes">kept</span> stored unchanged · <span class="crud-chip crud-chip--partial">escaped</span> stored as plain text (<code>&amp;lt;</code> instead of <code>&lt;</code>) · <span class="crud-chip crud-chip--no">removed</span> stored without the snippet, save reported success</p>

One chip means saving by API and saving in the editor gave the same result. Where they differ, the cell shows both, labelled **API** and **Editor**. Types with two editors get one row per editor.

{% assign data = site.data.code_persistence %}
<div class="code-persistence-scroll">
<table class="code-persistence-matrix">
  <thead>
    <tr>
      <th>Type</th>
      <th>Editor</th>
      {%- for s in data.snippets %}
      <th>{{ s.id }}<small>{{ s.label }}</small></th>
      {%- endfor %}
    </tr>
  </thead>
  <tbody>
  {%- for group in data.groups %}
    <tr><th colspan="{{ data.snippets.size | plus: 2 }}" scope="rowgroup">{{ group.name }}</th></tr>
    {%- for t in group.types %}
      {%- for ui in t.ui %}
    <tr>
        {%- if forloop.first %}
      <td rowspan="{{ t.ui.size }}"><strong>{{ t.name }}</strong><br><code>{{ t.asset_type }}</code>{% if t.note %}<small>{{ t.note }}</small>{% endif %}</td>
        {%- endif %}
      <td>{{ ui.editor }}{% if ui.note %}<small>{{ ui.note }}</small>{% endif %}</td>
        {%- for r in ui.results %}
          {%- assign a = t.api[forloop.index0] %}
      <td>
          {%- if a == r -%}
            {% include code-persistence-chip.html result=r %}
          {%- else -%}
            <span class="cp-channel">API</span>{% include code-persistence-chip.html result=a %}<span class="cp-channel">Editor</span>{% include code-persistence-chip.html result=r %}
          {%- endif -%}
      </td>
        {%- endfor %}
    </tr>
      {%- endfor %}
    {%- endfor %}
  {%- endfor %}
  </tbody>
</table>
</div>

The column headers stand for these five snippets. Each was saved on its own, between a line `PROBE_START` and a line `PROBE_END`:

| | What it is | Snippet |
|---|---|---|
{%- for s in data.snippets %}
| **{{ s.id }}** | {{ s.label }} | `{{ s.code }}` |
{%- endfor %}

## What the results mean

### Client-side JavaScript is removed without a warning

In emails, content blocks and templates, a `<script>` without `runat="server"` is cut out on save, together with its content. Everything around it stays. The API answers `201 Created` or `200 OK` as usual, and the editor shows "Saved".

In the code snippet editor, the `<script>` was still visible after the save while the stored item no longer had it. You only see that it is gone when you open the item again. Use this check if a tracking snippet or widget "stopped working" after an edit.

The filter does not depend on the content type you send. Code resources created by API with the content type the CloudPages editor uses (`application/javascript` and so on) lose the tag just the same, and an update (`PATCH`) is filtered like a create.

### Landing pages keep everything

A CloudPages landing page stores all five snippets unchanged, whether you save it in the editor or by API. This is the place for client-side JavaScript.

### CloudPages code resources: the editor keeps what the API removes

Saved in the CloudPages editor, all six code resource types keep a client-side `<script>`. Created or updated through the REST API, the same text is removed.

Watching the stored item once per second during an editor save hints at why the two differ. For the CSS, JSON and RSS resources, a version without the `<script>` was stored first, and about a second later the full text, which stays. For the other three types only the final version was caught.

So if you deploy code resources by API, for example with a deployment tool, any `<script>` tag inside them is lost. The normal content of a JavaScript code resource is plain JavaScript without a `<script>` tag, and that case was not part of this test.

### Rich text editors store tags as text

The Content tab of a free form block or text block is a rich text editor. Text you type there is text, so `<script runat="server">` becomes `&lt;script runat=&quot;server&quot;&gt;…`. It is kept, but it no longer runs. AMPscript in `%%[ … ]%%` and `%%= … =%%` has no tags and is stored as typed.

To add a script tag to these blocks, use their **HTML Editor** tab. There the results are the same as for an HTML block.

## How this was tested

- **Where:** a child business unit used for testing, Marketing Cloud Engagement, 26 November 2026.
- **By API:** for every type, one new asset per snippet, created with `POST /asset/v1/content/assets`, plus one control asset holding only the two marker lines. Every control was stored as sent, so a removed snippet is never a type that failed to save. The code resources were created twice, once without and once with the content type the CloudPages editor sets.
- **In the editor:** one item per type and editor, created in Content Builder or CloudPages, re-used for the five snippets. The code was pasted into code editors and typed into rich text editors and the CloudPages editor, then saved with the Save button.
- **Reading back:** after every save, the stored item was read through the REST API and the text between the markers compared with what was sent (line endings ignored). For CloudPages code resources the item was read once per second during the save.
- **Not tested:** whether the code runs when an email is sent or a page is published, and a JavaScript code resource with plain JavaScript (no `<script>` tag).
- **Browser extensions:** an extension that rewrites or formats editor content on save can change what gets stored. Format-on-save features were switched off for the test.

More metadata types will be added to this page over time.

## Related

- [Where SSJS and JavaScript can be saved](https://ssjs.guide/recipes/code-persistence/) on ssjs.guide: the SSJS and JavaScript columns only
- [ssjs.guide](https://ssjs.guide) for the SSJS reference
- [Personalization strings, AMPscript & SSJS together](/engagement/ampscript-ssjs-interplay/)
- [Querying Data Extensions with AMPscript](/engagement/querying-data/)
