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
	if (len == 0) return items;
	//console.log(len);
	while (ids.length) {
		var id = ids.shift();
		
		// create new closure so id and field are re-defined with each iteration of the result loop
		(function(id) {
			// once the multi is exec'd, these callbacks will fire
			m.hgetall(prefix + id, function(error, result) {
				if (error) throw new Error(error);
				var item = {id:id};
				for (var key in result) {
					item[ key ] = result[key].toString();
				}
				items.push(item);
				//len--;
				//check();
			});
		})(id);
	}
	//var check = function() {
	if (len == 0) callback(items);
	//};
	m.exec(function(error, result) {
		if (error) throw new Error(error);
		items.sort(function(a, b) {
			if (a.id < b.id) return -1;
			else if (a.id > b.id) return 1;
			else return 0;
		});
		if (!error) callback(items);
	});
};


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
	req.on_screen(Date.now().toString());
});
get('/test', function(req) {
	var a = new Array();
	a.push(123);
	a.push(444);
	var b = a.map(toString);
	req.on_screen( b.join(',') );
});

get('/items', function(req) {
	var params = req.parsed_url().query;

	if (params) {
	} else {
		// all!
		// get most recent
		redis.zrevrange('items.createdAt', -10, 10, function(error, result) {
			if (error || !result) {
				req.on_screen('[]');
				return;
			}

			hashObjects(result.map(toString), 'item:', function(items) {
				// sort
				// merge in tags
				var m = redis.multi();
				for (var i = 0; i < items.length; i++) {
					var item = items[i];
					m.smembers('item-to-tags:' + item.id,
						function(item) {
							return function(error, result) {
								if (error) throw new Error(error);
								if (!result) return;
								hashObjects(result.filter(notNull).map(toString), 'tag:', function(tags) { item['tags'] = tags; console.log(tags.length); });
							};
						}(item)
					);
				}
				if (items.length == 0) return req.on_screen('[]');
				m.exec(function(error, ready) {
					if (error) throw new Error(error);
					req.on_screen( JSON.stringify(items) );
				});
			});
		});
	}
});

get('/tags', function(req) {
	redis.keys('tag:*', function(error, result) {
		if (error) throw new Error(error);
		if (!result) return req.on_screen('[]');
		var tags = result.map(function(key) {
			console.log(key.toString());
			var parts = key.toString().split(':');
			return parts[1];
		});
		console.log(tags.join(','));
		hashObjects(tags, 'tag:', function(items) {
			req.on_screen( JSON.stringify(items) );
		});
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
			params.on_screen( JSON.stringify({success:true, id: id}));
		}
	});
});

// new item
post('/item', function(params) {
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
		}
		if (result) {
			params.on_screen( JSON.stringify({success:true, id: id}));
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
			params.on_screen( JSON.stringify({success:true, id: id}));
		}
	});
});

post('/items/:ids/tag/:tag', function(req) {
	var ids = req.ids.split(',');
	var multi = redis.multi();
	var tag = req.tag;
	if (ids.length == 0) return req.on_screen('{}');;
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		multi.sadd('tag-to-items:' + tag, id);
		multi.sadd('item-to-tags:' + id, tag);
	}
	multi.exec(function(error, result) {
		if (error) {
			req.on_screen('{}');
			return;
		}
		if (result) {
			var items = {};
			var series = [];
			for (var i = 0; i < ids.length; i++) {
				var id = ids[i];
				multi.smembers(
					'item-to-tags:' + id,
					function(id) {
						return function(error, result) {
							if (error) throw new Error(error);
							if (!result) return;
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
						};
					}(id)
				);
			}
			if (ids.length == 0) return req.on_screen(items);
			multi.exec(function(error, ready) {
				if (error) throw new Error(error);

				async.series(series, function() {
					console.log( JSON.stringify(items));
					req.on_screen( JSON.stringify(items) );
				});
			});
		}
	});
});


