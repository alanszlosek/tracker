require('./config/env')
// couldn't see orm from inside env.js ... surely there's a way to push it out through exports
var orm = require('/home/sandbox/checkouts/biggie-orm/lib/orm')

var a = orm.connect();


var Item = orm.model('Item', {
	title: {type: 'string'},
	body: {type: 'string'}
});


get('/', function(req){
	a.set(['testing', 'test'], function() {

		a.get(['testing'], function(error, results) {
			// needs to be cast to a string
			req.on_screen('' + results);
		});
	});
	/*
	{
		template: 'index'
	}
	*/
})

get('/save', function(req) {
	Item.clear();
	var a = new Item({title: 'Hey',body:'Testing'});
	var out = '';
	a.save(function(error,model) {
		if(error) return 'shit';

		return model.title;
		
	});
})
get('/items', function(req, res) {
	var items = Item.find().all();

	return JSON.stringify(items);
})
