---
layout: page
title: "AMPscript FormatDate (Next)"
description: "Format a date with AMPscript FormatDate in Marketing Cloud Next. Syntax, examples, and behaviour proven in a Marketing Cloud Next email, including how its pattern letters differ from Engagement."
parent: AMPscript Function Reference (Next)
parent_url: /next/ampscript/functions/
permalink: /next/ampscript/functions/formatdate/
platforms:
  - next
syntax: "FormatDate(dateString[, dateFormat, timeFormat, localeCode])"
return_type: string
min_args: 1
max_args: 4
verification: verified
differs_from_docs: true
signature_differs: true
engagement: differs
mcn_tested: 2026-11-23
engagement_note: "Engagement reads `mm` in the date pattern as the month (`yyyy-MM-dd HH:mm:ss` gives `2026-03-04 13:03:07`); Next reads it as minutes and gives `2026-03-04 13:52:07`. Pattern letters ignore case in Engagement but not in Next (`DD` gives the day of the year, `63`), and a time-only pattern gets a leading space in Next (`FormatDate(\"2026-03-04 13:52:07\",\"\",\"HH:mm:ss\")` gives ` 13:52:07`). An unreadable date returns an empty string in Engagement and is printed back unchanged in Next."
test_scripts: complete
---

{% include verification-status.html %}

{% include function-signature.html %}

## Parameters

| Name | Type | Required | Description |
|---|---|---|---|
| `dateString` | string \| date | Yes | The date to format, either a real date value or a parseable date string |
| `dateFormat` | string | No | The date pattern. Letters are case-sensitive: `MM` is the month, `mm` the minutes. Some single letters, such as `d`, `G` or `r`, select a standard format |
| `timeFormat` | string | No | A second pattern, whose output is appended after a space |
| `localeCode` | string | No | The locale for month names, such as `fr-FR` |

## Example

```ampscript
%%=FormatDate("2026-01-15", "MM/dd/yyyy")=%%
```

Renders `01/15/2026`.

A full timestamp fits in one pattern:

```ampscript
%%=FormatDate("2026-03-04 13:52:07", "yyyy-MM-dd HH:mm:ss")=%%
```

Renders `2026-03-04 13:52:07`.

## Return value

**`string`** — the formatted date. Called with only a date, it renders `3/4/2026 1:52:07 PM` for `2026-03-04 13:52:07`.

There is no empty-string failure value: input that cannot be read as a date is printed back (see below).

## Behaviour

All rows below format `2026-03-04 13:52:07`, a Wednesday, written as `@d` in the calls.

**Letters are case-sensitive.** `MM` is the month and `mm` the minutes, in the date pattern as well as in the time pattern:

| Pattern | Renders |
|---|---|
| `yyyy-MM-dd HH:mm:ss` | `2026-03-04 13:52:07` |
| `yyyy-mm-dd hh:mm:ss` | `2026-52-04 01:52:07` |
| `mm`, `mmm`, `mmmm` | `52` |
| `MMMM` | `March` |
| `MMM` | `Mar` |
| `dd` | `04` |
| `DD` | `63` (day of the year) |
| `DDDD` | `0063` |
| `yy`, `YY` | `26` |
| `yyyy`, `YYYY` | `2026` |
| `HH`, `hh`, `ss`, `tt` | `13`, `01`, `07`, `PM` |
| `gg` | `AD` |
| `zz`, `zzz` | `GMT`, `Z` |

**Day names.** `ddd` gives `Wed` (and `Fri` for December 25); `dddd` and `ddddd` both give `Wednesday`.

**Single letters select standard formats.**

