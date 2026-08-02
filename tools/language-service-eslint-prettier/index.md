---
layout: page
title: "Why the SFMC Language Service Is Great on Its Own, and Even Better With ESLint and Prettier"
description: "How the SFMC Language Service, eslint-plugin-sfmc, and prettier-plugin-sfmc share one source of truth — and why ESLint matters once CI and Git hooks enter the picture."
parent: Tools
parent_url: /tools/
permalink: /tools/language-service-eslint-prettier/
platforms:
  - engagement
  - next
---

{% include callout.html type="note" title="Originally published" content="Published **18 June 2026** on [LinkedIn](https://www.linkedin.com/pulse/why-sfmc-language-service-great-its-own-even-better-eslint-berkefeld-z3fbf/). Republished here for sfmc.guide." %}

If you write AMPscript or Server-Side JavaScript (SSJS) for Salesforce Marketing Cloud Engagement, you have probably lived through the classic workflow: paste code into Content Builder, hope it runs, discover a typo in a send preview, fix it, repeat.

That loop is fine for quick experiments. It is painful for anything you ship to production, review with teammates, or store in Git.

The **SFMC Language Service** VS Code extension changed that for me. It brings real editor intelligence to AMPscript, SSJS, GTL, and SFMC HTML: syntax highlighting, completions, hover docs, diagnostics, snippets, and even Marketing Cloud Next compatibility hints.

But here is the part many people miss: the extension is only one layer of a small toolchain. Pair it with **eslint-plugin-sfmc** and **prettier-plugin-sfmc**, and you get something that feels like a modern JavaScript project, not a copy-paste island inside Marketing Cloud.

This article explains what each tool does on its own, what they share, where they differ, and why ESLint becomes the real hero once CI/CD or Git hooks enter the picture.

---

## The shared foundation: one source of truth

All three tools draw from the same language catalogs, not three separate copies of “what AMPscript and SSJS look like.”

For **AMPscript**, a single canonical definition set covers every function, keyword, and personalization string. The VS Code extension, the ESLint plugin, and the Prettier plugin all read from that same catalog, so a signature change or a newly deprecated function shows up consistently everywhere.

