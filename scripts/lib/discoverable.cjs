'use strict';

/**
 * Shared skip predicates for sfmc.guide discoverability.
 *
 * `discoverable: false` is the author switch. Search (this helper) skips on that
 * alone. `sitemap: false` is a second skip path for pages hidden from the sitemap
 * without `discoverable`. Jekyll copies discoverable → sitemap via
 * `_plugins/discoverable.rb`; authors do not need to write `sitemap: false` for
 * search.
 */

/**
 * YAML / parsed-frontmatter false (boolean or the string the line parser stores).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isExplicitFalse(value) {
  return value === false || value === 'false';
}

/**
 * Whether a Markdown page belongs in `site-index.json`.
 *
 * @param {Record<string, unknown>|null|undefined} fm parsed frontmatter
 * @returns {boolean}
 */
function shouldIndexPage(fm) {
  if (!fm || !fm.title) {
    return false;
  }
  if (isExplicitFalse(fm.discoverable)) {
    return false;
  }
  if (isExplicitFalse(fm.sitemap)) {
    return false;
  }
  return true;
}

/**
 * Whether a tools-catalog entry should appear as a card on `/tools/`.
 * The per-tool page is still generated and deep-linkable.
 *
 * @param {{discoverable?: boolean|string}|null|undefined} tool
 * @returns {boolean}
 */
function shouldListOnToolsIndex(tool) {
  if (!tool) {
    return false;
  }
  return !isExplicitFalse(tool.discoverable);
}

/**
 * Strip a hash fragment so `/tools/#own-tools` resolves to `/tools/`.
 *
 * @param {unknown} url
 * @returns {string}
 */
function navPathFromUrl(url) {
  if (typeof url !== 'string' || !url) {
    return '';
  }
  return url.split('#')[0];
}

/**
 * Sidebar contract: hide a nav URL when the linked page is in the hidden map.
 * External URLs and unknown paths stay visible.
 *
 * @param {unknown} url
 * @param {Record<string, boolean>|null|undefined} hiddenUrls
 * @returns {boolean}
 */
function isNavUrlDiscoverable(url, hiddenUrls) {
  const path = navPathFromUrl(url);
  if (!path || !hiddenUrls) {
    return true;
  }
  return !hiddenUrls[path];
}

module.exports = {
  isExplicitFalse,
  shouldIndexPage,
  shouldListOnToolsIndex,
  navPathFromUrl,
  isNavUrlDiscoverable,
};
