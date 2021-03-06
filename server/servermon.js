var reload = require('require-reload')(require);
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
var sql = require('mssql');
var request = require('request');
var async = require("async");
var json2csv = require('json2csv');
var models = require('./models.js')
var appconfig = reload('./appconfig.js')

var onesignal = {
    groups: [{
        groupname: 'Group Game 3C',
        members: [{ name: 'Game 3C Unity (& Android)', appid: '1f96cdec-1624-11e5-add5-3f9206d46331', key: 'MWY5NmNlNzgtMTYyNC0xMWU1LWFkZDYtNDNlZjEzZTIxZjU2' },
            { name: 'Game 3C Sâm Lốc', appid: '2c838338-b34e-4c3a-b30f-95b9a2d84208', key: 'ZmNkNTViYTItZWExMC00Yzg2LTg4MGUtZmYxNTQxMTBmYTE5' },
            { name: 'Game 3C Tiến Lên', appid: '5065f953-5eee-4489-90e6-6ae6230c5860', key: 'NmIxNDg2ZDQtMThmMC00YmU4LTk2MDEtMjcxNWQwNTM2NmE5' },
            { name: 'Game 3C Xóc Đĩa', appid: '0c13acdd-61c7-433f-85cf-d1256f1c61b6', key: 'ZWU3YzFhY2UtZTkyYy00ZTAzLTkyNzItNzZmMWI1NDhmNzdk' }
        ]
    }, {
        groupname: 'Group 52Fun',
        members: [
            { name: '52Fun Unity (& Android)', appid: 'a34faff6-4d5a-11e5-bfed-3f96110e57ae', key: 'YTM0ZmIwNmUtNGQ1YS0xMWU1LWJmZWUtYmZlYjY1NWY2Nzk4' },
            { name: '52Fun Tiến Lên', appid: 'a1d96af6-6799-485f-b27a-3bf5ee4716bc', key: 'NzNhOWEzY2UtYzU0OS00MWQ1LWI0MmMtYjk1OTA1MzFkNDkz' },
            { name: '52Fun Xóc Đĩa', appid: '0f372644-5bde-43bf-b5e0-15c5f720d6e2', key: 'NTE1YmY2ZGItNzc2NS00NTMzLTgzNzQtZDNhOWJjYTI0MzY3' }
        ]
    }, {
        groupname: 'Group Đấu Trường',
        members: [
            { name: 'Đấu Trường Unity (& Android)', appid: '05052740-e9a0-11e4-9294-7f1cdb478da5', key: 'MDUwNTI3ZDYtZTlhMC0xMWU0LTkyOTUtNGI2ZDI0NDUzMDcy' },
            { name: 'Đấu Trường Tiến Lên', appid: '7b7b28de-9db4-4752-800c-9034d4ea79d4', key: 'ZjY0YjhjMzEtNjAyMC00OGRkLWFmNTQtOWQ4OWNlMzdkOTA4' },
            { name: 'Đấu Trường iOS new', appid: 'abfbab6c-ec9c-44d7-88b9-973c8088c20c', key: 'ZmZkODQ4MDEtN2IzYS00NjljLTk0ZjEtYTNjOWY2MzJjNDY2' },
            { name: 'Đấu Trường 2016', appid: 'b1b029c9-81c1-4c78-a80f-091547041204', key: 'NDBmMmRhYzMtNTFhYy00OGI4LTllY2YtYzllNGVkNWMxZjVl' },
            { name: 'Xanh 9', appid: '78398b12-0ba0-4879-8ab7-7b7ef6a3aa67', key: 'ZDBhMjRiYTktMWI4Zi00MzhkLTlmMGMtMzA5NGZmYWExYmUz' },
            { name: '88Club', appid: 'cce874c5-c0f8-4875-9342-7c2085e3f53f', key: 'OGE2MzMyMzQtZWY2MS00YmM0LWIzMGEtYTAwMGI0NmJiYmNk' }
        ]
    }, {
        groupname: 'Group Siam Play',
        members: [
            { name: 'Siam Unity', appid: '4f1d9f21-2646-42aa-807a-d13bacc41c56', key: 'ZjdjOTIwNjctZDFjMS00NTMwLTgxZTUtMmNhM2Q4MDIyYTRj' },
            { name: 'Siam Hilo', appid: 'e44e3328-2666-44b5-8d95-383b4aacfe8b', key: 'ODE0Y2Q1YzItMzE5NS00MmU5LWE5YjMtZGYzMzA4NGEwNTYz' },
            { name: 'Siam Dummy (& Android)', appid: '60c4f721-75c6-4f10-b736-3ff480038f61', key: 'Y2IyZDViNTEtMjY3NC00OWU5LTk4ZTQtZDRmZjg3YmE1MzIy' },
            { name: 'Siam 9K', appid: 'be0add25-0d69-4565-9bac-df36c6dc73be', key: 'MjdhODM0Y2UtMWE1YS00MDhiLWIxYzctYWVkOTI0MzNmMzhh' }
        ]
    }, {
        groupname: 'Group UWin',
        members: [
            { name: 'UWin', appid: '5274a4be-a643-4f6a-8241-9612eaab1f46', key: 'YzAxYjAwZmItNTVmMS00YmE4LThmOWYtMmU4NjdlYzk2ZGE4' }
        ]
    }],
    onProcessing: false
}

var mssqlconfig = {
    user: 'sa',
    password: 'DstVietnam@123!',
    server: '203.162.166.20', // You can use 'localhost\\instance' to connect to named instance
    database: 'Notify'
}

sql.on('error', function(err) {
    console.log({ err: err })
});