For **SSJS**, the same principle applies, and it goes one step further for the wider community. The SSJS definition catalog is also the **single source of truth for [ssjs.guide](https://ssjs.guide)**, the reference guide for Server-Side JavaScript in Marketing Cloud. When you look up a Platform function, a Core Library method, or a WSProxy operation on ssjs.guide, you are reading documentation generated from the same definitions that power hover text in the editor, lint rules in CI, and argument checks in ESLint.

That alignment matters beyond convenience:

- Hover in VS Code and a page on [ssjs.guide](https://ssjs.guide) describe the same API.
- ESLint rules and extension diagnostics flag the same unknown functions and the same missing Platform.Load patterns.
- Prettier formats AMPscript with a parser built for the same grammar the other tools understand.

When Salesforce deprecates an API, when Marketing Cloud Next narrows what SSJS can do, or when a function signature is corrected, the ecosystem is meant to move together instead of drifting apart. You learn it once on ssjs.guide (or in the editor), and your pipeline enforces the same truth.

---

## SFMC Language Service: the live editing experience

Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language) and open a `.amp`, `.ssjs`, or an HTML email template. If the HTML contains AMPscript blocks or SSJS script tags, the extension auto-switches it to the combined **SFMC (AMPscript / SSJS)** language mode.

**What it gives you while you type:**

**Syntax highlighting** for AMPscript blocks (`%%[ ]%%`, `%%= =%%`), inline expressions, GTL `{% raw %}{{ }}{% endraw %}`, SSJS script tags, and personalization strings.

**Auto-completion** with snippet-style placeholders: roughly 150 AMPscript functions, 298+ SSJS completions (Platform, Core Library, WSProxy, bare globals), plus ES3/ES5 builtins where appropriate.

**Hover / IntelliSense** with typed signatures, parameter docs, return types, deprecation notices, and links to [ssjs.guide](https://ssjs.guide), [ampscript.guide](https://ampscript.guide), and official Salesforce documentation.

**Signature help** while you type function arguments.

**Diagnostics in real time**: unmatched delimiters, bad IF/ENDIF nesting, unknown functions, missing Platform.Load before Core Library usage, ES6+ syntax in SSJS (which SFMC does not support), TypeScript-powered type checks, and optional Marketing Cloud Next warnings.

**Go-to definition** for SSJS globals and Platform APIs.

**Variable resolution** in SSJS and AMPscript: hover a local variable and see its type.

**Snippets** for common AMPscript, SSJS, and GTL patterns: lookups, HTTP calls, row-set loops, CloudPage boilerplate, and more.

**HTML auto-detection** so mixed email templates get full IntelliSense in both AMPscript regions and `<script runat="server">` blocks without manual language switching.

**MCP integration**: the extension registers the **mcp-server-sfmc** MCP server so Copilot agent mode and other MCP-aware assistants can validate and review SFMC code with the same catalogs.

**What the extension is optimized for:** feedback while your hands are on the keyboard. It is an IDE experience. Its settings are **per user** (or per workspace in VS Code). There is no shared “team policy” layer inside the extension itself: each developer chooses their own editor preferences unless you standardize through checked-in workspace settings.

---

## prettier-plugin-sfmc: consistent formatting without arguments

Prettier solves a different problem: *"Make this file look the same every time, for everyone."*

Neither the SFMC Language Service nor ESLint auto-formats your code. If you want consistent layout (keyword casing, quotes, indentation, line breaks in AMPscript blocks), Prettier is the tool for that.

Install **prettier-plugin-sfmc** as a dev dependency. Prettier auto-discovers the plugin for `.amp`, `.ampscript`, `.ssjs`, and `.sql` files.

**AMPscript formatting** is where this plugin shines:

- Keyword and function casing (`set` vs `SET`, `LookupRows` vs `lookuprows`)
- Quote style, spacing in inline expressions (`%%= V(@x) =%%`)
- Variable casing normalized to the first occurrence in the file
- Optional multi-line var declarations
- Smart handling of AMPscript embedded in `.html` email templates

**SSJS** files are formatted through Prettier's JavaScript pipeline with SFMC-friendly defaults baked in: 4-space indent, 100-character print width, single quotes, no trailing commas (trailing commas can bite you in some SFMC contexts).

**SQL** (`.sql`) is included via composed SQL formatting, tuned for T-SQL style queries you might run against Data Extensions or automation queries.

**What Prettier does not do:** tell you that Platform.Load is missing, catch a hardcoded encryption key, or warn that InsertDE is unsupported in Marketing Cloud Next. Formatting and correctness are separate concerns.

**Distinct Prettier features:**

- `/* prettier-ignore */` for AMPscript and `// prettier-ignore` for SSJS when aligned columns matter
- `.prettierignore` for SMS/mobile assets where whitespace is part of the message
- Project-wide style via `.prettierrc` committed to Git so the whole team shares one format

Pair **Format on Save** in VS Code with the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) and suddenly every AMPscript block in a shared repo looks like one person wrote it.

---

## eslint-plugin-sfmc: rules, severity, and enforcement

ESLint is the policy engine.

Install **eslint-plugin-sfmc**, add a flat `eslint.config.js`, and spread one of the bundled configs:

- `sfmc.configs.recommended` for standalone `.amp` and `.ssjs` files
- `sfmc.configs.embedded` for HTML templates (processors extract AMPscript and SSJS blocks)
- `sfmc.configs.strict` when you want warnings promoted to errors
- `*-next` variants when you target **Marketing Cloud Next** (subset of AMPscript, no SSJS)

**AMPscript rules** cover unknown functions, wrong arity, bad argument types, smart quotes in strings, empty blocks, loop counter misuse, deprecated APIs, naming conventions, RowCount checks before FOR on lookups, nested script tag mistakes, and more.

**SSJS rules** cover missing or out-of-order Platform.Load, ES6+ syntax, unknown Platform/Core/WSProxy methods, deprecated ContentArea APIs, hardcoded credentials in encryption calls, hasOwnProperty guards in for-in loops, unavailable Array/String methods on SFMC's ES3 engine, unsafe TreatAsContent patterns, and arity/type checks.

**The team-config benefit (this is the big one):**

The SFMC Language Service helps each developer individually, but it does not give you a **single shared ruleset** for everyone working on the same Marketing Cloud instance. Editor settings live in VS Code preferences unless you deliberately commit workspace files.

**eslint-plugin-sfmc** flips that. You check an `eslint.config.js` (and optional overrides per folder) into Git. Every person on the team, every CI pipeline, and every pre-commit hook runs the **same** rules with the **same** severity. You can start lenient and tighten over time, enable strict for production branches, add naming conventions your agency cares about, or switch to recommended-next while you migrate toward Marketing Cloud Next. One file, one truth, no “I turned off that warning in my VS Code.”

Install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) alongside eslint-plugin-sfmc so those rules surface in the Problems panel while you edit.

Because many ESLint rules overlap with built-in language-server diagnostics, you may see duplicate squiggles for the same issue. The SFMC Language Service adds a setting for exactly this case: enable `sfmcLanguageServer.disableLspDiagnosticsForEslintRules` in your workspace (for example in `.vscode/settings.json` so the whole team gets it). That suppresses LSP warnings already covered by eslint-plugin-sfmc (unknown functions, arity, smart quotes, and similar) while keeping diagnostics only the language server provides: delimiter balance, IF/ENDIF and FOR/NEXT nesting, GTL, Marketing Cloud Next compatibility, and related checks.

**What ESLint shares with the SFMC Language Service:**

Many diagnostics overlap by design. Unknown functions, missing Platform.Load, ES6+ in SSJS: you will see similar squiggles in the editor (via the ESLint extension) and in `npm run lint`.

