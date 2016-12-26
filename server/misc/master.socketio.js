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
var redis = new Redis();

redis.subscribe('news', function(err, count) {
    // Now we are subscribed to both the 'news' and 'music' channels.
    // `count` represents the number of channels we are currently subscribed to.
    console.log('im listening');
});

redis.on('message', function(channel, message) {
    // Receive message Hello world! from channel news
    // Receive message Hello again! from channel music
    console.log('Receive message %s from channel %s', message, channel);
});

// There's also an event called 'messageBuffer', which is the same as 'message' except
// it returns buffers instead of strings.
redis.on('messageBuffer', function(channel, message) {
    // Both `channel` and `message` are buffers.
    console.log('Receive messageBuffer %s from channel %s', message, channel);
    console.log(message.toJSON());
});

io.adapter(io_redis({ host: 'localhost', port: 6379 }));
var ioport = 4000 + parseInt(process.env.NODE_APP_INSTANCE || 0);

// game-loop
setInterval(function() {
    // tổng hợp dữ liệu từ clients
}, 5000);

// khởi động server.listen sau 3s để chắc chắn đã load data thành công từ DB

// server.listen(ioport, function() {
//     console.log('listening on *:' + ioport);
// });
