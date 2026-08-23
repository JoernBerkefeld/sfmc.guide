# frozen_string_literal: true
#
# Discoverable hiding — sitemap copy + sidebar lookup.
#
# Author switch is `discoverable: false` in page frontmatter. Pages stay in the
# build (do not use `published: false`) and remain reachable by exact URL.
#
# This plugin:
#   1. Copies `discoverable: false` → `sitemap: false` so jekyll-sitemap cannot
#      see a hidden page just because the author omitted the sitemap key.
#      Must run at `:site, :post_read` (before generators), not `:pre_render`.
#   2. Exposes `site.data.undiscoverable_urls` (url / permalink → true) for
#      `_includes/sidebar.html`, so a leftover `_data/navigation.yml` entry is
#      still omitted.

module Jekyll
  # Remember one URL form (and its trailing-slash twin) as hidden from nav.
  #
  # @param hidden [Hash] mutable lookup written onto site.data
  # @param key [String, nil] page.url or permalink
  # @return [void]
  def self.remember_undiscoverable_url(hidden, key)
    return if key.nil?

    raw = key.to_s
    return if raw.empty? || raw.start_with?('http://', 'https://')

    path = raw.split('#', 2).first
    return if path.nil? || path.empty?

    hidden[path] = true
    if path.end_with?('/')
      hidden[path.chomp('/')] = true
    else
      hidden["#{path}/"] = true
    end
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  hidden = {}

  (site.pages + site.documents).each do |item|
    next unless item.data['discoverable'] == false

    item.data['sitemap'] = false
    Jekyll.remember_undiscoverable_url(hidden, item.url)
    Jekyll.remember_undiscoverable_url(hidden, item.data['permalink'])
  end

  site.data['undiscoverable_urls'] = hidden
end
