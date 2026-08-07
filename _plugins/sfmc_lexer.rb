# frozen_string_literal: true
#
# Rouge lexer for Marketing Cloud Next content: Handlebars layered over
# AMPscript layered over HTML.
#
# Fence a code block with ```sfmc to use it. Plain ```handlebars still gets
# Rouge's stock lexer, which knows nothing about Marketing Cloud.
#
# This mirrors the SFMC Language Service TextMate grammar
# (vscode-sfmc-language/syntaxes/sfmc.tmLanguage.json), which is a set of
# Handlebars patterns followed by an include of the AMPscript grammar. Rouge's
# Handlebars lexer is a TemplateLexer, so the same layering is just a parent:
#
#   Handlebars -> AMPscript -> HTML
#
# Rouge's grammar already covers block helpers, comments, subexpressions,
# @data variables, block params and hash arguments. What it cannot know about
# is added here:
#
#   1. {!$binding} — the Marketing Cloud Next binding syntax, absent from
#      Handlebars proper.
#   2. Which helper names are real. Stock Rouge tags every helper the same;
#      splitting documented helpers from unknown ones matches what the
#      AMPscript lexer does for functions.
#   3. `as |block params|`, which the TextMate grammar scopes as a keyword.
#
# Known limitation: a binding inside an HTML attribute value, as in
# href="{!$link.PreferenceCenterUrl}", stays plain string. The TextMate
# grammar handles that with a scope injection; Rouge has no equivalent.
#
# Helper and binding names come from _plugins/sfmc_catalogs.rb, generated from
# handlebars-data. Never inline a helper list here.

require 'rouge'
require_relative 'sfmc_catalogs'
require_relative 'ampscript_lexer'

module Rouge
  module Lexers
    class SFMC < Handlebars
      title 'SFMC (Marketing Cloud Next)'
      desc 'Handlebars with AMPscript and HTML, as used by Marketing Cloud Next'
      tag 'sfmc'
      aliases 'mcn'

      # Words Handlebars gives its own meaning to. The inherited rules already
      # scope these, so the helper-name rules below must decline them.
      STACHE_RESERVED = /(?:else|this|true|false)(?=[}\s])/.freeze

      # Content outside a {{ }} expression is AMPscript, which in turn treats
      # its own non-AMPscript content as HTML.
      def parent
        @parent ||= lexer_option(:parent) || AMPscript.new(@options)
      end

      start { @seen_helper = false }

      prepend :root do
        # {!$organization.Address} — a Marketing Cloud Next binding.
        rule %r/(\{!\$)([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)(\})/ do |m|
          token Punctuation, m[1]
          token(
            SfmcGuide::Catalogs::HANDLEBARS_BINDINGS.include?(m[2]) ? Name::Builtin : Name::Variable,
            m[2],
          )
          token Punctuation, m[3]
        end

        # The inherited text rule stops only at \ or {{, so without this a
        # binding is swallowed before its rule is ever tried. Matches a run of
        # characters that starts none of the three delimiters, so it can never
        # cross one. Unquoted-attribute handling is copied from the inherited
        # rule; the parent needs to leave :attr when the value ends.
        rule %r/(?:(?!\\|\{\{|\{!\$).)+/m do
          delegate parent
          parent.pop! if parent.state?('attr')
        end
      end

      # {{#each}} / {{/each}} — the name right after the block sigil.
      prepend :block_name do
        rule %r/(?!#{STACHE_RESERVED})[A-Za-z_][\w-]*(?=[}\s])/ do |m|
          token helper_token(m[0])
          @seen_helper = true
          pop!
        end
      end

      # {{helper arg}} — the first name in a stache is the helper, anything
      # after it is an argument. Rouge enters :stache with :open_sym on top, so
      # by the time this state runs any block sigil has been consumed.
      prepend :stache do
        rule %r/\bas\b(?=\s*\|)/, Keyword

        rule %r/(?!#{STACHE_RESERVED})[A-Za-z_][\w-]*(?=[}\s])/ do |m|
          if @seen_helper
            token Name::Variable, m[0]
          else
            token helper_token(m[0])
            @seen_helper = true
          end
        end

        rule %r/\}\}\}?/ do |m|
          token Keyword, m[0]
          @seen_helper = false
          pop!
        end
      end

      private

      # Documented Marketing Cloud Next helpers are highlighted as built-ins;
      # anything else is a plain function name.
      def helper_token(name)
        SfmcGuide::Catalogs::HANDLEBARS_HELPERS.include?(name) ? Name::Builtin : Name::Function
      end
    end
  end
end
