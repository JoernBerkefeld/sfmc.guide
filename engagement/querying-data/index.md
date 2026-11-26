---
layout: page
title: "Querying Data Extensions with AMPscript"
description: "Read rows from a Data Extension with AMPscript: Lookup, LookupRows, LookupOrderedRows and their case-sensitive variants, with a SQL-to-AMPscript cheat sheet."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/querying-data/
platforms:
  - engagement
test_scripts: complete
---

AMPscript has five functions that read rows from a Data Extension. All of them filter the same way: a list of column/value pairs that must all match exactly. This page shows which one to pick, how a SQL query from Automation Studio maps to them, and what the rows look like once you have them.

Looking for the SSJS side? The same task in Server-Side JavaScript, including filters that AMPscript cannot express, is covered in [Querying Data Extensions on ssjs.guide](https://ssjs.guide/recipes/querying-data/).

Every example below reads the same `Customers` Data Extension (Name and external key are both `Customers`). It is the table from the ssjs.guide recipe plus one row, C008, whose tier is written in lower case:

| SubscriberKey | Email | FirstName | Country | Tier | Points | SignupDate | IsActive |
|---|---|---|---|---|---|---|---|
| C001 | anna@example.com | Anna | DE | Gold | 1200 | 2023-02-01 | true |
| C002 | ben@example.com | Ben | US | Silver | 300 | 2024-05-10 | true |
| C003 | carla@example.org | Carla | ES | Gold | 950 | 2024-07-20 | false |
| C004 | dirk@example.com | Dirk | DE | Bronze | 40 | 2025-01-05 | true |
| C005 | eva@example.com | Eva | DE | Gold | 2100 | 2025-03-15 | true |
| C006 | finn@example.net | Finn | US | Bronze | 0 | 2025-09-30 | false |
| C007 | gus@example.de | Gus | FR | *(empty)* | 10 | 2026-01-10 | false |
| C008 | hana@example.com | Hana | DE | gold | 500 | 2026-03-01 | true |

`LastName` is a ninth column (Becker, Clark, Diaz, …). Each "Show test script" block below runs the example above it unchanged on a CloudPage and checks the result. The two scripts here create the Data Extension before those runs and delete it afterwards:

{% include test-script.html bundle="engagement--querying-data" chapter="fixture-create" label="Show fixture script: create the Customers Data Extension" lang="html" %}

{% include test-script.html bundle="engagement--querying-data" chapter="fixture-delete" label="Show fixture script: delete it again" lang="html" %}

{% include callout.html type="note" title="The Data Extension must exist before the page runs" content="A `Lookup` call that names a Data Extension which does not exist fails the whole CloudPage (HTTP 422), even when the call sits in an `IF` branch that never runs, and even when SSJS earlier on the same page would have created it. That is why the fixture above is a separate script." %}

## Which function should I use? {#which-function}

| Function | Returns | Matching | Sort / limit | No match |
|---|---|---|---|---|
| [`Lookup`](/engagement/ampscript/functions/lookup/) | one value from the first matching row | equals, all pairs must match, ignores case | — | empty (`Empty()` is true) |
| [`LookupRows`](/engagement/ampscript/functions/lookuprows/) | a rowset | equals, all pairs, ignores case | — | rowset with `RowCount` 0 |
| [`LookupRowsCS`](/engagement/ampscript/functions/lookuprowscs/) | a rowset | equals, all pairs, **case-sensitive** | — | `RowCount` 0 |
| [`LookupOrderedRows`](/engagement/ampscript/functions/lookuporderedrows/) | a rowset | equals, all pairs, ignores case | row count (`0` = all) + `"Column ASC"` / `"Column DESC"` | `RowCount` 0 |
| [`LookupOrderedRowsCS`](/engagement/ampscript/functions/lookuporderedrowscs/) | a rowset | equals, all pairs, **case-sensitive** | as above | `RowCount` 0 |

Rules of thumb:

- **One value, and any matching row will do** → `Lookup`. It is the shortest form.
- **Several rows** → `LookupRows`. Add `Ordered` when you need a sort order or only the first few rows, and `CS` when `Gold` and `gold` must not count as the same value.
- **Which row `Lookup` returns** when several rows match is not something to rely on. Use `LookupOrderedRows` with a row count of `1` when it matters.
- **Anything other than "equals", an OR, or no condition at all** cannot be written with these functions. Use SSJS (see the next chapter).

A rowset is read with three helper functions: [`RowCount`](/engagement/ampscript/functions/rowcount/) gives the number of rows, [`Row`](/engagement/ampscript/functions/row/) picks one row by its position (starting at 1; `Row(@rows, 0)` fails the page), and [`Field`](/engagement/ampscript/functions/field/) reads one column from that row.

```ampscript
%%[
/* XX matches no row */
SET @name = Lookup("Customers", "FirstName", "Country", "XX")
SET @rows = LookupRows("Customers", "Country", "XX")
SET @exactRows = LookupRowsCS("Customers", "Country", "XX")
SET @ordered = LookupOrderedRows("Customers", 0, "Points DESC", "Country", "XX")
SET @exactOrdered = LookupOrderedRowsCS("Customers", 0, "Points DESC", "Country", "XX")
/* @name is empty, every RowCount() is 0 */

/* An empty column looks exactly like a miss */
SET @tier = Lookup("Customers", "Tier", "SubscriberKey", "C007")
IF RowCount(LookupRows("Customers", "SubscriberKey", "C007")) > 0 THEN
  SET @exists = "yes"
ENDIF
]%%
```

`Empty(@tier)` and `Empty(@name)` are both true, so `Lookup` alone cannot tell "no such row" from "the row exists, but this column is empty". Check `RowCount` of a `LookupRows` call when the difference matters.

{% include test-script.html bundle="engagement--querying-data" chapter="which-function" lang="html" %}

## From SQL to AMPscript {#sql-to-ampscript}

The [SQL Converter](/tools/sql-converter/) turns a query into AMPscript for you. The table shows what it produces for each part of a query, and which parts have no AMPscript equivalent.

| SQL | AMPscript |
|---|---|
| `SELECT FirstName … WHERE Email = 'eva@example.com'` | `Lookup("Customers", "FirstName", "Email", "eva@example.com")` (one column, first matching row) |
| `WHERE Country = 'DE' AND Tier = 'Gold'` | `LookupRows("Customers", "Country", "DE", "Tier", "Gold")`, one name/value pair per condition |
| `Points = 300` / `IsActive = 1` | `"Points", "300"` / `"IsActive", "1"` (numbers become text; for a Boolean column `"1"` and `"true"` both match) |
| `ORDER BY Points DESC` | `LookupOrderedRows("Customers", 0, "Points DESC", …)` (`0` = no limit) |
| `ORDER BY Points DESC, FirstName` | `"Points DESC, FirstName ASC"` |
| `TOP 3 … ORDER BY …` | `LookupOrderedRows("Customers", 3, …)` |
| `TOP 3` without `ORDER BY` | no limit without a sort order: `LookupOrderedRows` needs one, so the converter falls back to `LookupRows` and you stop after three rows yourself |
| `SELECT FirstName, Points` | one `Field(@row, "…")` per column inside a `FOR` loop over the rowset |
| `=` that respects case | `LookupRowsCS` / `LookupOrderedRowsCS` in AMPscript |
| `OR`, `<>` / `!=`, `<`, `>`, `LIKE`, `IN`, `BETWEEN`, `IS NULL` | no AMPscript equivalent: use an SSJS filter object ([SQL WHERE to an SSJS filter](https://ssjs.guide/recipes/querying-data/#from-sql-where-to-an-ssjs-filter)) |
| no `WHERE` at all | no AMPscript equivalent: every lookup needs at least one condition |

This is the converter's unchanged `LookupOrderedRows` output for `SELECT TOP 2 FirstName, Points FROM Customers WHERE Country = 'DE' AND IsActive = 1 ORDER BY Points DESC`:

```ampscript
%%[
/* SQL: SELECT FirstName, Points */
SET @rows = LookupOrderedRows("Customers", 2, "Points DESC", "Country", "DE", "IsActive", "1")
SET @rowCount = RowCount(@rows)
FOR @i = 1 TO @rowCount DO
    SET @row = Row(@rows, @i)
    SET @FirstName = Field(@row, "FirstName")
    SET @Points = Field(@row, "Points")
NEXT @i
]%%
```

It returns Eva (2100) and then Anna (1200). Inside the loop, use `@FirstName` and `@Points` before the next pass overwrites them.

{% include test-script.html bundle="engagement--querying-data" chapter="sql-to-ampscript" lang="html" %}

## One value: Lookup {#lookup}

`Lookup` returns one column of the first row that matches. Add more name/value pairs to narrow the match; all of them must match. Text is compared without regard to case, so `EVA@EXAMPLE.COM` finds Eva as well.

```ampscript
%%[
SET @firstName = Lookup("Customers", "FirstName", "Email", "eva@example.com")
SET @points = Lookup("Customers", "Points", "Country", "US", "Tier", "Silver")
SET @missing = Lookup("Customers", "FirstName", "Email", "nobody@example.com")

IF Empty(@missing) THEN
  SET @greeting = "Hello"
ELSE
  SET @greeting = Concat("Hello ", @missing)
ENDIF
]%%
```

`@firstName` is `Eva`, `@points` is `300`, and `@missing` is empty, so `@greeting` is `Hello`.

{% include test-script.html bundle="engagement--querying-data" chapter="lookup" lang="html" %}

## All matching rows: LookupRows {#lookuprows}

`LookupRows` returns every row that matches all pairs, as a rowset. Loop over it with `RowCount`, `Row` and `Field`.

```ampscript
%%[
SET @rows = LookupRows("Customers", "Country", "DE", "Tier", "Gold")
SET @count = RowCount(@rows)
SET @names = ""

FOR @i = 1 TO @count DO
  SET @row = Row(@rows, @i)
  SET @names = Concat(@names, Field(@row, "FirstName"), " ")
NEXT @i
]%%
```

`@count` is 3: Anna, Eva and Hana. Hana's tier is `gold` in lower case, and `LookupRows` ignores case. When nothing matches, `RowCount` is 0 and the loop does not run.

{% include test-script.html bundle="engagement--querying-data" chapter="lookuprows" lang="html" %}

## Case matters: LookupRowsCS {#lookuprowscs}

`LookupRowsCS` works like `LookupRows`, but a value only matches when its case is identical. That applies to every pair: `"Country", "de"` finds nothing, because the column holds `DE`.

```ampscript
%%[
SET @exact = LookupRowsCS("Customers", "Country", "DE", "Tier", "Gold")
SET @any = LookupRows("Customers", "Country", "DE", "Tier", "Gold")
/* RowCount(@exact) is 2, RowCount(@any) is 3: Hana's tier is gold in lower case */
]%%
```

{% include test-script.html bundle="engagement--querying-data" chapter="lookuprowscs" lang="html" %}

## Sorted and limited: LookupOrderedRows {#lookuporderedrows}

`LookupOrderedRows` adds two arguments in front of the pairs: how many rows to return (`0` returns every match) and the sort order. Separate several sort columns with commas; a column without `ASC` or `DESC` sorts ascending.

```ampscript
%%[
/* The three German customers with the most points */
SET @top3 = LookupOrderedRows("Customers", 3, "Points DESC", "Country", "DE")

/* All active customers by tier, then by points; 0 returns every match */
SET @active = LookupOrderedRows("Customers", 0, "Tier ASC, Points DESC", "IsActive", "true")

SET @best = Field(Row(@top3, 1), "FirstName")
]%%
```

`@top3` holds Eva, Anna and Hana, so `@best` is `Eva`. `@active` is Dirk (Bronze), then Eva, Anna and Hana (Gold and gold sort together), then Ben (Silver).

{% include test-script.html bundle="engagement--querying-data" chapter="lookuporderedrows" lang="html" %}

## Sorted and case-sensitive: LookupOrderedRowsCS {#lookuporderedrowscs}

`LookupOrderedRowsCS` combines the row count and sort order of `LookupOrderedRows` with the exact-case matching of `LookupRowsCS`.

```ampscript
%%[
/* Gold customers by points, without the lower-case gold row */
SET @gold = LookupOrderedRowsCS("Customers", 0, "Points DESC", "Tier", "Gold")

/* The one customer whose tier is gold in lower case */
SET @lower = LookupOrderedRowsCS("Customers", 1, "Points DESC", "Tier", "gold")
SET @name = Field(Row(@lower, 1), "FirstName")
]%%
```

`@gold` holds Eva, Anna and Carla; `@name` is `Hana`. Searching for `GOLD` finds nothing with `LookupOrderedRowsCS` and all four gold rows with `LookupOrderedRows`.

{% include test-script.html bundle="engagement--querying-data" chapter="lookuporderedrowscs" lang="html" %}

## See also {#see-also}

- [Lookup](/engagement/ampscript/functions/lookup/), [LookupRows](/engagement/ampscript/functions/lookuprows/), [LookupRowsCS](/engagement/ampscript/functions/lookuprowscs/), [LookupOrderedRows](/engagement/ampscript/functions/lookuporderedrows/), [LookupOrderedRowsCS](/engagement/ampscript/functions/lookuporderedrowscs/)
- [Row](/engagement/ampscript/functions/row/), [Field](/engagement/ampscript/functions/field/), [RowCount](/engagement/ampscript/functions/rowcount/)
- [SQL Converter](/tools/sql-converter/): SQL to AMPscript and SSJS lookup code, and back
- [Querying Data Extensions on ssjs.guide](https://ssjs.guide/recipes/querying-data/): the same task in SSJS, including OR, ranges, LIKE and NULL checks
