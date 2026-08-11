---
layout: page
title: "UpdateSingleSalesforceObject"
description: "Updates a single record in a connected Salesforce Sales or Service Cloud object via Marketing Cloud Connect and returns 1 on success. Runtime-proven on a live Marketing Cloud Engagement CloudPage — including that a successful update returns 1 and that a failed update aborts the page instead of returning the documented 0."
parent: AMPscript Function Reference
parent_url: /engagement/ampscript/functions/
permalink: /engagement/ampscript/functions/updatesinglesalesforceobject/
platforms:
  - engagement
syntax: "UpdateSingleSalesforceObject(objectName, idToUpdate, fieldName1, fieldValue1[, fieldNameN, fieldValueN, ...])"
return_type: number
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
| `objectName` | string | Yes | API name of the Salesforce object to update |
| `idToUpdate` | string | Yes | ID of the record to update |
| `fieldName1` | string | Yes | API name of the first field to update |
| `fieldValue1` | string \| number | Yes | Value to assign to the first field |
| `fieldNameN` | string | No | Further field name |
| `fieldValueN` | string \| number | No | Value for the corresponding further field |

Fields are supplied as repeating name/value pairs; there is no upper bound on the number of pairs.

## Example

```ampscript
%%[
  VAR @ok
  SET @ok = UpdateSingleSalesforceObject("Task", @recordId, "Description", "Reviewed")
]%%
Updated: %%=v(@ok)=%%
```

Renders `Updated: 1` — the update succeeded. `@recordId` is the ID of a record that already exists in the connected org, for example one returned by [`CreateSalesforceObject`](/engagement/ampscript/functions/createsalesforceobject/) or [`RetrieveSalesforceObjects`](/engagement/ampscript/functions/retrievesalesforceobjects/).

{% include callout.html type="warning" title="A successful update mutates real CRM data" content="This function changes a live record in the connected Salesforce org. AMPscript has no delete or reliable revert, so an update made this way cannot be undone from AMPscript. Only run the success path against data you are willing to change." %}

## Return value

**`number`** — `1` when the update succeeds.

Per the official reference a failed update returns `0`, but on a CloudPage a failure does not surface that value — see below. Because only `1` is observable in this context, there is no closed `0`/`1` set to test for on a CloudPage.

## Behaviour

**A successful update round-trips to the connected org and returns 1.** The function issues a SOAP request through Marketing Cloud Connect. Updating one field of a record that already exists — an ID returned by `CreateSalesforceObject` earlier in the same run — returned the literal `1` with the page rendering normally.

### A failed update aborts the page instead of returning 0

{% include callout.html type="warning" title="The documented 0 is not observable on a CloudPage" content="AMPscript has no try/catch, so a fault from the connected org — an unknown object, a malformed ID, or a well-formed but non-existent record ID — aborts the whole CloudPage with HTTP 422 and discards everything already rendered. The documented failure return of 0 never materialises to be read in this context; the update either returns 1 or aborts." %}

An unknown object name, a malformed ID, and a well-formed but non-existent Lead ID at both 15 and 18 characters each aborted the page with HTTP 422 rather than returning `0`. Confirm the record ID exists before the call rather than relying on a `0` return.

{% include test-script.html bundle="ampscript-functions--updatesinglesalesforceobject" chapter="behaviour" %}

{% include callout.html type="warning" title="OutputLine needs Concat" content="`OutputLine` given a bare string literal renders an **empty** line. Wrap the argument in `Concat()` or your start and done markers vanish silently — which looks exactly like the function failing." %}

## Availability

| Platform | Available |
|---|---|
| Marketing Cloud Engagement | Yes |
| Marketing Cloud Next | No |

Requires an active Marketing Cloud Connect integration to a Sales or Service Cloud org on the business unit.

## See also

- [`CreateSalesforceObject`](/engagement/ampscript/functions/createsalesforceobject/) — insert a record into the same connected org
- [`RetrieveSalesforceObjects`](/engagement/ampscript/functions/retrievesalesforceobjects/) — read records back
- [`LongSFID`](/engagement/ampscript/functions/longsfid/) — convert a 15-character ID for matching
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-salesforce/mc-ampscript-reference-salesforce-update-single-object.html) · [ampscript.guide](https://ampscript.guide/updatesinglesalesforceobject/)