function createOneSignalMessage(campaignid, targetapp, recipient) {
    var tags = [{ "key": "username", "relation": "=", "value": recipient.username }];
    // if (targetapp.userid) {
    //     tags = [{ "key": "userid", "relation": "=", "value": recipient.userid }];
    // }
    var send_after = undefined;
    if (recipient.send_after) {
        send_after = moment(recipient.send_after).subtract(7, 'hours');
        if (send_after.isAfter(moment()))
            send_after = send_after.toString();
        else
            send_after = undefined;
    }

    var json = {
        "app_id": targetapp.appid,
        "tags": tags,
        "data": { data: recipient.data || '' },
        "headings": { "en": recipient.title },
        "contents": { "en": recipient.message },
        "ios_badgeType": "Increase",
        "ios_badgeCount": 1
    }

    if (send_after)
        json.send_after = send_after;

    var options = {
        method: 'POST',
        url: 'https://onesignal.com/api/v1/notifications',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + targetapp.key
        },
        json: json
    };
    console.log("---> m " + recipient.id);

    function callback(error, response, body) {
        console.log("<--- m " + recipient.id);
        if (error) {
            console.log('error: ' + JSON.stringify(error));
        }
        if (response && response.statusCode == 200) {
            // servermon - 4 createOneSignalMessage insert error { "name": "RequestError", "message": "Validation failed for parameter 'param4'. Invalid date.", "code": "EPARAM", "number": "EPARAM", "precedingErrors": [] }
            // servermon - 4 < -- - m 3800
            // servermon - 4 createOneSignalMessage insert error { "name": "ConnectionError", "message": "Connection is closed.", "code": "ECONNCLOSED" }
            // servermon - 4 createOneSignalMessage update error { "name": "ConnectionError", "message": "Connection is closed.", "code": "ECONNCLOSED" }
            // servermon - 4 < -- - m 2497
            // servermon - 4 createOneSignalMessage insert error { "name": "ConnectionError", "message": "Connection is closed.", "code": "ECONNCLOSED" }
            // servermon - 4 createOneSignalMessage update error { "name": "ConnectionError", "message": "Connection is closed.", "code": "ECONNCLOSED" }
            // servermon - 4 < -- - m 2496
            // servermon - 4 createOneSignalMessage insert error { "name": "RequestError", "message": "Validation failed for parameter 'param4'. Invalid date.", "code": "EPARAM", "number": "EPARAM", "precedingErrors": [] }
            // servermon - 4 < -- - m 2492

            // console.log('body: ' + JSON.stringify(body));
            //body: {"id":"4bcfd959-a712-473e-bd6a-7d05760a1531","recipients":1}
            //body: {"id":"","recipients":0,"errors":["All included players are not subscribed"]}

            sql.connect(mssqlconfig).then(function() {
                var err = body.errors ? body.errors[0] : 'none';
                err = err.substring(0, 250); // maxlength

                // var querystring = 'insert into  Message (userid, username, message, send_after, error, onesignalid, campaignid, recipients, target, pendingmsgid) ' +
                // 'values(\'' + recipient.userid + '\', N\'' + recipient.username + '\', N\'' + recipient.message + '\', \'' + moment(send_after).format("YYYY-MM-DD HH:mm:ss") +
                //  '\', \'' + err + '\', \'' + body.id + '\', \'' + campaignid + '\', \'' + body.recipients + '\', \'' + targetapp.appid + '\', \'' + recipient.id + '\')';

                sql.query `insert into  Message (userid, username, message, send_after, error, onesignalid, campaignid, recipients, target, pendingmsgid) 
                    values(${recipient.userid},${recipient.username},${recipient.message},${moment(send_after).format("YYYY-MM-DD HH:mm:ss")},${err},${body.id},${campaignid},${body.recipients},${targetapp.appid},${recipient.id})`
                    .catch(function(err) {
                        console.log("createOneSignalMessage insert error " + JSON.stringify(err));
                    });

                var status = 1; // done
                if (body.errors) status = 2; // đã bắn nhưng lỗi.
                sql.query `update PendingMessage set status=${status} where id=${recipient.id} and status = 0`
                    .catch(function(err) {
                        console.log("createOneSignalMessage update error " + JSON.stringify(err));
                    });
            }).catch(function(err) {
                console.log({ err: err });
            });
        } else {
            console.log('body: ' + JSON.stringify(body));
        }

    }

    request(options, callback);
}

/*************************************************************/
// socketio namespaces
var tracker = io.of('/tracker');

// socketio vars
var formattedData = {}; // là phiên bản đã format của connectedDevices
var timelineFormattedData = [];
var distsInfo = {}; // thông tin của các dist
var realtimemode = false;

/*************************************************************/
mongoose.connect('mongodb://localhost/CustomerMonitor');

// init data when server startup
/*************************************************************/
// var lastHours = moment().subtract(1, 'hours').format("YYYY-MM-DD HH:mm:ss");
function objectIdWithTimestamp(date) {
    // assume date is a Date
    // Convert date object to hex seconds since Unix epoch
    var hexSeconds = Math.floor(date / 1000).toString(16);
    // Create an ObjectId with that hex timestamp
    return mongoose.Types.ObjectId(hexSeconds + "0000000000000000");
}

models.SnapshotData.find({})
    .select('_id time formattedData')
    // .where('time').gt(lastHours)
    .sort({ _id: -1 })
    .limit(2880)
    .exec(function(err, docs) {
        if (err) return console.log(err);
        timelineFormattedData = docs;
        console.log("timelineFormattedData length " + docs.length);
    });

models.Dist.find({})
    // .select({ id: 1, data: 1, _id: 0 })
    .exec(function(err, docs) {
        if (err) return console.log(err);
        // console.log(docs);
        _.forEach(docs, function(doc) {
            distsInfo[doc.id] = doc.data;
        });
    });

