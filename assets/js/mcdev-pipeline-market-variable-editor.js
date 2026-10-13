/**
 * Draft-only market-variable panel; the caller owns commits and persistence.
 *
 * @param global host browser global
 */
(function (global) {
    'use strict';
    let sequence = 0;
    function expanded(cell, dialog, enabled) {
        cell.trigger.setAttribute('aria-controls', dialog.id);
        cell.trigger.setAttribute('aria-expanded', String(enabled));
    }
    function consume(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    /**
     * Create one editor per rendered market-variable step.
     *
     * @param {HTMLElement} root overlay host, outside the scrolling table
     * @param {object} options readOnly(), onApply(cell, value), onSwitch(cell, scalar)
     * @returns {object} open(cell), confirmSwitch(cell), dispose()
     */
    function create(root, options) {
        const document = root.ownerDocument;
        const helpers = global.mpbConfigBuilder;
        const id = 'mpb-mv-editor-' + ++sequence;
        let active;
        let confirmation;
        let consumeClick = false;
        let disposed = false;

        function element(tag, className = '', text = '') {
            const node = document.createElement(tag);
            node.className = className;
            node.textContent = text;
            return node;
        }
        function button(text, primary, handler) {
            const node = element(
                'button',
                'mpb-btn mpb-btn--' + (primary ? 'primary' : 'secondary'),
                text,
            );
            node.type = 'button';
            node.addEventListener('click', handler);
            return node;
        }
        function overlay(className, role, suffix) {
            const backdrop = element('div', className + '-backdrop');
            const dialog = element('div', className);
            dialog.id = id + suffix;
            dialog.setAttribute('role', role);
            dialog.setAttribute('aria-modal', 'true');
            dialog.hidden = backdrop.hidden = true;
            root.append(backdrop, dialog);
            return { backdrop, dialog };
        }
        const panel = overlay('mpb-mv-panel', 'dialog', '-panel');
        const warning = overlay('mpb-mv-confirmation', 'alertdialog', '-confirmation');
        const title = element('h2');
        title.id = id + '-title';
        panel.dialog.setAttribute('aria-labelledby', title.id);
        panel.dialog.append(
            title,
            element(
                'p',
                '',
                'Regex mode · global, case-sensitive matching. Changes remain drafts until Apply.',
            ),
        );
        function field(labelText, suffix, property) {
            const label = element('label', 'mpb-mv-editor-field', labelText);
            const input = element('input', 'mpb-mv-input');
            input.id = id + '-' + suffix;
            input.type = 'text';
            input.autocomplete = 'off';
            input.spellcheck = false;
            label.htmlFor = input.id;
            input.addEventListener('focus', () => {
                if (active) {
                    active.focus = input;
                }
            });
            input.addEventListener('input', () => {
                if (active && !options.readOnly()) {
                    active.draft[property] = input.value;
                    refreshError();
                }
            });
            label.append(input);
            panel.dialog.append(label);
            return input;
        }
        const replace = field('Market value', 'replace', 'replace');
        const search = field('Search pattern', 'search', 'search');
        const error = element('p', 'mpb-mv-editor-error mpb-field-error');
        error.id = id + '-error';
        error.setAttribute('aria-live', 'polite');
        search.setAttribute('aria-describedby', error.id);
        panel.dialog.append(error);
        const template = field('Template replacement', 'template', 'template');
        const apply = button('Apply', true, () => {
            if (!active || options.readOnly() || refreshError()) {
                return;
            }
            const previous = active;
            const value = helpers.normalizeMarketVariable(previous.draft, previous.cell.name);
            dismiss();
            options.onApply(previous.cell, value);
        });
        const cancel = button('Cancel', false, () => dismiss());
        const actions = element('div', 'mpb-mv-editor-actions');
        const panelSwitch = button('Switch to text', false, () => {
            if (active) {
                if (helpers.classifyMarketVariable(active.cell.value) === 'scalar') {
                    dismiss();
                } else {
                    confirmSwitch(active.cell);
                }
            }
        });
        actions.append(apply, panelSwitch, cancel);
        panel.dialog.append(actions);
        const warningTitle = element('h2', '', 'Switch to text?');
        warningTitle.id = id + '-warning-title';
        const message = element('p');
        message.id = id + '-warning-message';
        warning.dialog.setAttribute('aria-labelledby', warningTitle.id);
        warning.dialog.setAttribute('aria-describedby', message.id);
        const keep = button('Cancel', false, () => cancelConfirmation());
        const switchText = button('Switch to text', true, () => {
            if (!confirmation || options.readOnly()) {
                return;
            }
            const previous = confirmation.cell;
            if (helpers.classifyMarketVariable(previous.value) !== 'regex') {
                return;
            }
            const value = helpers.displayedMarketVariableValue(previous.value);
            cancelConfirmation(false);
            dismiss(false);
            previous.trigger.focus();
            options.onSwitch(previous, value);
        });
        const warningActions = element('div', 'mpb-mv-editor-actions');
        warningActions.append(keep, switchText);
        warning.dialog.append(warningTitle, message, warningActions);

        function refreshError() {
            const reason =
                active?.invalid || (active && helpers.validateMarketVariable(active.draft));
            error.textContent = reason || '';
            search.setAttribute('aria-invalid', String(Boolean(reason)));
            apply.disabled = Boolean(reason) || options.readOnly();
            return reason;
        }
        function cancelConfirmation(returnFocus = true) {
            if (!confirmation) {
                return;
            }
            const previous = confirmation;
            confirmation = undefined;
            warning.dialog.hidden = warning.backdrop.hidden = true;
            expanded(previous.cell, panel.dialog, active?.cell.key === previous.cell.key);
            if (returnFocus) {
                previous.focus.focus();
            }
        }
        function dismiss(returnFocus = true) {
            cancelConfirmation(false);
            if (!active) {
                return;
            }
            const previous = active;
            active = undefined;
            panel.dialog.hidden = panel.backdrop.hidden = true;
            expanded(previous.cell, panel.dialog, false);
            if (returnFocus) {
                previous.cell.trigger.focus();
            }
        }

        /**
         * Open a regex draft; stable keys identify a BU/variable pair.
         *
         * @param {object} cell key, name, marketLabel, value (native), trigger (focusable)
         */
        function open(cell) {
            if (disposed || options.readOnly()) {
                return;
            }
            cancelConfirmation(false);
            if (active?.cell.key === cell.key) {
                search.focus();
                return;
            }
            dismiss(false);
            const kind = helpers.classifyMarketVariable(cell.value);
            const draft = {
                search: kind === 'regex' ? cell.value.search : '',
                replace: helpers.displayedMarketVariableValue(cell.value),
                template:
                    kind === 'regex'
                        ? (cell.value.template ?? '{{{' + cell.name + '}}}')
                        : '{{{' + cell.name + '}}}',
            };
            active = {
                cell,
                draft,
                focus: replace,
                invalid: kind === 'invalid' ? helpers.validateMarketVariable(cell.value) : null,
            };
            panelSwitch.hidden = kind === 'invalid';
            title.textContent = cell.name + ' · ' + cell.marketLabel;
            replace.value = String(draft.replace);
            search.value = draft.search;
            template.value = draft.template;
            panel.dialog.hidden = panel.backdrop.hidden = false;
            expanded(cell, panel.dialog, true);
            refreshError();
            replace.focus();
        }

        /**
         * Ask before discarding saved regex settings, without touching an open draft.
         *
         * @param {object} cell same shape as open(cell); value must be a regex object
         */
        function confirmSwitch(cell) {
            if (
                disposed ||
                options.readOnly() ||
                helpers.classifyMarketVariable(cell.value) !== 'regex' ||
                confirmation
            ) {
                return;
            }
            if (active && active.cell.key !== cell.key) {
                dismiss(false);
            }
            confirmation = { cell, focus: active ? active.focus : cell.trigger };
            message.textContent =
                'Switching to text deletes the search pattern and template replacement for ' +
                cell.name +
                ' in ' +
                cell.marketLabel +
                '. Any unapplied draft will be discarded.';
            warning.dialog.hidden = warning.backdrop.hidden = false;
            expanded(cell, warning.dialog, true);
            switchText.disabled = false;
            keep.focus();
        }
        function pointerdown(event) {
            if (confirmation && !warning.dialog.contains(event.target)) {
                consume(event);
                consumeClick = true;
                cancelConfirmation();
            } else if (!confirmation && event.target === panel.backdrop) {
                consume(event);
                consumeClick = true;
                dismiss();
            }
        }
        function click(event) {
            if (consumeClick || (confirmation && !warning.dialog.contains(event.target))) {
                consume(event);
                consumeClick = false;
                cancelConfirmation();
            }
        }
        function keydown(event) {
            const dialog = confirmation ? warning.dialog : active ? panel.dialog : null;
            if (!dialog) {
                return;
            }
            if (event.key === 'Escape') {
                consume(event);
                if (confirmation) {
                    cancelConfirmation();
                } else {
                    dismiss();
                }
            } else if (event.key === 'Tab') {
                const nodes = [...dialog.querySelectorAll('input, button')].filter(
                    (node) => !node.disabled && node.getClientRects().length > 0,
                );
                const first = nodes[0];
                const last = nodes.at(-1);
                if (
                    event.shiftKey &&
                    (document.activeElement === first || !dialog.contains(document.activeElement))
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (
                    !event.shiftKey &&
                    (document.activeElement === last || !dialog.contains(document.activeElement))
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }
        }
        document.addEventListener('pointerdown', pointerdown, true);
        document.addEventListener('click', click, true);
        document.addEventListener('keydown', keydown, true);
        function dispose() {
            if (disposed) {
                return;
            }
            dismiss(false);
            disposed = true;
            document.removeEventListener('pointerdown', pointerdown, true);
            document.removeEventListener('click', click, true);
            document.removeEventListener('keydown', keydown, true);
            for (const node of [panel.dialog, panel.backdrop, warning.dialog, warning.backdrop]) {
                node.remove();
            }
        }
        return { open, confirmSwitch, dispose };
    }
    global.mpbMarketVariableEditor = { create };
})(globalThis);
