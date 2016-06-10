var express = require('express')
var app = express()
var server = require('http').createServer(app)
var bodyParser = require('body-parser')
var sql = require('mssql')
var io = require('socket.io').listen(server)
var _ = require('lodash')
var request = require('request')
var moment = require('moment')
var mongoose = require('mongoose')
var sql = require('mssql')

var timelineFormattedData = [];
var distsInfo = {}; // thông tin của các dist

function getTimeStamp() {
    return (moment().format("YYYY-MM-DD HH:mm:ss.SSS"));
}

var mssqlconfig = {
    user: 'sa',
    password: 'DstVietnam@123!',
    server: '203.162.166.20', // You can use 'localhost\\instance' to connect to named instance
    database: 'Notify'
}

var campaign = {
    name: '',
    targetType: 'manually',
    selectedGroup: -1,
    selectedApp: -1,
    recipients: ['$scope.target.one']
}

var request = require('request');
var options = {
    method: 'POST',
    url: 'https://onesignal.com/api/v1/notifications',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic NTE1YmY2ZGItNzc2NS00NTMzLTgzNzQtZDNhOWJjYTI0MzY3'
    },
    json: {
        "app_id": "0f372644-5bde-43bf-b5e0-15c5f720d6e2",
        "tags": [{ "key": "username", "relation": "=", "value": "aann2009" }],
        "data": { "text": "Đến giờ chơi game rồi nhé!" },
        "headings": { "en": "Knock knock" },
        "contents": { "en": "Đến giờ chơi game rồi nhé!" },
        "ios_badgeType": "Increase",
        "ios_badgeCount": 1
    }
};

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log('response: ' + JSON.stringify(response));
        console.log('body: ' + JSON.stringify(body));
    } else {
        console.log(error);
    }
}

request(options, callback);

// sql.connect(mssqlconfig).then(function() {
//     console.log('mssql connect ok');
//     // sql.query`select * from mytable where id = ${value}`.then(function(recordset) {
//     sql.query `insert into  MessageCampaign (name, recipients, type) output inserted.id 
//             values(${campaign.name}, ${campaign.recipients.length},${campaign.targetType})`
//     .then(function(recordset) {
//         console.dir(recordset);
//     }).catch(function(err) {
//         // ... error checks 
//     });
// }).catch(function(err) {
//     // ... error checks
//     console.log({ err: err });
// });

// sql.connect(config).then(function() {
//     new sql.Request().query('select * from PrepareMessage', function(err, recordset) {
//         // ... error checks
//         console.dir(recordset);
//         // console.log({ data: recordset, err: err });
//     });

// }).catch(function(err) {
//     // ... error checks
//     // res.json(err);
//     console.log(err);
// });

sql.on('error', function(err) {
    // ... error handler
    console.log(err)
});

return;
/*************************************************************/
mongoose.connect('mongodb://localhost/CustomerMonitor')

var SnapshotData = mongoose.model('SnapshotData', { time: String, formattedData: {} });
var Dist = mongoose.model("Dist", { id: String, data: { os: String, bundle: String, op: Number } });

// init data when server startup
/*************************************************************/
var lastHours = moment().subtract(1, 'hours').format("YYYY-MM-DD HH:mm:ss");

SnapshotData.find({})
    .select('time formattedData')
    // .where('time').gt(lastHours)
    .sort({ time: -1 })
    .limit(2880)
    .exec(function(err, docs) {
        if (err) return console.log(err);
        timelineFormattedData = docs;
        console.log(getTimeStamp() + " timelineFormattedData length " + docs.length);
    });

Dist.find({})
    // .select({ id: 1, data: 1, _id: 0 })
    .exec(function(err, docs) {
        if (err) return console.log(err);
        console.log('dist: ' + JSON.stringify(docs));
        _.forEach(docs, function(doc) {
            distsInfo[doc.id] = doc.data;
        });
    });

function addDistInfo(_info) {
    var _distid = _info.disid;
    console.log(getTimeStamp() + ' ' + JSON.stringify(distsInfo[_distid]))
    console.log('_.isEmpty(distsInfo[_distid].op): ' + _.isEmpty(distsInfo[_distid].op))
    console.log('!_.isEmpty(_info.operator): ' + _info.operator)
    console.log('_info.operator ' + Boolean(_info.operator))
    if (!_.has(distsInfo, _distid)) {
        // insert
        console.log('insert')
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
        console.log('update')
        distsInfo[_distid] = {
            os: _info.device_OS,
            bundle: _info.bundle,
            op: _info.operator
        };
        Dist.update({ id: _distid }, { $set: { data: distsInfo[_distid] } }, {}, function(err, logDoc) {
            if (err) return console.error(err);
            console.log('*dist');
        });
    } else {
        console.log('other case')
    }
}

var info = {
    "disid": "2483",
    "bundle": "th.hilothai",
    "app_version": "1.02",
    "device_OS": "iOS",
    "device_OS_version": "7.1.2",
    "scene_name": "GAME_VIEW",
    "loginTime": "23-05-2016 14:34:24",
    "username": "สุดยอด.007",
    "userid": 503989331,
    "operator": 1000,
    "logged_in_game_host": "203.150.82.49;",
    "gameid": 8021,
    "sceneStartedTime": "23-05-2016 15:21:09"
}
setTimeout(function() {
    addDistInfo(info)
}, 3000)

/*************************************************************/
// SETTING
// goi file trong cung thu muc
app.use(express.static(__dirname))
    // parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
    // parse application/json
app.use(bodyParser.json())

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

function getTimeStamp() {
    var currentdate = new Date()
    var datetime = currentdate.getDate() + "/" + (currentdate.getMonth() + 1) + "/" + currentdate.getFullYear() + " " + currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds()

    return datetime
}

app.get('/onesignal/:app', function(req, res) {
    var config = {
        siamunity: {
            appid: '4f1d9f21-2646-42aa-807a-d13bacc41c56',
            key: 'ZjdjOTIwNjctZDFjMS00NTMwLTgxZTUtMmNhM2Q4MDIyYTRj'
        },
        dummycocos: {
            appid: '60c4f721-75c6-4f10-b736-3ff480038f61',
            key: 'Y2IyZDViNTEtMjY3NC00OWU5LTk4ZTQtZDRmZjg3YmE1MzIy'
        },
    }

    var options = {
        method: 'post',
        body: {}, // Javascript object
        json: true, // Use,If you are sending JSON data
        url: "https://onesignal.com/api/v1/players/csv_export?app_id=" + config[req.params.app].appid,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + config[req.params.app].key
        }
    }
    request(options, function(err, _res, body) {
        if (err) {
            console.log('Error :', err)
            res.json(err)
            return
        }
        console.log(' Body :', body)
        res.json(body)

    })
})


server.listen(3001, function() {
    console.log(getTimeStamp() + ' listening on *:3001')
})