function dbgetTimeLineData(option, onSuccess, onFailed) {
    if (option.oncache) {
        var limit = 0;
        if (option.limit) limit = option.limit;
        else limit = timelineFormattedData.length;

        onSuccess(timelineFormattedData.slice(0, limit));
        // socket.emit('tld.response', timelineFormattedData.slice(0, limit));
    } else {
        if (option.limit == 0) {
            var start, end;
            if (option.date != null) {
                // find on DB
                start = moment(option.date).startOf('day').add(5, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");
                end = moment(option.date).startOf('day').add(29, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");

                start = objectIdWithTimestamp(start._d);
                end = objectIdWithTimestamp(end._d);
            } else if (option.date == null && option.datefrom != null && option.dateto != null) {
                start = moment(option.datefrom).startOf('day').add(5, 'hours');
                end = moment(option.dateto).startOf('day').add(29, 'hours');

                if (moment.duration(end.diff(start)).asDays() > 10) {
                    onFailed('date range exceed the limit 10 days');
                    return;
                }
                start = objectIdWithTimestamp(start._d);
                end = objectIdWithTimestamp(end._d);
            } else {
                onFailed('invalid option');
                return;
            }

            console.log(getTimeStamp() + ' start find on DB');
            models.SnapshotData.find({ _id: { $gt: start, $lt: end } })
                .select('_id time formattedData')
                // .where('time').gt(start)
                .sort({ _id: -1 })
                .exec(function(err, docs) {
                    if (err) {
                        // socket.emit('tld.response.error');
                        onFailed(err);
                        return console.log(err)
                    };
                    console.log(getTimeStamp() + ' tld.response: ' + docs.length);
                    // socket.emit('tld.response', docs);
                    onSuccess(docs);
                });
        }

        if (option.limit != 0 && option.date == null) {
            // find on DB
            console.log(getTimeStamp() + ' start find on DB');
            models.SnapshotData.find({})
                .select('_id time formattedData')
                // .where('time').gt(start)
                .sort({ _id: -1 })
                .limit(option.limit)
                .exec(function(err, docs) {
                    if (err) {
                        // socket.emit('tld.response.error');
                        onFailed(err);
                        return console.log(err)
                    };
                    console.log(getTimeStamp() + ' tld.response: ' + docs.length);
                    // socket.emit('tld.response', docs);
                    onSuccess(docs);
                });
        }
    }
}

function dbgetLoginData(option, onSuccess, onFailed) {
    if (option.limit) {
        var limit = 72;
        if (option.limit) limit = option.limit / 10;
        // else limit = timelineFormattedData.length;

        // onSuccess(timelineFormattedData.slice(0, limit));
        // socket.emit('tld.response', timelineFormattedData.slice(0, limit));
        console.log(getTimeStamp() + ' start find on DB');
        models.LoginData.find({})
            .select('_id time formattedData')
            // .where('time').gt(start)
            .sort({ _id: -1 })
            .limit(limit)
            .exec(function(err, docs) {
                if (err) {
                    onFailed(err);
                    return console.log(err)
                };
                console.log(getTimeStamp() + ' tld.response: ' + docs.length);
                onSuccess(docs);
            });
    } else {
        var start, end;
        if (option.date != null) {
            // find on DB
            start = moment(option.date).startOf('day').add(5, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");
            end = moment(option.date).startOf('day').add(29, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");

            start = objectIdWithTimestamp(start._d);
            end = objectIdWithTimestamp(end._d);
        } else if (option.date == null && option.datefrom != null && option.dateto != null) {
            start = moment(option.datefrom).startOf('day').add(5, 'hours');
            end = moment(option.dateto).startOf('day').add(5, 'hours');

            if (moment.duration(end.diff(start)).asDays() > 10) {
                onFailed('date range exceed the limit 10 days');
                return;
            }
            start = objectIdWithTimestamp(start._d);
            end = objectIdWithTimestamp(end._d);
        } else {
            onFailed('invalid option');
            return;
        }

        console.log(getTimeStamp() + ' start find on DB');
        models.LoginData.find({ _id: { $gt: start, $lt: end } })
            .select('_id time formattedData')
            // .where('time').gt(start)
            .sort({ _id: -1 })
            .exec(function(err, docs) {
                if (err) {
                    onFailed(err);
                    return console.log(err)
                };
                console.log(getTimeStamp() + ' tld.response: ' + docs.length);
                onSuccess(docs);
            });

    }
}

function dbgetGrettingPopup(option, onSuccess, onFailed) {
    // trả về 3 list
    // 1. valid, 2. valid in future, 3. invalid
    var valid = [],
        valid_in_future = [],
        invalid = [];

    var _now = new Date();

    var getGPAsycn = {
        query: function(querystring, callback) {
            models.SMessage.find(querystring)
                .limit(200)
                .exec(function(err, docs) {
                    callback(err, docs);
                });
        }
    };

    var query1 = { app: option.app, date: { $lt: _now }, dexp: { $gt: _now } };
    var query2 = { app: option.app, date: { $gt: _now }, dexp: { $gt: _now } };
    var query3 = { app: option.app, date: { $lt: _now }, dexp: { $lt: _now } };

    async.map([query1, query2, query3], getGPAsycn.query.bind(getGPAsycn), function(err, result) {
        if (err) {
            onFailed(err);
        } else {
            onSuccess(result);
        }
    });
}

function dbgetLoadConfigActionData(option, onSuccess, onFailed) {
    if (option.limit) {
        var limit = 72;
        if (option.limit) limit = option.limit / 10;
        // else limit = timelineFormattedData.length;

        // onSuccess(timelineFormattedData.slice(0, limit));
        // socket.emit('tld.response', timelineFormattedData.slice(0, limit));
        console.log(getTimeStamp() + ' start find on DB');
        models.LoadConfig.find({})
            // .select('_id time formattedData')
            // .where('time').gt(start)
            .sort({ _id: -1 })
            .limit(limit)
            .exec(function(err, docs) {
                if (err) {
                    onFailed(err);
                    return console.log(err)
                };
                console.log(getTimeStamp() + ' tld.response: ' + docs.length);
                onSuccess(docs);
            });
    } else {
        var start, end;
        if (option.date != null) {
            // find on DB
            start = moment(option.date).startOf('day').add(5, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");
            end = moment(option.date).startOf('day').add(29, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");

            start = objectIdWithTimestamp(start._d);
            end = objectIdWithTimestamp(end._d);
        } else if (option.date == null && option.datefrom != null && option.dateto != null) {
            start = moment(option.datefrom).startOf('day').add(5, 'hours');
            end = moment(option.dateto).startOf('day').add(5, 'hours');

            if (moment.duration(end.diff(start)).asDays() > 10) {
                onFailed('date range exceed the limit 10 days');
                return;
            }
            start = objectIdWithTimestamp(start._d);
            end = objectIdWithTimestamp(end._d);
        } else {
            onFailed('invalid option');
            return;
        }

        console.log(getTimeStamp() + ' start find on DB');
        models.LoadConfig.find({ _id: { $gt: start, $lt: end } })
            // .select('_id time formattedData')
            // .where('time').gt(start)
            .sort({ _id: -1 })
            .exec(function(err, docs) {
                if (err) {
                    onFailed(err);
                    return console.log(err)
                };
                console.log(getTimeStamp() + ' tld.response: ' + docs.length);
                onSuccess(docs);
            });

    }
}
/*************************************************************/
// SETTING
// phải gọi enable compression trước khi gọi các setting khác
app.use(compression());
// goi file trong cung thu muc
app.use(express.static(__dirname + '/../client'));
app.use(express.static(__dirname + '/../crossfilter'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
// parse application/json
app.use(bodyParser.json({ limit: '50mb' }));

// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "http://203.162.166.99:3001");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });

// set the view engine to ejs
app.set('view engine', 'ejs');


function getTimeStamp() {
    return (moment().format("YYYY-MM-DD HH:mm:ss"));
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
        var dist = new models.Dist({ id: _distid, data: distsInfo[_distid] });
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
        models.Dist.update({ id: _distid }, { $set: { data: distsInfo[_distid] } }, {}, function(err, logDoc) {
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
    // res.sendFile(__dirname + '/../client/index.html');
    res.sendFile(path.resolve(__dirname + '/../client/index.html'));
});

app.get('/square', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');
    res.sendFile(path.resolve(__dirname + '/../crossfilter/index.html'));
});

app.get('/test', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');
    res.sendFile(path.resolve(__dirname + '/../client/test.html'));
});


// ************  api Notification *************
function notify(campaign, callback) {
    console.log('--> notify');
    if (!onesignal.groups[campaign.selectedGroup]) {
        callback({ err: 'invalid selectedApp' });
        return;
    }

    if (onesignal.onProcessing) {
        callback({ err: 'onesignal is onProcessing' });
        return;
    } else {
        onesignal.onProcessing = true;
    }

    function end(data) {
        onesignal.onProcessing = false;
        callback(data);
    }

    function startCampaign(campaignid) {
        if (campaign.targetType == 'manually' || campaign.targetType == 'automatic' || campaign.targetType == 'FBFriends') {
            // 2. tạo các message trong bảng message
            var mc = campaign.recipients.length;
            if (!group.members[campaign.selectedApp])
                mc = mc * group.members.length;
            _.forEach(campaign.recipients, function(recipient) {
                if (group.members[campaign.selectedApp]) {
                    // send to a specific app
                    var targetapp = group.members[campaign.selectedApp];
                    createOneSignalMessage(campaignid, targetapp, recipient);
                } else {
                    // send to group
                    _.forEach(group.members, function(targetapp) {
                        createOneSignalMessage(campaignid, targetapp, recipient);
                    });
                }
            });
            end({ campaignid: campaignid, messagecount: mc });
        } else if (campaign.targetType == 'ondb') {
            end({ err: 'not supported yet.' });
        } else {
            end({ err: 'not supported yet.' });
        }
    }

    var group = onesignal.groups[campaign.selectedGroup];

    // 1. tạo campaign trong db và lấy id
    sql.connect(mssqlconfig).then(function() {
        sql.query `insert into  MessageCampaign (name, recipients, type, sentdate) output inserted.id 
            values(${campaign.name}, ${campaign.recipients.length},${campaign.targetType},${new Date()})`
            .then(function(recordset) {
                var campaignid = recordset[0].id;
                console.log('start campaignid: ' + campaignid);
                startCampaign(campaignid);
            }).catch(function(err) {
                end({ err: err });
            });
    }).catch(function(err) {
        end({ err: err });
    });
}

app.post('/notify', function(req, res) {
    var campaign = req.body;

    notify(campaign, function(result) {
        res.json(result);
    });
});

app.get('/loadLastSentMsg', function(req, res) {
    sql.connect(mssqlconfig).then(function() {
        new sql.Request().query('select top 30 * from Message order by id desc', function(err, recordset) {
            // ... error checks
            res.json({ data: recordset, err: err });
        });

    }).catch(function(err) {
        res.json({ err: err });
    });
});

app.get('/loadSentMsgByCampaign/:cmpid', function(req, res) {
    sql.connect(mssqlconfig).then(function() {
        sql.query `select * from Message where campaignid=${req.params.cmpid} order by id desc`
            .then(function(recordset) {
                res.json({ data: recordset });
            }).catch(function(err) {
                res.json({ err: err });
            });
    }).catch(function(err) {
        res.json({ err: err });
    });
});

app.get('/loadLastSentCampaigns', function(req, res) {
    sql.connect(mssqlconfig).then(function() {
        new sql.Request().query('select top 30 * from MessageCampaign order by id desc', function(err, recordset) {
            // ... error checks
            res.json({ data: recordset, err: err });
        });

    }).catch(function(err) {
        res.json({ err: err });
    });
});

function getPendingMessage(postdata, callback) {
    sql.connect(mssqlconfig).then(function() {
        sql.query `select top 4000 * from PendingMessage where target=${postdata.target} and status = 0`
            .then(function(recordset) {
                callback({ data: recordset }, postdata.target);
            });

    }).catch(function(err) {
        callback({ err: err }, postdata.target);
    });
}

app.post('/getPendingMessage', function(req, res) {
    var postdata = req.body;
    getPendingMessage(postdata, function callback(result, appid) {
        res.json(result);
    });

});

app.get('/messagedetail/:appid/:msgid', function(req, res) {
    var appid = req.params.appid;
    var msgid = req.params.msgid;

    for (var i = onesignal.groups.length - 1; i >= 0; i--) {
        var group = onesignal.groups[i];
        for (var j = group.members.length - 1; j >= 0; j--) {
            var member = group.members[j];
            if (member.appid == appid) {
                var key = member.key;
                var options = {
                    method: 'GET',
                    url: 'https://onesignal.com/api/v1/notifications/' + msgid + '?app_id=' + appid,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + key
                    }
                };
                // console.log("options.json: " + JSON.stringify(options.json));

                function callback(error, response, body) {
                    // TODO
                    res.json(JSON.parse(body));
                }

                request(options, callback);
                return;
            }
        };
    };

    res.json({ err: 'appid not found' });
});

app.get('/loginfailed', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');

    models.LoginFailed.find({})
        // .select('_id time formattedData')
        // .where('time').gt(lastHours)
        .sort({ _id: -1 })
        .limit(200)
        .exec(function(err, docs) {
            if (err) return res.json(err);
            res.render('view_loginfailed', {
                data: docs,
                moment: moment
            });
        });

});

app.get('/siamaction', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');

    models.SiamAction.find({})
        // .select('_id time formattedData')
        // .where('time').gt(lastHours)
        .sort({ _id: -1 })
        .limit(100)
        .exec(function(err, docs) {
            if (err) return res.json(err);
            res.json(docs);
            // res.render('view_loginfailed', {
            //     data: docs,
            //     moment: moment
            // });
        });

});

app.get('/loginSuccess', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');

    models.LoginSuccess.find({})
        // .select('_id time formattedData')
        // .where('time').gt(lastHours)
        .sort({ _id: -1 })
        .limit(100)
        .exec(function(err, docs) {
            if (err) return res.json(err);
            res.json(docs);
        });

});

app.get('/loadConfig', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');

    models.LoadConfig.find({})
        // .select('_id time formattedData')
        // .where('time').gt(lastHours)
        .sort({ _id: -1 })
        .limit(100)
        .exec(function(err, docs) {
            if (err) return res.json(err);
            res.json(docs);
        });

});

app.get('/loginData', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');

    models.LoginData.find({})
        // .select('_id time formattedData')
        // .where('time').gt(lastHours)
        .sort({ _id: -1 })
        .limit(100)
        .exec(function(err, docs) {
            if (err) return res.json(err);
            res.json(docs);
        });

});
// ************** end api notification ***************


app.get('/users', function(req, res) {
    res.json(connectedDevices);
});

app.get('/dist', function(req, res) {
    res.json(distsInfo);
});
app.post('/tkgetdist', function(req, res) {
    var option = req.body;
    realtimemode = option.realtime;
    res.json({ status: true, data: distsInfo })
});

app.post('/dist', function(req, res) {
    var alreadyHaveList = req.body;
    if (!Array.isArray(alreadyHaveList)) {
        socket.emit('dist.response', { status: false, data: {} });
        return;
    }

    var res = _.cloneDeep(distsInfo);
    _.forOwn(res, function(value, key) {
        if (_.has(alreadyHaveList, key))
            delete res[key];
    })

    // socket.emit('dist.response', { status: true, data: res })
    res.json({ status: true, data: res });
});

app.get('/users2', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/../client/chart.html'));
});

