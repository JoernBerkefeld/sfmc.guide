---
layout: page
title: "Update Catalog"
description: "Working with Einstein Recommendations in Marketing Cloud Engagement."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/einstein/recommendation/update-catalog/
platforms:
  - engagement
---

{% include callout.html type="note" title="Originally published" content="First published **2020-09-27** in the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/einstein/recommendation/). Ported here for sfmc.guide." %}

There are various ways of updating the catalog in Einstein that come with their own advantages and disadvantages.

### Via Collect Code

> Source: [help.salesforce.com/articleView?id=mc_ctc_streaming_updates.htm](https://help.salesforce.com/articleView?id=mc_ctc_streaming_updates.htm&type=5)

It is actually possible to send in updates to your catalog via the collect code. This approach runs without authentication and is therefore up for being hacked. Treat it with caution. With that said, you cannot deactivate it AFAIK.

**Update a single item:**

```javascript
_etmc.push(['updateItem',
    {
    'item': 'INSERT_ITEM',
    'unique_id': 'INSERT_UNIQUE_ITEM_ID',
    'name': 'INSERT_ITEM_NAME_OR_TITLE',
    'url': 'INSERT_ITEM_URL',
    'item_type': 'INSERT_ITEM_TYPE',
    'INSERT_ATTRIBUTE_NAME': 'INSERT_ATTRIBUTE_VALUE'
    }
]);
```

**Update multiple items:**

```javascript
_etmc.push(['updateItem', [
    {
        'item': 'INSERT_ITEM',
        'unique_id': 'INSERT_UNIQUE_ITEM_ID',
        'name': 'INSERT_ITEM_NAME_OR_TITLE',
        'url': 'INSERT_ITEM_URL',
        'item_type': 'INSERT_ITEM_TYPE',
        'INSERT_ATTRIBUTE_NAME': 'INSERT_ATTRIBUTE_VALUE'
    },
    {
        'item': 'INSERT_ITEM',
        'unique_id': 'INSERT_UNIQUE_ITEM_ID',
        'name': 'INSERT_ITEM_NAME_OR_TITLE',
        'url': 'INSERT_ITEM_URL',
        'item_type': 'INSERT_ITEM_TYPE',
        'INSERT_ATTRIBUTE_NAME': 'INSERT_ATTRIBUTE_VALUE'
    }
]]);
```

### Update Catalog via API

> Source: [help.salesforce.com/articleView?id=mc_ctc_streaming_updates.htm](https://help.salesforce.com/articleView?id=mc_ctc_streaming_updates.htm&type=5)

This is in theory possible, however so far I haven't gotten it to work.
