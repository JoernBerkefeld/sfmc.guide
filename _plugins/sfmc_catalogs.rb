# frozen_string_literal: true
#
# Name catalogs shared by the SFMC Rouge lexers.
#
# AUTO-GENERATED — do not edit by hand.
# Regenerate with: node sfmc.guide/scripts/generate-rouge-lexer-data.mjs
#
# Sources of truth:
#   ampscript-data/src/index.js   -> FUNCTIONS, AMPSCRIPT_KEYWORDS
#   handlebars-data/src/index.js  -> HELPERS, BUILTIN_BINDINGS

require 'set'

module SfmcGuide
  module Catalogs
    # Documented AMPscript functions. AMPscript is case-insensitive, so the
    # lexer downcases before lookup and these are stored downcased.
    AMPSCRIPT_FUNCTIONS = Set.new(%w[
      add addmscrmlistmember addobjectarrayitem attachfile attributevalue
      authenticatedemployeeid authenticatedemployeenotificationaddress
      authenticatedemployeeusername authenticatedenterpriseid authenticatedmemberid
      authenticatedmembername barcodeurl base64decode base64encode beginimpressionregion
      buildoptionlist buildrowsetfromjson buildrowsetfromstring buildrowsetfromxml char claimrow
      claimrowvalue cloudpagesurl concat contentarea contentareabyname contentblockbyid
      contentblockbykey contentblockbyname contentimagebyid contentimagebykey createmscrmrecord
      createobject createsalesforceobject createsmsconversation dataextensionrowcount dateadd
      datediff dateparse datepart decryptsymmetric deletedata deletede describemscrmentities
      describemscrmentityattributes divide domain empty encryptsymmetric endimpressionregion
      endsmsconversation executefilter executefilterorderedrows field format formatcurrency
      formatdate formatnumber getjwt getjwtbykeyname getportfolioitem getpublishedsocialcontent
      getsendtime getsocialpublishurl getsocialpublishurlbyname guid httpget httppost httppost2
      httppostwithretry httprequestheader iif image indexof insertdata insertde invokecreate
      invokedelete invokeexecute invokeperform invokeretrieve invokeupdate ischtmlbrowser
      isemailaddress isnull isnulldefault isphonenumber length livecontentmicrositeurl
      localdatetosystemdate longsfid lookup lookuporderedrows lookuporderedrowscs lookuprows
      lookuprowscs lowercase md5 micrositeurl mms_content_url mod msg multiply noun nouns now
      output outputline propercase queryparameter raiseerror random ratingstars redirect
      redirectto regexmatch replace replacelist requestparameter retrievemscrmrecords
      retrievemscrmrecordsfetchxml retrievesalesforcejobsources retrievesalesforceobjects row
      rowcount setobjectproperty setsmsconversationnextkeyword setstatemscrmrecord sha1 sha256
      sha512 stringtodate stringtohex substring subtract systemdatetolocaldate transformxml
      treatascontent treatascontentarea trim updatedata updatede updatemscrmrecords
      updatesinglesalesforceobject uppercase upsertcontact upsertdata upsertde upsertmscrmrecord
      urlencode v verb wat watp wraplongurl
    ]).freeze

    # Reserved words: control flow, declarations, logical operators, booleans.
    AMPSCRIPT_KEYWORDS = Set.new(%w[
      and do downto else elseif endif false for if next not or set then to true var
    ]).freeze

    # Handlebars helpers available on Marketing Cloud Next.
    HANDLEBARS_HELPERS = Set.new(%w[
      add and char compare concat dateAdd dateDiff divide each equals fallback filter flatten
      format formatCurrency formatNumber get getContentBlock hash if iif indexOf isEmpty
      jsonPath length lookup lowercase map modulo multiply not now or personalizationResult
      properCase query queryFirst raiseError random repeat replace set slice sort substring
      subtract timeZoneConversion trim unless uppercase with
    ]).freeze

    # Namespaces and full paths used by {!$binding} tokens.
    HANDLEBARS_BINDINGS = Set.new(%w[
      link link.EmailAddressOptOutUrl link.PreferenceCenterUrl organization organization.Address
    ]).freeze
  end
end
