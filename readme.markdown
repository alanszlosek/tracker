Introduction
====

This is the next iteration of my tracker took. I use it for journal keeping, blog staging, link-tracking, logging comments on said links.

This version is simpler than the last, though the UI is much fancier. The PHP code accepts and returns JSON, interacts with MySQL. The UI is a three-column setup: tags sorted by frequency, items, item currently being viewed or edited.

Features
====

* Pure AJAX interaction with webserver means backend can be in any language. PHP backend is complete, node.js has been started.
* Can filter items by one or more tags at a time
* Clicking on an item in the items column shows it as text, clicking again opens it for editing
* Bookmarklet for quickly adding URLs
* When adding an item by URL, the title is fetched by the server, URL stored in the url field, title as the title. Auto-tagged with "url".

OLD TODO (node.js and redis version)
====

* save tags
* parse for hashtags and save them
* return object on save
* delete
* try mihai's redis client ... already downloaded
* finish tag assignment
* clean up appearance
* import script: 2MB sqlite2 database to redis
* ability to click and select multiple items
	* then can tag/untag multiple at once

When click Edit for an item:
- change background
- clicking tags adds/removes on the fly

OLD NOTES
====

Tags:
	sadd items:id:tags tagname
	sadd tags:tagname:items itemid

probably switch to http://github.com/mranney/node_redis.git

fictorial's redis-node-client has hgetall, AND it returns objects for us, but it doesn't convert object values to strings