app.get('/count', function(req, res) {
    res.json({ connectedDevicesCount: _.size(connectedDevices) });
});

app.get('/timelineData', function(req, res) {
    res.json(timelineFormattedData);
});

function format_sMes(docs) {
    var data = [];
    for (var i = docs.length - 1; i >= 0; i--) {
        var doc = docs[i];
        var result = doc.result;
        if (!result)
            result = {};

        var datekeys = Object.keys(result);
        // sort tăng dần
        datekeys.sort(function(x, y) {
            if (x == y) return 0;
            return x < y;
        });

        delete doc.result;

        // chạy giảm dần
        _.forEach(datekeys, function(date, index) {
            var dayResult = result[date];

            var oskeys = Object.keys(dayResult);
            _.forEach(oskeys, function(os) {
                var osResult = dayResult[os];

                var res = {};
                var totalValue = 0;
                var positionKeys = Object.keys(osResult);
                _.forEach(positionKeys, function(pos) {
                    var posResult = osResult[pos];

                    _.forEach(Object.keys(posResult), function(eventkey) {
                        if (!_.has(res, eventkey)) {
                            res[eventkey] = 0;
                        }
                        res[eventkey] += posResult[eventkey];
                        totalValue += posResult[eventkey];
                    });
                });

                var item = {
                    date: date,
                    id: doc._id,
                    title: doc.title,
                    showType: doc.showType,
                    type: doc.type,
                    priority: doc.priority,
                    os: os,
                    Vip: doc.Vip,
                    LQ: doc.LQ,
                    AG: doc.AG,
                    url: doc.url,
                    totalValue: totalValue
                };
                _.extend(item, res);
                data.push(item);
            });
        });

    };

    // sort giảm dần theo ngày
    // data.sort();
    // console.log(data);
    data.sort(function(x, y) {
        if (x.date > y.date) return -1;
        if (x.date < y.date) return 1;
        return 0;
    });

    // _.forEach(data, function(item){
    //     console.log(item.date);
    // });

    return data;
}


