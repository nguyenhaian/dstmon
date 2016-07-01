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
            { name: 'Đấu Trường 2016', appid: 'b1b029c9-81c1-4c78-a80f-091547041204', key: 'NDBmMmRhYzMtNTFhYy00OGI4LTllY2YtYzllNGVkNWMxZjVl' }
        ]
    }, {
        groupname: 'Group Siam Play',
        members: [
            { name: 'Siam Unity', appid: '4f1d9f21-2646-42aa-807a-d13bacc41c56', key: 'ZjdjOTIwNjctZDFjMS00NTMwLTgxZTUtMmNhM2Q4MDIyYTRj' },
            { name: 'Siam Hilo', appid: 'e44e3328-2666-44b5-8d95-383b4aacfe8b', key: 'ODE0Y2Q1YzItMzE5NS00MmU5LWE5YjMtZGYzMzA4NGEwNTYz' },
            { name: 'Siam Dummy (& Android)', appid: '60c4f721-75c6-4f10-b736-3ff480038f61', key: 'Y2IyZDViNTEtMjY3NC00OWU5LTk4ZTQtZDRmZjg3YmE1MzIy' },
            { name: 'Siam 9K', appid: '3c76eabc-4bdb-44bc-8673-b61e816b6396', key: 'ZTk1OGY5YjEtOTBjNS00OWRjLWE3ZDUtOTUwZGY5ZDNkNThl' }
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
    if (targetapp.userid) {
        tags = [{ "key": "userid", "relation": "=", "value": recipient.userid }];
    }
    var send_after = recipient.send_after || new Date().toString();
    var options = {
        method: 'POST',
        url: 'https://onesignal.com/api/v1/notifications',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + targetapp.key
        },
        json: {
            "app_id": targetapp.appid,
            "tags": tags,
            "data": { data: recipient.data || '' },
            "headings": { "en": recipient.title },
            "contents": { "en": recipient.message },
            "send_after": send_after,
            "ios_badgeType": "Increase",
            "ios_badgeCount": 1
        }
    };
    console.log("---> m "+ recipient.id);

    function callback(error, response, body) {
        console.log("<--- m "+ recipient.id);
        if (error) {
            console.log('error: ' + JSON.stringify(error));
        }
        if (response.statusCode == 200) {
            // console.log('body: ' + JSON.stringify(body));
            //body: {"id":"4bcfd959-a712-473e-bd6a-7d05760a1531","recipients":1}
            //body: {"id":"","recipients":0,"errors":["All included players are not subscribed"]}
            var err = body.errors ? body.errors[0] : 'none';
            err = err.substring(0, 250); // maxlength
            sql.query `insert into  Message (userid, username, message, send_after, error, onesignalid, campaignid, recipients, target) 
            values(${recipient.userid},${recipient.username},${recipient.message},${new Date(send_after)},${err},${body.id},${campaignid},${body.recipients},${targetapp.appid})`
                .catch(function(err) {
                    console.log("createOneSignalMessage insert error " + JSON.stringify(err));
                });

            var status = 1; // done
            if (body.errors) status = 2; // đã bắn nhưng lỗi.
            sql.query `update PendingMessage set status=${status} where id=${recipient.id} and status is null`
                .catch(function(err) {
                    console.log("createOneSignalMessage update error " + JSON.stringify(err));
                });
        } else {
            console.log('body: ' + JSON.stringify(body));
        }

    }

    request(options, callback);
}

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
var LoginData = mongoose.model('LoginData', { time: Date, formattedData: {} });

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

SnapshotData.find({})
    .select('_id time formattedData')
    // .where('time').gt(lastHours)
    .sort({ _id: -1 })
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
            SnapshotData.find({ _id: { $gt: start, $lt: end } })
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
            SnapshotData.find({})
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
        LoginData.find({})
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
        LoginData.find({ _id: { $gt: start, $lt: end } })
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

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://203.162.121.174:3001");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

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
    // res.sendFile(__dirname + '/../client/index.html');
    res.sendFile(path.resolve(__dirname + '/../client/index.html'));
});

app.get('/square', function(req, res) {
    // res.sendFile(__dirname + '/../client/index.html');
    res.sendFile(path.resolve(__dirname + '/../crossfilter/index.html'));
});

// ************  api Notification *************
app.post('/notify', function(req, res) {
    var campaign = req.body;

    if (!onesignal.groups[campaign.selectedGroup]) {
        res.json({ err: 'invalid selectedApp' });
        return;
    }

    if (onesignal.onProcessing) {
        res.json({ err: 'onesignal is onProcessing' });
        return;
    } else {
        onesignal.onProcessing = true;
    }

    function end(data) {
        onesignal.onProcessing = false;
        res.json(data);
    }

    function startCampaign(campaignid) {
        if (campaign.targetType == 'manually' || campaign.targetType == 'game') {
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
                console.log('campaignid: ' + campaignid);
                startCampaign(campaignid);
            }).catch(function(err) {
                end({ err: err });
            });
    }).catch(function(err) {
        end({ err: err });
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

app.post('/getPendingMessage', function(req, res) {
    var postdata = req.body;
    sql.connect(mssqlconfig).then(function() {
        sql.query `select top 200 * from PendingMessage where target=${postdata.target} and status is null`
            .then(function(recordset) {
                res.json({ data: recordset });
            }).catch(function(err) {
                res.json({ err: err });
            });

    }).catch(function(err) {
        res.json({ err: err });
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
    if (_.isEmpty(formattedData))
        return;
    var copy = _.cloneDeep(formattedData);
    timelineFormattedData.unshift({ time: new Date(), formattedData: copy });

    var snapshotData = new SnapshotData({ time: new Date(), formattedData: copy });
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
    server.listen(3003, function() {
        console.log('listening on *:3003');
    });
}, 3000);
