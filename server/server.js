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

/*************************************************************/
// socketio namespaces
var clients = io.of('/clients');
var tracker = io.of('/tracker');

// socketio vars
var connectedDevices = {};

var formattedData = {}; // là phiên bản đã format của connectedDevices
var timelineFormattedData = [];
var distsInfo = {}; // thông tin của các dist
var realtimemode = false;

/*************************************************************/
mongoose.connect('mongodb://localhost/CustomerMonitor');

var SnapshotData = mongoose.model('SnapshotData', { time: String, formattedData: {} });
var Dist = mongoose.model("Dist", { id: String, data: { os: String, bundle: String, op: Number } });

// init data when server startup
/*************************************************************/
var lastHours = moment().subtract(1, 'hours').format("DD-MM-YYYY HH:mm:ss");

SnapshotData.find({})
    .select('time formattedData')
    // .where('time').gt(lastHours)
    .sort({ time: -1 })
    .limit(2880)
    .exec(function(err, docs) {
        if (err) return console.log(err);
        timelineFormattedData = docs;
        console.log("timelineFormattedData length " + docs.length);
    });

Dist.find({})
    // .select({ id: 1, data: 1, _id: 0 })
    .exec(function(err, docs) {
        if (err) return console.log(err);
        // console.log(docs);
        _.forEach(docs, function(doc) {
            distsInfo[doc.id] = doc.data;
        });
    });

