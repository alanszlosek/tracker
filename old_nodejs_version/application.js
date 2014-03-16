require('./config/env');
var redisModule = require("redis"),
	redis = redisModule.createClient();
var async = require('./lib/async');

var Item = {
	title: '',
	body: '',
	tags: []
}

process.on('exit', function() {
	redis.quit();
});

var notNull = function(a) { return a !== null; };
var toString = function(a) { return a.toString(); };

var hashObjects = function(ids, prefix, callback) {
	// need to create extra closure?
	var m = redis.multi();
	var items = [];
	var len = ids.length;
	//console.log(len);
	for (var i = 0; i < len; i++) {
		var id = ids[ i ] ;
		
		// create new closure so id and field are re-defined with each iteration of the result loop
		(function(id, i) {
			// once the multi is exec'd, these callbacks will fire
			m.hgetall(prefix + id, function(error, result) {
				if (error) throw new Error(error);
				var item = {id:id};
				for (var key in result) {
					item[ key ] = result[key].toString();
				}
				items[ i ] = item;
				//len--;
				//check();
			});
		})(id, i);
	}
	//var check = function() {
	if (len == 0) callback(items);
	//};
	m.exec(function(error, result) {
		if (error) throw new Error(error);
// don't sort because the ids should have been passed in the order of the output
/*
		items.sort(function(a, b) {
			if (a.id < b.id) return -1;
			else if (a.id > b.id) return 1;
			else return 0;
		});
*/
		if (!error) callback(items);
	});
};

function decorateItems(items, whew) {
	var series = [];
	var len = items.length;
	var multi = redis.multi();
	for (var i = 0; i < len; i++) {
		var id = items[i].id;
		//console.log(id);
		multi.smembers(
			'item-to-tags:' + id,
			(function(i, id) {
				return function(error, result) {
					//console.log(result.filter(notNull).map(toString).join(', '));
					if (error) throw new Error(error);
					result = result.filter(notNull);
					if (result.length) {
						series.push(function(callback) {
							hashObjects(
								result.filter(notNull).map(toString),
								'tag:',
								function(tags) {
									items[ i ]['tags'] = tags;
									callback();
								}
							);
						});
					} else {
						//console.log('notags');
						series.push(function(callback) {
							items[ i ]['tags'] = [];
							callback();
						});
					}
				};
			})(i, id)
		);
	}
	if (len == 0) return;
	multi.exec(function(error, ready) {
		if (error) throw new Error(error);

		async.series(series, function() {
		//console.log(items.length);
			whew(items);
		});
	});
}

function getItemTags(ids, whew) {
	var items = {};
	var series = [];
	var multi = redis.multi();
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		multi.smembers(
			'item-to-tags:' + id,
			function(id) {
				return function(error, result) {
					if (error) throw new Error(error);
					result = result.filter(notNull);
					if (result.length)
						series.push(function(callback) {
							hashObjects(
								result.filter(notNull).map(toString),
								'tag:',
								function(tags) {
									items[ id ] = tags;
									callback();
								}
							);
						});
					else
						items[ id ] = [];
				};
			}(id)
		);
	}
	if (ids.length == 0) return req.onScreen(items);
	multi.exec(function(error, ready) {
		if (error) throw new Error(error);

		async.series(series, function() {
			whew(items);
		});
	});

}

// both should be arrays. an array of item ids, and an array of tag names
function addTagsToItems(ids, tags, callback) {
	// do the tags exist?
	touchTags(tags, function() {
		tagItems2(ids, tags, callback);
	});
}
function tagItems2(ids, tags, callback) {
	// not sure whether i have to check for duplicates
	var multi = redis.multi();
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		for (var j = 0; j < tags.length; j++) {
			var tag = tags[j];
			multi.sadd('tag-to-items:' + tag, id);
			multi.sadd('item-to-tags:' + id, tag);
		}
	}
	multi.exec(function(error, result) {
		if (error) {
			callback({error:'Failed to tag items'});
			return;
		}
		if (result) {
			getItemTags(ids, function(tags) {
				callback(tags);
			});
		}
	});
}

// like touch on linux ... creates if doesn't exist
function touchTags(tags, callback) {
	var multi = redis.multi();
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		var timestamp = Date.now().toString();
		multi.hset('tag:' + tag, 'timestamp', timestamp);
	}
	multi.exec(function(error, result) {
		if (error) {
			req.onScreen( jsonError('Failed to create all tags'));
			return;
		}
		if (result) {
			callback();
		}
	});
}

function printItems(req) {
	return function(items) {
		req.onScreen( jsonItems(items, false) );
	};
}

function jsonItems(items, errorIfEmpty) {
	if (items.length) {
		return JSON.stringify(items);
	} else
		return '[]';
}

function jsonError(msg) {
	return JSON.stringify( {error:msg} );
}


// GET
get('/', function(req){
	/*
	a.set(['testing', 'test'], function() {

		a.get(['testing'], function(error, results) {
			// needs to be cast to a string
			req.on_screen('' + results);
		});
	});
	*/
	return {
		template: 'index'
	}
});