**What ESLint does that the language service does not:**

- **One shared, version-controlled config** for the entire team and every automation path
- **Configurable severity** per rule (warn vs error, team policy in config)
- strict and strict-next configs for zero-tolerance pipelines
- **Naming convention rules** and opinionated best-practice warnings you can tune per repo
- **Headless execution** anywhere Node runs
- **Processors** that lint extracted code inside HTML without splitting files manually

The SFMC Language Service extension also wires up `eslint.validate` for SFMC language IDs automatically when you use both, so you do not need manual `settings.json` plumbing for ESLint to run on `.amp`, `.ssjs`, and SFMC HTML files.

---

## Better together: a practical local workflow

Here is the stack I recommend for day-to-day SFMC development:

1. **SFMC Language Service** for completions, hover, and instant feedback while coding.
2. **Prettier** on save for formatting (no more "your diff is 400 lines of whitespace").
3. **ESLint** in the editor for rule violations, plus `npm run lint` before you push.

In VS Code, that feels seamless: type, see hovers, get squiggles, save to format, commit.

The magic is that steps 2 and 3 are **project tools**, not editor tools. They live in `package.json` and config files in Git, run from the terminal, and behave identically on every machine.

**Example workspace settings** you can commit for a team repo:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "sfmcLanguageServer.disableLspDiagnosticsForEslintRules": true
}
```

---

## Why ESLint gets more interesting when CI/CD and Git hooks show up

This is the section I wish more SFMC teams read.

The VS Code extension is wonderful. It is also **local and optional**. A colleague can clone the repo, open files in Notepad, push broken SSJS with `let`/`const`, and your Git history does not care that *you* have great IntelliSense.

CI/CD and pre-commit hooks fix that gap.

**Continuous Integration (GitHub Actions, Azure DevOps, GitLab CI, etc.):**

```bash
npm ci
npm run lint
npm run format:check
```

If lint fails, the pipeline fails. No human has to remember to install a VS Code extension. No "works on my machine" because someone disabled diagnostics in their personal settings.

**Pre-commit hooks with Husky:**

```json
"lint-staged": {
  "**/*.{amp,ampscript,ssjs,html}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

A bad commit never lands. Formatting is normalized before review. ESLint auto-fixes what it can; the rest blocks the commit.

**Why the VS Code extension cannot replace this:**

The extension teaches you while you code. ESLint **guarantees** the codebase stays teachable for everyone else.

Prettier plays the same enforcement role for style: `prettier --check` in CI catches drift that Format on Save would have fixed locally, but only for developers who actually saved in VS Code.

---

## What to adopt first

If you are starting from zero:

1. Install **SFMC Language Service** today. Immediate payoff, zero repo setup.
2. Add **prettier-plugin-sfmc** when two or more people touch the same files, or whenever you want **auto-formatted code** (something neither the language service nor ESLint provides).
3. Add **eslint-plugin-sfmc** when you want guardrails the whole team shares: ES3 compliance, Platform.Load order, deprecated APIs, naming rules, MCN migration checks.
4. Wire **Husky + lint-staged** or a CI lint job when broken code in main has cost you a send preview or a deployment rollback.

You do not need all four on day one. You do need to understand that they solve different layers of the same problem: **understand** (language service), **style** (Prettier), **policy** (ESLint), **enforce** (CI/hooks).

---

## Closing thought

Salesforce Marketing Cloud code has lived outside the normal software toolchain for too long. AMPscript and SSJS are real languages with real footguns: ES3 limits, Platform.Load ordering, deprecated SOAP-era APIs, and soon Marketing Cloud Next compatibility.

The SFMC Language Service makes writing that code feel modern in the editor. [ssjs.guide](https://ssjs.guide) gives you a durable reference for SSJS that stays in sync with those same definitions. ESLint and Prettier make the *repository* modern: reviewable, consistent, and safe to merge.

Use the extension because coding without IntelliSense is a waste of your afternoon. Bookmark ssjs.guide when you need the full picture on a Platform function. Add ESLint when your team needs one shared rulebook, not fifteen personal VS Code setups. Add Prettier when you want the formatter nobody else in the stack provides. Wire CI and hooks because your teammates, your pipeline, and your future self at 4:55 p.m. on a Friday all deserve the same protection you get from squiggles in VS Code.

---

## Links

- SFMC Language Service: <https://marketplace.visualstudio.com/items?itemName=joernberkefeld.sfmc-language>
- Prettier (VS Code): <https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode>
- ESLint (VS Code): <https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint>
- eslint-plugin-sfmc: <https://www.npmjs.com/package/eslint-plugin-sfmc>
- prettier-plugin-sfmc: <https://www.npmjs.com/package/prettier-plugin-sfmc>
- [ssjs.guide](https://ssjs.guide)
- [ampscript.guide](https://ampscript.guide)
- [Tools catalog](/tools/)
