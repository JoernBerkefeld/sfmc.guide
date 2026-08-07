# frozen_string_literal: true
#
# Rouge lexer for AMPscript (Marketing Cloud Engagement).
#
# Fence a code block with ```ampscript to use it. AMPscript is an HTML
# templating language, so this is a TemplateLexer: everything outside a
# %%[ ]%% block, a %%= =%% inline, a %%Personalization%% string or an
# AMPscript <script> tag is handed to the HTML lexer.
#
# The token model is ported from the SFMC Language Service TextMate grammar
# (vscode-sfmc-language/syntaxes/ampscript.tmLanguage.json) so code samples on
# the site read the same way they do in the editor.
#
# Token types are deliberately restricted to the ones _sass/_code.scss styles.
#
# Function names come from _plugins/sfmc_catalogs.rb, generated from
# ampscript-data. Never inline a function list here.

require 'rouge'
require_relative 'sfmc_catalogs'

module Rouge
  module Lexers
    class AMPscript < TemplateLexer
      title 'AMPscript'
      desc 'AMPscript, the templating language of Salesforce Marketing Cloud Engagement'
      tag 'ampscript'
      aliases 'amp'
      filenames '*.amp', '*.ampscript'

      # An AMPscript <script> tag. Marketing Cloud treats a server-side script
      # tag as SSJS unless language="ampscript" says otherwise, so both
      # attributes have to be present for the content to be AMPscript.
      AMPSCRIPT_SCRIPT_TAG = %r{
        (<\s*script\b)
        (?=[^>]*\brunat\s*=\s*["']server["'])
        (?=[^>]*\blanguage\s*=\s*["']ampscript["'])
        ([^>]*)
        (>)
      }ix.freeze

      # Where the HTML delegation has to stop and an AMPscript rule take over.
      BREAKOUT = %r{%%|<\s*script\b}i.freeze

      state :root do
        rule %r/%%\[/, Keyword::Reserved, :block
        rule %r/%%=/, Keyword::Reserved, :inline

        # Content syndication, e.g. %%HTTPGet "https://..."%%
        rule %r/%%(?:After;)?(?:HTTPGet|HTTPPost)\s+"[^"]*"%%/i, Name::Builtin

        # Personalization string, e.g. %%FirstName%%
        rule %r/%%(?!\[|=)[a-zA-Z_][a-zA-Z0-9_ ]*%%/, Name::Attribute

        rule AMPSCRIPT_SCRIPT_TAG do |m|
          token Name::Tag, m[1]
          token Name::Attribute, m[2]
          token Name::Tag, m[3]
          push :script_block
        end

        # A lone %% or a non-AMPscript <script> is plain markup. Handing the
        # opening delimiter to HTML keeps the parent's state machine in sync;
        # a server-side SSJS block then lands in the HTML lexer's own
        # JavaScript delegation, which is what we want.
        rule %r/%%/ do
          delegate parent
        end

        rule %r/<\s*script\b/i do
          delegate parent
        end

        rule %r/.+?(?=#{BREAKOUT})|.+/m do
          delegate parent
        end
      end

      state :block do
        rule %r/\]%%/, Keyword::Reserved, :pop!
        mixin :ampscript
      end

      state :inline do
        rule %r/=%%/, Keyword::Reserved, :pop!
        mixin :ampscript
      end

      state :script_block do
        rule %r(<\s*/\s*script\s*>)i, Name::Tag, :pop!
        mixin :ampscript
      end

      state :ampscript do
        rule %r(/\*.*?\*/)m, Comment::Multiline

        rule %r/"/, Str::Double, :string_double
        rule %r/'/, Str::Single, :string_single

        rule %r/-?\d+\.\d+/, Num::Float
        rule %r/-?\d+/, Num::Integer

        # Keywords first: `if` and `not` would otherwise look like calls when
        # followed by a parenthesised condition.
        rule %r/\b(?:var|set)\b/i, Keyword::Declaration
        rule %r/\b(?:and|or|not)\b/i, Operator::Word
        rule %r/\b(?:true|false)\b/i, Keyword
        rule %r/\b(?:if|then|elseif|else|endif|for|to|downto|do|next)\b/i, Keyword

        rule %r/@@[a-zA-Z_]\w*/, Name::Builtin
        rule %r/@[a-zA-Z_]\w*/, Name::Variable

        rule %r/[a-zA-Z_]\w*(?=\s*\()/ do |m|
          if SfmcGuide::Catalogs::AMPSCRIPT_FUNCTIONS.include?(m[0].downcase)
            token Name::Builtin
          else
            token Name::Function
          end
        end

        # Bracketed field name, e.g. [Email Address]
        rule %r/\[[^\]\n]+\]/, Name::Attribute

        rule %r/==|!=|>=|<=|[<>=]/, Operator
        rule %r/[(),]/, Punctuation

        rule %r/\s+/m, Text
        rule %r/./m, Text
      end

      # AMPscript escapes a quote by doubling it.
      state :string_double do
        rule %r/""/, Str::Escape
        rule %r/"/, Str::Double, :pop!
        rule %r/[^"]+/m, Str::Double
      end

      state :string_single do
        rule %r/''/, Str::Escape
        rule %r/'/, Str::Single, :pop!
        rule %r/[^']+/m, Str::Single
      end
    end
  end
end
