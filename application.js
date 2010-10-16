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

get('/save', function(req) {
/*
	redis.transaction(function() {
		redis.incr('ids.item', function(error, result) {
			if (error) throw error;
			req.on_screen('' + result);
		});
	});
*/
	var a = new Item({title:'Title',body:'Body text'});
	a.save(function(error, model) {
		if (error) return;
		req.on_screen(model.title);
	});
});
get('/items', function(req) {
	var params = req.parsed_url().query;

	if (params.length) {
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
			console.log(items.length);
			for (var i = 0; i < result.length; i++) {
				var parts = result[i].toString().split(':');
				var id = parts[1];
				var field = parts[2];
				
				var a = function(id, field) {
					m.get(result[i].toString(), function(error, result) {
						if (result) {
							if (!items[id]) {
								items[id] = {};
							}
							items[ id ][ field ] = result.toString();
							console.log('add');
						}
					});
				}
				a(id, field);
			}
			
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
