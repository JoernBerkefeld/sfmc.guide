---
layout: page
title: "Einstein Recommendations"
description: "Working with Einstein Recommendations in Marketing Cloud Engagement."
parent: Engagement
parent_url: /engagement/
permalink: /engagement/einstein/recommendation/
platforms:
  - engagement
---

{% include callout.html type="note" title="Originally published" content="First published **2020-09-27** in the [SFMC Cookbook](https://joernberkefeld.github.io/SFMC-Cookbook/einstein/recommendation/). Ported here for sfmc.guide." %}

This page aims to make using Einstein recommendations a little easier by adding a few explanations around how to use it in a modern setup.

- [Collect Code](collect-code/)
  - [Note to developers](collect-code/#note-to-developers)
  - [Initialize the library](collect-code/#initialize-the-library)
    - [Collect Code on page load](collect-code/#collect-code-on-page-load)
    - [Asynchronous Collect Code](collect-code/#asynchronous-collect-code)
    - [Asynchronous Collect Code with preloading](collect-code/#asynchronous-collect-code-with-preloading)
  - [Debug your tracking solution](collect-code/#debug-your-tracking-solution)
  - [Tracking and other Collect Code features](collect-code/#tracking-and-other-collect-code-features)
    - [Disable tracking](collect-code/#disable-tracking)
    - [Identify Business Unit for Tracking](collect-code/#identify-business-unit-for-tracking)
    - [Identify current user](collect-code/#identify-current-user)
      - [Attribute Affinity](collect-code/#attribute-affinity)
    - [Track Page Views: trackPageView](collect-code/#track-page-views-trackpageview)
    - [Track Items in Cart: trackCart](collect-code/#track-items-in-cart-trackcart)
    - [Track Purchases / Conversions: trackConversion](collect-code/#track-purchases--conversions-trackconversion)
      - [Tracking overhead cost](collect-code/#tracking-overhead-cost)
    - [Track Custom Event: trackEvent](collect-code/#track-custom-event-trackevent)
    - [Track User Wishlist: trackWishList](collect-code/#track-user-wishlist-trackwishlist)
- [Update Catalog](update-catalog/)
  - [Via Collect Code](update-catalog/#via-collect-code)
  - [Update Catalog via API](update-catalog/#update-catalog-via-api)
- [Predictive Intelligence (PI) Data Extensions](pi-data-extensions/)
- [Einstein Email Recommendations](einstein-email/)
- [Einstein Web Recommendations](einstein-web/)
  - [Embedding Web Recommendations](einstein-web/#embedding-web-recommendations)
    - [How the recommender knows who the current user is](einstein-web/#how-the-recommender-knows-who-the-current-user-is)
    - [Enhancing recommendation results](einstein-web/#enhancing-recommendation-results)
    - [Embed via JSON](einstein-web/#embed-via-json)
      - [JSON Example responses](einstein-web/#json-example-responses)
    - [Embed via JavaScript ("HTML")](einstein-web/#embed-via-javascript-html)
      - [JavaScript/HTML example code](einstein-web/#javascripthtml-example-code)
  - [Debugging Web Recommendations](einstein-web/#debugging-web-recommendations)
- [Embedding Collect Code via Google Tag Manager (GTM)](gtm/)
  - [Loading the GTM library](gtm/#loading-the-gtm-library)
  - [Loading collect.js via GTM](gtm/#loading-collectjs-via-gtm)
    - [GTM: Developer Playground](gtm/#gtm-developer-playground)
  - [Logging events via GTM](gtm/#logging-events-via-gtm)
    - [Identify current user via GTM](gtm/#identify-current-user-via-gtm)
  - [Debugging / Previewing your GTM setup](gtm/#debugging--previewing-your-gtm-setup)
  - [Publishing your changes](gtm/#publishing-your-changes)
  - [Events mapping: Collect Code to GA4 Retail/Ecommerce](gtm/#events-mapping-collect-code-to-ga4-retailecommerce)
