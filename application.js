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
		multi.set('item:' + id + ':' + i, item[i]);
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
		var id = result.toString();
		var multi = redis.multi();
		for (var i in item) {
			multi.set('item:' + id + ':' + i, item[i]);
		}
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
});

get('/items', function(req) {
	var params = req.parsed_url().query;

	if (params) {
	} else {
		// all!
		// get most recent
		redis.keys('item:*', function(error, result) {
			if (error || !result) {
				req.on_screen('[]');
				return;
			}
			// need to create extra closure?
			var m = redis.multi();
			var items = [];
			//console.log(items.length);
			for (var i = 0; i < result.length; i++) {
				var parts = result[i].toString().split(':');
				var id = parts[1];
				var field = parts[2];
				
				// create new closure so id and field are re-defined with each iteration of the result loop
				var a = function(id, field) {
					// once the multi is exec'd, these callbacks will fire
					m.get(result[i].toString(), function(error, result) {
						if (result) {
							if (!items[id]) {
								items[id] = {id: id};
							}
							items[ id ][ field ] = result.toString();
						}
					});
				}
				var b = function(id, field) {
					// once the multi is exec'd, these callbacks will fire
					m.smembers(result[i].toString(), function(error, result) {
						if (result) {
							if (!items[id]) {
								items[id] = {id: id};
							}
							items[ id ][ field ] = result.toString().split(/,/);
						}
					});
				}
				if (field == 'tags')
					b(id, field);
				else
					a(id, field);
			}
			
			// this should fire after all queued statement callbacks have
			m.exec(function(error, result) {
				if (error || !result) {
					req.on_screen('[]');
					return;
				}
				items.shift(); // since ids start at 1
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