app.get('/popupreport/:app', function(req, res) {
    var app = req.params.app;

    var getGPAsycn = {
        query: function(queryObject, callback) {
            queryObject.find({ app: { "$regex": app, "$options": "i" } })
                .select('_id title showType type priority Vip LQ AG url result')
                .limit(200).lean().exec(function(err, docs) {
                    callback(err, docs);
                });
        }
    };

    async.map([models.SMessage, models.GreetingPopup, models.Type10Popup], getGPAsycn.query.bind(getGPAsycn), function(err, result) {
        if (err) {
            res.send(JSON.stringify(err, null, 3));
            return;
        }

        // res.setHeader('Content-Type', 'application/json ');
        // res.send(JSON.stringify(docs, null, 3));
        res.render('view_banner_report', {
            date: moment().format('DD/MM, HH:mm:ss'),
            lodash: _,
            'type10': format_sMes(result[2]),
            'type5': format_sMes(result[1]),
            'sMes': format_sMes(result[0])
        });
    });
});

app.get('/performancereport', function(req, res) {
    performancereport({ time: "1h", view: "direct" }, res);
});
app.get('/performancereport/:option', function(req, res) {
    var option = req.params.option;
    performancereport({ time: option, view: "direct" }, res);
});

app.post('/performancereport', function(req, res) {
    var option = req.body;
    performancereport(option, res);
});

