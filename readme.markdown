Introduction
====

This is the next iteration of my tracker tool. I use it for journal keeping, blog staging, link-tracking, logging comments on said links.

This version is simpler than the last, though the UI is much fancier. The PHP code accepts and returns JSON, interacts with MySQL. The UI is a three-column setup (inspired by thinkery.me): tags sorted by frequency, items, item currently being viewed or edited.

Here's what it looks like: [tracker.png](https://www.greaterscope.net/files/tracker.png)

Requirements
====

* PHP 5.3+
* MySQL (though, since I use dbFacile, it's likely to work fine with SQLite as well)

Features
====

* Pure AJAX interaction with webserver means backend can be in any language
* Can filter items by one or more tags at a time
* Clicking on an item in the items column shows it as text, clicking again opens it for editing
* Bookmarklet for quickly adding URLs
* When adding an item by URL, the title is fetched by the server, URL stored in the url field, title as the title. Auto-tagged with "url".

