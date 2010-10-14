var app = require('express').createServer();
app.configure(function() {
	app.set('view engine', 'jade');
	//app.use(express.staticProvider(__dirname + '/public'));
});

app.get('/', function(req, res){
	res.render('index')

});

app.listen(3000);

