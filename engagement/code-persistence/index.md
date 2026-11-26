---
layout: page
title: "Where AMPscript, SSJS and JavaScript Can Be Saved"
description: "Which Content Builder, CloudPages and Automation Studio script activity types keep AMPscript, SSJS and client-side JavaScript on save, by API and in the editor, tested live on Engagement."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/code-persistence/
platforms:
  - engagement
---

You paste code into an email, a content block, a CloudPage or a script activity and press Save. The save succeeds, but is your code still there? Marketing Cloud Engagement removes some code without telling you. This page shows, for each content type, which kinds of code survive a save. It covers saving through the REST API and saving in the editor.

{% include callout.html type="note" title="What was tested" content="Only what gets **stored**. Whether the code runs when an email is sent or a page is published is a separate question and is not covered here. All results come from a live test on one business unit on 26 November 2026." %}

## The short answer

- **AMPscript is kept in content.** All three forms are stored unchanged in every Content Builder and CloudPages type tested, by API and in every code editor: the `%%[ … ]%%` block, the `%%= … =%%` inline form and `<script runat="server" language="ampscript">`. The exception is typing into a rich text editor (see below).
- **Script activities refuse AMPscript.** Automation Studio rejects all three forms on save, by API and in the editor. SSJS and a client-side `<script>` are saved. AMPscript can still run from a script activity through `TreatAsContent` or a content block (see below).
- **SSJS is kept.** `<script runat="server">` is stored unchanged in every type tested, by API and in every code editor, including script activities, with the same rich text exception.
- **A client-side `<script>` is removed.** Plain `<script>…</script>` disappears from emails, content blocks and templates. The save still reports success. No error, no warning.
- **Landing pages keep everything,** including a client-side `<script>`.
- **CloudPages code resources depend on how you save.** In the CloudPages editor a client-side `<script>` is kept. Through the API the same text is removed.
- **Send contexts are AMPscript territory.** Sender profiles, subject lines, push and SMS text and other fields filled in per recipient held AMPscript, not SSJS, on a production business unit (see [AMPscript in send contexts](#ampscript-in-send-contexts), not tested).
- **Rich text editors turn tags into text.** If you type `<script …>` into the Content tab of a free form or text block, it is stored as escaped text (`&lt;script…`), so it never runs. AMPscript in `%%` delimiters is not affected.

## Results

<p class="crud-legend"><span class="crud-chip crud-chip--yes">kept</span> stored unchanged · <span class="crud-chip crud-chip--partial">escaped</span> stored as plain text (<code>&amp;lt;</code> instead of <code>&lt;</code>) · <span class="crud-chip crud-chip--no">removed</span> stored without the snippet, save reported success · <span class="crud-chip crud-chip--no">rejected</span> save refused with an error</p>

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

The column headers stand for these five snippets. Each was saved on its own, between a line `PROBE_START` and a line `PROBE_END` (script activities: the snippet was the whole script, see below):

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

### Script activities accept SSJS only

An Automation Studio script activity is checked when you save it. All three AMPscript forms are refused, by API (`400`) and in the editor (an error banner), with the message "AMP Script is not currently supported in SSJS Activities." for `%%[ … ]%%` and `%%= … =%%`, and a validation error for `<script runat="server" language="ampscript">`. The check also finds AMPscript delimiters inside an SSJS string: `TreatAsContent('%%[ … ]%%')` written literally in the script is refused in the same way.

SSJS and a client-side `<script>` are saved unchanged. The check parses the script as SSJS: a script with only the two marker lines was refused, and so was the SSJS snippet between them, while a client-side `<script>` between them was accepted. That is why each snippet was saved as the whole script here.

### Running AMPscript from a script activity

AMPscript can still run inside a script activity when SSJS hands it over at run time. Because the save check looks for the AMPscript delimiters, the test script built them at run time:

```js
var P = "%" + "%";
var open = "<scr" + "ipt runat=\"server\" language=\"amp" + "script\">";
var close = "</scr" + "ipt>";
```

Each statement below ran in that script activity, in one automation run, and its return value was written to a data extension:

| Statement in the script activity | AMPscript it hands over | Result |
|---|---|---|
| `Platform.Function.TreatAsContent(P + '[ SET @a1 = "A1-RAN" ]' + P + P + '=v(@a1)=' + P)` | `%%[ SET @a1 = "A1-RAN" ]%%%%=v(@a1)=%%` | ran, returned `A1-RAN` |
| `Variable.GetValue("@a1")` (after the call above) | — | returned `A1-RAN` |
| `Platform.Function.TreatAsContent(P + '=Concat("A2", "-RAN")=' + P)` | `%%=Concat("A2", "-RAN")=%%` | ran, returned `A2-RAN` |
| `Platform.Function.TreatAsContent(P + '="A2-RAN"=' + P)` | `%%="A2-RAN"=%%` | error: "The function call does not include the required open parenthesis" — an inline expression needs a function call |
| `Platform.Function.TreatAsContent(open + 'SET @a3 = "A3-RAN"' + close + P + '=v(@a3)=' + P)` | `<script runat="server" language="ampscript">SET @a3 = "A3-RAN"</script>%%=v(@a3)=%%` | ran, returned `A3-RAN` |
| `Platform.Function.ContentBlockByKey("cpp-exec-block")` | the HTML block's content: `%%[ SET @cb = "CB-RAN" ]%%%%=v(@cb)=%%` | ran, returned `CB-RAN` |
| `Variable.GetValue("@cb")` (after the call above) | — | returned `CB-RAN` |

Writing the AMPscript out literally, for example `Platform.Function.TreatAsContent('%%[ SET @a1 = "A1-RAN" ]%%')`, is refused when the script activity is saved. Keeping the AMPscript in a content block and loading it with `ContentBlockByKey` needs no workaround.

## AMPscript in send contexts

{% include callout.html type="note" title="Not tested here" content="This section lists where AMPscript is used at send time. The fields come from a full retrieve of a business unit that sends email, push and SMS in production. Nothing in this section was saved or run as part of the test above." %}

Fields that are filled in per recipient when a message goes out are AMPscript territory; we don't recommend SSJS there. Salesforce's [SSJS overview](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/ssjs_serverSideJavaScript.html) advises AMPscript or the SSJS Platform functions for email messages and the SSJS Core library only for landing pages and applications, and it names AMPscript as the better fit when every recipient sees different content. On the business unit below, all of these fields held AMPscript and none held SSJS.

| Where | Fields that held AMPscript |
|---|---|
| Sender profile | From name, from address, auto-forward name and address |
| Journey Builder email activity | Subject, preheader, CC, BCC |
| Journey Builder push activity | Title, message, custom keys |
| Journey Builder SMS activity | Message |
| Push message (Content Builder, Mobile App messaging) | Title, message |
| SMS message (Content Builder) | Message |
| MobilePush message | Alert text, title |
| MobileConnect outbound SMS | Message text |
| Transactional SMS definition | Message |
| Transactional email definition | CC, BCC |

The retrieved in-app messages held no AMPscript, so in-app is not listed, although its title and message fields are filled in at send time like a push message.

In Journey Builder, AMPscript support depends on the activity. From experience (not tested here), send activities generally take it in the fields that become part of the message, such as subject, title and body, but not in their settings, and other activity types take neither AMPscript nor SSJS. The business unit above fits that: 325 of 325 email activities and 35 of 45 push activities held AMPscript, while none of the 54 decision splits, 182 waits and 83 update-contact activities did.

File naming patterns of imports, extracts and file transfers use personalization strings such as `%%Year%%`. Those are placeholders the platform replaces, not AMPscript.

## How this was tested

- **Where:** a child business unit used for testing, Marketing Cloud Engagement, 26 November 2026.
- **By API:** for every type, one new asset per snippet, created with `POST /asset/v1/content/assets`, plus one control asset holding only the two marker lines. Every control of the Content Builder and CloudPages types was stored as sent, so a removed snippet is never a type that failed to save. The code resources were created twice, once without and once with the content type the CloudPages editor sets.
- **In the editor:** one item per type and editor, created in Content Builder or CloudPages, re-used for the five snippets. The code was pasted into code editors and typed into rich text editors and the CloudPages editor, then saved with the Save button.
- **Reading back:** after every save, the stored item was read through the REST API and the text between the markers compared with what was sent (line endings ignored). For CloudPages code resources the item was read once per second during the save.
- **Script activities:** created with `POST /automation/v1/scripts` and in the Automation Studio editor, read back with `GET /automation/v1/scripts/{id}`. For the run, one automation with one script activity was started twice (the second run added the `Concat` case, the other results were the same); the script wrote each call's result into a data extension, which was read back through the REST API.
- **Send contexts:** the list of send-time fields comes from a full retrieve of another business unit (not the test business unit) with the deployment tool mcdev; it was not tested.
- **Not tested:** whether the code runs when an email is sent or a page is published, and a JavaScript code resource with plain JavaScript (no `<script>` tag).
- **Browser extensions:** an extension that rewrites or formats editor content on save can change what gets stored. Format-on-save features were switched off for the test.

More metadata types will be added to this page over time.

## Related

- [Where SSJS and JavaScript can be saved](https://ssjs.guide/recipes/code-persistence/) on ssjs.guide: the SSJS and JavaScript columns only
- [ssjs.guide](https://ssjs.guide) for the SSJS reference
- [Personalization strings, AMPscript & SSJS together](/engagement/ampscript-ssjs-interplay/)
- [Querying Data Extensions with AMPscript](/engagement/querying-data/)
- [TreatAsContent on ssjs.guide](https://ssjs.guide/platform-functions/treatascontent/)
