---
layout: page
title: "Collect Code"
description: "Working with Einstein Recommendations in Marketing Cloud Engagement."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/einstein/recommendation/collect-code/
platforms:
  - engagement
---

{% include callout.html type="note" title="Originally published" content="First published **2020-09-27** in the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/einstein/recommendation/). Ported here for sfmc.guide." %}

> Official documentation: [help.salesforce.com](https://help.salesforce.com/articleView?id=mc_ctc_collect_code.htm&type=5)

The default sample codes all assume a page load is happening whenever something needs to be tracked. However, the `collect.js` library is actually capable of being loaded asynchronously and can be used in a single-page-application (SPA) environment as well, similarly to [Google's analytics.js](https://developers.google.com/analytics/devguides/collection/analyticsjs).

### Note to developers

While the offical sample code snippets might lead you to believe that you are looking at an **Array**, that is in fact only half true. The variable `_etmc` gets rewritten by `collect.js` to become an object that happens to also expose a method named `push()`. Their base snippet in fact assumes that `collect.js` has been loaded synchronously before you execute your first call to `push()`. Essentially, the first Array-element is the name of an internal method of collect.js that gets executed.

For more details, have a look at the [collect.js](/engagement/einstein/recommendation/collect-code/default/collect.js) library itself.

### Initialize the library

#### Collect Code on page load

_Quoting from [SFMC's documentation](https://help.salesforce.com/articleView?id=mc_ctc_install_collect_code.htm&type=5):_

The Collect Code should be placed just before the closing head tag and before any other Marketing Cloud code.

To initialize the tracking, do not forget to replace the two occurences of "INSERT_MID" with your actual BU's Member ID.

```html
<script src='//INSERT_MID.collect.igodigital.com/collect.js'></script>
```

This code should be placed directly below the `</head>` tag following the above tag.

```html
<script>
_etmc.push(['setOrgId', 'INSERT_MID']);


// then execute tracking, e.g.:
// _etmc.push(['trackPageView']);
</script>
```

Download: [Default sample code](https://github.com/JoernBerkefeld/SFMC-Cookbook/blob/master/einstein/recommendation/collect-code/default/collect-code.defaut.html)

#### Asynchronous Collect Code

The Collect Code tag should be added near the top of the `<head>` tag and before any other script or CSS tags.

To initialize the tracking, do not forget to replace the two occurences of "INSERT_MID" with your actual BU's Member ID.

```html
<!-- Einstein Collect Code -->
<script>
(function(e,t,c,n,o,s,a){e[o]=e[o]||[],s=t.createElement(c),a=t.getElementsByTagName(c)[0],s.async=1,s.src=n,a.parentNode.insertBefore(s,a)})(window,document,'script','//INSERT_MID.collect.igodigital.com/collect.js','_etmc');

// always run this line once, followed by what you actually want to track; can be run programmatically in single-page-applications
_etmc.push(['setOrgId', 'INSERT_MID']);


// then execute tracking, e.g.:
// _etmc.push(['trackPageView']);
</script>
<!-- End Einstein Collect Code -->
```

Download: [Async sample code](https://github.com/JoernBerkefeld/SFMC-Cookbook/blob/master/einstein/recommendation/collect-code/collect-code.async.html)

The above code does four main things:

1. Creates a `<script>` element that starts asynchronously downloading the collect.js JavaScript library from `https://INSERT_MID.collect.igodigital.com/collect.js`
2. Initializes a global `_etmc` function that allows you to schedule commands to be run once the collect.js library is loaded and ready to go.
3. Adds a command to the `_etmc` command queue to _set the Org ID_ to your Business Unit Member ID. This is required to ensure your tracking data ends up in the correct Business Unit.
4. Adds another command to the `_etmc` command queue to track a [pageview](https://help.salesforce.com/articleView?id=mc_ctc_track_page_view.htm&type=5) to Einstein for the current page.

Custom implementations may require modifying the last line of the above code snippet (the trackPageView command) or adding additional code to capture more interactions. However, you should not change the code that loads the collect.js library or initializes the `_etmc.push()` command queue function. Refer to the [official docs](https://help.salesforce.com/articleView?id=mc_ctc_collect_code.htm&type=5) for details on available options.

#### Asynchronous Collect Code with preloading

The above Collect Code snippet will ensure things work across all browsers but it has the disadvantage of not allowing modern browsers to preload the script.

The alternative async tag below adds support for preloading, which will provide a small performance boost on modern browsers, but can degrade to synchronous loading and execution on IE 9 and older mobile browsers that do not recognize the async script attribute. Only use this tag configuration if your visitors primarily use modern browsers to access your site.

To initialize the tracking, do not forget to replace the two occurences of "INSERT_MID" with your actual BU's Member ID.

```html
<!-- Einstein Collect Code -->
<script>
window._etmc=window._etmc||[];

_etmc.push(['setOrgId', 'INSERT_MID']);


// then execute tracking, e.g.:
// _etmc.push(['trackPageView']);
</script>
<script async src='//INSERT_MID.collect.igodigital.com/collect.js'></script>
<!-- End Einstein Collect Code -->
```

Keep the above in the `<head>` section of your code.

Download: [Async preload sample code](https://github.com/JoernBerkefeld/SFMC-Cookbook/blob/master/einstein/recommendation/collect-code/collect-code.async-preload.html)

### Debug your tracking solution

Use the following to activate `console.log` outputs whenever data is send to the server.

```javascript
// enable debug output
_etmc.debug = true;
```

Alternatively, look for loaded images in the Network tab of your browser. The calls go to "files" (endpoints) with the name of your method calls, though rewritten to [Snake Case](https://en.wikipedia.org/wiki/Snake_case).

### Tracking and other Collect Code features

There are a lot of options available from the Collect Code library, available via the `_etmc.push()` method. Only options starting on "track" and "update" actually result in a callout to the server. The "set" and "doNotTrack" methods are mere settings that need to be executed before those.

| Method |Description |
| -- | -- |
| [doNotTrack](#disable-tracking) | Deactivate tracking on the current page. More info below. |
| setFirstParty | Allows you to send tracking data to a server other than the default, e.g. to proxy the data through your own server. Use together with one of the `track...` methods |
| setInsecure | Use together with `setFirstParty` to track data via a non-secure proxy server. Only works if the current website was not opened securely either; use together with one of the `track...` methods |
| [setOrgId](#identify-business-unit-for-tracking) | set your BUs MID; use together with one of the `track...` methods |
| [setUserInfo](#identify-current-user) | allows to send in an object with user data `{email:'', custom:'abc'}`; use together with one of the `track...` methods |
| [trackCart](#track-items-in-cart-trackcart) | Log items added or removed from a contact's cart |
| [trackConversion](#track-purchases--conversions-trackconversion) | Log details about a contact’s purchase |
| [trackEvent](#track-custom-event-trackevent) | _Undocumented feature:_ Allows you to track custom events |
| [trackPageView](#track-page-views-trackpageview) | Log [content/product page](https://help.salesforce.com/articleView?id=mc_ctc_track_page_view.htm&type=5) views, [in-site search terms](https://help.salesforce.com/articleView?id=mc_ctc_track_in_site_search.htm&type=5) and [category views](https://help.salesforce.com/articleView?id=mc_ctc_track_category_view.htm&type=5). More info below |
| [trackRating](https://help.salesforce.com/articleView?id=mc_ctc_track_rating.htm&type=5) | Log a user's rating for an item on your website. |
| [trackWishlist](#track-user-wishlist-trackwishlist) | _Undocumented feature:_ Allows you to track multiple "shopping carts"-like lists in which users track future wishes |
| [updateItem](/engagement/einstein/recommendation/update-catalog/#via-collect-code) | This allows you to [update your product catalog](https://help.salesforce.com/articleView?id=mc_ctc_streaming_updates.htm&type=5). More info below. |

#### Disable tracking

Contrary to the [official docs](https://help.salesforce.com/articleView?id=mc_ctc_do_not_track.htm&type=5), just a single line is needed, which then literally deactivates `_etmc.push()` and therefore any other tracking calls that are issued afterwards on the current page. This should be executed on page load before other push-calls.

```javascript
// disable tracking for current page
_etmc.push(['doNotTrack']);
```

#### Identify Business Unit for Tracking

This is a required configuration step before tracking anything which allows the collect code to send the tracking data to the right business unit.

```javascript
_etmc.push(['setOrgId','INSERT_MID']);
```

#### Identify current user

Contrary to what the [official docs](https://help.salesforce.com/articleView?id=mc_ctc_set_user_info.htm) state, the only line required to define the user is this:

```javascript
_etmc.push(['setUserInfo', {'email': 'INSERT_EMAIL_OR_UNIQUE_ID'}]);

// run a generic trackPageView once to set cookies that are necessary for personalized Web Recommendations to show up
_etmc.push(['trackPageView']);
```

According to a well hidden part of the [documentation](https://help.salesforce.com/articleView?id=mc_anb_prerequisites_einstein_engagement_scoring.htm&type=5) Einstein Engagement Scoring actually supports for `INSERT_EMAIL_OR_UNIQUE_ID`:

- **Subscriber Key**, which can be implemented with a support request (**not tested yet**)
- **Subscriber ID**
- **Email address**
- **MD5 Hashed lowercase version of email address**

... as your subscriber identifier in Collect Tracking Code. Based on the source of collect.js, this should always be handed in as a value of `'email'`.

Thinking about using Einstein in Journey Builder it makes sense to align with something that Einstein can actually understand and map to existing contacts in SFMC.
However, there is the automatically created attribute group that links the PI_* Data Extensions to a Contact using the Email. Based on what I was able to find out, one should simply ignore that Attribute Group altogether.

On the other hand, if all you care about is showing Einstein powered recommendations, you simply have to ensure that you use the same string when you retrieve web/email recommendations that you previously used for tracking via collect code.

##### Attribute Affinity

This should theoretically boost catalog items that carry the same attribute (detail-field and value) defined as the current user.

> _[Quote](https://help.salesforce.com/articleView?id=mc_ctc_set_contact_attribute_affinity.htm&type=5):_ Match a contact attribute to a tagged catalog field to increase the subscriber's affinity for the value of that contact attribute. The amount of increase is less than what results from a purchase but more than the increase from a view.

```javascript
_etmc.push(['setUserInfo', {
    'email': 'INSERT_EMAIL_OR_UNIQUE_ID',
    'details': {
        'gender': 'female',
        'otherCustomAttribute', 'myValue'
    }
}]);
```

#### Track Page Views: trackPageView

The first element you pass in basically represents a method name which takes multiple variables. `trackPageView` accepts the following parameters alone or combined:

To track the view of a content or product, use this code:

| Key          | Value                   |
| ------------ | ----------------------- |
| `'item'`     | _Product code_ (String) |
| `'search'`   | _Search term_ (String)  |
| `'category'` | _Catgeory_ (String)     |

The most simple versions use **one** of the following lines

```javascript
// product page viewed
_etmc.push(['trackPageView', { 'item': 'INSERT_PRODUCT_CODE' }]);

// category viewed
_etmc.push(['trackPageView', { 'category': 'INSERT_CATEGORY' }]);

// search executed
_etmc.push(['trackPageView', { 'search': 'INSERT_SEARCH_TERM' }]);
```

But of course these can also be combined: If the user came to the page using your search you can optionally use the following extended snippet:

```javascript
_etmc.push(['trackPageView', { 'item': 'INSERT_PRODUCT_CODE','search': 'INSERT_SEARCH_TERM' }]);
```

#### Track Items in Cart: trackCart

This should be run each time a product is added or removed from the cart, the quantity is changed or when the purchase is finalized.

```javascript
_etmc.push(['trackCart', {
    'cart': [
        {
            'item': 'INSERT_ITEM',
            'quantity':  'INSERT_QUANTITY',
            'price': 'INSERT_PRICE',
            'unique_id': 'INSERT_UNIQUE_ID'
        },
        {
            'item': 'INSERT_ITEM',
            'quantity':  'INSERT_QUANTITY' ,
            'price': 'INSERT_PRICE' ,
            'unique_id': 'INSERT_UNIQUE_ID'
        }
    ]
}]);
```

**Definitions:**

| Key | Definition |
| -- | -- |
| `item`      | Matches the field mapped to **ProductCode** in the catalog. |
| `quantity`  | The number of items added for the particular SKU. |
| `price`     | The price at the time of adding an item to the cart. |
| `unique_id` | Matches the field mapped to the **SKUId** in the catalog. When these items match it ensures the exact record in the catalog, including all specific attributes like color and size, is tied to the cart rather than just the ProductCode |

**Important:** Always include the entire cart in this call because it will overwrite whatever was stored before. Therefore, in order to remove one row, simply pass in all other rows that were not deleted.

The [official docs](https://help.salesforce.com/articleView?id=mc_ctc_track_cart.htm&type=5) state that one should use the following to remove all cart line items at once:

```javascript
_etmc.push(['trackCart', { 'clear_cart': true } ]);
```

#### Track Purchases / Conversions: trackConversion

```javascript
_etmc.push(['trackConversion', {
    'cart': [
        {
            'item': 'INSERT_ITEM',
            'quantity':  'INSERT_QUANTITY',
            'price': 'INSERT_PRICE',
            'unique_id': 'INSERT_UNIQUE_ID'
        },
        {
            'item': 'INSERT_ITEM',
            'quantity':  'INSERT_QUANTITY',
            'price': 'INSERT_PRICE',
            'unique_id': 'INSERT_UNIQUE_ID'
        }
    ],
   // OPTIONAL PARAMETERS
   'details': {
       'AttributeName': 'Value'
    }
   // END OPTIONAL PARAMETERS
}]);
```

| Key          | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| `cart`         | same as for `trackCart`; [see above](#track-items-in-cart-trackcart) for more details |
| `order_number` | _mentioned in official docs but not actually supported_ |
| `discount`     | _mentioned in official docs but not actually supported_ |
| `shipping`     | _mentioned in official docs but not actually supported_ |
| `details`      | _optional: Given the similar format this could have something to do with affinity attributes but the effect remains unclear_ **TBC** |

##### Tracking overhead cost

> **Not actually working!**

The [official docs](https://help.salesforce.com/articleView?id=mc_ctc_track_conversion.htm&type=5) state that you can in fact track `order_number`, `discount` and `shipping` as separate fields and that those are then used to calculate the line item cost together with their respective overhead. While looking into collect.js however, those fields seem to get ignored when calling back to the server.

**What to do instead:** Simply calculate final prices on an order-line-item level before sharing it with the Collect Code. Shipping Cost have no bearing on the recommendation but if you have to track it, send it in as an order-line-item.

```javascript
// non-working example from official docs
_etmc.push(['trackConversion', {
    'cart': [
        {
            'item': '123',
            'quantity': '2',
            'price': '10.00',
            'unique_id': '123'
        }
    ],
    // OPTIONAL PARAMETERS
    'order_number': '123456', // fact check: not supported by collect.js
    'discount': '2.00', // fact check: not supported by collect.js
    'shipping': '5.00' // fact check: not supported by collect.js
    // END OPTIONAL PARAMETERS
}]);
```


#### Track Custom Event: trackEvent

From what collect.js shows, only `name` and `details` are actually send to the server. The field `details` is optional!

```javascript
_etmc.push(['trackEvent', {
    'name': 'INSERT_CUSTOM_EVENT_NAME',
    'details': {
        'gender': 'female',
        'otherCustomAttribute', 'myValue'
    }
}]);
```

This is untested code and hence further information will be added later once we've seen it in action.

#### Track User Wishlist: trackWishList

Allows you to store contact wishlists for items on your website.

```javascript
_etmc.push(['trackWishlist', {
    'items': ['INSERT_ITEM_1', 'INSERT_ITEM_2', 'INSERT_ITEM_3'],
    'skus': ['INSERT_UNIQUE_ID_1', 'INSERT_UNIQUE_ID_2', 'INSERT_UNIQUE_ID_3']
}]);
```

| Key         | Definition                                                  |
| ----------- | ----------------------------------------------------------- |
| `item`      | Matches the field mapped to **ProductCode** in the catalog. |
| `unique_id` | Matches the field mapped to the **SKUId** in the catalog.   |

According to the offical docs, handing in skus is optional but I haven't tested that. Make sure the 2 arrays have the same length as the first item in one list is mapped to the first in the other; the second to the second; and so on and so forth.

The contact’s wishlist data is replaced by each subsequent trackWishlist call. Therefore, make sure to always include the entire _current_ list and remove entries from the call that the user deleted from it.
