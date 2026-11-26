---
layout: page
title: "Querying Data in Next"
description: "Read Sales Cloud objects and marketing objects in Marketing Cloud Next emails with Handlebars query, queryFirst or AMPscript; SQL cheat sheet, data graph tests."
parent: Next
parent_url: /next/
permalink: /next/querying-data/
platforms:
  - next
test_scripts: complete
---

Marketing Cloud Next emails can read three kinds of data while they render: Sales Cloud objects (CRM), marketing objects (MO) and Data 360 data graphs (DG). Handlebars reads all of them with [`query`](/next/handlebars/helpers/query/) and [`queryFirst`](/next/handlebars/helpers/queryfirst/); AMPscript has [`RetrieveSalesforceObjects`](/next/ampscript/functions/retrievesalesforceobjects/) for Sales Cloud objects and the `Lookup` family for marketing objects. This page shows which call works for which source and how a SQL `WHERE` clause turns into each one. For Data Extensions in Marketing Cloud Engagement, see the sister page [Querying Data Extensions](/engagement/querying-data/).

Every example below was rendered in the preview of a Next email (one HTML component, previewed through the Email Direct Send preview API, never sent); the calls that failed are marked as such. The examples read data of a demo org: Sales Cloud `Contact` records, two small marketing objects (`zzprobecoupons__mo` with the text key field `CouponCode__c` and one record `PROBE0001`, `IsClaimed__c` `false`; `zzprobenumkey__mo` with the number key field `CouponNo__c`, a text field `Label__c` and a number field `Points__c`), and the data graph `Marketing`. Replace object, field and graph names with your own. The SQL table further down also draws on earlier single-call tests of the same helpers and functions.

{% raw %}

## Which call should I use?

| Data source | Handlebars | AMPscript | Filter | Sort / limit |
|---|---|---|---|---|
| Sales Cloud object (`type="CRM"`) | `query`, `queryFirst` | `RetrieveSalesforceObjects` | Handlebars: `where` with `:placeholders` filled from `params=(hash …)`; AMPscript: field / operator / value triplets joined with AND | Handlebars: `sortBy="Field ASC"` / `"Field DESC"`, `limit`; AMPscript: none |
| Marketing object (`type="MO"`) | `query`, `queryFirst` | `Lookup`, `LookupRows` | Handlebars: inline filters `Field="value"` on any field, joined with AND; AMPscript: column / value pairs | Handlebars: `limit` works, `sortBy` fails; AMPscript: none (`LookupOrderedRows` fails) |
| Data graph (`type="DG"`) | `queryFirst` (documented; failed in our tests) | — | see [Data graphs](#data-graphs) | — |

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

The Salesforce reference documents `queryFirst` with `type="DG"`: `object` names the data graph, and an inline field condition picks the record (its example filters a unified profile on an email address). `query` lists only `CRM` and `MO` as types. In the form below, `ssot__Id__c` is the key field of the graph's root object:

```handlebars
{{get (queryFirst type="DG" object="Marketing" ssot__Id__c="<unified individual id>") "ssot__FirstName__c"}}
```

In our tests no `type="DG"` call rendered. Each of these forms saved and published, but made the preview fail with HTTP 500, alone in the email and with a working control email before and after:

- an inline filter on the key field of the graph's root object, read with `get` or looped with `#each`, on a graph rooted on the unified individual (`Marketing`) and on one rooted on the individual (`ssot__Individual__dlm`);
- no filter, on both graphs, to see whether the graph follows the previewed recipient;
- `where` with `params` on a field of the root object.

The test email carried the data graph binding that the email editor stores with it (a different graph from the ones queried). Whether a matching binding, a real-time graph or a sent email behaves differently was not tested. The email editor's data graph merge fields are the documented alternative (not tested here).

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
  <li><a href="/next/ampscript/functions/retrievesalesforceobjects/">RetrieveSalesforceObjects</a></li>
  <li><a href="/next/ampscript/functions/lookup/">Lookup</a></li>
  <li><a href="/next/ampscript/functions/lookuprows/">LookupRows</a></li>
  <li><a href="/next/ampscript/functions/lookuporderedrows/">LookupOrderedRows</a></li>
  <li><a href="/engagement/querying-data/">Querying Data Extensions (Engagement)</a></li>
  <li><a href="/tools/sql-converter/">SQL Converter</a></li>
</ul>
</div>
