/**
 * mcdev Pipeline Builder — rules wizard step.
 *
 * Classic browser IIFE (NOT an ES module). Must load AFTER `mcdev-pipeline-core.js`
 * and BEFORE leftover `mcdev-pipeline-builder.js`. Registers the `rules` step
 * on `mpbController`. Prefix-blacklist and DE-retention mini-wizards live here.
 *
 * @typedef {import('./mcdev-pipeline-config-builder.js').WizardState} WizardState
 */

/**
 * @param {Window} global host window object
 */
(function (global) {
    'use strict';

    const C = global.mpbController;
    if (!C) {
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-step-rules.js');
    }

    const state = C.state;
    const makeElement = C.makeEl;
    const childBUReferences = C.childBUReferences;
    const emptyRetention = C.emptyRetention;
    const render = C.render;

    /**
     * `rules` gate: always ok. Selecting no extra rules is a valid outcome (keySuffix is always on).
     *
     * @returns {{ok: boolean, reason: string}} gate result
     */
    function proceedRulesGate() {
        return { ok: true, reason: '' };
    }

    /**
     * Retention-policy option lists for the `sendableDeRetention` mini-wizard. Values match the
     * DevTools data-extension metadata model consumed verbatim by the validations builder.
     */
    // The three real retention types, mirroring SFMC's "Apply To → Delete" radio group. `none`
    // is intentionally NOT listed here: in the GUI it is represented by the "Retention Setting"
    // On/Off master toggle being Off, not by a fourth radio. `individialRecords` keeps the
    // DevTools spelling verbatim (it is emitted into the rule as-is).
    const RETENTION_TYPE_OPTIONS = [
        { value: 'individialRecords', label: 'Individual Records' },
        { value: 'allRecordsAndDataextension', label: 'All records and data extensions' },
        { value: 'allRecords', label: 'All records' },
    ];
    // The default real type restored when the master toggle is switched from Off back to On.
    const RETENTION_DEFAULT_TYPE = 'individialRecords';
    // Remembers the last real retention type chosen so toggling Off→On restores it rather than
    // always jumping to the default. UI-only (not persisted in wizardState); updated in
    // `updateRetention` whenever a real type is stored.
    let lastRealRetentionType = RETENTION_DEFAULT_TYPE;
    const RETENTION_UNIT_OPTIONS = ['Years', 'Months', 'Weeks', 'Days'];
    // DE-type scope options for the retention policy: which data-extension types it is enforced on.
    // New configs default to `both`; an absent value in an old saved config is read as `sendable`
    // by the emitter to preserve the historical sendable-only behaviour.
    const RETENTION_DE_TYPE_OPTIONS = [
        { value: 'sendable', label: 'Sendable only' },
        { value: 'nonSendable', label: 'Non-sendable only' },
        { value: 'both', label: 'Sendable and Non-sendable DEs' },
    ];

    /**
     * Which rule mini-wizard `<details>` panels are currently expanded. This is UI-only state (not
     * part of `wizardState`, so it is neither persisted nor fed to the builders); it is reapplied on
     * every `render()` so a panel stays open while the user edits inputs inside it.
     *
     * @type {Set<string>}
     */
    const openMiniWizards = new Set();

    /**
     * Catalogue of validation rules for the rule picker. `keySuffix` is always emitted by the
     * builder, so it is modelled here with `alwaysOn: true` and rendered as a checked+disabled row
     * (users see it is included but cannot toggle it); it is never written to `selectedRules`.
     * `miniWizard` marks the two rules whose `<details>` sub-config is built in Chunk 3.
     * Descriptions are original one-liners.
     */
    const RULE_CATALOG = [
        {
            id: 'keySuffix',
            name: 'BU key suffix',
            description: 'Requires every asset key to carry its business-unit suffix.',
            autoFix: false,
            alwaysOn: true,
        },
        {
            id: 'noGuidKeys',
            name: 'No GUID keys',
            description: 'Flags metadata still keyed by a raw GUID instead of a readable key.',
            autoFix: false,
        },
        {
            id: 'properJourneyDeNameAndKey',
            name: 'Named journey DEs',
            description: 'Flags journey data extensions left with the default "New Journey" name or key.',
            autoFix: false,
        },
        {
            id: 'filterText',
            name: 'No test / archive items',
            description: 'Blocks names, keys and folder paths that look like test or archive leftovers.',
            autoFix: true,
        },
        {
            id: 'noSharedAssets',
            name: 'No shared assets',
            description: 'Flags assets shared across business units instead of cloned per BU.',
            autoFix: true,
        },
        {
            id: 'onlyCBbyKey',
            name: 'Content blocks by key',
            description: 'Requires content blocks to be referenced by key, not by id or name.',
            autoFix: false,
        },
        {
            id: 'noMultipartEmails',
            name: 'No multipart journey emails',
            description: 'Ensures journey email activities keep isMultipart off to avoid duplicates.',
            autoFix: true,
        },
        {
            id: 'noMidDependentCode',
            name: 'No hard-coded MIDs',
            description: 'Flags asset code that hard-codes a business-unit MID instead of a market variable.',
            autoFix: false,
        },
        {
            id: 'filterPrefixByBu',
            name: 'Forbidden prefixes per BU',
            description: 'Blocks configured key/name prefixes on specific business units.',
            autoFix: true,
            miniWizard: true,
        },
        {
            id: 'sendableDeRetention',
            name: 'DE retention policy',
            description: 'Enforces a data-retention policy on the selected data extensions and business units.',
            autoFix: true,
            miniWizard: true,
        },
    ];

    /**
     * Ids of rules the builder always emits (so they are shown as checked+disabled and never stored
     * in `selectedRules`). Derived from the `alwaysOn` catalog flag so the two stay in sync.
     *
     * @type {Set<string>}
     */
    const ALWAYS_ON_RULES = new Set(RULE_CATALOG.filter((rule) => rule.alwaysOn).map((rule) => rule.id));

    /**
     * `rules` step: a checkbox rule picker feeding the derived `validationsState.selectedRules`.
     * Each row shows the rule name, a short description and an auto-fix badge. The two mini-wizard
     * rules leave a marked mount point where their `<details>` sub-config is built in Chunk 3. This
     * step is also the sole visible step in validations-only mode.
     *
     * @param {HTMLElement} panel the step panel to mount into
     * @returns {void}
     */
    function renderRulesStep(panel) {
        panel.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Pick the validation rules to generate. keySuffix is always included. Selecting no extra rules is fine.',
            })
        );

        const selected = new Set(Array.isArray(state.wizardState.selectedRules) ? state.wizardState.selectedRules : []);
        const list = makeElement('div', { class: 'mpb-list' });
        for (const rule of RULE_CATALOG) {
            list.append(ruleRow(rule, selected.has(rule.id)));
        }
        panel.append(list);
    }

    /**
     * Build one rule-picker row: a checkbox to the LEFT of the rule name (a horizontal
     * `.mpb-rule-head` label, not the stacked `.mpb-field`), plus a description and an auto-fix
     * badge. `alwaysOn` rules render checked+disabled with an "always on" badge and never touch
     * `selectedRules`. Mini-wizard rules also mount a `<details>` sub-config while selected.
     *
     * @param {{id: string, name: string, description: string, autoFix: boolean, miniWizard?: boolean, alwaysOn?: boolean}} rule the rule
     * @param {boolean} isSelected whether the rule is currently selected
     * @returns {HTMLElement} the row element
     */
    function ruleRow(rule, isSelected) {
        const row = makeElement('div', { class: 'mpb-rule' });
        // The head is a horizontal label so the checkbox sits to the LEFT of the title (the generic
        // `.mpb-field` stacks its children in a column, which would put the checkbox above the name).
        const label = makeElement('label', { class: 'mpb-rule-head' });
        const checkbox = makeElement('input', {
            type: 'checkbox',
            checked: rule.alwaysOn ? true : isSelected,
        });
        if (rule.alwaysOn) {
            // Always-on rules (e.g. keySuffix) are emitted unconditionally by the builder, so the
            // checkbox is checked + disabled and never wired to `selectedRules`.
            checkbox.disabled = true;
        } else {
            checkbox.addEventListener('change', () => {
                toggleRule(rule.id, checkbox.checked);
            });
        }
        label.append(checkbox, makeElement('span', { class: 'mpb-rule-name', text: rule.name }));
        if (rule.alwaysOn) {
            label.append(makeElement('span', { class: 'mpb-chip mpb-chip--always', text: 'always on' }));
        }
        if (rule.autoFix) {
            label.append(makeElement('span', { class: 'mpb-chip', text: 'auto-fix' }));
        }
        row.append(label);
        row.append(makeElement('p', { class: 'mpb-rule-desc text-muted', text: rule.description }));

        // Mini-wizard rules mount a native <details> sub-config, but only while the rule is
        // selected — toggling the checkbox OFF hides (and effectively ignores) the sub-config.
        if (isSelected && rule.miniWizard) {
            row.append(miniWizardDetails(rule.id));
        }
        return row;
    }

    /**
     * Build the `<details>/<summary>` sub-wizard for a mini-wizard rule. The panel body is picked by
     * rule id: `filterPrefixByBu` → a per-BU forbidden-prefix blacklist editor; `sendableDeRetention`
     * → an applies-to BU selector plus the retention-policy inputs. Its open/closed
     * state is remembered in `openMiniWizards` so a `render()` triggered by editing inside it keeps
     * the panel open.
     *
     * @param {string} ruleId the mini-wizard rule id
     * @returns {HTMLElement} the `<details>` element
     */
    function miniWizardDetails(ruleId) {
        const details = makeElement('details', { class: 'mpb-mini' });
        if (openMiniWizards.has(ruleId)) {
            details.open = true;
        }
        details.addEventListener('toggle', () => {
            if (details.open) {
                openMiniWizards.add(ruleId);
            } else {
                openMiniWizards.delete(ruleId);
            }
        });
        details.append(makeElement('summary', { text: 'Configure this rule' }));
        const body = makeElement('div', { class: 'mpb-mini-body' });
        if (ruleId === 'filterPrefixByBu') {
            renderPrefixBlacklist(body);
        } else if (ruleId === 'sendableDeRetention') {
            renderRetentionPolicy(body);
        }
        details.append(body);
        return details;
    }

    // ── filterPrefixByBu mini-wizard ──

    /**
     * The forbidden prefixes stored for a child buRef, always as a fresh array.
     *
     * @param {string} reference the child buRef
     * @returns {string[]} the forbidden prefixes for that BU
     */
    function prefixesFor(reference) {
        const map = state.wizardState.prefixBlacklist || {};
        const list = map[reference];
        return Array.isArray(list) ? [...list] : [];
    }

    /**
     * Add a trimmed forbidden prefix for a child buRef (ignoring blanks and case-insensitive dupes)
     * and re-render.
     *
     * @param {string} reference the child buRef
     * @param {string} prefix the prefix to add
     * @returns {void}
     */
    function addPrefix(reference, prefix) {
        const trimmed = String(prefix).trim();
        if (!trimmed) {
            return;
        }
        const current = prefixesFor(reference);
        if (current.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
            return;
        }
        state.wizardState.prefixBlacklist = {
            ...state.wizardState.prefixBlacklist,
            [reference]: [...current, trimmed],
        };
        render();
    }

    /**
     * Remove a forbidden prefix from a child buRef and re-render.
     *
     * @param {string} reference the child buRef
     * @param {string} prefix the prefix to remove
     * @returns {void}
     */
    function removePrefix(reference, prefix) {
        const next = prefixesFor(reference).filter((existing) => existing !== prefix);
        state.wizardState.prefixBlacklist = {
            ...state.wizardState.prefixBlacklist,
            [reference]: next,
        };
        render();
    }

    /**
     * `filterPrefixByBu` mini-wizard body: a per-child-BU editor for the forbidden-prefix blacklist.
     * An item fails the rule only when its key or name starts with one of that BU's prefixes;
     * everything else (including generic no-prefix items) passes, and a BU with no prefixes passes
     * everything. Prefixes are trimmed; internal spaces trigger a stern (non-rewriting) warning,
     * consistent with the suffix step.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderPrefixBlacklist(body) {
        body.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Add key/name prefixes that must NOT appear on each business unit. Items that do not start with a listed prefix (including generic items) always pass.',
            })
        );
        const references = childBUReferences();
        if (references.length === 0) {
            body.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }
        const board = makeElement('div', { class: 'mpb-prefix-board' });
        for (const reference of references) {
            board.append(prefixBURow(reference));
        }
        body.append(board);
    }

    /**
     * Build one BU block in the prefix-blacklist editor: the BU label, its current prefixes as
     * removable chips, and an input + "Add" button to append a new forbidden prefix.
     *
     * @param {string} reference the child buRef
     * @returns {HTMLElement} the BU block element
     */
    function prefixBURow(reference) {
        const field = makeElement('div', { class: 'mpb-prefix-card' });
        field.append(makeElement('label', { class: 'mpb-prefix-card-name', text: reference }));

        const prefixes = prefixesFor(reference);
        const chips = makeElement('div', { class: 'mpb-chips' });
        if (prefixes.length === 0) {
            chips.append(makeElement('span', { class: 'text-muted', text: 'No forbidden prefixes.' }));
        }
        for (const prefix of prefixes) {
            const chip = makeElement('span', { class: 'mpb-prefix-chip' });
            chip.append(makeElement('span', { class: 'mpb-prefix-chip-text', text: prefix }));
            const remove = makeElement('button', {
                type: 'button',
                class: 'mpb-prefix-chip-remove',
                text: '×',
                attrs: { 'aria-label': 'Remove prefix ' + prefix },
            });
            remove.addEventListener('click', () => {
                removePrefix(reference, prefix);
            });
            chip.append(remove);
            chips.append(chip);
        }
        field.append(chips);

        // Stern, non-rewriting warning about internal spaces (mirrors the suffix step).
        const spaceWarn = makeElement('p', {
            class: 'mpb-warn',
            text: 'Avoid spaces inside a prefix — they rarely match real key or name prefixes.',
            hidden: true,
        });

        const entry = makeElement('div', { class: 'mpb-suffix-input mpb-prefix-input' });
        const input = makeElement('input', {
            type: 'text',
            value: '',
            attrs: {
                autocomplete: 'off',
                spellcheck: 'false',
                'aria-label': 'New forbidden prefix for ' + reference,
                placeholder: 'e.g. tmp_',
            },
        });
        const addButton = makeElement('button', { type: 'button', class: 'mpb-btn', text: 'Add' });
        const commit = () => {
            addPrefix(reference, input.value);
        };
        addButton.addEventListener('click', commit);
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
            	return;
            }

            event.preventDefault();
            commit();
        });
        input.addEventListener('input', () => {
            spaceWarn.hidden = !/\s/.test(input.value.trim());
        });
        entry.append(input, addButton);
        field.append(entry);
        field.append(spaceWarn);
        return field;
    }

    // ── sendableDeRetention mini-wizard ──

    /**
     * The stored retention policy, filled in from defaults for any missing field so the mini-wizard
     * always renders a complete form.
     *
     * @returns {{c__retentionPolicy: string, DataRetentionPeriodLength: number, c__dataRetentionPeriodUnitOfMeasure: string, ResetRetentionPeriodOnImport: boolean, appliesTo: string[], deTypeScope: ('sendable'|'nonSendable'|'both')}} the policy
     */
    function retentionPolicy() {
        return { ...emptyRetention(), ...state.wizardState.retention };
    }

    /**
     * Patch the stored retention policy with the given fields and re-render.
     *
     * @param {object} patch partial policy fields to merge in
     * @returns {void}
     */
    function updateRetention(patch) {
        state.wizardState.retention = { ...retentionPolicy(), ...patch };
        // Remember the last real type so the On/Off toggle can restore it (UI-only, not persisted).
        const type = state.wizardState.retention.c__retentionPolicy;
        if (type && type !== 'none') {
            lastRealRetentionType = type;
        }
        render();
    }

    /**
     * `sendableDeRetention` mini-wizard body: an applies-to selector (which business units this
     * policy is enforced on) plus the retention-policy inputs (type, length, unit, reset-on-import).
     * The applies-to checkboxes write `wizardState.retention.appliesTo` (this rule's own buRef set,
     * decoupled from the pipeline's production concept); the policy inputs write
     * `wizardState.retention`.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderRetentionPolicy(body) {
        // Config first (the retention policy the user is defining), then the applies-to BU scope.
        renderRetentionInputs(body);
        renderRetentionAppliesTo(body);
    }

    /**
     * Toggle a buRef in/out of the retention rule's own `appliesTo` set and re-render.
     *
     * @param {string} reference the buRef to toggle
     * @param {boolean} on true to include the BU, false to exclude it
     * @returns {void}
     */
    function toggleRetentionAppliesTo(reference, on) {
        const current = Array.isArray(retentionPolicy().appliesTo) ? retentionPolicy().appliesTo : [];
        const next = on
            ? (current.includes(reference) ? current : [...current, reference])
            : current.filter((existing) => existing !== reference);
        updateRetention({ appliesTo: next });
    }

    /**
     * The applies-to (WHERE) block: the user picks which data-extension types (`deTypeScope`) and
     * which business units this retention policy targets. The DE-type select is independent of the
     * On/Off master toggle. Toggling the BU checkboxes edits this rule's own
     * `wizardState.retention.appliesTo` set — it does not touch the pipeline's production BUs.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderRetentionAppliesTo(body) {
        const policy = retentionPolicy();
        body.append(makeElement('label', { class: 'mpb-mini-label', text: 'Applies to' }));

        // "DE type": which data-extension types the policy targets. Independent of the On/Off master
        // toggle (it scopes WHERE the rule applies, not whether the policy is enforced), so it stays
        // enabled regardless of the toggle state.
        const deTypeField = makeElement('div', { class: 'mpb-field' });
        deTypeField.append(makeElement('label', { text: 'DE type' }));
        const deTypeSelect = makeElement('select', {
            attrs: { 'aria-label': 'Data extension types this retention policy applies to' },
        });
        for (const option of RETENTION_DE_TYPE_OPTIONS) {
            const element = makeElement('option', { value: option.value, text: option.label });
            if (option.value === policy.deTypeScope) {
                element.selected = true;
            }
            deTypeSelect.append(element);
        }
        deTypeSelect.addEventListener('change', () => {
            updateRetention({ deTypeScope: deTypeSelect.value });
        });
        deTypeField.append(deTypeSelect);
        body.append(deTypeField);

        body.append(
            makeElement('p', {
                class: 'text-muted',
                text: 'Select the business units this retention policy applies to.',
            })
        );
        const references = childBUReferences();
        if (references.length === 0) {
            body.append(
                makeElement('p', { class: 'text-muted', text: 'Assign BUs to environments first.' })
            );
            return;
        }
        const selected = new Set(retentionPolicy().appliesTo || []);
        // Wrapping equal-width flex list: BUs flow into multiple columns when space allows.
        const list = makeElement('div', { class: 'mpb-bu-flex' });
        for (const reference of references) {
            const label = makeElement('label', { class: 'mpb-check-row mpb-bu-flex-item' });
            const checkbox = makeElement('input', {
                type: 'checkbox',
                checked: selected.has(reference),
            });
            checkbox.addEventListener('change', () => {
                toggleRetentionAppliesTo(reference, checkbox.checked);
            });
            label.append(checkbox, makeElement('span', { text: reference }));
            list.append(label);
        }
        body.append(list);

        // Selecting no BU drops the rule from the generated file — warn so it is not silently omitted.
        if (selected.size === 0) {
            body.append(
                makeElement('p', {
                    class: 'mpb-warn',
                    text: 'Select at least one business unit — otherwise this rule is not included in the generated validations file.',
                })
            );
        }
    }

    /**
     * The retention-policy inputs, mirroring SFMC's native Data Extension "Retention Setting" GUI:
     * a master On/Off toggle (Off ⇔ `c__retentionPolicy === 'none'`), an "Apply To → Delete" radio
     * group of the three real types, an "After [n] [unit]" period row, and a "Reset period on import"
     * checkbox. When the toggle is Off the whole config is rendered but disabled/greyed. The reset
     * checkbox is unchecked+disabled for `individialRecords` and active for the other two types.
     *
     * @param {HTMLElement} body the mini-wizard body to mount into
     * @returns {void}
     */
    function renderRetentionInputs(body) {
        const policy = retentionPolicy();
        const isOn = policy.c__retentionPolicy !== 'none';
        // Reset-on-import only applies to the record-level types; SFMC disables + clears it for
        // `individialRecords`.
        const isResetDisabled = !isOn || policy.c__retentionPolicy === 'individialRecords';

        // Section heading names the field AND states the enforced outcome (not just the field name).
        body.append(
            makeElement('label', {
                class: 'mpb-mini-label',
                text: 'Retention setting — require this policy on the selected data extensions',
            })
        );

        // Master On/Off segmented pill ("Retention Setting"), modelled on SFMC's GUI. Off stores the
        // `none` sentinel; On restores a real type — the previous real type if we still have one,
        // else the DevTools default. Two connected buttons in a `role="group"` pill.
        const segToggle = makeElement('div', {
            class: 'mpb-seg-toggle',
            attrs: { role: 'group', 'aria-label': 'Retention setting on or off' },
        });
        const onButton = makeElement('button', {
            type: 'button',
            class: isOn ? 'mpb-seg-btn mpb-seg-on is-active' : 'mpb-seg-btn mpb-seg-on',
            text: 'On',
            attrs: { 'aria-pressed': isOn ? 'true' : 'false' },
        });
        const offButton = makeElement('button', {
            type: 'button',
            class: isOn ? 'mpb-seg-btn mpb-seg-off' : 'mpb-seg-btn mpb-seg-off is-active',
            text: 'Off',
            attrs: { 'aria-pressed': isOn ? 'false' : 'true' },
        });
        onButton.addEventListener('click', () => {
            if (!isOn) {
                updateRetention({ c__retentionPolicy: lastRealRetentionType || RETENTION_DEFAULT_TYPE });
            }
        });
        offButton.addEventListener('click', () => {
            if (isOn) {
                updateRetention({ c__retentionPolicy: 'none' });
            }
        });
        segToggle.append(onButton, offButton);
        body.append(segToggle);

        // Everything below the toggle is greyed + disabled when the toggle is Off, matching SFMC.
        const config = makeElement('div', {
            class: isOn ? 'mpb-retention-config' : 'mpb-retention-config mpb-retention-disabled',
        });

        // "Apply To → Delete": a radio group of the three real types.
        const typeField = makeElement('div', { class: 'mpb-field' });
        typeField.append(makeElement('label', { text: 'Delete' }));
        const radioGroup = makeElement('div', { class: 'mpb-radio-group', attrs: { role: 'radiogroup' } });
        for (const option of RETENTION_TYPE_OPTIONS) {
            const radioRow = makeElement('label', { class: 'mpb-check-row' });
            const radio = makeElement('input', {
                type: 'radio',
                name: 'mpb-retention-type',
                value: option.value,
                checked: isOn && policy.c__retentionPolicy === option.value,
                disabled: !isOn,
            });
            radio.addEventListener('change', () => {
                // Switching to `individialRecords` forces reset-on-import off so a previously-on
                // value cannot leak into the emitted rule.
                const patch = { c__retentionPolicy: option.value };
                if (option.value === 'individialRecords') {
                    patch.ResetRetentionPeriodOnImport = false;
                }
                updateRetention(patch);
            });
            radioRow.append(radio, makeElement('span', { text: option.label }));
            radioGroup.append(radioRow);
        }
        typeField.append(radioGroup);
        config.append(typeField);

        // "Period → After [n] [unit ▾]": a compact (100px) length input with the unit inline beside it.
        const periodField = makeElement('div', { class: 'mpb-field' });
        periodField.append(makeElement('label', { text: 'Period' }));
        const periodRow = makeElement('div', { class: 'mpb-inline-row' });
        periodRow.append(makeElement('span', { class: 'mpb-mini-label', text: 'After' }));
        const lengthInput = makeElement('input', {
            type: 'number',
            class: 'mpb-length-input',
            value: String(policy.DataRetentionPeriodLength),
            disabled: !isOn,
            attrs: { min: '1', step: '1', 'aria-label': 'Retention period length' },
        });
        lengthInput.addEventListener('change', () => {
            const parsed = Math.trunc(Number(lengthInput.value));
            updateRetention({
                DataRetentionPeriodLength: Number.isNaN(parsed) || parsed < 1 ? 1 : parsed,
            });
        });
        const unitSelect = makeElement('select', {
            disabled: !isOn,
            attrs: { 'aria-label': 'Retention period unit' },
        });
        for (const unit of RETENTION_UNIT_OPTIONS) {
            const element = makeElement('option', { value: unit, text: unit });
            if (unit === policy.c__dataRetentionPeriodUnitOfMeasure) {
                element.selected = true;
            }
            unitSelect.append(element);
        }
        unitSelect.addEventListener('change', () => {
            updateRetention({ c__dataRetentionPeriodUnitOfMeasure: unitSelect.value });
        });
        periodRow.append(lengthInput, unitSelect);
        periodField.append(periodRow);
        config.append(periodField);

        // "Reset period on import": checkbox to the LEFT of its label. Unchecked + disabled for
        // `individialRecords` (and when the whole setting is Off), active otherwise. When disabled,
        // the row also carries `is-disabled` so the label text greys along with the checkbox.
        const resetLabel = makeElement('label', {
            class: isResetDisabled ? 'mpb-check-row is-disabled' : 'mpb-check-row',
        });
        const resetCheckbox = makeElement('input', {
            type: 'checkbox',
            checked: !isResetDisabled && !!policy.ResetRetentionPeriodOnImport,
            disabled: isResetDisabled,
        });
        resetCheckbox.addEventListener('change', () => {
            updateRetention({ ResetRetentionPeriodOnImport: resetCheckbox.checked });
        });
        resetLabel.append(resetCheckbox, makeElement('span', { text: 'Reset period on import' }));
        config.append(resetLabel);

        body.append(config);
    }

    /**
     * Toggle a rule id in/out of the selected set and re-render.
     *
     * @param {string} ruleId the rule id to toggle
     * @param {boolean} on true to select, false to deselect
     * @returns {void}
     */
    function toggleRule(ruleId, on) {
        // Always-on rules are emitted by the builder regardless of selection; never store them.
        if (ALWAYS_ON_RULES.has(ruleId)) {
            return;
        }
        const current = Array.isArray(state.wizardState.selectedRules) ? state.wizardState.selectedRules : [];
        const next = on
            ? (current.includes(ruleId) ? current : [...current, ruleId])
            : current.filter((existing) => existing !== ruleId);
        state.wizardState.selectedRules = next;
        render();
    }

    C.registerStep({ id: 'rules', render: renderRulesStep, canProceed: proceedRulesGate });
    C.RULE_CATALOG = RULE_CATALOG;
    C.ALWAYS_ON_RULES = ALWAYS_ON_RULES;
    C.toggleRule = toggleRule;
    C.retentionPolicy = retentionPolicy;
    C.updateRetention = updateRetention;
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
