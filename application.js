require('./config/env')

get('/', function(req, res){
	return {
		template: 'index'
	}
})

