/**
 * Isolated Market Variables prototypes. No production controller or persistence.
 *
 * @param global host global object
 */
(function (global) {
    'use strict';

    const markets = [
        { id: 'dev', environment: 'DEV', name: 'Brand_DEV', suffix: '_DEV' },
        { id: 'uat', environment: 'UAT', name: 'Brand_UAT', suffix: '_UAT' },
        { id: 'prod', environment: 'PROD', name: 'Brand_PROD', suffix: '_PROD' },
    ];
    const variables = ['brandName', 'campaignCode'];

    function createState() {
        const values = {
            dev: ['Example Dev', 'DEV-2026'],
            uat: ['Example Preview', 'UAT-2026'],
            prod: ['Example', 'PROD-2026'],
        };
        const cells = {};
        for (const market of markets) {
            cells[market.id] = {};
            for (const [index, name] of variables.entries()) {
                cells[market.id][name] = {
                    mode: 'literal',
                    value: values[market.id][index],
                    pattern:
                        name === 'campaignCode'
                            ? String.raw`(DEV|UAT|PROD)-(\d{4})`
                            : 'Example(?: Dev| Preview)?',
                    template: '{{{' + name + '}}}',
                };
            }
        }
        cells.uat.brandName.mode = 'regex';
        cells.dev.campaignCode.mode = 'regex';
        cells.prod.campaignCode.mode = 'regex';
        return {
            cells,
            suffixes: Object.fromEntries(markets.map((market) => [market.id, market.suffix])),
        };
    }

    function setMode(state, marketId, name, mode) {
        if (!['literal', 'regex'].includes(mode)) {
            throw new Error('Unknown demo mode');
        }
        state.cells[marketId][name].mode = mode;
    }

    function setField(state, marketId, name, field, value) {
        if (!['value', 'pattern', 'template'].includes(field)) {
            throw new Error('Unknown demo field');
        }
        state.cells[marketId][name][field] = value;
    }

    function validatePattern(pattern) {
        try {
            // Compile only: never execute user patterns against content.
            new RegExp(pattern, 'g');
            return '';
        } catch (ex) {
            return 'Invalid search pattern: ' + ex.message;
        }
    }

    function mount(root) {
        const document = root.ownerDocument;
        const variant = root.dataset.variant;
        const state = createState();
        const isInline = variant === 'inline';
        const isPanel = variant === 'panel';
        const view = document.defaultView;
        const panelModeButtons = new Map();
        if (isPanel) {
            for (const market of markets) {
                for (const name of variables) {
                    delete state.cells[market.id][name].template;
                }
            }
        }
        let active;
        let confirmation;

        function cancelConfirmation(returnFocus = true) {
            if (!confirmation) {
                return;
            }
            const previous = confirmation;
            confirmation = undefined;
            previous.editor.hidden = true;
            previous.trigger.setAttribute('aria-expanded', 'false');
            previous.trigger.setAttribute(
                'aria-controls',
                previous.editor.id.replace('-confirmation', '-editor'),
            );
            if (returnFocus) {
                previous.focus.focus();
            }
        }

        function dismiss(returnFocus = true) {
            if (!active) {
                return;
            }
            const previous = active;
            active = undefined;
            previous.editor.hidden = true;
            previous.trigger.setAttribute('aria-expanded', 'false');
            previous.reset();
            if (returnFocus) {
                previous.trigger.focus();
            }
        }

        function positionEditor() {
            if (!active) {
                return;
            }
            const narrow = view.innerWidth <= 640;
            const modal = narrow || variant === 'panel';
            active.editor.classList.toggle('regex-demo-dialog', narrow);
            active.editor.setAttribute('aria-modal', String(modal));
            if (variant !== 'popover' || narrow) {
                active.editor.style.left = '';
                active.editor.style.top = '';
                return;
            }
            const anchor = active.trigger.getBoundingClientRect();
            // Fixed viewport coordinates keep the editor outside the scrolling table.
            const width = active.editor.getBoundingClientRect().width;
            const height = active.editor.getBoundingClientRect().height;
            active.editor.style.left =
                Math.max(12, Math.min(anchor.left, view.innerWidth - width - 12)) + 'px';
            const below = anchor.bottom + 8;
            active.editor.style.top =
                Math.max(12, Math.min(below, view.innerHeight - height - 12)) + 'px';
        }

        if (!isInline) {
            document.addEventListener('pointerdown', (event) => {
                if (confirmation) {
                    if (!confirmation.editor.contains(event.target)) {
                        event.preventDefault();
                        cancelConfirmation();
                    }
                    return;
                }
                if (
                    isPanel &&
                    [...panelModeButtons].some(
                        ([button, cell]) => cell.mode === 'regex' && button.contains(event.target),
                    )
                ) {
                    // Preserve drafts until the field activation or explicit confirmation action.
                    event.preventDefault();
                    return;
                }
                if (
                    active &&
                    !active.editor.contains(event.target) &&
                    !active.trigger.contains(event.target)
                ) {
                    dismiss(false);
                }
            });
            document.addEventListener('keydown', (event) => {
                if (confirmation) {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelConfirmation();
                    } else if (event.key === 'Tab') {
                        const [first, last] = confirmation.actions.children;
                        if (event.shiftKey && document.activeElement === first) {
                            event.preventDefault();
                            last.focus();
                        } else if (!event.shiftKey && document.activeElement === last) {
                            event.preventDefault();
                            first.focus();
                        }
                    }
                    return;
                }
                if (!active) {
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    dismiss();
                } else if (
                    event.key === 'Tab' &&
                    active.editor.getAttribute('aria-modal') === 'true'
                ) {
                    const focusable = [
                        ...active.editor.querySelectorAll('input, summary, button'),
                    ].filter((node) => !node.disabled && node.getClientRects().length > 0);
                    const first = focusable[0];
                    const last = focusable.at(-1);
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            });
            view.addEventListener('resize', positionEditor);
            document.addEventListener('scroll', positionEditor, true);
        }

        function element(tag, className = '', text = '') {
            const node = document.createElement(tag);
            node.className = className;
            node.textContent = text;
            return node;
        }

        function inputField(container, labelText, id, value, onInput) {
            const label = element('label', 'regex-demo-field', labelText);
            const input = element('input', 'mpb-mv-input');
            input.type = 'text';
            input.id = id;
            input.value = value;
            input.autocomplete = 'off';
            input.spellcheck = false;
            label.htmlFor = id;
            input.addEventListener('input', () => onInput(input.value));
            label.append(input);
            container.append(label);
            return input;
        }

        function variableCell(market, name) {
            const cell = state.cells[market.id][name];
            const host = element('div', 'mpb-env-node-control regex-demo-cell');
            host.dataset.market = market.id;
            host.dataset.variable = name;
            const id = 'regex-demo-' + market.id + '-' + name;
            const controls = element('div', 'regex-demo-controls');
            const button = element('button', 'mpb-btn mpb-btn--secondary regex-demo-mode');
            button.type = 'button';
            if (isPanel) {
                panelModeButtons.set(button, cell);
            }
            const defaultTemplate = '{{{' + name + '}}}';
            let draft;
            const editor = element(
                'div',
                'regex-demo-editor' + (isInline ? '' : ' regex-demo-overlay regex-demo-' + variant),
            );
            editor.id = id + '-editor';
            button.setAttribute('aria-controls', editor.id);
            const edit = element('button', 'mpb-btn mpb-btn--secondary regex-demo-edit', 'Edit');
            edit.type = 'button';
            edit.setAttribute('aria-label', 'Edit regex for ' + name + ' in ' + market.name);
            edit.setAttribute('aria-controls', editor.id);
            if (!isInline) {
                editor.setAttribute('role', 'dialog');
                const title = element(
                    'h2',
                    'regex-demo-editor-title',
                    name + ' · ' + market.name + ' (' + market.environment + ')',
                );
                title.id = id + '-title';
                editor.setAttribute('aria-labelledby', title.id);
                editor.append(
                    title,
                    element(
                        'p',
                        'regex-demo-editor-help',
                        'Regex mode · global, case-sensitive matching. Changes are drafts until Apply.',
                    ),
                );
            }
            const valueInput = inputField(
                controls,
                isPanel ? '' : 'Market value',
                id + '-value',
                cell.value,
                (value) => {
                    setField(state, market.id, name, 'value', value);
                },
            );
            valueInput.setAttribute(
                'aria-label',
                'Market value for ' + name + ' in ' + market.name,
            );
            controls.append(button);
            if (!isInline && !isPanel) {
                controls.append(edit);
            }
            if (isPanel) {
                panelModeButtons.set(valueInput, cell);
                valueInput.setAttribute('aria-controls', editor.id);
                valueInput.addEventListener('click', () => {
                    if (cell.mode === 'regex') {
                        openEditor(valueInput);
                    }
                });
                valueInput.addEventListener('keydown', (event) => {
                    if (cell.mode === 'regex' && ['Enter', ' '].includes(event.key)) {
                        event.preventDefault();
                        openEditor(valueInput);
                    }
                });
            }
            const draftValueInput = isInline
                ? undefined
                : inputField(editor, 'Market value', id + '-draft-value', cell.value, (value) => {
                      draft.value = value;
                  });
            const patternInput = inputField(
                editor,
                'Search pattern',
                id + '-pattern',
                cell.pattern,
                (value) => {
                    if (isInline) {
                        setField(state, market.id, name, 'pattern', value);
                    } else {
                        draft.pattern = value;
                    }
                    refreshError();
                },
            );
            const error = element('p', 'mpb-field-error regex-demo-error');
            error.id = id + '-error';
            error.setAttribute('aria-live', 'polite');
            patternInput.setAttribute('aria-describedby', error.id);
            editor.append(error);
            const details = element(isPanel ? 'div' : 'details', 'regex-demo-template');
            if (!isPanel) {
                details.append(element('summary', '', 'Template replacement'));
            }
            const templateInput = inputField(
                details,
                'Template replacement',
                id + '-template',
                cell.template ?? defaultTemplate,
                (value) => {
                    if (isInline) {
                        setField(state, market.id, name, 'template', value);
                    } else {
                        draft.template = value;
                    }
                },
            );
            editor.append(details);
            details.addEventListener('toggle', positionEditor);
            const apply = element('button', 'mpb-btn mpb-btn--primary', 'Apply');
            apply.type = 'button';
            const cancel = element('button', 'mpb-btn mpb-btn--secondary', 'Cancel');
            cancel.type = 'button';
            if (!isInline) {
                const actions = element('div', 'regex-demo-editor-actions');
                actions.append(apply, cancel);
                editor.append(actions);
                apply.addEventListener('click', () => {
                    if (validatePattern(draft.pattern)) {
                        refreshError();
                        patternInput.focus();
                        return;
                    }
                    Object.assign(cell, draft);
                    if (isPanel && cell.template === defaultTemplate) {
                        delete cell.template;
                    }
                    valueInput.value = cell.value;
                    dismiss();
                    refreshMode();
                });
                cancel.addEventListener('click', () => dismiss());
            }

            const warning = isPanel
                ? element('div', 'regex-demo-overlay regex-demo-confirmation')
                : undefined;
            let warningActions;
            let keepRegex;
            if (isPanel) {
                warning.id = id + '-confirmation';
                warning.hidden = true;
                warning.setAttribute('role', 'alertdialog');
                warning.setAttribute('aria-modal', 'true');
                const title = element('h2', 'regex-demo-editor-title', 'Switch to text?');
                title.id = warning.id + '-title';
                const message = element(
                    'p',
                    '',
                    'Switching to text deletes the search pattern and template replacement for ' +
                        name +
                        ' in ' +
                        market.name +
                        '. Any unapplied draft will be discarded.',
                );
                message.id = warning.id + '-message';
                warning.setAttribute('aria-labelledby', title.id);
                warning.setAttribute('aria-describedby', message.id);
                keepRegex = element('button', 'mpb-btn mpb-btn--secondary', 'Cancel');
                const switchText = element('button', 'mpb-btn mpb-btn--primary', 'Switch to text');
                keepRegex.type = switchText.type = 'button';
                warningActions = element('div', 'regex-demo-editor-actions');
                warningActions.append(keepRegex, switchText);
                warning.append(title, message, warningActions);
                keepRegex.addEventListener('click', () => cancelConfirmation());
                switchText.addEventListener('click', () => {
                    if (confirmation?.editor !== warning) {
                        return;
                    }
                    cancelConfirmation(false);
                    dismiss(false);
                    delete cell.pattern;
                    delete cell.template;
                    setMode(state, market.id, name, 'literal');
                    refreshMode();
                    button.focus();
                });
                root.append(warning);
            }

            function openEditor(trigger) {
                cancelConfirmation(false);
                if (isPanel && active?.editor === editor) {
                    patternInput.focus();
                    return;
                }
                dismiss(false);
                draft = {
                    ...cell,
                    mode: 'regex',
                    pattern: cell.pattern ?? '',
                    template: cell.template ?? defaultTemplate,
                };
                draftValueInput.value = draft.value;
                patternInput.value = draft.pattern;
                templateInput.value = draft.template;
                details.open = false;
                editor.hidden = false;
                trigger.setAttribute('aria-expanded', 'true');
                if (isPanel) {
                    valueInput.setAttribute('aria-expanded', 'true');
                }
                active = {
                    editor,
                    trigger,
                    reset: () => {
                        draft = undefined;
                        refreshMode();
                    },
                };
                refreshError();
                positionEditor();
                patternInput.focus();
            }

            function refreshError() {
                const message = validatePattern((draft || cell).pattern);
                apply.disabled = message !== '';
                error.textContent = message;
                patternInput.setAttribute('aria-invalid', String(message !== ''));
            }

            function refreshMode() {
                const isRegex = cell.mode === 'regex';
                button.textContent = isRegex ? '.*' : 'aA';
                button.setAttribute('aria-pressed', String(isRegex));
                button.setAttribute('aria-expanded', String(isInline && isRegex));
                const description =
                    (isRegex ? 'Regex' : 'Literal text') +
                    ' mode for ' +
                    name +
                    ' in ' +
                    market.name;
                button.setAttribute('aria-label', description + '; toggle mode');
                button.title = description + '. Click to switch mode.';
                if (isPanel) {
                    valueInput.readOnly = isRegex;
                    valueInput.setAttribute('aria-haspopup', isRegex ? 'dialog' : 'false');
                    valueInput.setAttribute('aria-expanded', 'false');
                    valueInput.setAttribute(
                        'aria-label',
                        'Market value for ' +
                            name +
                            ' in ' +
                            market.name +
                            (isRegex ? '; open regex editor with Enter or Space' : ''),
                    );
                }
                edit.hidden = isInline || isPanel || !isRegex;
                edit.setAttribute('aria-expanded', 'false');
                editor.hidden = !isInline || !isRegex;
                refreshError();
            }

            button.addEventListener('click', () => {
                if (!isInline) {
                    if (cell.mode === 'literal') {
                        openEditor(button);
                        return;
                    }
                    if (isPanel) {
                        if (!confirmation) {
                            confirmation = {
                                editor: warning,
                                trigger: button,
                                actions: warningActions,
                                focus: active ? document.activeElement : button,
                            };
                            warning.hidden = false;
                            button.setAttribute('aria-controls', warning.id);
                            button.setAttribute('aria-expanded', 'true');
                            keepRegex.focus();
                        }
                        return;
                    }
                    dismiss(false);
                }
                setMode(state, market.id, name, cell.mode === 'regex' ? 'literal' : 'regex');
                refreshMode();
            });
            edit.addEventListener('click', () => openEditor(edit));
            host.append(controls);
            if (isInline) {
                host.append(editor);
            } else {
                root.append(editor);
            }
            refreshMode();
            return host;
        }

        const legend = element(
            'p',
            'regex-demo-legend',
            'aA = literal text; .* = regular expression. Each control belongs to one variable in one market. Regex matching is global and case-sensitive (mcdev 10+).',
        );
        root.append(legend);
        const scroll = element('div', 'mpb-mv-scroll');
        const table = element('table', 'mpb-mv-table');
        table.append(element('caption', 'mpb-mv-caption', 'Pipeline #1 — sample Market Variables'));
        const head = element('thead');
        const groups = element('tr');
        groups.append(element('td'), element('td'));
        for (const market of markets) {
            const heading = element('th', 'mpb-mv-env-group', market.environment);
            heading.setAttribute('scope', 'colgroup');
            heading.setAttribute('colspan', '1');
            groups.append(heading);
        }
        const headings = element('tr');
        for (const [className, title] of [
            ['mpb-mv-col-name', 'Variable'],
            ['mpb-mv-col-actions', 'Actions'],
            ...markets.map((market) => ['mpb-mv-col-bu', market.name]),
        ]) {
            const heading = element('th', className, title);
            heading.setAttribute('scope', 'col');
            headings.append(heading);
        }
        head.append(groups, headings);
        const body = element('tbody');
        for (const name of ['suffix', ...variables]) {
            const row = element('tr');
            row.dataset.var = name;
            row.append(element('td', 'mpb-mv-name-cell', name));
            // Renaming/deleting variables is outside this interaction comparison.
            row.append(element('td', 'mpb-mv-actions-cell', name === 'suffix' ? '' : '—'));
            for (const market of markets) {
                const td = element('td', 'mpb-mv-value-cell');
                if (name === 'suffix') {
                    const group = element('div', 'mpb-suffix-input');
                    group.append(element('span', 'mpb-suffix-sep', '_'));
                    const input = element('input');
                    input.type = 'text';
                    input.value = state.suffixes[market.id].slice(1);
                    input.setAttribute('aria-label', 'suffix for ' + market.name);
                    input.addEventListener('input', () => {
                        state.suffixes[market.id] = '_' + input.value.trim();
                    });
                    group.append(input);
                    td.append(group);
                } else {
                    td.append(variableCell(market, name));
                }
                row.append(td);
            }
            body.append(row);
        }
        table.append(head, body);
        scroll.append(table);
        root.append(scroll);
        return { state, variant };
    }

    global.mpbRegexDemo = {
        markets,
        variables,
        createState,
        setMode,
        setField,
        validatePattern,
        mount,
    };
    if (global.document) {
        for (const root of global.document.querySelectorAll('[data-regex-demo]')) {
            mount(root);
        }
    }
})(globalThis);
