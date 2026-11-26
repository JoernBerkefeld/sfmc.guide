---
layout: page
title: "Querying Data in Next"
description: "Read Sales Cloud objects and marketing objects in Marketing Cloud Next emails with Handlebars query, queryFirst or AMPscript; SQL cheat sheet, and the bound data graph."
parent: Next
parent_url: /next/
permalink: /next/querying-data/
platforms:
  - next
test_scripts: complete
---

Marketing Cloud Next emails can read three kinds of data while they render: Sales Cloud objects (CRM), marketing objects (MO) and Data 360 data graphs (DG). Handlebars reads Sales Cloud objects and marketing objects with [`query`](/next/handlebars/helpers/query/) and [`queryFirst`](/next/handlebars/helpers/queryfirst/), and the data graph bound to the email through `$dataGraph` merge fields; AMPscript has [`RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) for Sales Cloud objects and the `Lookup` family for marketing objects. This page shows which call works for which source and how a SQL `WHERE` clause turns into each one. For Data Extensions in Marketing Cloud Engagement, see the sister page [Querying Data Extensions](/engagement/querying-data/).

> **Skip the manual mapping:** paste a `SELECT` into the [SQL Converter](/tools/sql-converter/) and get the matching Handlebars and AMPscript lookup code for Sales Cloud and marketing objects, or paste lookup code to get the SQL back.

Every example below was rendered in the preview of a Next email (one HTML component, previewed through the Email Direct Send preview API, never sent; the data graph merge fields in the Email Builder preview, because the preview API does not load the graph); the calls that failed are marked as such. The examples read data of a demo org: Sales Cloud `Contact` records, two small marketing objects (`zzprobecoupons__mo` with the text key field `CouponCode__c` and one record `PROBE0001`, `IsClaimed__c` `false`; `zzprobenumkey__mo` with the number key field `CouponNo__c`, a text field `Label__c` and a number field `Points__c`), and the data graphs `Marketing` (rooted on the unified individual) and `CMSM_Graph` (rooted on the individual). Replace object, field and graph names with your own. The SQL table further down also draws on earlier single-call tests of the same helpers and functions.

{% raw %}

## Which call should I use?

| Data source | Handlebars | AMPscript | Filter | Sort / limit |
|---|---|---|---|---|
| Sales Cloud object (`type="CRM"`) | `query`, `queryFirst` | `RetrieveSalesforceObjects` | Handlebars: `where` with `:placeholders` filled from `params=(hash …)`; AMPscript: field / operator / value triplets joined with AND | Handlebars: `sortBy="Field ASC"` / `"Field DESC"`, `limit`; AMPscript: none |
| Marketing object (`type="MO"`) | `query`, `queryFirst` | `Lookup`, `LookupRows` | Handlebars: inline filters `Field="value"` on any field, joined with AND; AMPscript: column / value pairs | Handlebars: `limit` works, `sortBy` fails; AMPscript: none (`LookupOrderedRows` fails) |
| Data graph bound to the email | root fields: `{{get (get @root "$dataGraph") "Field"}}`; related DMO rows: `#each` over `(get (get @root "$dataGraph") "<DMO API name>")` (both rendered in the Email Builder preview); `query` / `queryFirst type="DG"` failed in every test | — | always the previewed recipient; related rows: `#if` with `compare` / `equals`, joined with `and` / `or` (`filter` fails) | `sort`, then `slice` for the first N rows; `length` counts them |

Rules of thumb:

- **Values always go through `params`.** On Sales Cloud objects, a value typed straight into `where` (`where="MailingCity = 'Denver'"`, or a number such as `= 82`) saves fine but makes the preview fail with HTTP 500. Write a placeholder (`:city`) and pass the value in `params=(hash city="Denver")`.
- **Marketing objects need an inline filter.** Filter a marketing object inline (`CouponCode__c="PROBE0001"`), on the key field or any other field. Without an inline filter, or with any `where`, the preview fails with HTTP 500.
- **Several matches may come back as one.** In our test, a marketing object filter that matched two records returned only one of them, in Handlebars and in `LookupRows`. Filter on the key field when every match matters.
- **`LIKE` means "contains".** Both Handlebars `where` and `RetrieveSalesforceObjects` match a `LIKE` value anywhere in the field and ignore `%`: `"Ro%"` also finds `Brown`, and `"Bl"` finds `Blau`. "Starts with" and "ends with" cannot be expressed.
- **`=` ignores case** in Handlebars `where`: `"blau"` finds `Blau`.
- **List the fields you need.** A Sales Cloud object query without `fields` returns the record, but every field in it renders empty.

## Sales Cloud objects

`query` returns every matching record; loop over them with `#each`. `queryFirst` returns one record; read a field with `get` or open it with `#with`. `sortBy` and `limit` are applied before the first record is picked or the list is cut.

Contacts in Denver born after 1 January 1980, two placeholders joined with AND:

```handlebars
{{#each (query type="CRM" object="Contact" fields="FirstName,LastName" where="MailingCity = :city AND Birthdate > :born" params=(hash city="Denver" born="1980-01-01"))}}{{FirstName}} {{LastName}};{{/each}}
```

Renders `Lisa Jones;`. Dates go into `params` as `"yyyy-MM-dd"` strings.

Contacts in Denver or Boston, sorted by last name, at most three:

```handlebars
{{#each (query type="CRM" object="Contact" fields="LastName" where="MailingCity = :a OR MailingCity = :b" params=(hash a="Denver" b="Boston") sortBy="LastName ASC" limit=3)}}{{LastName}};{{/each}}
```

Renders `Bowden;Brennaman;Jones;`.

The youngest contact in Wichita, read with `get`, and one contact opened with `#with`:

```handlebars
{{get (queryFirst type="CRM" object="Contact" fields="LastName" where="MailingCity = :city" params=(hash city="Wichita") sortBy="Birthdate DESC") "LastName"}}
{{#with (queryFirst type="CRM" object="Contact" fields="FirstName,LastName" where="LastName = :n" params=(hash n="Brennaman"))}}{{FirstName}} {{LastName}}{{/with}}
```

Renders `Sutherland` and `Jason Brennaman`.

When nothing matches, `queryFirst` raises no error: `get` renders nothing, and the result counts as false in `#if`:

```handlebars
{{#if (queryFirst type="CRM" object="Contact" fields="LastName" where="LastName = :n" params=(hash n="Nobody"))}}found{{else}}none{{/if}}
```

Renders `none`.

In AMPscript, `RetrieveSalesforceObjects` takes the object, the fields to return, and one or more field / operator / value triplets, all joined with AND. Read the result with `RowCount`, `Row` and `Field`. It has no sort order, so do not rely on the order of the rows.

```ampscript
%%[ SET @den = RetrieveSalesforceObjects("Contact","FirstName,LastName","MailingCity","=","Denver","Birthdate",">","1980-01-01") ]%%%%=RowCount(@den)=%%|%%=Field(Row(@den,1),"LastName")=%%
```

Renders `1|Jones`. To print every match, loop over the rows:

```ampscript
%%[ SET @wic = RetrieveSalesforceObjects("Contact","LastName","MailingCity","=","Wichita","LeadSource","=","Cold Call") FOR @i = 1 TO RowCount(@wic) DO ]%%%%=Field(Row(@wic,@i),"LastName")=%%;%%[ NEXT @i ]%%
```

Rendered `Sullivan;Janzen;Chopra;` in the test.

Write the operator as a plain string (`"="`, `"!="`, `">"`, `">="`, `"<"`, `"<="`, `"LIKE"`). In the test, building `<` at runtime with `Char(60)` instead made the preview fail.

{% endraw %}
{% include test-script.html bundle="next--querying-data" chapter="sales-cloud-objects" lang="handlebars" label="Show Next test script" %}
{% raw %}

## Marketing objects

Handlebars reads a marketing object only through inline filters (`Field="value"` inside the call). `query` then returns the matching records, `queryFirst` the first one.

```handlebars
{{#each (query type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001")}}{{CouponCode__c}}|{{IsClaimed__c}};{{/each}}
{{get (queryFirst type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001") "IsClaimed__c"}}
{{#with (queryFirst type="MO" object="zzprobecoupons__mo" CouponCode__c="PROBE0001")}}{{CouponCode__c}}{{/with}}
```

Renders `PROBE0001|false;`, `false` and `PROBE0001`.

In AMPscript, `Lookup` returns one field of the first matching record, and `LookupRows` returns every match as a rowset. Both take the marketing object's API name where Engagement takes a Data Extension name. `LookupRows` also filters on a field that is not the key.

```ampscript
%%=Lookup("zzprobecoupons__mo","IsClaimed__c","CouponCode__c","PROBE0001")=%%
%%[ SET @cp = LookupRows("zzprobecoupons__mo","CouponCode__c","PROBE0001") ]%%%%=RowCount(@cp)=%%|%%=Field(Row(@cp,1),"IsClaimed__c")=%%
%%[ SET @none = LookupRows("zzprobecoupons__mo","CouponCode__c","NOPE0000") ]%%%%=RowCount(@none)=%%
```

Renders `false`, `1|false` and `0` (no match gives an empty rowset).

The filters are not limited to the key field. They work on number, text and boolean fields, and several of them combine with AND. A number may be written with or without quotes; Next prints number fields with one decimal. `limit` caps the list, while `sortBy` makes the preview fail.

```handlebars
{{#each (query type="MO" object="zzprobenumkey__mo" CouponNo__c=7)}}{{CouponNo__c}}|{{Label__c}}|{{Points__c}};{{/each}}
{{#each (query type="MO" object="zzprobenumkey__mo" Points__c=7)}}{{Label__c}};{{/each}}
{{#each (query type="MO" object="zzprobenumkey__mo" CouponNo__c=7 Points__c=70)}}{{Label__c}};{{/each}}
{{#each (query type="MO" object="zzprobenumkey__mo" Label__c="group" limit=1)}}{{Label__c}};{{/each}}
{{get (queryFirst type="MO" object="zzprobenumkey__mo" Label__c="seventy") "CouponNo__c"}}
```

Renders `7.0|seven|70.0;`, `seventy;`, `seven;`, `group;` and `70.0`.

`Lookup` and `LookupRows` take a number key as a string or as a number:

```ampscript
%%[ SET @nk = LookupRows("zzprobenumkey__mo","CouponNo__c",7) ]%%%%=RowCount(@nk)=%%|%%=Field(Row(@nk,1),"Label__c")=%%
%%=Lookup("zzprobenumkey__mo","Label__c","CouponNo__c",12)=%%
```

Renders `1|seven` and `twelve`.

Two records of `zzprobenumkey__mo` share the label `group`. Both calls below found only one of them (record 8):

```handlebars
{{#each (query type="MO" object="zzprobenumkey__mo" Label__c="group")}}{{CouponNo__c}};{{/each}}
%%[ SET @grp = LookupRows("zzprobenumkey__mo","Label__c","group") ]%%%%=RowCount(@grp)=%%
```

Renders `8.0;` and `1`. Record 9 is found when the filter matches it alone (`CouponNo__c=9`). `LookupRows` with the same field in two pairs does not combine them: only the last pair counts.

`LookupOrderedRows` saves, but every form tried (count 0, 1 or 5, `ASC`, `DESC` or no direction, key or other field) makes the preview fail with HTTP 500. When you need sorted records, keep them in a Sales Cloud object and use `query` with `sortBy`.

{% endraw %}
{% include test-script.html bundle="next--querying-data" chapter="marketing-objects" lang="handlebars" label="Show Next test script" %}
{% raw %}

## Data graphs

An email reads Data 360 data through the data graph bound to it (the graph picked under the email's data sources in the editor). Everything below rendered in the Email Builder preview with a profile. The `query` and `queryFirst` helpers with `type="DG"` did not render in any form; see [Calls with type="DG" fail](#calls-with-typedg-fail).

### Fields of the graph's root object

The fields of the root object sit under `$dataGraph` on the root context, for the recipient being rendered:

```handlebars
{{get (get @root "$dataGraph") "ssot__FirstName__c"}}
{{@root.$dataGraph.ssot__LastName__c}}
```

Both forms rendered the recipient's first and last name; the values matched a Data 360 SQL read of the same record. A field the graph does not contain renders empty. There is no filter: the record is always the recipient being previewed.

{% endraw %}
{% include test-script.html bundle="next--querying-data" chapter="data-graph-merge-fields" lang="handlebars" label="Show the data graph merge field test script" %}
{% raw %}

### Related DMO rows of the graph

Each data model object related to the root object is a list under `$dataGraph`, named by the DMO's API name. Loop over it with `#each`; inside the loop, read the row's fields by name. In the `Marketing` graph, `UnifiedLinkssotIndividualMkt__dlm` holds one row per source record that was merged into the unified individual:

```handlebars
{{#each (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm")}}{{ssot__DataSourceObjectId__c}}: {{SourceRecordId__c}};{{/each}}
```

For a recipient merged from one lead and one contact, the loop printed both rows, in the order the graph stores them.

**Picking rows (SQL `WHERE`).** Wrap the row in `#if` and test it with [`compare`](/next/handlebars/helpers/compare/) or [`equals`](/next/handlebars/helpers/equals/); combine tests with `and` / `or`:

```handlebars
{{#each (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm")}}{{#if (or (compare ssot__DataSourceObjectId__c "==" "Contact") (equals ssot__DataSourceObjectId__c "Lead"))}}{{SourceRecordId__c}};{{/if}}{{/each}}
```

`compare` also took `!=` and `>` (on text, `"Lead" > "D"` is true). Unlike SQL, `compare` with `==` is case-sensitive: `"contact"` did not match `Contact`. Values that look like numbers are compared as numbers, quoted or not: `"10" > "9"` is true, and so is `"10" == 10`. A field the row does not have simply compares as false. The [`filter`](/next/handlebars/helpers/filter/) helper, the obvious candidate, does not work here: its documented form saved but made the whole preview fail, and leaving out its last argument (`filterAs`) got the save rejected with HTTP 400.

**Order and limit (SQL `ORDER BY` and `TOP`).** [`sort`](/next/handlebars/helpers/sort/) orders the list by one field (`"asc"` or `"desc"`, compared as `"string"` in the test), and [`slice`](/next/handlebars/helpers/slice/) keeps the first N rows. Nest them to get the first row after sorting:

```handlebars
{{#each (slice (sort (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm") "SourceRecordId__c" "asc" "string") 0 1)}}{{SourceRecordId__c}}{{/each}}
```

`slice` cuts the list before the loop runs, so it limits the rows the graph holds, not the rows an `#if` lets through. Testing `@index` inside the loop (`{{#if (compare @index "<" 1)}}`) counts the same way.

**Counting rows.** [`length`](/next/handlebars/helpers/length/) returns the number of rows: `{{length (get (get @root "$dataGraph") "UnifiedLinkssotIndividualMkt__dlm")}}` rendered `2` for the same recipient.

{% endraw %}
{% include test-script.html bundle="next--querying-data" chapter="data-graph-related" lang="handlebars" label="Show the related DMO test script" %}
{% raw %}

### Which profile id loads which graph

The Email Builder preview loads the graph for the profile id you pick, and that id has to match the key of the graph's root object:

- a graph rooted on the unified individual (`Marketing`, root `UnifiedssotIndividualMkt__dlm`) rendered with the **unified individual id**;
- a graph rooted on the individual (`CMSM_Graph`, root `ssot__Individual__dlm`) rendered with the **Individual id** (the source record id, here a Contact id); its related `ssot__ContactPointEmail__dlm` list gave the recipient's email address. With the unified individual id, the same email's preview stayed unrendered: the template text showed, without an error.

Two limits from the same tests:

- **The preview API does not load the graph.** The email preview API (`previewEmail`) rendered the merge fields empty, whatever individual id it was given. Instead, it turns the request's `attributes` into `@root`: `{"attributes":{"$dataGraph":{"ssot__FirstName__c":"AttrX"}}}` made the first-name line render `AttrX`. Use the Email Builder preview to check real graph data.
- **A real send was not tested.** The tests never sent an email.

### Calls with type="DG" fail

The Salesforce reference documents `queryFirst` with `type="DG"`: `object` names the data graph, and an inline field condition picks the record (its example filters a unified profile on an email address). `query` lists only `CRM` and `MO` as types. In the form below, `ssot__Id__c` is the key field of the graph's root object:

```handlebars
{{get (queryFirst type="DG" object="Marketing" ssot__Id__c="<unified individual id>") "ssot__FirstName__c"}}
```

In our tests no `type="DG"` call rendered, with `queryFirst` or with `query`. Each of these forms saved and published, but made the preview fail with HTTP 500, alone in the email and with a working control email before and after:

- an inline filter on the key field of the graph's root object, read with `get` or looped with `#each`, on both graphs, with a unified individual id and with a source Individual id;
- the documented contact-point email filter (`contactPointEmail="<email>"`);
- no filter, on both graphs, to see whether the graph follows the previewed recipient;
- `where` with `params` on a field of the root object;
- with `query`: the graph name or a related DMO (`ssot__ContactPointEmail__dlm`, `UnifiedLinkssotIndividualMkt__dlm`) as `object`, with and without a filter.

The emails were bound to the graph they queried, in the same data space (`default`); the ids were checked against the graph's data first, and the Email Builder preview used the profile id that loads that graph. It showed a generic error instead of the email. Read the bound graph as shown above instead.

{% endraw %}
{% include test-script.html bundle="next--querying-data" chapter="data-graphs" lang="handlebars" label="Show the data graph calls that failed (one email each)" %}
{% raw %}

## From SQL WHERE to Next

| SQL | Handlebars `where` (CRM) | `RetrieveSalesforceObjects` | Marketing object |
|---|---|---|---|
| `MailingCity = 'Denver'` | `where="MailingCity = :c" params=(hash c="Denver")` | `"MailingCity","=","Denver"` | Handlebars: inline, on any field (`CouponCode__c="PROBE0001"`); AMPscript: column / value in `Lookup` / `LookupRows` |
| `LastName <> 'Smith'` | `!=` (`<>` fails) | `"!="` | — |
| `LastName IN ('a', 'b')`, `NOT IN`, `NOT (…)` | fails; write `=` … `OR` … or `!=` … `AND` … | — | — |
| `Score > 300` (also `>=`, `<`, `<=`) | `>`, `>=`, `<`, `<=` | `">"`, `">="`, `"<"`, `"<="` | — |
| `Birthdate > '1980-01-01'` | `"yyyy-MM-dd"` string in `params` | `"yyyy-MM-dd"` string | — |
| `LastName LIKE '%son%'` | `LIKE :n` with `n="%son%"` (always "contains") | `"LIKE","%son%"` (always "contains") | — |
| `LIKE 'Ro%'` / `LIKE '%son'` | no exact form: `LIKE` matches anywhere | no exact form | — |
| `a AND b` | `AND` | several triplets | several inline filters (Handlebars) or pairs (AMPscript), each field once |
| `a OR b`, parentheses | `OR`, `( … )` | — | — |
| `ORDER BY Field DESC` | `sortBy="Field DESC"` (one field only) | — | — (`sortBy` fails) |
| `TOP 3` / `LIMIT 3` | `limit=3` | — | Handlebars: `limit=3` |
| `SELECT FirstName, LastName` | `fields="FirstName,LastName"` (always list them) | second argument | all fields |

The [SQL Converter](/tools/sql-converter/) turns a SQL query into lookup code for Engagement and Next and reads lookup code back into SQL. The table above shows which parts of a query Next can express.

## Calls that fail

Each of these saves without an error, but makes the whole preview fail with HTTP 500. Test such a call alone in an email: in a combined email it takes every other result with it.

A value written into `where`, a marketing object without an inline filter, and `where` on a marketing object:

```handlebars
{{#each (query type="CRM" object="Contact" fields="LastName" where="MailingCity = 'Denver'")}}{{LastName}};{{/each}}
{{#each (query type="MO" object="zzprobecoupons__mo" fields="CouponCode__c")}}{{CouponCode__c}};{{/each}}
{{#each (query type="MO" object="zzprobecoupons__mo" fields="CouponCode__c" where="CouponCode__c = :c" params=(hash c="PROBE0001"))}}{{CouponCode__c}};{{/each}}
```

`LookupOrderedRows` on a marketing object:

```ampscript
%%[ SET @ord = LookupOrderedRows("zzprobecoupons__mo",1,"CouponCode__c DESC","CouponCode__c","PROBE0001") ]%%%%=RowCount(@ord)=%%
```

`sortBy` on a marketing object (also with `ASC`, with `limit`, and in `queryFirst`):

```handlebars
{{#each (query type="MO" object="zzprobenumkey__mo" Label__c="group" sortBy="Points__c DESC")}}{{CouponNo__c}};{{/each}}
```

On a Sales Cloud object: `<>`, `IN`, `NOT IN`, `NOT (…)` and a `sortBy` with two fields:

```handlebars
{{#each (query type="CRM" object="Contact" fields="LastName" where="pi__score__c > :a AND LastName <> :n" params=(hash a=300 n="Chopra"))}}{{LastName}};{{/each}}
{{#each (query type="CRM" object="Contact" fields="LastName" where="LastName IN (:a, :b)" params=(hash a="Brown" b="Blau"))}}{{LastName}};{{/each}}
{{#each (query type="CRM" object="Contact" fields="LastName" where="pi__score__c > :s AND LastName NOT IN (:a, :b)" params=(hash s=300 a="Chopra" b="Nobody"))}}{{LastName}};{{/each}}
{{#each (query type="CRM" object="Contact" fields="LastName" where="pi__score__c > :s AND NOT (LastName = :n)" params=(hash s=300 n="Chopra"))}}{{LastName}};{{/each}}
{{#each (query type="CRM" object="Contact" fields="FirstName,LastName" where="FirstName = :f" params=(hash f="Sarah") sortBy="FirstName ASC, LastName DESC")}}{{LastName}};{{/each}}
```

Two marketing object queries in one email that write the same number field once without quotes and once with quotes. Each renders alone, and both render together when they are written the same way:

```handlebars
{{#each (query type="MO" object="zzprobenumkey__mo" CouponNo__c=7)}}{{CouponNo__c}}|{{Label__c}}|{{Points__c}};{{/each}}
{{#each (query type="MO" object="zzprobenumkey__mo" CouponNo__c="12")}}{{Label__c}};{{/each}}
```

{% endraw %}
{% include test-script.html bundle="next--querying-data" chapter="failing" lang="handlebars" label="Show calls that fail in Next (one email each)" %}

## See Also

<div class="see-also">
<h4>See Also</h4>
<ul>
  <li><a href="/next/handlebars/helpers/query/">query</a></li>
  <li><a href="/next/handlebars/helpers/queryfirst/">queryFirst</a></li>
  <li><a href="/next/handlebars/helpers/get/">get</a></li>
  <li><a href="/next/handlebars/helpers/with/">with</a></li>
  <li><a href="/next/handlebars/helpers/hash/">hash</a></li>
  <li><a href="/next/handlebars/helpers/each/">each</a></li>
  <li><a href="/next/handlebars/helpers/compare/">compare</a></li>
  <li><a href="/next/handlebars/helpers/sort/">sort</a></li>
  <li><a href="/next/handlebars/helpers/slice/">slice</a></li>
  <li><a href="/next/handlebars/helpers/length/">length</a></li>
  <li><a href="/next/handlebars/helpers/filter/">filter</a></li>
  <li><a href="/next/ampscript/functions/retrievesalesforceobjects/">RetrieveSalesforceObjects</a></li>
  <li><a href="/next/ampscript/functions/lookup/">Lookup</a></li>
  <li><a href="/next/ampscript/functions/lookuprows/">LookupRows</a></li>
  <li><a href="/next/ampscript/functions/lookuporderedrows/">LookupOrderedRows</a></li>
  <li><a href="/engagement/querying-data/">Querying Data Extensions (Engagement)</a></li>
  <li><a href="/tools/sql-converter/">SQL Converter</a></li>
</ul>
</div>
