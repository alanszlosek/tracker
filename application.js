require('./config/env')
var sys = require("sys"),
    redislib = require("./lib/redis-client"),
    redis = redislib.createClient(),
    redis2json = require("./lib/redis2json");

redis2json.redis = redis;

var Item = {
	title: "item:{id}:title",
	body: "item:{id}:body"
}



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
})

get('/save', function(req) {
	Item.clear();
	var a = new Item({title: 'Hey',body:'Testing'});
	var out = '';
	a.save(function(error,model) {
		if(error) return 'shit';

		redisClient.quit();
		req.on_screen(model.title);
	});
})
get('/items', function(req) {
	redis2json.load(map, {}, function(error, result) {
		req.on_screen( JSON.stringify(result) );
	});
})