function performancereport(req, res) {
    // chế độ, 
    // 1. week
    // 2. day
    // 3. 6h
    // 4. 1h
    // 5. 30m
    var start = moment().add(0, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");
    if (req.time == "month") {
        start = moment().add(-30, 'days');
    } else
    if (req.time == "week") {
        start = moment().add(-7, 'days');
    } else
    if (req.time == "2day") {
        start = moment().add(-2, 'days');
    } else
    if (req.time == "day") {
        start = moment().add(-1, 'days');
    } else
    if (req.time == "12h") {
        start = moment().add(-12, 'hours');
    } else
    if (req.time == "6h") {
        start = moment().add(-6, 'hours');
    } else
    if (req.time == "1h") {
        start = moment().add(-1, 'hours');
    } else
    if (req.time == "30m") {
        start = moment().add(-0.5, 'hours');
    } else {
        req.time = "day";
        start = moment().add(-1, 'days');
    }
    // end = moment(option.date).startOf('day').add(29, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");

    var options = {
        method: 'GET',
        url: appconfig.socketapp + '/ccus',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    async.parallel({
        tsv: function(callback) {
            dbgetCCU(start, function onSuccess(tsv) {
                tsv = JSON.stringify(tsv);
                tsv = tsv.replace(/\"/g, "");
                callback(null, tsv);
            }, function onFailed(err) {
                callback(err, null);
            });
        },
        rccu: function(callback) {
            request(options, function(error, response, body) {
                var ccus = JSON.stringify(JSON.parse(body), null, 3);
                callback(error, ccus);
            });
        }
    }, function(err, results) {
        if (err) {
            res.json({ err: err });
        } else {
            if (req.view == "direct") {
                res.render('view_d3graph', {
                    tsvdata: results.tsv,
                    rccu: results.rccu,
                    req: req
                });
            } else {
                res.json({
                    tsvdata: results.tsv,
                    rccu: results.rccu,
                    req: req
                });
            }
        }
    });
};


app.post('/timelineData', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    dbgetTimeLineData(option,
        function onSuccess(timelineData) {
            // Làm thưa data
            var step = Math.round(timelineData.length / 2880);
            if (step == 0) step = 1;

            if (step == 1) {
                res.json({ timelineData: timelineData, error: null, samplestep: 30 * 1 });
            } else {
                var _timelineData = [];

                for (var i = 0; i < timelineData.length; i += step) {
                    _timelineData.push(timelineData[i]);
                }
                // socket.emit('tld.response', timelineData);
                res.json({ timelineData: _timelineData, error: null, samplestep: 30 * step });
            }
        },
        function onFailed(error) {
            // socket.emit('tld.response.error', error);
            res.json({ timelineData: [], error: error, samplestep: 30 * 1 });
        });
});

app.post('/loginData', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    dbgetLoginData(option,
        function onSuccess(loginData) {
            res.json({ loginData: loginData });
        },
        function onFailed(error) {
            // socket.emit('tld.response.error', error);
            res.json({ loginData: [], error: error });
        });
});

function dbgetCCU(start, onSuccess, onFailed) {
    // db.getCollection('ccus').find({si: { $mod: [ 5, 0 ] }})
    // db.getCollection('ccus').find({ si: {$in: [0,5,10,15] } })
    start = objectIdWithTimestamp(start._d);
    var NOW = moment();
    var duration = moment.duration(NOW.diff(start)).asMinutes();
    var cexp = duration * 2; // count-expected: mỗi phút có 2 bản ghi
    var cdesign = 600; // design: 600 điểm ảnh là chấp nhận đc, cdesign = [450,750];
    // -> 
    var n = Math.round(cexp / cdesign);

    if (n == 0) // trường hợp cexp quá nhỏ
        n = 1;
    if (n > 20)
        n = 20;
    // trong tập cexp bản ghi, mình sẽ lọc bớt khoảng n lần, để đc số design (là số hiển thị đc) vào khoảng 600
    models.CCU.find({ _id: { $gte: start }, si: { $mod: [n, 0] } }) // số remains = 0 -> n-1, số nào cũng đc
        .sort({ _id: -1 })
        // .limit(limit) -> ko còn limit nữa
        .lean().exec(function(err, docs) {
            if (err) onFailed(err);
            else {
                // có thể ko cần phép lọc này lắm, vì query kiểu mới đã lọc khá ổn.
                if (docs.length > 600) {
                    var n = Math.round(docs.length / 600);
                    if (n > 1) {
                        docs = docs.filter(function(value, index) {
                            return index % n == 0;
                        });
                    }
                }

                if (docs.length < 1) {
                    onFailed("no data");
                    return;
                }

                var doc = docs[docs.length - 1];
                var keys_app = Object.keys(doc.app);
                keys_app = keys_app.map(function(obj) {
                    return "app." + obj;
                });
                var keys_ip = Object.keys(doc.ip);
                keys_ip = keys_ip.map(function(obj) {
                    return "ip." + obj;
                });
                var fields = keys_app.concat(keys_ip);
                fields.unshift('date');

                docs = docs.map(function(d) {
                    d.date = moment(d.date).format("YY-MM-DDHH:mm:ss");
                    return d;
                });
                // for (var i = docs.length - 1; i >= 0; i--) {
                //     docs[i].date = moment(docs[i].date).format("YY-MM-DDHH:mm:ss");
                // };

                var tsv = json2csv({ data: docs, fields: fields, del: '\t' });
                tsv = tsv.replace(/\"/g, "");

                onSuccess(tsv);
            }
        });
}

app.get('/ccutsv/:option', function(req, res) {
    var req = req.params.option;
    // chế độ, 
    // 1. week
    // 2. day
    // 3. 6h
    // 4. 1h
    // 5. 30m
    var start = moment().add(0, 'hours'); //.format("YYYY-MM-DD HH:mm:ss");
    if (req == "week") {
        start = moment().add(-7, 'days');
    } else
    if (req == "day") {
        start = moment().add(-1, 'days');
    } else
    if (req == "12h") {
        start = moment().add(-12, 'hours');
    } else
    if (req == "6h") {
        start = moment().add(-6, 'hours');
    } else
    if (req == "1h") {
        start = moment().add(-1, 'hours');
    } else
    if (req == "30m") {
        start = moment().add(-0.5, 'hours');
    }
    dbgetCCU(start, function onSuccess(tsv) {
        res.writeHead(200, { "Content-Type": "text/tsv", "Content-Disposition": "inline; filename=data.tsv" });
        res.end(tsv);
    }, function onFailed(err) {
        res.json({ err: err });
    });
});

app.post('/ccujson', function(req, res) {
    var option = req.body;
    models.CCU.find({})
        .sort({ _id: -1 })
        .limit(30)
        .exec(function(err, docs) {
            if (err) res.json({ err: err });
            else
                res.json(docs);
        });
});
app.post('/getGP', function(req, res) {
    // console.log(JSON.stringify(req.body));
    // var option = req.body;
    // dbgetGrettingPopup(option,
    //     function onSuccess(gp) {
    //         res.json({ app: option.app, valid: gp[0], valid_in_future: gp[1], invalid: gp[2] });
    //     },
    //     function onFailed(error) {
    //         // socket.emit('tld.response.error', error);
    //         res.json({ error: error });
    //     });

    // console.log(JSON.stringify(req.body));
    var option = req.body;
    var query = models.GreetingPopup.find(option.query);

    if (option.selectOption) {
        query = query.select(option.selectOption);
    }
    if (option.limit) {
        query = query.limit(option.limit);
    }

    query.exec(function(err, docs) {
        res.json({ app: option.app, err: err, data: docs });
    });
});

app.get('/getGP/:_id', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var _id = req.params._id;
    var query = models.GreetingPopup.find({ _id: _id });
    query.exec(function(err, doc) {
        res.json({ err: err, data: doc });
    });
});

app.post('/deleteGP', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;

    models.GreetingPopup.remove({ _id: option._id }, function(err) {
        res.json({ err: err });
    });
});


app.post('/saveGP', function(req, res) {
    var option = req.body; // { _id: item._id, data: data }
    if (_.has(option.data, 'result'))
        delete option.data.result;
    if (_.has(option.data, 'date'))
        option.data.date = moment(option.data.date, 'YYYY-MM-DDTHH:mm:ss.SSSSZ')._d;
    if (_.has(option.data, 'dexp'))
        option.data.dexp = moment(option.data.dexp, 'YYYY-MM-DDTHH:mm:ss.SSSSZ')._d;

    models.GreetingPopup.update({ _id: option._id }, {
        $set: option.data
    }, { new: true }, function(err, doc) {
        if (err) {
            res.json({ err: err });
            console.log("models.GreetingPopup saveBanner failed!");
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(doc, null, 3));
    });
});

