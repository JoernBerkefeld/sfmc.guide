/**
 * Client-side search using the static site-index.json catalog.
 * The index is served from /site-index.json (generated for sfmc.guide pages).
 */
(function () {
  'use strict';

  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');

  if (!searchInput || !searchResults) return;

  var headerSearch = document.querySelector('.header-search');
  var cancelBtn = document.querySelector('.search-cancel');

  var EXPAND_THRESHOLD = 280; // px — expand to full-width overlay below this

  function expandSearch() {
    if (headerSearch) headerSearch.classList.add('is-expanded');
  }

  function collapseSearch() {
    if (headerSearch) headerSearch.classList.remove('is-expanded');
    searchResults.hidden = true;
    searchInput.blur();
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      collapseSearch();
    });
  }

  var index = null;
  var documents = [];
  var loadFailed = false;

  // Load search index
  function loadIndex(onReady) {
    // Don't retry after a confirmed failure
    if (loadFailed) {
      if (onReady) onReady();
      return;
    }
    // Prefer the content-hashed URL injected by the template (cache-busted);
    // fall back to the plain path for older cached HTML.
    var url =
      typeof siteIndexUrl !== 'undefined'
        ? siteIndexUrl
        : (typeof siteBaseUrl !== 'undefined' ? siteBaseUrl : '') + '/site-index.json';
    console.log('[search] fetching', url);
    fetch(url)
      .then(function (r) {
        if (!r.ok) {
          throw new Error('HTTP ' + r.status);
        }
        return r.json();
      })
      .then(function (data) {
        console.log('[search] index loaded,', data.length, 'entries');
        documents = data;
        index = buildIndex(data);
        console.log('[search] index built,', Object.keys(index).length, 'tokens');
        if (onReady) onReady();
      })
      .catch(function (err) {
        loadFailed = true;
        console.error('[search] failed to load index:', err);
        searchResults.innerHTML = '<div class="search-empty">Search temporarily unavailable — please reload the page.</div>';
        searchResults.hidden = false;
      });
  }

  // Simple inverted index — tokenize name, description, and aliases
  function buildIndex(docs) {
    // Object.create(null) avoids prototype-pollution collisions when a token
    // happens to match a built-in property name like "constructor".
    var idx = Object.create(null);
    docs.forEach(function (doc, i) {
      var aliases = Array.isArray(doc.aliases) ? doc.aliases.join(' ') : '';
      var text = (doc.name || '') + ' ' + (doc.description || '') + ' ' + aliases;
      var words = tokenize(text);
      words.forEach(function (w) {
        if (!idx[w]) idx[w] = [];
        if (idx[w].indexOf(i) === -1) idx[w].push(i);
      });
    });
    return idx;
  }

  function tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (w) { return w.length > 1; });
  }

  function search(query) {
    if (!index || !query) return [];
    var terms = tokenize(query);
    var scores = Object.create(null);

    terms.forEach(function (term) {
      Object.keys(index).forEach(function (word) {
        if (word.indexOf(term) === 0) {
          var boost = word === term ? 2 : 1;
          index[word].forEach(function (docIdx) {
            scores[docIdx] = (scores[docIdx] || 0) + boost;
          });
        }
      });
    });

    return Object.keys(scores)
      .sort(function (a, b) { return scores[b] - scores[a]; })
      .slice(0, 8)
      .map(function (i) { return documents[parseInt(i, 10)]; });
  }

  function highlight(text, query) {
    if (!text) return '';
    var words = tokenize(query);
    var result = escapeHtml(text.substring(0, 150));
    words.forEach(function (w) {
      var re = new RegExp('(' + escapeRegex(w) + ')', 'gi');
      result = result.replace(re, '<mark>$1</mark>');
    });
    return result;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function renderResults(results, query) {
    console.log('[search] renderResults called, results:', results.length, 'query:', query);
    if (!results.length) {
      searchResults.innerHTML = '<div class="search-empty">No results for "' + escapeHtml(query) + '"</div>';
      searchResults.hidden = false;
      return;
    }

    var html = results.map(function (doc) {
      return '<a class="search-result-item" href="' + escapeHtml(doc.url) + '">' +
        '<div class="result-title">' + highlight(doc.name, query) + '</div>' +
        '<div class="result-section">' + escapeHtml(doc.section || '') + '</div>' +
        (doc.description ? '<div class="result-snippet">' + highlight(doc.description, query) + '…</div>' : '') +
        '</a>';
    }).join('');

    searchResults.innerHTML = html;
    searchResults.hidden = false;
  }

  var debounceTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var q = searchInput.value.trim();
    if (!q) {
      searchResults.hidden = true;
      return;
    }
    debounceTimer = setTimeout(function () {
      if (!index) {
        if (!loadFailed) {
          searchResults.innerHTML = '<div class="search-empty">Loading search…</div>';
          searchResults.hidden = false;
        }
        loadIndex(function () { renderResults(search(q), q); });
        return;
      }
      renderResults(search(q), q);
    }, 200);
  });

  searchInput.addEventListener('focus', function () {
    var wrapper = document.querySelector('.search-wrapper');
    if (wrapper && wrapper.offsetWidth < EXPAND_THRESHOLD) expandSearch();
    var q = searchInput.value.trim();
    if (q && index) {
      renderResults(search(q), q);
    } else if (q && !index) {
      loadIndex(function () { renderResults(search(q), q); });
    } else if (!index) {
      loadIndex();
    }
  });

  document.addEventListener('click', function (e) {
    var inSearch = searchResults.contains(e.target) ||
                   e.target === searchInput ||
                   (headerSearch && headerSearch.contains(e.target));
    if (!inSearch) {
      searchResults.hidden = true;
      if (headerSearch) headerSearch.classList.remove('is-expanded');
    }
  });

  // Keyboard navigation of results
  searchInput.addEventListener('keydown', function (e) {
    var items = searchResults.querySelectorAll('.search-result-item');
    var focused = searchResults.querySelector('.is-focused');
    var idx = Array.prototype.indexOf.call(items, focused);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focused) focused.classList.remove('is-focused');
      var next = items[idx + 1] || items[0];
      if (next) next.classList.add('is-focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focused) focused.classList.remove('is-focused');
      var prev = items[idx - 1] || items[items.length - 1];
      if (prev) prev.classList.add('is-focused');
    } else if (e.key === 'Enter') {
      if (focused) {
        e.preventDefault();
        window.location.href = focused.href;
      }
    }
  });

  // Eagerly load the index so the first search feels instant.
  // search.js is loaded with defer so the DOM is already parsed here —
  // DOMContentLoaded has already fired; call loadIndex() directly.
  loadIndex();

})();
