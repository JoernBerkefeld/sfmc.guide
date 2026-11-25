---
layout: page
title: "SFMC UX Tools for Chrome"
description: "Chrome extension that makes Marketing Cloud's own screens easier to work in: code help for AMPscript and SSJS, readable keys, real journey names and a list of transactional messages. For Engagement and for the content editor of Marketing Cloud Next."
parent: Tools
parent_url: /tools/
permalink: /tools/chrome-sfmc-ux-tools/
platforms:
  - engagement
  - next
---

Install it and Marketing Cloud gets easier to work in. Nothing to set up, nothing to log in to.

<a href="https://chromewebstore.google.com/detail/icngdchkbniamebbmhebciohjimfmjej" target="_blank" rel="noopener"><img src="/assets/images/chrome-sfmc-ux-tools/chrome-web-store-badge.png" alt="Available in the Chrome Web Store" width="206" height="58"></a>

Free, from the Chrome Web Store.

![Animation: while "SET @lastName = Look" is typed, a list offers Lookup, LookupOrderedRows, LookupRows and more, each with a short description](/assets/images/chrome-sfmc-ux-tools/completion.gif)

## What you get

- **Code editors you can read:** AMPscript and SSJS in colour, in a light or dark theme.
- **Help while you type:** suggestions, explanations when you point at code, and mistakes underlined before you save.
- **Tidy code with one click:** the **{ }** button or **Shift+Alt+F**, and **Ctrl+S** saves.
- **Readable keys instead of random ones:** new automations, activities, data extensions, journeys and more get a key made from their name, such as `Welcome_series`.
- **No more "New Journey - 18 November…":** Journey Builder asks for a real name before a new journey is saved.
- **Transactional SMS, push and OTT messages in a list:** a new entry in the Mobile Studio menu shows them and lets you create, change and delete them. Marketing Cloud itself has no place for this.
- **Small fixes for everyday annoyances:** select all scopes of an installed package with one click, and a pasted name or key that Marketing Cloud would ignore is used.
- **Private:** nothing is collected and nothing leaves Marketing Cloud.

{% include callout.html type="note" title="Coming with the next update" content="Finished and on their way to the Chrome Web Store: links you can send to a coworker for Content Builder assets and for data extensions, lists and folders in Email Studio and Contact Builder; deleting messages in MobileConnect and MobilePush; a search on every field of a data extension's records; and underlined mistakes in the SQL query activity." %}

## Where it works

- **Marketing Cloud Engagement:** Content Builder, Email Studio, CloudPages, Automation Studio, Journey Builder, Contact Builder, Mobile Studio and Setup.
- **Marketing Cloud Next:** the code of an email made with **Create with HTML**, and the **HTML** component in emails, landing pages and content blocks. There the extension helps with AMPscript; colours and Handlebars are left to Salesforce.

## Code you can read

Marketing Cloud colours HTML but shows AMPscript as plain black text. The extension gives AMPscript and SSJS their own colours.

![A code editor with made-up AMPscript, HTML and server-side JavaScript in colour: keywords, functions, variables, texts and comments each have their own colour](/assets/images/chrome-sfmc-ux-tools/colours.png)

- **Light or dark:** pick the theme in the options; the code editors follow.

![The same made-up code in the dark theme: light text and colours on a dark background](/assets/images/chrome-sfmc-ux-tools/theme-dark.png)

## Help while you type

- **Suggestions:** functions, keywords and your own variables, each with a short description.
- **Explanations:** rest the mouse on a function and a box says what it does, what it needs and shows an example.

![Animation: the mouse comes to rest on the function AttributeValue and a box opens that explains it, with its input, an example and whether Marketing Cloud Next has it](/assets/images/chrome-sfmc-ux-tools/hover.gif)

- **Mistakes underlined before you save:** a misspelt function, a missing bracket, or something that will not work in the place you are writing it.

![A misspelt function, ProperCse, is underlined in red; the box above it says that AMPscript has no such function](/assets/images/chrome-sfmc-ux-tools/diagnostics.png)

- **One-click fixes:** where the extension knows the fix, the box offers it as a button.

![A comment written with // in AMPscript is underlined in yellow; the box above it explains why and offers the button "Convert to AMPscript block comment"](/assets/images/chrome-sfmc-ux-tools/quick-fix.png)

## Tidy code with one click

- **The { } button** or **Shift+Alt+F** indents and spaces your code the same way every time.
- **Ctrl+S** saves, like everywhere else.

![Made-up code before and after a click on the button: first crammed onto a few long lines, then neatly indented, one statement and one HTML tag per line](/assets/images/chrome-sfmc-ux-tools/format.png)

## Readable keys

Marketing Cloud gives most new things a random key. The extension fills in a key made from the name while you type it, and you can still change it.

![Animation: in the dialog of a new script activity, a name is typed, and the External Key below it fills in by itself with the same words joined by underscores](/assets/images/chrome-sfmc-ux-tools/readable-keys.gif)

- **Where:** automations and their activities, data extensions, data filters, triggered sends, journeys and their API events, content blocks and emails, sender profiles, send classifications, delivery profiles, file locations, roles and users.

## A real name for every journey

Journey Builder calls every new journey "New Journey" with a date. The extension asks for a name of your own before the journey is saved.

![After a click on Save, the default journey name is an open field with the name selected, and a message below it asks for a name of its own](/assets/images/chrome-sfmc-ux-tools/journey-name.png)

## Transactional messages in a list

Transactional SMS, push and OTT messages exist in Marketing Cloud, but only its API shows them. The extension adds **Transactional Messages** to the Mobile Studio menu.

![The panel Transactional Messages on its SMS tab: made-up messages with name, key, status, code, keyword and dates, a search box and a list to show one status only](/assets/images/chrome-sfmc-ux-tools/panel-list.png)

- **One tab per channel:** SMS, push and OTT, each with search and a filter by status.
- **Create, change and delete:** in forms that know your account's codes, keywords, apps and contents.
- **Details that explain themselves:** a push message shows its app and its content by name, with links to both.

![The details of a made-up push message: its app by name with a link to its settings, the title, subtitle and message of its content, and its two custom keys with their values](/assets/images/chrome-sfmc-ux-tools/push-details.png)

## Small fixes

- **Select all scopes:** the scope list of an installed package gets a **Select all** button.

![Animation: the mouse clicks Select all in the Scope bar of a package dialog; every box is ticked and the button now says Deselect all](/assets/images/chrome-sfmc-ux-tools/scopes.gif)

- **Pasting with the mouse works:** a name or key pasted from the right-click menu is used, where Marketing Cloud would ignore it.

## Privacy

Nothing is collected and nothing leaves Marketing Cloud. The extension only talks to the Marketing Cloud pages you are signed in to.

## Related

The language help comes from the same catalogs as the [SFMC Language Service](/tools/vscode-sfmc-language/) for VS Code and [prettier-plugin-sfmc](/tools/prettier-plugin-sfmc/).

## Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/icngdchkbniamebbmhebciohjimfmjej)
- [Full feature list on GitHub](https://github.com/JoernBerkefeld/chrome-sfmc-ux-tools#readme)

[← All tools](/tools/)
