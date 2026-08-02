(function () {
  'use strict';

  // ── Mobile sidebar toggle ───────────────────────────────────────────────────

  var toggle = document.getElementById('mobile-menu-toggle');
  var sidebar = document.getElementById('sidebar');
  var overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-visible');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('is-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // ── Sidebar section expand/collapse ────────────────────────────────────────

  var sectionTitles = document.querySelectorAll('.sidebar-section-title');
  sectionTitles.forEach(function (title) {
    title.addEventListener('click', function (e) {
      var section = title.parentElement;
      var children = section.querySelector('.sidebar-children');
      if (children) {
        // Only prevent default if it's a collapsible section (has children)
        var isOpen = children.classList.contains('is-open');
        if (isOpen) {
          children.classList.remove('is-open');
          section.classList.remove('is-active');
        } else {
          children.classList.add('is-open');
          section.classList.add('is-active');
        }
        // Only prevent default navigation when toggling collapsed section
        // Let active-section links through
      }
    });
  });

  // ── Copy code buttons ───────────────────────────────────────────────────────

  document.querySelectorAll('pre').forEach(function (pre) {
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    var btn = document.createElement('button');
    btn.className = 'copy-button';
    btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M1 4v7h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Copy';
    btn.setAttribute('aria-label', 'Copy code');
    wrapper.appendChild(btn);

    btn.addEventListener('click', function () {
      var code = pre.querySelector('code') || pre;
      var text = code.innerText || code.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add('is-copied');
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!';
        setTimeout(function () {
          btn.classList.remove('is-copied');
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="4" y="1" width="7" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M1 4v7h7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Copy';
        }, 2000);
      }).catch(function () {
        // Fallback for older browsers
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch (err) {}
        document.body.removeChild(ta);
        btn.classList.add('is-copied');
        setTimeout(function () { btn.classList.remove('is-copied'); }, 2000);
      });
    });
  });

  // ── Heading anchor copy links ────────────────────────────────────────────────

  var LINK_ICON = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
    + '<path d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0'
    + ' .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25z'
    + 'M3.085 12.915a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5'
    + 'a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"'
    + ' fill="currentColor"/></svg>';

  document.querySelectorAll('.prose h2[id], .prose h3[id], .prose h4[id], .prose h5[id], .prose h6[id]').forEach(function (heading) {
    var anchor = document.createElement('a');
    anchor.className = 'header-anchor';
    anchor.href = '#' + heading.id;
    anchor.setAttribute('aria-label', 'Copy link to this section');
    anchor.innerHTML = LINK_ICON;
    heading.appendChild(anchor);

    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var url = window.location.href.split('#')[0] + '#' + heading.id;
      navigator.clipboard.writeText(url).then(function () {
        anchor.classList.add('is-copied');
        setTimeout(function () { anchor.classList.remove('is-copied'); }, 2000);
      }).catch(function () {
        window.location.hash = heading.id;
      });
    });
  });

  // ── Service worker registration ─────────────────────────────────────────────

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js');
    });
  }

  // ── iOS "Add to Home Screen" guidance tooltip ────────────────────────────────
  // iOS Safari does not fire the beforeinstallprompt event, so we show a
  // one-per-session banner guiding the user to Share → Add to Home Screen.

  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isInStandaloneMode = (window.navigator.standalone === true);
  var iosBannerShown = sessionStorage.getItem('iosBannerShown');

  if (isIos && !isInStandaloneMode && !iosBannerShown) {
    var iosBanner = document.createElement('div');
    iosBanner.className = 'pwa-ios-banner';
    iosBanner.setAttribute('role', 'status');
    iosBanner.innerHTML =
      '<span class="pwa-ios-banner__text">'
      + '<svg class="pwa-ios-banner__share-icon" viewBox="0 0 50 50" fill="currentColor" aria-hidden="true">'
      + '<path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/>'
      + '<path d="M24 7h2v21h-2z"/>'
      + '<path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/>'
      + '</svg>'
      + 'Tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install'
      + '</span>'
      + '<button class="pwa-ios-banner__close" aria-label="Dismiss">'
      + '<svg viewBox="0 0 14 14" fill="currentColor" aria-hidden="true"><path d="M13 1L1 13M1 1l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      + '</button>';

    document.body.appendChild(iosBanner);
    sessionStorage.setItem('iosBannerShown', '1');

    iosBanner.querySelector('.pwa-ios-banner__close').addEventListener('click', function () {
      iosBanner.classList.add('pwa-ios-banner--hidden');
    });
  }

  // ── Keyboard shortcut for search ────────────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      var input = document.getElementById('search-input');
      if (input) {
        input.focus();
        input.select();
      }
    }
    if (e.key === 'Escape') {
      var headerSearchEl = document.querySelector('.header-search');
      if (headerSearchEl) headerSearchEl.classList.remove('is-expanded');
      var results = document.getElementById('search-results');
      if (results) {
        results.hidden = true;
      }
      var input2 = document.getElementById('search-input');
      if (input2) {
        input2.blur();
      }
    }
  });

})();
