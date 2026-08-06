# Test-script bundles

One YAML file per sfmc.guide page that ships runnable AMPscript proof, rendered
by `_includes/test-script.html`. Authored by the
`add-ampscript-guide-test-scripts` skill.

Jekyll only loads `.yml` / `.yaml` / `.json` / `.csv` / `.tsv` from `_data`, so
this Markdown file is ignored by the build and exists purely to document the
convention (and to keep the folder tracked while it is still empty).

## File naming

The bundle name is the page's folder path relative to the site root with `/`
replaced by `--`:

```
engagement/divide/index.md   ->   _data/test_scripts/engagement--divide.yml
```

## File shape

Top-level keys are **chapter slugs** — the anchor of the `##` heading the block
is rendered under. Each value is the complete, deployable CloudPage document as
a YAML block scalar:

```yaml
# Test scripts for /engagement/divide/
#
# Every script is a full HTML document that can be pasted into the shared
# verification CloudPage asset and deployed as-is.

returns: |
  <!DOCTYPE html>
  <html>
  <body>
  <pre>
  %%[ ... ]%%
  </pre>
  </body>
  </html>
```

## Rendering it on a page

```liquid
{% include test-script.html bundle="engagement--divide" chapter="returns" %}
```

Add `label="Show test script — <what it proves>"` when a chapter carries more
than one block. The include renders nothing when the bundle or chapter key is
missing, so a partially-populated page still builds.

## AMPscript specifics

AMPscript has no `try`/`catch`, no exception object, and no `typeof`. A failing
call aborts the entire page with HTTP 422 and discards everything rendered
before it, so a script cannot catch and report its own failures. Published
scripts therefore use the **gated-fetch** shape: risky cases live behind
`IF @b == "<case>" THEN … ENDIF` branches driven by `RequestParameter("b")`,
and the header comment states which `?b=` value renders which block and what it
must print. The full authoring contract lives in
`.cursor/skills/add-ampscript-guide-test-scripts/SKILL.md`.
