var cluster = require('cluster');
var os = require('os');

if (cluster.isMaster) {
    // we create a HTTP server, but we do not use listen
    // that way, we have a socket.io server that doesn't accept connections
    var server = require('http').createServer();
    var io = require('socket.io').listen(server);
    var redis = require('socket.io-redis');

    io.adapter(redis({ host: 'localhost', port: 6379 }));

    setInterval(function() {
        // all workers will receive this in Redis, and emit
        io.emit('data', 'payload');
    }, 1000);

    for (var i = 0; i < os.cpus().length; i++) {
        // console.log('cluster.fork()');
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
}

if (cluster.isWorker) {
    var express = require('express');
    var app = express();

    var http = require('http');
    var server = http.createServer(app);
    var io = require('socket.io').listen(server);
    var redis = require('socket.io-redis');

    var bodyParser = require('body-parser');
    var compression = require('compression')

    /*************************************************************/
    // SETTING
    // phải gọi enable compression trước khi gọi các setting khác
    app.use(compression());
    // goi file trong cung thu muc
    app.use(express.static(__dirname + '/cluster_client_test'));
    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: true }));
    // parse application/json
    app.use(bodyParser.json());

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "http://203.162.121.174:3002");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.get('/', function(req, res) {
        res.sendFile(__dirname + '/cluster_client_test/index.html');
    });

    /*************************************************************/
    io.adapter(redis({ host: 'localhost', port: 6379 }));
    io.on('connection', function(socket) {
        socket.emit('data', 'connected to worker: ' + cluster.worker.id);
    });

    // app.listen();

    server.listen(3002, function() {
        console.log('listening on *:3002');
    });
}
