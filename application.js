require('./config/env')
var redisModule = require("redis"),
	redis = redisModule.createClient();

var Item = {
	title: '',
	body: '',
	tags: []
}

process.on('exit', function() {
	redis.quit();
});

var toString = function(a) { return a.toString(); };

var hashObjects = function(ids, prefix, callback) {
	// need to create extra closure?
	var m = redis.multi();
	var items = [];
	var len = ids.length;
	//console.log(len);
	while (ids.length) {
		var id = ids.shift();
		
		// create new closure so id and field are re-defined with each iteration of the result loop
		(function(id) {
			// once the multi is exec'd, these callbacks will fire
			m.hgetall(prefix + id, function(error, result) {
				if (error || !result) {
					return;
				}
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
	var check = function() {
		if (len == 0) callback(items);
	};
	m.exec(function(error, result) {
		items.sort(function(a, b) {
			if (a.id < b.id) return -1;
			else if (a.id > b.id) return 1;
			else return 0;
		});
		if (!error) callback(items);
	});
};

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

// edit item
post('/item/:id', function(params) {
	var item = {
		title: params.title,
		body: params.body
	}
	var tags = params.tags.split(',');

	var id = params.id;
	var multi = redis.multi();
	for (var i in item) {
		multi.hset('item:' + id, i, item[i]);
	}
	// find existing, clear
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i].trim();
		multi.sadd('tag:' + tag + ':items', id);
		multi.sadd('item:' + id + ':tags', tag);
	}
	multi.exec(function(error, result) {
		if (error) {
			redis.decr('item.id', function(error, result) {
				params.on_screen('{success:false}');
			});
		}
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
	var tags = params.tags.split(',');

	redis.incr('item.id', function(error, result) {
		var id = Date.now().toString();
		var multi = redis.multi();
		for (var i in item) {
			multi.hset('item:' + id, i, item[i]);
		}
		// tags
		for (var i = 0; i < tags.length; i++) {
			var tag = tags[i].trim();
			multi.sadd('tag:' + tag + ':items', id);
			multi.sadd('item:' + id + ':tags', tag);
		}
		// sorted set for ordering
		// in case we move away from timestamp for item id, 
		multi.zadd('items:createdAt', id, id);
		multi.exec(function(error, result) {
			if (error) {
				redis.decr('item.id', function(error, result) {
					params.on_screen('{success:false}');
				});
			}
			if (result) {
				params.on_screen( JSON.stringify({success:true, id: id}));
			}
		});
	});
});

get('/items', function(req) {
	var params = req.parsed_url().query;

	if (params) {
	} else {
		// all!
		// get most recent
		redis.zrevrange('items:createdAt', -10, 10, function(error, result) {
			if (error || !result) {
				req.on_screen('[]');
				return;
			}

			hashObjects(result.map(toString), 'item:', function(items) {
				// sort
				
				req.on_screen( JSON.stringify(items) );
			});
		});
	}
});

get('/tags', function(req) {
	redis.keys('tag:*:item', function(error, result) {
		if (error || !result) {
			req.on_screen('[a]');
			return;
		}
		var tags = [];
		for (var i = 0; i < result.length; i++) {
			var parts = result[i].toString().split(':');
			tags.push( parts[1] );
			
		}
		req.on_screen( JSON.stringify(tags) );
	});
});

get('/form', function() {
	return {
		template: 'form'
	}
});
