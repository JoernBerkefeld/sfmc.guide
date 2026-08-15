---
layout: page
title: "Where ampscript.guide Differs from Runtime"
description: "The 18 AMPscript functions where the community site ampscript.guide is actually wrong or materially incomplete about how Marketing Cloud Engagement behaves — each contradiction proven by a CloudPage test script on its sfmc.guide function page."
parent: AMPscript
parent_url: /engagement/ampscript/
permalink: /engagement/ampscript/differs-from-ampscript-guide/
platforms:
  - engagement
aggregate_verification: false
sitemap: false
---

The pages on this site describe AMPscript as it **actually runs** on a live Marketing Cloud Engagement CloudPage. Every function reference here was proven by deploying the function and reading back what it returned — not by reading a documentation page. [ampscript.guide](https://ampscript.guide/) is a separate, well-regarded community reference that many people rely on, but it was written from the docs rather than from runtime probes, so in a handful of places its own description would mislead a reader who trusted it.

This page lists **only those places** — the **18 functions where ampscript.guide is actually wrong or materially incomplete** about how the engine behaves: it omits a genuinely required argument, marks an argument required or optional contrary to runtime, states a return value or valid-value set the engine contradicts, understates a deprecation, or types an argument in a way that would send a reader down a broken path. Each entry is backed by a CloudPage test script on its sfmc.guide function page.

Every other function was left off on purpose. The remaining verified functions either agree with ampscript.guide outright, or the only gap is that **sfmc.guide documents extra runtime nuance** (a wider accepted type, an edge-case abort, a sharper definition) while ampscript.guide's own statement is still accurate as far as it goes — those are not ampscript.guide mistakes, so they do not belong on a page about ampscript.guide's faults.

{% include callout.html type="note" title="This is not the official-docs page" content="A separate page, [Differs from Official Docs](/engagement/differs-from-docs/), tracks where the engine contradicts Salesforce's own reference at developer.salesforce.com. That is a different comparison. Cases such as `BuildRowsetFromJSON` — where the engine disagrees with the official Syntax section but ampscript.guide's own note is correct — live there, not here. This page is strictly about where [ampscript.guide](https://ampscript.guide/) itself is wrong." %}

## How to read this page

Every function name links to its sfmc.guide reference page. Each of those pages carries a **Test scripts included** badge and embeds the exact runnable CloudPage AMPscript that produced the evidence — open the *Show test script* block at the bottom of the page's Behaviour chapter, paste it into a CloudPage, and re-run it yourself. That embedded script is the proof behind every claim on this page; there is no separate copy to maintain.

Every function below carries the same verdict — **Runtime confirms sfmc.guide** — because the runtime probe proved sfmc.guide's description and contradicted ampscript.guide's. The entries are grouped by how disruptive the mistake is: **major** changes what a working call looks like (a wrong argument count or a contradicted return), while **moderate** and **minor** keep the same call shape but get an optionality, type, valid-value, or deprecation detail wrong.

## Major differences

These change what a working call looks like — a wrong argument count, or a contradicted return value.

### [`ClaimRow`](/engagement/ampscript/functions/claimrow/)

- **ampscript.guide says:** when the data extension has no unclaimed rows left, the function returns an error.
- **Reality:** exhausting the pool returns an **empty row** and the page keeps rendering — nothing is thrown. A caller must guard with `Empty()` rather than expecting a raised error, so ampscript.guide's exhaustion path is wrong.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [ClaimRow](/engagement/ampscript/functions/claimrow/) test script.

### [`GetSocialPublishURLByName`](/engagement/ampscript/functions/getsocialpublishurlbyname/)

- **ampscript.guide says:** two required arguments (the network name and the content region), and its example accidentally calls `GetSocialPublishURL` instead.
- **Reality:** a working call needs **three** required arguments — the omitted one is the country code. An empty content region or an unknown network aborts the page. A reader who follows ampscript.guide's two-argument signature writes a call that fails.
- **Verdict — Runtime confirms sfmc.guide.** ampscript.guide drops a genuinely required parameter. Proof: [GetSocialPublishURLByName](/engagement/ampscript/functions/getsocialpublishurlbyname/) test script.

### [`IndexOf`](/engagement/ampscript/functions/indexof/)

- **ampscript.guide says:** two arguments only, and — by omission — a case-sensitive match.
- **Reality:** an undocumented **third argument** selects which occurrence to locate, and the match is **case-insensitive**. A reader relying on ampscript.guide would neither know the occurrence argument exists nor expect a case-insensitive hit.
- **Verdict — Runtime confirms sfmc.guide.** ampscript.guide is materially incomplete about both. Proof: [IndexOf](/engagement/ampscript/functions/indexof/) test script.

## Moderate differences

Same call shape in most of these, but a difference in optionality, an accepted type or valid-value set, a return nuance, or a deprecation.

### [`AuthenticatedEmployeeNotificationAddress`](/engagement/ampscript/functions/authenticatedemployeenotificationaddress/)

- **ampscript.guide says:** the function is scoped to microsites and not meant for CloudPages.
- **Reality:** a public CloudPage returns a real notification address anyway, so the scoping claim is contradicted — a reader would wrongly avoid using it on a CloudPage.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [AuthenticatedEmployeeNotificationAddress](/engagement/ampscript/functions/authenticatedemployeenotificationaddress/) test script.

### [`BuildOptionList`](/engagement/ampscript/functions/buildoptionlist/)

- **ampscript.guide says:** the additional value/text pair after the first is a required argument (even though its own note says pairs "can be appended").
- **Reality:** the minimum form renders with one value/text pair; further pairs are optional and variadic. Marking the extra pair required contradicts runtime.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [BuildOptionList](/engagement/ampscript/functions/buildoptionlist/) test script.

### [`ClaimRowValue`](/engagement/ampscript/functions/claimrowvalue/)

- **ampscript.guide says:** the fallback value and the two claimant arguments (positions 4–6) are optional.
- **Reality:** an arity-bisection probe shows a three-argument and a four-argument call each **abort the page** (HTTP 422 at compile time), while the six-argument call renders — so the first six arguments are all genuinely **required**. Only argument seven onward (extra name/value pairs) is optional. A reader who trusted ampscript.guide and omitted an argument gets a broken page.
- **Verdict — Runtime confirms sfmc.guide.** Marking positions 4–6 optional is wrong. Proof: [ClaimRowValue](/engagement/ampscript/functions/claimrowvalue/) test script.

### [`ContentArea`](/engagement/ampscript/functions/contentarea/)

- **ampscript.guide says:** the function is Classic-only, with no deprecation wording.
- **Reality:** it still runs, but Classic content is retired, so the correct framing is "deprecated — use `ContentBlockByID`". Presenting it as a plain Classic option, with no deprecation flag, would lead a reader to keep building new content on a retired system.
- **Verdict — Runtime confirms sfmc.guide.** ampscript.guide's omission of the deprecation misleads. Proof: [ContentArea](/engagement/ampscript/functions/contentarea/) test script.

### [`ContentAreaByName`](/engagement/ampscript/functions/contentareabyname/)

- **ampscript.guide says:** Classic-only, with no deprecation wording.
- **Reality:** still live by name, but Classic content is retired — deprecated, use `ContentBlockByName`. Same misleading omission as `ContentArea`.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [ContentAreaByName](/engagement/ampscript/functions/contentareabyname/) test script.

### [`ContentImageByKey`](/engagement/ampscript/functions/contentimagebykey/)

- **ampscript.guide says:** the second argument (fallback image key) is required.
- **Reality:** the single-argument form renders an `<img>` tag, so the fallback key is optional — matching the sibling `ContentImageByID`. The required flag is a mistake.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [ContentImageByKey](/engagement/ampscript/functions/contentimagebykey/) test script.

### [`Format`](/engagement/ampscript/functions/format/)

- **ampscript.guide says:** the third argument accepts both `Date` and `Number`.
- **Reality:** passing `Number` aborts the page (HTTP 422); only `Date` (or an empty value) works. Listing `Number` as a valid value points a reader at a call that fails.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [Format](/engagement/ampscript/functions/format/) test script.

### [`FormatDate`](/engagement/ampscript/functions/formatdate/)

- **ampscript.guide says:** the date-format argument is required, and its pattern-token table reads `mm` as minutes with a particular set of day-name tokens.
- **Reality:** the format argument is optional, and in a date pattern `mm` means month (minutes are only reachable through the separate time-format argument); the day-name tokens are shifted from the documented table. A reader following the token table produces the wrong output.
- **Verdict — Runtime confirms sfmc.guide.** The required flag and the token meanings are both wrong. Proof: [FormatDate](/engagement/ampscript/functions/formatdate/) test script.

### [`InvokeExecute`](/engagement/ampscript/functions/invokeexecute/)

- **ampscript.guide says:** the two output variables (status message and request ID) are required.
- **Reality:** a one-argument call `InvokeExecute(@er)` and a two-argument call `InvokeExecute(@er, @st)` both render at HTTP 200 alongside the full three-argument form, so the two out-variables are **optional and independent**. A reader who thought they were mandatory would declare and pass variables they never needed.
- **Verdict — Runtime confirms sfmc.guide.** The out-variables are optional, not required. Proof: [InvokeExecute](/engagement/ampscript/functions/invokeexecute/) test script.

### [`Output`](/engagement/ampscript/functions/output/)

- **ampscript.guide says:** a single required `String` argument.
- **Reality:** a bare string literal or variable renders **nothing** (HTTP 200, no error); the slot is really a function call, and zero-argument and variadic forms are accepted. A reader passing a plain string expects it to print — and silently gets empty output.
- **Verdict — Runtime confirms sfmc.guide.** The "single required String" framing is wrong. Proof: [Output](/engagement/ampscript/functions/output/) test script.

### [`Random`](/engagement/ampscript/functions/random/)

- **ampscript.guide says:** the bounds are ordinary numbers that may carry a decimal part.
- **Reality:** any decimal bound aborts the page (HTTP 422) — the bounds must be whole numbers (reproduced on two business units). Presenting decimals as allowed points a reader at a call that fails.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [Random](/engagement/ampscript/functions/random/) test script.

### [`Replace`](/engagement/ampscript/functions/replace/)

- **ampscript.guide says:** the third (replacement) argument is required.
- **Reality:** a two-argument call works and deletes the match, so the replacement is optional. The required flag is wrong.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [Replace](/engagement/ampscript/functions/replace/) test script.

### [`WrapLongURL`](/engagement/ampscript/functions/wraplongurl/)

- **ampscript.guide says:** the URL is shortened when the function runs.
- **Reality:** on a CloudPage the URL passes through unchanged — shortening only happens during an actual email send. Stating the shortening as unconditional would leave a reader expecting a short link that never appears in a CloudPage context.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [WrapLongURL](/engagement/ampscript/functions/wraplongurl/) test script.

## Minor differences

These keep the same call shape, but ampscript.guide states a valid-value scope the engine contradicts.

### [`IsPhoneNumber`](/engagement/ampscript/functions/isphonenumber/)

- **ampscript.guide says:** the check accepts **US** phone numbers.
- **Reality:** the whole North American Numbering Plan passes — Canadian and Caribbean numbers validate as `true`, not just US ones. A reader trusting the "US-only" scope would wrongly expect a valid Canadian number to fail the check.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [IsPhoneNumber](/engagement/ampscript/functions/isphonenumber/) test script.

### [`OutputLine`](/engagement/ampscript/functions/outputline/)

- **ampscript.guide says:** a single required `String` argument (the `Output` sibling, plus a line break).
- **Reality:** exactly like `Output`, a bare string renders **nothing**; the slot is a function call, and zero-argument and variadic forms are accepted. A reader passing a plain string expects a printed line and gets an empty one.
- **Verdict — Runtime confirms sfmc.guide.** Proof: [OutputLine](/engagement/ampscript/functions/outputline/) test script.

## Everything else is either correct or just less detailed

Of the 129 AMPscript functions compared, only the **18 above are cases where ampscript.guide itself is wrong or materially incomplete** about runtime. The rest fall into two groups that are deliberately not listed here:

- **Agrees with reality** — the great majority of functions, where sfmc.guide and ampscript.guide describe the same behaviour.
- **sfmc.guide adds detail, ampscript.guide is still correct** — functions where sfmc.guide documents a wider accepted type, an extra edge-case abort, a sharper unit definition, or a nuance ampscript.guide simply does not cover (for example `Char`, `Concat`, `Length`, `MicrositeURL`, `URLEncode`, `Base64Encode`). ampscript.guide's statement is accurate as far as it goes, so these are not ampscript.guide mistakes. Cases where the contradiction is against Salesforce's **official** docs rather than ampscript.guide (such as `BuildRowsetFromJSON`, `BuildRowSetFromXML`, and the `HTTPPost` family) belong on the [Differs from Official Docs](/engagement/differs-from-docs/) page instead.

## Related

- [AMPscript Function Reference](/engagement/ampscript/functions/) — the runtime-proven per-function pages, each with its embedded test script
- [Differs from Official Docs](/engagement/differs-from-docs/) — where the engine contradicts Salesforce's own reference (a different comparison)
- [ampscript.guide](https://ampscript.guide/) — the community reference this page compares against
