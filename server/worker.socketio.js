var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var io = require('socket.io').listen(server);
var compression = require('compression')
var _ = require('lodash')
var moment = require('moment')
var mongoose = require('mongoose')
var path = require('path');
var io_redis = require('socket.io-redis');
var Redis = require('ioredis');

/*************************************************************/
var pub = new Redis();

var data = {name:'An Nguyen', birth:'14-12'}
pub.publish('news', data);


io.adapter(io_redis({ host: 'localhost', port: 6379 }));
var ioport = 4000 + parseInt(process.env.NODE_APP_INSTANCE || 0);

// khởi động server.listen sau 3s để chắc chắn đã load data thành công từ DB
// server.listen(ioport, function() {
//     console.log('listening on *:' + ioport);
// });
