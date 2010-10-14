require('./config/env')

get('/', function(req, res){
	return {
		template: 'index'
	}
})

get('/items', function(req, res) {
	var items = [
		{title: 'Hey',body:'Testing',tags:['a','b']}
	];

	return JSON.stringify(items);
})