app.post('/createGP', function(req, res) {
    var option = req.body; // { _id: item._id, data: data }

    var data = {
        "title": "............",
        "type": 5,
        "app": option.app,
        "priority": 11,
        "requirePayment": 3,
        "os": 0,
        "version": [
            3.9,
            4.09
        ],
        "url": "http://siamplayth.com/mconfig/banner/lq_km100/100_1.png;http://siamplayth.com/mconfig/banner/lq_km100/100_2.png;http://siamplayth.com/mconfig/banner/lq_km100/100_3.png;http://siamplayth.com/mconfig/banner/lq_km100/100_4.png;http://siamplayth.com/mconfig/banner/lq_km100/100_5.png",
        "urllink": "https://www.google.com.vn/",
        "date": Date(),
        "dexp": Date(),
        "LQ": [
            1,
            99
        ],
        "AG": [
            0,
            25000
        ],
        "Vip": [
            1,
            4
        ],
        "countBtn": 3,
        "valueSms": 2,
        "valueCard": 0,
        "valueIAP": 1,
        "bonusSms": 100,
        "bonusCard": 100,
        "bonusIAP": 100,
        "showPopup": false,
        "arrUrlBtn": [
            "http://siamplayth.com/mconfig/banner/button/btn_iap.png",
            "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
            "http://siamplayth.com/mconfig/banner/button/btn_sms.png"
        ],
        "arrPos": [{
            "x": 0,
            "y": -0.35
        }, {
            "x": -0.3,
            "y": -0.35
        }, {
            "x": 0.3,
            "y": -0.35
        }]
    };
    var banner = new models.GreetingPopup(data);
    banner.save(function(err, doc) {
        if (err) {
            console.log("Something wrong when insert models.GreetingPopup! ");
            console.log(err);
        }

        res.json({ err: err, data: doc });
    });
});

app.post('/getBanner', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;

    var Model = models.Type10Popup;
    if (option.bannerVer == 1) {
        Model = models.Type10Popup;
    } else if (option.bannerVer == 2) {
        Model = models.BannerV2;
    } else {
        res.json({ err: "wrong bannerVer " + option.bannerVer });
        return;
    }

    var query = Model.find(option.query);

    if (option.selectOption) {
        query = query.select(option.selectOption);
    }
    if (option.limit) {
        query = query.limit(option.limit);
    }

    query.exec(function(err, docs) {
        res.json({ app: option.app, err: err, data: docs });
    });
});


app.get('/getBanner/:bannerver/:_id', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var _id = req.params._id;
    var bannerver = req.params.bannerver;
    var Model = models.Type10Popup;
    if (bannerver == 1) {
        Model = models.Type10Popup;
    } else if (bannerver == 2) {
        Model = models.BannerV2;
    } else {
        res.json({ err: "wrong bannerVer " + bannerver });
        return;
    }
    var query = Model.find({ _id: _id });
    query.exec(function(err, doc) {
        res.json({ err: err, data: doc });
    });
});

app.post('/saveBanner', function(req, res) {
    var option = req.body; // { _id: item._id, data: data }
    if (_.has(option.data, 'result'))
        delete option.data.result;
    if (_.has(option.data, 'date'))
        option.data.date = moment(option.data.date, 'YYYY-MM-DDTHH:mm:ss.SSSSZ')._d;
    if (_.has(option.data, 'dexp'))
        option.data.dexp = moment(option.data.dexp, 'YYYY-MM-DDTHH:mm:ss.SSSSZ')._d;


    var Model = models.Type10Popup;
    if (option.bannerVer == 1) {
        Model = models.Type10Popup;
    } else if (option.bannerVer == 2) {
        Model = models.BannerV2;
    } else {
        res.json({ err: "wrong bannerVer " + option.bannerVer });
        return;
    }

    Model.update({ _id: option._id }, {
        $set: option.data
    }, { new: true }, function(err, doc) {
        if (err) {
            res.json({ err: err });
            console.log("Banner saveBanner failed!");
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(doc, null, 3));
    });
});

app.post('/createBanner', function(req, res) {
    var option = req.body; // { _id: item._id, data: data }

    var Model = models.Type10Popup;
    if (option.bannerVer == 1) {
        Model = models.Type10Popup;

        var data = {
            app: option.app,
            type: 10,
            showType: 0,
            title: '',
            note: 'String',
            showLimit: 100, // số lần hiển thị tối da trong 1 ngày với 1 user
            LQ: [0, 100000000],
            Vip: [0, 10],
            AG: [0, 100000000],
            version: [0, 10],
            os: 0, // 0: không quan tâm, 1: iOS, 2: android
            stake: [0, 10000000], // chỉ dùng khi showtype == 1
            requirePayment: 3,
            priority: 0,
            showDaily: [
                [0, 24]
            ],
            posButtonClose: {
                x: -10,
                y: -10
            },
            isShowCloseSms: false,
            showTextButton: false,
            date: Date(),
            dexp: Date(),
            url: '',
            urllink: '',
            countBtn: 3,
            arrTypeBtn: [
                "sms",
                "sms",
                "iap"
            ],
            arrUrlBtn: [
                "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
                "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
                "http://siamplayth.com/mconfig/banner/button/btn_iap.png"
            ],
            arrBonus: [
                100,
                200,
                300
            ],
            arrValue: [
                0,
                1,
                0
            ],
            arrPos: [{
                "x": -0.3,
                "y": -0.3
            }, {
                "x": 0,
                "y": -0.3
            }, {
                "x": 0.3,
                "y": -0.3
            }],
        };
    } else if (option.bannerVer == 2) {
        Model = models.BannerV2;
        var data = {
            "app": option.app,
            "title": "",
            "note": "st1_staketype là thông tin bổ trợ cho showType1. -1-> ko phân biệt loại mức cược, 0 -> chơi bằng Chip, 1 -> chơi bằng Gold",
            "type": 20,
            "allowClose": true,
            "url": "http://siamplayth.com/mconfig/banner/lq_km200/300_1.png",
            arrButton: [{
                "type": "sms",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
                "pos": [-0.3, -0.3],
                "ctype": 0,
                "ccost": 10000,
                "btype": 1,
                "bvalue": 200,
                "bstyle": 1,
                "comment": "ctype:0 -> Nạp Chip, btype:1 -> bonus Gold, ccost:10000 -> 10K VND, bstyle:1 -> giá cũ/giá mới"
            }, {
                "type": "card",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_card.png",
                "pos": [
                    0, -0.3
                ],
                "ctype": 1,
                "ccost": 10000,
                "btype": 0,
                "bvalue": 200,
                "bstyle": 0,
                "comment": "ctype:1 -> Nạp Gold, btype:0 -> bonus Chip, ccost:10000 -> 10K VND, bstyle:0 -> giá cũ/bonus"
            }, {
                "type": "iap",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_iap.png",
                "pos": [
                    0.3, -0.3
                ],
                "ctype": 1,
                "ccost": 1,
                "btype": 0,
                "bvalue": 200,
                "bstyle": 1,
                "comment": "ctype:1 -> Nạp Gold, btype:0 -> bonus Chip, ccost:1 -> 1USD"
            }, {
                "type": "ok",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_iap.png",
                "pos": [
                    0.3, -0.3
                ]
            }, {
                "type": "video",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_video.png",
                "pos": [
                    0.3, -0.3
                ]
            }, {
                "type": "openlink",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_video.png",
                "pos": [
                    0.3, -0.3
                ],
                "urllink": "http://google.com.vn"
            }, {
                "type": "bongda",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_video.png",
                "pos": [
                    0.3, -0.3
                ]
            }, {
                "type": "xoso",
                "btn": "http://siamplayth.com/mconfig/banner/button/btn_video.png",
                "pos": [
                    0.3, -0.3
                ]
            }],
            "showLimit": 100,
            "os": 0,
            "requirePayment": 3,
            "priority": 0,
            "date": "2016-11-24T06:55:43.000Z",
            "dexp": "2016-11-24T06:55:43.000Z",
            "showType": 0,
            st1_stake: [0, 10000000], // mức cược đang chơi
            st1_game: [], // loại game chơi
            st1_staketype: [0, 1], // loại bàn cược
            "comment1": "ctype:0 nạp Chip, 1, nạp Gold",
            "comment2": "btype:0 bonus Chip, 1, bonus Gold",
            "version": [
                0,
                10
            ],
            "AG": [
                0,
                100000000
            ],
            "DM": [
                0,
                100000000
            ],
            "Vip": [
                0,
                10
            ],
            "LQ": [
                0,
                100000000
            ]
        };

    } else {
        res.json({ err: "wrong bannerVer " + option.bannerVer });
        return;
    }

    var banner = new Model(data);
    banner.save(function(err, doc) {
        if (err) {
            console.log("Something wrong when insert banner! ");
            console.log(err);
        }

        res.json({ err: err, data: doc });
    });

});

