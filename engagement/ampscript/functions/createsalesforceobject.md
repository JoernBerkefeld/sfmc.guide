---
layout: page
title: "CreateSalesforceObject"
description: "Creates a new record in a connected Salesforce Sales or Service Cloud object via Marketing Cloud Connect and returns the 18-character ID of the created record. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that a successful create returns a real Salesforce ID and a fault aborts the page instead of returning an error value."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/createsalesforceobject/
platforms:
  - engagement
syntax: "CreateSalesforceObject(objectName, numFields, fieldName1, fieldValue1[, fieldNameN, fieldValueN, ...])"
return_type: string
min_args: 4
verification: verified
test_scripts: complete
differs_from_docs: false
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `objectName` | string | Yes | API name of the Salesforce object to insert into |
| `numFields` | number | Yes | Number of field name/value pairs that follow; must match the pairs supplied |
| `fieldName1` | string | Yes | API name of the first field to set |
| `fieldValue1` | string \| number | Yes | Value for the first field |
| `fieldNameN` | string | No | Further field name |
| `fieldValueN` | string \| number | No | Value for the corresponding further field |

Fields are supplied as repeating name/value pairs; `numFields` counts the pairs, not the arguments. There is no upper bound on the number of pairs.

## Example

```ampscript
%%[
  VAR @id
  SET @id = CreateSalesforceObject("Task", 1, "Subject", "Follow up")
]%%
Created: %%=v(@id)=%%
```

Renders `Created: 00T...` — the 18-character ID of the new record, whose three-character prefix identifies the object type (`00T` for a Task).

{% include callout.html type="warning" title="A successful create writes real CRM data" content="This function inserts a live record into the connected Salesforce org. AMPscript has no matching delete function, so a record created this way cannot be removed from AMPscript. Only run the success path against data you are willing to keep." %}

A realistic use passes several fields in one call, keeping `numFields` in step:

```ampscript
%%[
  VAR @id
  SET @id = CreateSalesforceObject("Task", 2, "Subject", "Callback", "Status", "Not Started")
]%%
```

## Return value

**`string`** — the 18-character Salesforce ID of the newly created record.

There is no closed set of sentinel values: the return is an ID string when the insert succeeds. A fault does not yield a testable error value — see below.

## Behaviour

**A successful create round-trips to the connected org and returns a real ID.** The function issues a SOAP request through Marketing Cloud Connect. Creating a Task with a single field returned an 18-character ID whose `00T` prefix marks it as a Task, confirming the record was committed in the org.

**The number of pairs is declared, not inferred.** `numFields` states how many field name/value pairs follow. The count must match the pairs actually supplied.

### A fault aborts the page

{% include callout.html type="warning" title="A SOAP fault becomes a page abort" content="AMPscript has no try/catch, so a fault from the connected org — an object API name that does not exist, or a field name that is not valid on the object — aborts the whole CloudPage with HTTP 422 and discards everything already rendered. There is no error value to test for; the function either returns an ID or aborts." %}

`CreateSalesforceObject("NotARealObject__x", 1, "Subject", "zzz")` and a call naming a field that does not exist on the object each aborted the page with HTTP 422. Validate object and field API names before the call rather than relying on a graceful failure.

{% include test-script.html bundle="ampscript-functions--createsalesforceobject" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

Requires an active Marketing Cloud Connect integration to a Sales or Service Cloud org on the business unit.

## See also

- [`UpdateSingleSalesforceObject`](/engagement/ampscript/functions/updatesinglesalesforceobject/) — update a record in the same connected org
- [`RetrieveSalesforceObjects`](/engagement/ampscript/functions/retrievesalesforceobjects/) — read records back
- [`LongSFID`](/engagement/ampscript/functions/longsfid/) — convert a 15-character ID for matching
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-salesforce/mc-ampscript-reference-salesforce-create-object.html) · [ampscript.guide](https://ampscript.guide/createsalesforceobject/)
