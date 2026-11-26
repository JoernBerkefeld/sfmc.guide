---
layout: page
title: "AMPscript RetrieveSalesforceObjects (Next)"
description: "Query Salesforce records into a rowset with AMPscript RetrieveSalesforceObjects in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how it differs from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/retrievesalesforceobjects/
platforms:
  - next
syntax: "RetrieveSalesforceObjects(objectName, fieldsToRetrieve, queryFieldName1, queryFieldOperator1, queryFieldValue1[, queryFieldNameN, queryFieldOperatorN, queryFieldValueN, ...])"
return_type: rowset
min_args: 5
verification: in-progress
differs_from_docs: false
engagement: differs
mcn_tested: 2026-11-25
engagement_note: "For a query that matches nothing, Engagement's `Empty()` on the result renders `True`; Next renders `false`. The row count (`0`), a live read of an 18-character `Id`, and the failure on an unknown object name are the same on both."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `objectName` | string | Yes | Object to read records from, written as its API name (for example `Contact`) |
| `fieldsToRetrieve` | string | Yes | Field API names, separated by commas, that become the rowset columns |
| `queryFieldName1` | string | Yes | Field the first condition tests |
| `queryFieldOperator1` | string | Yes | Comparison operator (`=`, `!=`, `<`, `<=`, `>`, `>=`) |
| `queryFieldValue1` | string \| number | Yes | Value to filter against |
| `queryFieldNameN` | string | No | Further filter field |
| `queryFieldOperatorN` | string | No | Further comparison operator |
| `queryFieldValueN` | string \| number | No | Further filter value |

## Example

```ampscript
%%[
  SET @rows = RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")
  IF RowCount(@rows) > 0 THEN
    SET @idLength = Length(Field(Row(@rows, 1), "Id"))
  ENDIF
]%%
%%=v(@idLength)=%%
```

Renders `18`: the query reached the org's Contact records and the first `Id` has 18 characters.

A filter that matches nothing gives an empty rowset:

```ampscript
%%[
  SET @none = RetrieveSalesforceObjects("Contact", "Id", "Id", "=", "000000000000000AAA")
]%%
%%=RowCount(@none)=%%
```

Renders `0`.

## Return value

**`rowset`** — one row per matching record, read with [`Row`](/next/ampscript/functions/row/) and [`Field`](/next/ampscript/functions/field/). An unmatched filter returns a rowset with `RowCount` `0`.

## Behaviour

**Queries live records.** `RetrieveSalesforceObjects("Contact", "Id", "IsDeleted", "=", "false")` returned rows, and `Field(Row(@rows, 1), "Id")` had a length of 18.

**No match is not an error.** The filter `"Id", "=", "000000000000000AAA"` returned a rowset with `RowCount` `0` and the email rendered normally.

**Check for no match with `RowCount`, not `Empty`.** `Empty()` on that unmatched result rendered `false`. Test `RowCount(@rows) > 0` instead.

**An unknown object name fails.** An email querying `NotARealObject__x` saved and published, but rendering it failed with HTTP 500.

The following was tested on 2026-11-25 on the `Contact` object, one call per email, with the expected counts taken from a SOQL query of the same org:

**Comparison operators work as literal strings.** `"="`, `">"`, `">="`, `"<"` and `"<="` on a number field returned the same records as SOQL; for example `RetrieveSalesforceObjects("Contact", "LastName,pi__score__c", "pi__score__c", "=", "82")` returned the one matching contact, and `Field` read its last name.

**Several conditions combine with AND.** `"pi__score__c", ">", "290", "LastName", "!=", "Adelson"` returned the one record that meets both, and two `=` conditions no record meets at once returned `RowCount` `0`.

**Dates compare as `yyyy-MM-dd` strings.** `"Birthdate", "=", "1965-07-26"` returned the one contact born that day.

**`LIKE` matches anywhere in the field.** The value is found anywhere, regardless of case, and `%` is not treated as a wildcard: `"LastName", "LIKE", "Ro%"` returned 5 records where a SOQL prefix match finds 3, and `"LIKE", "Bl"` returned 2 records where SOQL finds none.

**Write the operator as a literal.** An operator built at run time fails: `Char(60)` in place of `"<"` saved and published, but the preview failed with HTTP 500, and `Concat(Char(60), "=")` in place of `"<="` was rejected at publish with HTTP 400 ("invalid Handlebars script").

{% include test-script.html bundle="next-ampscript-functions--retrievesalesforceobjects" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--retrievesalesforceobjects" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

{% include platform-compare.html %}

## See also

- [`RowCount`](/next/ampscript/functions/rowcount/) — the reliable no-match check
- [`Row`](/next/ampscript/functions/row/)
- [`Field`](/next/ampscript/functions/field/) — read the returned rowset
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-salesforce/mc-ampscript-reference-salesforce-retrieve-objects.html)