| Pattern | Renders |
|---|---|
| `d` | `3/4/2026` |
| `D` | `Wednesday, March 4, 2026` |
| `M` | `March 4` |
| `Y` | `March 2026` |
| `f` | `Wednesday, March 4, 2026 1:52 PM` |
| `F` | `Wednesday, March 4, 2026 1:52:07 PM` |
| `g` | `3/4/2026 1:52 PM` |
| `G` | `3/4/2026 1:52:07 PM` |
| `o` | `2026-03-04T13:52:07.0000000+0000` |
| `r` | `Wed, 04 Mar 2026 13:52:07 GMT` |
| `s` | `2026-03-04T13:52:07` |
| `t` | `1:52 PM` |
| `T` | `1:52:07 PM` |
| `u` | `2026-03-04 13:52:07Z` |
| `U` | `Wednesday, March 4, 2026 1:52:07 PM` |

**Unknown patterns fall back to a default.** `qqqq`, `l`, `iso` and `rfc` each rendered `2026-03-04 13:52:07`. `L` rendered `3` and `S` rendered `0`.

**The time pattern is appended after a space.** `FormatDate(@d, "yyyy-MM-dd", "HH:mm:ss")` gives `2026-03-04 13:52:07`. With an empty date pattern the space stays at the front: `FormatDate(@d, "", "HH:mm:ss")` gives ` 13:52:07`, and `""` with `mm`, `MM`, `ss`, `tt`, `yyyy` or `fff` gives ` 52`, ` 03`, ` 07`, ` PM`, ` 2026` and ` 000`. A lone `h` gives ` 1` and a lone `s` gives ` 7`, while a lone `t` gave `2026-03-04 13:52:07`.

**The locale changes month names, not the pattern meaning.** `FormatDate(@d, "MMMM", "", "fr-FR")` gives `mars ` with a trailing space from the empty time pattern. With `D` the result stays the day of the year (`63 `) for `fr-FR`, `fr_FR`, `ja-JP` and a made-up `zz-ZZ`. No locale is rejected.

**Input formats.** ISO dates, US slash dates (`3/4/2026`, `03/04/2026 13:52:07`) and date values such as a `DateAdd` result format as expected. A timestamp with an offset is converted: `2026-03-04T13:52:07.123-0700` with `HH:mm:ss` gives `20:52:07`.

**Unreadable input is printed back.** `not a date at all` and the number `20260304` are returned unchanged, and so is `4 March 2026 1:52:07 PM`, which did not parse. An empty string returns an empty string. Check the input before formatting it.

**One to four arguments.** An email with `FormatDate()` or with five arguments cannot be saved: the content API answers HTTP 400 with "The AMPscript syntax isn't valid".

{% include test-script.html bundle="next-ampscript-functions--formatdate" chapter="behaviour" lang="ampscript" label="Show Next test script" %}
{% include test-script.html bundle="next-ampscript-functions--formatdate" chapter="failing" lang="ampscript" label="Show calls that fail in Next (one email each)" %}

## Differs from official docs

- **The reference's own input string is not parsed.** All usage examples, the Next one included, format `5 August 2024 1:41:23 PM`. In Next, `4 March 2026 1:52:07 PM` was returned unchanged, as was any other text that is not a date, without an error. [Card](/next/differs-from-docs/#formatdate-long-form-input-not-parsed)
- **Locale formats do not work.** The reference shows `D` as a long date per locale and `S` / `L` with a locale code as that locale's short and long date. In Next, `D` with `fr-FR` gave `63 ` (day of the year) and `S` with `uk_UA` gave `0 `. [Card](/next/differs-from-docs/#formatdate-locale-formats-ignored)
- **`o` carries an offset.** The reference's example for `o` ends in seven fractional digits. In Next it ended in `.0000000+0000`. [Card](/next/differs-from-docs/#formatdate-o-adds-offset)

{% include platform-compare.html %}

## See also

- [`FormatDate` in Marketing Cloud Engagement](/engagement/ampscript/functions/formatdate/) — how it behaves there
- [Now](/next/ampscript/functions/now/) — a common value to format
- [DateAdd](/next/ampscript/functions/dateadd/)
- [DateParse](/next/ampscript/functions/dateparse/)
- [DatePart](/next/ampscript/functions/datepart/)
- [Official reference](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/references/mc-ampscript-date-time/mc-ampscript-reference-date-time-format-date.html)
