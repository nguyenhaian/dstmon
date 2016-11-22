var express = require('express');
var app = express();
var server = require('http').createServer(app);

var nodeadmin = require('nodeadmin');
app.use(nodeadmin(app));


app.get('/', function(req, res) {
    res.json({message:'hello'});
});
server.listen(3002, function() {
    console.log('listening on *:3002');
});
