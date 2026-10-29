(function () {
  'use strict';

  const groups = [];
  for (const root of document.querySelectorAll('[data-operation-tabs]')) {
    const list = root.querySelector('[data-tab-list]');
    const tabs = [...list.querySelectorAll('[data-method]')];
    const panels = [...root.querySelectorAll('[data-method-panel]')];
    const enabled = tabs.filter((tab) => !tab.disabled);
    // eslint-disable-next-line unicorn/consistent-function-scoping -- Selection closes over this operation's tabs and panels.
    const select = (tab, focus = false) => {
      if (!enabled.includes(tab)) {
        return;
      }
      for (const item of tabs) {
        item.setAttribute('aria-selected', String(item === tab));
        item.tabIndex = item === tab ? 0 : -1;
      }
      for (const panel of panels) {
        panel.hidden = panel.dataset.methodPanel !== tab.dataset.method;
      }
      if (focus) {
        tab.focus();
      }
    };
    // Only add tab semantics when there is an actual selectable panel.
    if (enabled.length > 0) {
      list.setAttribute('role', 'tablist');
      for (const tab of tabs) {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', 'false');
        tab.tabIndex = -1;
        const panel = panels.find((item) => item.dataset.methodPanel === tab.dataset.method);
        if (panel) {
          tab.setAttribute('aria-controls', panel.id);
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tab.id);
          panel.tabIndex = 0;
        }
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', (event) => {
          if (!enabled.includes(tab)) {
            return;
          }
          const index = enabled.indexOf(tab);
          let next;
          switch (event.key) {
            case 'ArrowRight': {
              next = enabled[(index + 1) % enabled.length];
              break;
            }
            case 'ArrowLeft': {
              next = enabled[(index + enabled.length - 1) % enabled.length];
              break;
            }
            case 'Home': {
              next = enabled[0];
              break;
            }
            case 'End': {
              next = enabled.at(-1);
              break;
            }
            default: {
              return;
            }
          }
          event.preventDefault();
          select(next, true);
        });
      }
      select(enabled[0]);
    }
    list.hidden = false;
    root.classList.add('operation-tabs--enhanced');
    groups.push({ tabs, panels, select });
  }

  // Reveal before scrolling: the browser's first fragment scroll may have hit a hidden panel.
  function revealFragment() {
    let id;
    try {
      id = decodeURIComponent(globalThis.location.hash.slice(1));
    } catch {
      return;
    }
    // eslint-disable-next-line unicorn/prefer-query-selector -- Fragment IDs are literal identifiers, not CSS selectors requiring escaping.
    const target = id && document.getElementById(id);
    if (!target) {
      return;
    }
    for (const { tabs, panels, select } of groups) {
      const panel = panels.find((item) => item === target || item.contains(target));
      if (panel) {
        select(tabs.find((tab) => tab.dataset.method === panel.dataset.methodPanel));
        target.scrollIntoView();
        return;
      }
    }
  }
  globalThis.addEventListener('hashchange', revealFragment);
  revealFragment();
})();