get('/date', function(req) {
	req.onScreen(Date.now().toString());
});
get('/test', function(req) {
	var a = new Array();
	a.push(123);
	a.push(444);
	var b = a.map(toString);
	req.onScreen( b.join(',') );
});

get('/items', function(req) {
	//var ids = req.ids.split(',');

	// if ids, intersect 
	// all!
	// get most recent
	redis.zrevrange('items.createdAt', 0, 10, function(error, result) {
		if (error || !result) {
			req.onScreen('[]');
			return;
		}

		hashObjects(result.map(toString), 'item:', function(items) {
			// merge in tags
			decorateItems(items, printItems(req));
		});
	});
});

get('/tags', function(req) {
	redis.keys('tag:*', function(error, result) {
		if (error) throw new Error(error);
		if (!result) return req.onScreen('[]');
		var tags = result.map(function(key) {
			console.log(key.toString());
			var parts = key.toString().split(':');
			return parts[1];
		});
		console.log(tags.join(','));
		hashObjects(tags, 'tag:', printItems(req));
	});
});

get('/items/:ids', function(req) {
	var ids = req.ids.split(',');
	hashObjects(ids, 'item:', printItems(req));
});

get('/items-by-tags/:ids', function(req) {
	var keys = req.ids.split(',').map(function(a) {
		return 'tag-to-items:' + a;
	});
	redis.sinter(keys, function(error, result) {
		if (error || !result) return req.onScreen('[]');
		var ids = result.map(toString).splice(0, 5);
		console.log(ids.join(','));
		hashObjects(ids, 'item:', function(items) {
			decorateItems(items, printItems(req));
		});
	});
});

get('/items/:ids/tags', function(req) {
	var ids = req.ids.split(',');
	redis.keys('tag:*', function(error, result) {
		if (error) throw new Error(error);
		if (!result) return req.onScreen('[]');
		var tags = result.map(function(key) {
			console.log(key.toString());
			var parts = key.toString().split(':');
			return parts[1];
		});
		console.log(tags.join(','));
		hashObjects(tags, 'tag:', printItems(req));
	});
});

get('/form', function() {
	return {
		template: 'form'
	}
});


// POST
// edit item
post('/item/:id', function(params) {
	var tags = params.tags.split(',');
	var item = {
		title: params.title,
		body: params.body
	}
	var id = params.id;
	var multi = redis.multi();
	for (var i in item) {
		multi.hset('item:' + id, i, item[i]);
	}
	multi.exec(function(error, result) {
		if (error) throw new Error(error);
		if (result) {
			if (tags) {
				// need function to take a continuation, expecting an array of items, return it
				addTagsToItems([id], tags, printItems(params));
			} else {
				hashObjects([id], 'item:', printItems(params));
			}
		}
	});
});

// new item
post('/item', function(params) {
	// if title has URL, split it out
	var tags = params.tags.split(',');
	var item = {
		title: params.title,
		body: params.body
	}
	var id = Date.now().toString();
	var multi = redis.multi();
	for (var i in item) {
		multi.hset('item:' + id, i, item[i]);
	}

	// sorted set for ordering
	// in case we move away from timestamp for item id, 
	multi.zadd('items.createdAt', id, id);
	multi.exec(function(error, result) {
		if (error) {
			params.onScreen(JSON.stringify({
				error: 'Failed to save'
			}));
		}
		if (result) {
			if (tags) {
				// need function to take a continuation, expecting an array of items, return it
				addTagsToItems([id], tags, printItems(params));
			} else {
				hashObjects([id], 'item:', printItems(params));
			}
		}
	});
});

post('/tag', function(params) {
	var item = {
		name: params.name
	}
	var id = Date.now().toString();
	var multi = redis.multi();
	for (var i in item) {
		multi.hset('tag:' + id, i, item[i]);
	}

	// sorted set for ordering
	// in case we move away from timestamp for item id, 
	multi.zadd('tags.createdAt', id, id);
	multi.exec(function(error, result) {
		if (result) {
			// fetch and return new tag
			// printItem
			params.onScreen( JSON.stringify({success:true, id: id}));
		}
	});
});

post('/items/:ids/tag/:tag', function(req) {
	var ids = req.ids.split(',');
	var multi = redis.multi();
	var tag = req.tag;
	if (ids.length == 0) return req.onScreen('{}');;

	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		multi.sadd('tag-to-items:' + tag, id);
		multi.sadd('item-to-tags:' + id, tag);
	}
	multi.exec(function(error, result) {
		if (error) {
			req.onScreen('{}');
			return;
		}
		if (result) {
			getItemTags(ids, function(tags) {
				req.onScreen( JSON.stringify(tags) );
			});
		}
	});
});

post('/items/:ids/untag/:tag', function(req) {
	var ids = req.ids.split(',');
	var multi = redis.multi();
	var tag = req.tag;
	if (ids.length == 0) return req.onScreen('{}');;
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		multi.srem('tag-to-items:' + tag, id);
		multi.srem('item-to-tags:' + id, tag);
	}
	multi.exec(function(error, result) {
		if (error) {
			req.onScreen('{}');
			return;
		}
		if (result) {
			getItemTags(ids, function(tags) {
				req.onScreen( JSON.stringify(tags) );
			});
		}
	});
});