/*************************************************************/
// SETTING
// phải gọi enable compression trước khi gọi các setting khác
app.use(compression());
// goi file trong cung thu muc
app.use(express.static(__dirname + '/../client'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://203.162.121.174:3001");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

function getTimeStamp() {
    return (moment().format("DD-MM-YYYY HH:mm:ss"));
}

function addDistInfo(_info) {
    var _distid = _info.disid;

    if (!_.has(distsInfo, _distid)) {
        // insert
        distsInfo[_distid] = {
            os: _info.device_OS,
            bundle: _info.bundle,
            op: _info.operator
        };
        var dist = new Dist({ id: _distid, data: distsInfo[_distid] });
        dist.save(function(err, logDoc) {
            if (err) return console.error(err);
            console.log('+dist');
        });
    } else if (!Boolean(distsInfo[_distid].op) && Boolean(_info.operator)) { //if(a) để check nếu a != null, a != 0, a != undefined
        // update
        distsInfo[_distid] = {
            os: _info.device_OS,
            bundle: _info.bundle,
            op: _info.operator
        };
        Dist.update({ id: _distid }, { $set: { data: distsInfo[_distid] } }, {}, function(err, logDoc) {
            if (err) return console.error(err);
            console.log('*dist');
        });
    }
}

function formatClientData() {
    // TODO: this function should be avoid
    var _formattedData = {};

    _.forOwn(connectedDevices, function(cd, key) {
        var sceneName = cd.scene_name ? cd.scene_name : "LOGIN_VIEW";
        var disid = cd.disid ? cd.disid : 0;
        var host = (cd.logged_in_game_host ? cd.logged_in_game_host : "0.0.0.0").replace(/\;$/, '').replace(/\./g, '_');
        var gameid = cd.gameid ? cd.gameid : "0000";
        // var bundle = cd.bundle;
        // var os = cd.device_OS;

        if (!_.has(_formattedData, disid)) {
            _formattedData[disid] = {};
        }

        if (!_.has(_formattedData[disid], 'info')) {
            _formattedData[disid]['info'] = distsInfo[disid];
        }

        if (!_.has(_formattedData[disid], 'data')) {
            _formattedData[disid]['data'] = {};
        }

        if (!_.has(_formattedData[disid]['data'], host)) {
            _formattedData[disid]['data'][host] = {};
        }

        if (!_.has(_formattedData[disid]['data'][host], gameid)) {
            _formattedData[disid]['data'][host][gameid] = {};
        }

        if (!_.has(_formattedData[disid]['data'][host][gameid], sceneName)) {
            _formattedData[disid]['data'][host][gameid][sceneName] = 0;
        }

        _formattedData[disid]['data'][host][gameid][sceneName]++;
    });

    return _formattedData;
}

function addNewDevice(cd) { // connectedDevice
    var sceneName = cd.scene_name ? cd.scene_name : "LOGIN_VIEW";
    var disid = cd.disid ? cd.disid : 0;
    var host = (cd.logged_in_game_host ? cd.logged_in_game_host : "0.0.0.0").replace(/\;$/, '').replace(/\./g, '_');
    var gameid = cd.gameid ? cd.gameid : "0000";
    // var bundle = cd.bundle;
    // var os = cd.device_OS;

    if (!_.has(formattedData, disid)) {
        formattedData[disid] = {};
    }

    if (!_.has(formattedData[disid], 'data')) {
        formattedData[disid]['data'] = {};
    }

    if (!_.has(formattedData[disid]['data'], host)) {
        formattedData[disid]['data'][host] = {};
    }

    if (!_.has(formattedData[disid]['data'][host], gameid)) {
        formattedData[disid]['data'][host][gameid] = {};
    }

    if (!_.has(formattedData[disid]['data'][host][gameid], sceneName)) {
        formattedData[disid]['data'][host][gameid][sceneName] = 0;
    }

    formattedData[disid]['data'][host][gameid][sceneName]++;
}

function removeDevice(cd) { // connectedDevice  
    var sceneName = cd.scene_name ? cd.scene_name : "LOGIN_VIEW";
    var disid = cd.disid ? cd.disid : 0;
    var host = (cd.logged_in_game_host ? cd.logged_in_game_host : "0.0.0.0").replace(/\;$/, '').replace(/\./g, '_');
    var gameid = cd.gameid ? cd.gameid : "0000";
    // var bundle = cd.bundle;
    // var os = cd.device_OS;

    // console.log(JSON.stringify(cd));
    formattedData[disid]['data'][host][gameid][sceneName]--;

    if (formattedData[disid]['data'][host][gameid][sceneName] == 0) {
        delete formattedData[disid]['data'][host][gameid][sceneName];

        if (_.isEmpty(formattedData[disid]['data'][host][gameid]))
            delete formattedData[disid]['data'][host][gameid];

        if (_.isEmpty(formattedData[disid]['data'][host]))
            delete formattedData[disid]['data'][host];

        if (_.isEmpty(formattedData[disid]['data']))
            delete formattedData[disid]; // --> xóa luôn object ko chứa data mà chỉ chứa info
    }
}

app.get('/', function(req, res) {
    // res.sendFile(__dirname + '/../client/home.html');
    res.sendFile(path.resolve(__dirname + '/../client/home.html'));
});

app.get('/users', function(req, res) {
    res.json(connectedDevices);
});

app.get('/dist', function(req, res) {
    res.json(distsInfo);
});

app.get('/users2', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/../client/chart.html'));
});

app.get('/count', function(req, res) {
    res.json({ connectedDevicesCount: _.size(connectedDevices) });
});

app.get('/timelineData', function(req, res) {
    res.json(timelineFormattedData);
    // SnapshotData.find({})
    //     .select({ "time": 1, "formattedData": 1, "_id": 0 })
    //     .sort({ time: -1 })
    //     .exec(function(err, docs) {
    //         // docs is an array
    //         if (err) return console.log(err);
    //         res.json(docs);
    //         // console.log(docs);
    //     });
});

app.get('/timelineCount', function(req, res) {
    res.json({ timeLineDataCount: _.size(timelineFormattedData) });
});

app.get('/clients', function(req, res) {
    var _formattedData = formatClientData();
    res.json(_formattedData);
});

app.get('/clients2', function(req, res) {
    var _formattedData = _.cloneDeep(formattedData);
    _.forOwn(_formattedData, function(fd, key) {
        if (!_.has(fd, 'info')) {
            fd['info'] = distsInfo[key];
        }
    });

    res.json(_formattedData);
});

app.get('/live', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/../client/client.socketio.html'));
});

app.get('/d3chart', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/../client/d3chart.html'));
});

// server-sent event stream
app.get('/events', function(req, res) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')

    // send a ping approx every 2 seconds
    var timer = setInterval(function() {
        res.write('data: ping\n\n')

        // !!! this is the important part
        res.flush()
    }, 2000)

    res.on('close', function() {
        clearInterval(timer)
    })
})

