Notes
====

Planning to use Redis for data storage.

LEFT
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
