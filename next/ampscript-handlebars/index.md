---
layout: page
title: "AMPscript and Handlebars on Marketing Cloud Next"
description: "Which AMPscript functions are supported in Marketing Cloud Next, how they map to Handlebars helpers, and which helpers have no AMPscript counterpart."
parent: Next
parent_url: /next/
permalink: /next/ampscript-handlebars/
platforms:
  - next
---

<!-- AUTO-GENERATED tables below — regenerate with: node scripts/generate-mcn-ampscript-table.mjs -->

Marketing Cloud Next supports a **subset** of Engagement AMPscript and a parallel **Handlebars** helper surface. This page is an architect-oriented overview generated from the same catalogs that power the SFMC Language Service and ESLint rules.

{% include callout.html type="note" title="Source of truth" content="AMPscript support and `handlebarsEquivalent` come from `ampscript-data`. Handlebars helpers come from `handlebars-data`. Regenerate this page when those packages change." %}

## AMPscript supported in Marketing Cloud Next

Functions where `isMcnSupported` is true. **API version** is the Marketing Cloud Next API version from `mcnSince` / `getMcnApiVersion`.

| AMPscript | API version | Handlebars equivalent | Notes |
|---|---:|---|---|
| `Add` | 67 | `add` | — |
| `BuildRowsetFromJSON` | 67 | — | — |
| `Concat` | 67 | `concat` | — |
| `ContentBlockByID` | 67 | — | true |
| `ContentBlockByKey` | 67 | — | true |
| `ContentBlockByName` | 67 | — | true |
| `DateAdd` | 67 | `dateAdd` | — |
| `DateDiff` | 67 | `dateDiff` | — |
| `DateParse` | 67 | — | — |
| `Divide` | 67 | `divide` | — |
| `Empty` | 67 | `isEmpty` | — |
| `Field` | 67 | — | — |
| `Format` | 67 | `format` | — |
| `FormatCurrency` | 67 | `formatCurrency` | — |
| `FormatDate` | 67 | — | In MCN, uses Java SimpleDateFormat format strings instead of .NET. Omitting dateFormat returns the G standard format (e.g. "5/15/2026 1:23:45 PM"). |
| `FormatNumber` | 67 | `formatNumber` | — |
| `IIf` | 67 | `iif` | — |
| `IndexOf` | 67 | `indexOf` | — |
| `IsNull` | 67 | — | — |
| `Length` | 67 | `length` | — |
| `Lookup` | 67 | — | In MCN, search arguments must be provided in column/value pairs - an odd count causes an error. All filter keys must fully specify the composite primary key. |
| `Lowercase` | 67 | `lowercase` | — |
| `Mod` | 67 | `modulo` | — |
| `Multiply` | 67 | `multiply` | — |
| `Now` | 67 | `now` | — |
| `Output` | 67 | — | — |
| `OutputLine` | 67 | — | — |
| `ProperCase` | 67 | `properCase` | — |
| `RaiseError` | 67 | `raiseError` | — |
| `Random` | 67 | `random` | — |
| `Replace` | 67 | `replace` | — |
| `ReplaceList` | 67 | — | — |
| `RetrieveSalesforceObjects` | 67 | — | — |
| `Row` | 67 | — | — |
| `RowCount` | 67 | — | — |
| `StringToDate` | 67 | — | In MCN, returns a locale-formatted string (G standard format, e.g. "5/15/2026 1:23:45 PM") instead of a dateTime object. Cannot be reliably passed to FormatDate() or other date functions in MCN - use FormatDate() directly instead. |
| `Substring` | 67 | `substring` | — |
| `Subtract` | 67 | `subtract` | — |
| `Trim` | 67 | `trim` | — |
| `Uppercase` | 67 | `uppercase` | — |
| `v` | 67 | — | — |

## Handlebars helpers without an AMPscript counterpart

Helpers that are not referenced by any AMPscript `handlebarsEquivalent`.

| Helper | API version | Category | Description |
|---|---:|---|---|
| `and` | 65 | Comparison | Returns true only when all operands are truthy. |
| `char` | 65 | String | Returns the Unicode character for a character code, optionally repeated. |
| `compare` | 65 | Comparison | Compares two values using a specified operator. |
| `each` | 65 | Objects | Iterates over arrays, lists, and objects, rendering a block for each element. |
| `equals` | 65 | Comparison | Compares two values for equality, optionally by a comparison type. |
| `fallback` | 65 | Utility | Returns a fallback value when the first argument is null, empty, or throws an exception. |
| `filter` | 65 | Objects | Returns a list of items that match a field/operator/value condition. |
| `flatten` | 65 | Objects | Flattens a nested list of lists into a single list. |
| `get` | 65 | Objects | Retrieves a value from a list or map by index or key. |
| `getContentBlock` | 67 | Content | Retrieves and renders a content block within a template. |
| `hash` | 67 | Utility | Constructs an object from key-value pairs. Used only as a subexpression within other helpers. |
| `if` | 65 | Comparison | Conditionally renders a block based on whether a value evaluates to true. |
| `jsonPath` | 67 | Objects | Queries and filters JSON objects using a JSONPath expression. |
| `lookup` | 67 | Objects | Dynamically accesses an object property or array element by a variable key. |
| `map` | 65 | Objects | Extracts a specific field from each object in a list. |
| `not` | 65 | Comparison | Returns true when the operand evaluates to false. |
| `or` | 65 | Comparison | Returns true when at least one operand is truthy. |
| `personalizationResult` | 65 | Personalization | Retrieves a personalized value by key from the subscriber context. |
| `query` | 67 | Utility | Retrieves multiple records from Sales Cloud or marketing object data sources. |
| `queryFirst` | 67 | Utility | Retrieves the first record from Sales Cloud, marketing objects, or data graphs matching criteria. |
| `repeat` | 65 | Utility | Repeats a block a specified number of times, exposing index, first, and last loop variables. |
| `set` | 65 | Utility | Performs local variable assignment within the block scope. Variables do not persist outside the block. |
| `slice` | 65 | Objects | Returns a portion of a list between two indices (end index exclusive). |
| `sort` | 65 | Utility | Sorts a list of objects by a field, order, and type. |
| `timeZoneConversion` | 67 | Date & Time | Converts a date from one time zone to another. |
| `unless` | 65 | Comparison | Conditionally renders a block based on whether a value evaluates to false. |
| `with` | 65 | Utility | Changes the block context to a specified object so properties can be accessed directly. |

_Last regenerated 2026-08-02. 41 AMPscript rows · 27 Handlebars-only helpers._

## See also

- [Next overview](/next/)
- [ampscript.guide](https://ampscript.guide)
- [SFMC Language Service](/tools/vscode-sfmc-language/)