clients.on('connection', function(socket) {
    // console.log(getTimeStamp() + " a user has been connected");
    // socket.emit('connected');
    // socket.emit('hello');
    // console.log(getTimeStamp() + ' ***** ');
    process.stdout.write('*')
    connectedDevices[socket.id] = {};

    socket.on('reginfo', function(user) {
        user = JSON.parse(user);
        // console.log(getTimeStamp() + ' +++++ '); // + JSON.stringify(user));
        process.stdout.write('+')
            // them thoi gian vao user
        user['loginTime'] = getTimeStamp();
        connectedDevices[socket.id] = user;
        // connectedDevices[socket.id].loseFocus = false;

        addNewDevice(user);

        addDistInfo(user);

        // gui den manager_users
        if (realtimemode) tracker.emit('mobile_reginfo', user);
    });

    socket.on('changeScene', function(user) {
        user = JSON.parse(user);
        // console.log(getTimeStamp() + ' ~~~~~ '); // + JSON.stringify(user));
        process.stdout.write('~')
            // them thoi gian vao user
        user['sceneStartedTime'] = getTimeStamp();
        // update user object

        // remove khoi mang formatted truoc khi them thong tin vao user
        removeDevice(connectedDevices[socket.id]);

        // TODO: cần phải đảm bảo chắc chắn changeScene luôn xảy ra sau reginfo, nếu ko thì có trường hợp
        user = _.extend(connectedDevices[socket.id], user);
        // connectedDevices[socket.id].loseFocus = false;

        addNewDevice(user);

        // lưu ý device ko chứa thông tin về distid nên phải đưa thông tin đã extend
        addDistInfo(user);

        // gui den manager_users
        if (realtimemode) tracker.emit('mobile_changeScene', user);
    });

    socket.on('loseFocus', function() {
        console.log(getTimeStamp() + " a user loseFocus");
        connectedDevices[socket.id].loseFocus = true;
    });

    socket.on('getFocus', function() {
        // console.log(data);
        console.log(getTimeStamp() + " a user getFocus");
        connectedDevices[socket.id].loseFocus = false;
    });

    socket.on('disconnect', function() {
        // console.log(getTimeStamp() + " ----- ");
        process.stdout.write('-')

        var client = connectedDevices[socket.id];

        // gui den manager_users
        if (typeof client === 'object' && !Array.isArray(client) && _.isEmpty(client) && client != undefined && client != null) {
            // determine object is {}, you can't check by Object.is({},{}), it always returns false
            delete connectedDevices[socket.id];
        } else if (!_.isEmpty(client)) {
            removeDevice(client);

            // remove khoi mang
            delete connectedDevices[socket.id];

            if (realtimemode) tracker.emit('mobile_disconnect', client);
        } else {
            console.log("....................ERRROR DELETE CLIENT.....................");
        }
    });

});

tracker.on('connection', function(socket) {
    console.log('a tracker connected');

    socket.on('tk.on', function(option) {
        realtimemode = option.realtime;
        socket.emit('dist.response', { status: true, data: distsInfo })
    });

    socket.on('tk.getdist', function(alreadyHaveList) {
        if (!Array.isArray(alreadyHaveList)) {
            socket.emit('dist.response', { status: false, data: {} });
            return;
        }

        var res = _.cloneDeep(distsInfo);
        _.forOwn(res, function(value, key) {
            if (_.has(alreadyHaveList, key))
                delete res[key];
        })

        socket.emit('dist.response', { status: true, data: res })
    });

    socket.on('tk.timelineData', function(option) {
        if (option.oncache) {
            var limit = 0;
            if (option.limit) limit = option.limit;
            else limit = timelineFormattedData.length;

            socket.emit('tld.response', timelineFormattedData.slice(0, limit));
        } else {
            // find on DB
            socket.emit('tld.response', []);
        }
    });

    socket.on('disconnect', function() {
        console.log('a tracker disconnected');
    });
});

// game-loop
setInterval(function() {
    if (_.isEmpty(formattedData))
        return;
    var copy = _.cloneDeep(formattedData);
    timelineFormattedData.unshift({ time: getTimeStamp(), formattedData: copy });

    var snapshotData = new SnapshotData({ time: getTimeStamp(), formattedData: copy });
    snapshotData.save(function(err, logDoc) {
        if (err) return console.error(err);
        console.log('+SnapshotData');
    });

    var maxlength = 24 * 60 * 60 / 30;
    if (timelineFormattedData.length > maxlength)
        timelineFormattedData.pop();
}, 30000);

// khởi động server.listen sau 3s để chắc chắn đã load data thành công từ DB
setTimeout(function() {
    server.listen(3000, function() {
        console.log('listening on *:3000');
    });
}, 3000);