app.post('/deleteBanner', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;

    var Model = models.Type10Popup;
    if (option.bannerVer == 1) {
        Model = models.Type10Popup;
    } else if (option.bannerVer == 2) {
        Model = models.BannerV2;
    } else {
        res.json({ err: "wrong bannerVer " + option.bannerVer });
        return;
    }

    Model.remove({ _id: option._id }, function(err) {
        res.json({ err: err });
    });
});

app.post('/createBannerShowLimit', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    var Model = models.BannerShowLimitRule;
    var maxRuleNumber = 0;
    var date = Date();

    Model.find({}).sort("-ruleNumber").limit(1).exec(function(err, docs) {
        if (!err && docs.length > 0) {
            maxRuleNumber = docs[0].ruleNumber;
        }

        option.rule.ruleNumber = maxRuleNumber + 1;
        option.rule.date = date;

        var rule = new Model(option.rule);
        rule.save(function(err, doc) {
            if (err) {
                console.log("Something wrong when insert BannerShowLimitRule! ");
                console.log(err);
            }

            res.json({ err: err, data: doc, ruleNumber: option.rule.ruleNumber });
        });

    });


});

app.post('/getBannerShowLimit', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    var Model = models.BannerShowLimitRule;
    // console.log('getBannerShowLimit');
    // console.log(option.query);

    Model.find(option.query).exec(function(err, docs) {
        res.json({ err: err, data: docs });
    });
});

app.post('/saveBannerShowLimit', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    var Model = models.BannerShowLimitRule;

    Model.update({ _id: option._id }, {
        $set: option.data
    }, { new: true }, function(err, doc) {
        if (err) {
            res.json({ err: err });
            console.log("saveBannerShowLimit failed!");
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(doc, null, 3));
    });
});

app.post('/deleteBannerShowLimit', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    var Model = models.BannerShowLimitRule;

    function handleErr(err, data) {
        res.json({ err: err, data: data });
    }

    Model.find({ _id: option._id }, function(err, docs) {
        if (err) {
            handleErr(err)
        } else if (docs.length < 1) {
            handleErr("not found")
        } else {
            var rule = docs[0];
            // kiểm tra xem có banner nào đang dùng ràng buộc này ko
            var getBannerAsycn = {
                querystring: { bannerShowLimitRule: rule.ruleNumber },
                query: function(model, callback) {
                    model.find(this.querystring)
                        .select({ _id: 1 })
                        .limit(200)
                        .exec(function(err, docs) {
                            callback(err, docs);
                        });
                }
            };

            var bannerModels = [models.BannerV2, models.Type10Popup, models.GreetingPopup];
            var bannerModelNames = ['BannerV2', 'Type10Popup', 'GreetingPopup'];
            async.map(bannerModels,
                getBannerAsycn.query.bind(getBannerAsycn),
                function(errs, results) {
                    if (errs) {
                        handleErr(errs);
                    } else {
                        var strres = "";
                        var total = 0;
                        // console.log('getBannerAsycn callback');
                        results.map(function(docs, index) {
                            // console.log(docs);
                            var bannerCount = docs.length;
                            strres += "[" + bannerModelNames[index] + ": " + bannerCount + "] ";
                            total += bannerCount;
                        });

                        if (total > 0) {
                            handleErr(total + " banner(s) are depend on this rule", strres);
                        } else {
                            Model.remove({ _id: option._id }, function(err) {
                                if (err)
                                    handleErr(err);
                                else
                                    res.json({ data: 'removed' });
                            });
                        }
                    }
                });
        }
    });

});


app.post('/actionLoadConfig', function(req, res) {
    // console.log(JSON.stringify(req.body));
    var option = req.body;
    dbgetLoadConfigActionData(option,
        function onSuccess(data) {
            res.json({ data: data });
        },
        function onFailed(error) {
            // socket.emit('tld.response.error', error);
            res.json({ data: [], error: error });
        });
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
        dbgetTimeLineData(option,
            function onSuccess(timelineData) {
                socket.emit('tld.response', timelineData);
            },
            function onFailed(error) {
                socket.emit('tld.response.error', error);
            });
    });

    socket.on('disconnect', function() {
        console.log('a tracker disconnected');
    });
});

// game-loop
setInterval(function() {


}, 1 * 60 * 1000); // 60s xem xét tách report


// khởi động server.listen sau 3s để chắc chắn đã load data thành công từ DB
// setTimeout(function() {
server.listen(appconfig.port_man, function() {
    console.log(`listening on *:${appconfig.port_man}`);
});
// }, 3000);
