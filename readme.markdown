Notes
====

Planning to use Redis for data storage.

TODO
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

Can 

BYE BYE
====

Moved to redis2json because I couldn't save or pull with biggie-orm. Fought with it long-enough. Couldn't figure it out.

But redis2json is read-only. So now I have to figure out how to save multiple values to redist in node ... maybe build up some sort of simple ORM of my own. Really just need a few functions.

NOTES
====

Tags:
	sadd items:id:tags tagname
	sadd tags:tagname:items itemid

probably switch to http://github.com/mranney/node_redis.git

fictorial's redis-node-client has hgetall, AND it returns objects for us, but it doesn't convert object values to strings
