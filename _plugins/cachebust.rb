# frozen_string_literal: true
#
# Automatic, per-file cache-busting Liquid filter.
#
# Usage in templates:
#   <link rel="stylesheet" href="{{ '/assets/css/main.css' | relative_url | cache_bust }}">
#   <script src="{{ '/assets/js/main.js' | relative_url | cache_bust }}"></script>
#
# Appends `?v=<token>` where <token> is the first 10 hex chars of the MD5 of the
# referenced file's real content, so the query string changes exactly when the
# file changes and is stable for identical content. Works on both `jekyll serve`
# and the production `bundle exec jekyll build` (this repo builds itself in its
# GitHub Action, so `_plugins/*.rb` are executed).
#
# Only local/relative assets are touched. Absolute (`http://`, `https://`),
# protocol-relative (`//`) and `data:`/`mailto:` URLs are returned unchanged.

require 'digest'

module Jekyll
  module CacheBustFilter
    # Match a scheme (http:, https:, mailto:, data: …) or a protocol-relative
    # URL (//cdn.example.com/…) — anything we must not append a token to.
    EXTERNAL_URL = %r{\A(?:[a-z][a-z0-9+.-]*:|//)}i.freeze

    # Append `?v=<content-hash>` to a local asset URL.
    #
    # @param input [String] the (already `relative_url`-processed) asset URL
    # @return [String] the URL with a content-derived cache-busting query string,
    #   or the original input when it is external or the file can't be resolved
    def cache_bust(input)
      url = input.to_s
      return url if url.empty?
      return url if url =~ EXTERNAL_URL

      # Separate the fragment (#…) and any pre-existing query (?…) from the path
      # so we resolve the real file and re-attach the extras afterwards.
      path_part, hash, fragment = url.partition('#')
      path_only, _q, query = path_part.partition('?')

      site = @context.registers[:site]
      token = cache_bust_token(site, path_only)
      return url if token.nil?

      # Append the token, preserving an existing query string and fragment.
      new_query = query.empty? ? "v=#{token}" : "#{query}&v=#{token}"
      "#{path_only}?#{new_query}#{hash}#{fragment}"
    end

    private

    # Resolve the on-disk source file for a site-relative URL and hash it.
    #
    # @param site [Jekyll::Site] the current site
    # @param path_part [String] URL path (baseurl already applied, no query)
    # @return [String, nil] a short hex token, or nil when the file is missing
    def cache_bust_token(site, path_part)
      baseurl = site.config['baseurl'].to_s
      rel = path_part
      # Strip the configured baseurl prefix so we can locate the source file.
      rel = rel[baseurl.length..-1] if !baseurl.empty? && rel.start_with?(baseurl)
      rel = rel.sub(%r{\A/}, '')
      return nil if rel.empty?

      file = File.join(site.source, rel)
      return Digest::MD5.file(file).hexdigest[0, 10] if File.file?(file)

      # SCSS/Sass sources compile to `.css` — the request is `/assets/css/x.css`
      # but the real source is `/assets/css/x.scss`. Hash the source so the token
      # is available regardless of build/render ordering.
      if rel.end_with?('.css')
        %w[.scss .sass].each do |ext|
          src = File.join(site.source, rel.sub(/\.css\z/, ext))
          return Digest::MD5.file(src).hexdigest[0, 10] if File.file?(src)
        end
      end

      # Last resort: hash the already-generated file from the destination tree.
      dest = File.join(site.dest, rel)
      return Digest::MD5.file(dest).hexdigest[0, 10] if File.file?(dest)

      nil
    end
  end
end

Liquid::Template.register_filter(Jekyll::CacheBustFilter)
