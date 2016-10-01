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
var request = require('request');
var jsonfile = require('jsonfile');
var FB = require('fb');

/*************************************************************/
// socketio namespaces
var client3C = io.of('/client3C');
var client52 = io.of('/client52');
var clientdt = io.of('/clientdt');
var clientuwin = io.of('/clientuwin');
var clientsiam = io.of('/clientsiam');
var clientindo = io.of('/clientindo');
var tracker = io.of('/tracker');

// socketio vars
var connectedDevices = {};

var formattedData = {}; // là phiên bản đã format của connectedDevices
var avgLoginData = {};
var avgNetworkPerformanceData = {};
var timelineFormattedData = [];
var distsInfo = {}; // thông tin của các dist
var realtimemode = false;
var lastReportTime = moment();
var siamActions = {};

var ccus_byapp = {};
var ccus_byip = {};
var ccus_bygame = {};
var ccus_bydisid = {};
var lastRecordsCCUS = {};

var loopcount = 0;

var sendpulse = {
    add_getac: 'https://api.sendpulse.com/oauth/access_token',
    add_sendmail: 'https://api.sendpulse.com/smtp/emails',
    // maillist: './config.maillist.json',
    // threshold: './config.threshold.json',
    config: './config.params.json',
    token_type: '',
    access_token: '',
    expired_date: '',
    minDurationSentNotify: 5
}

var goitinlam = {
    "event": "news",
    "name": "affeil",
    "data": [{
        "_id": "idfake1",
        "type": 1,
        "title": "nap Gold",
        "url": "http://203.162.166.19:5000/Siam/image/km200_1.png",
        "urllink": "https://www.google.com.vn",
        "urlBtn": "http://203.162.166.19:5000/Siam/image/btnkmai.png",
        "pos": {
            "x": 0,
            "y": -0.32
        }
    }, {
        "_id": "idfake2",
        "type": 1,
        "title": "nap Gold",
        "url": "http://203.162.166.19:5000/Siam/image/km200_2.png",
        "urllink": "https://www.google.com.vn",
        "urlBtn": "http://203.162.166.19:5000/Siam/image/btnkmai.png",
        "pos": {
            "x": 0,
            "y": -0.32
        }
    }, {
        "_id": "idfake3",
        "type": 1,
        "title": "nap Gold",
        "url": "http://203.162.166.19:5000/Siam/image/km200_3.png",
        "urllink": "https://www.google.com.vn/",
        "urlBtn": "http://203.162.166.19:5000/Siam/image/btnkmai.png",
        "pos": {
            "x": 0,
            "y": -0.32
        }
    }, {
        "_id": "idfake4",
        "type": 1,
        "title": "nap Gold",
        "url": "http://203.162.166.19:5000/Siam/image/km200_4.png",
        "urllink": "https://www.google.com.vn/",
        "urlBtn": "http://203.162.166.19:5000/Siam/image/btnkmai.png",
        "pos": {
            "x": 0,
            "y": -0.32
        }
    }]
};
// system message được lưu vào mảng này, nhằm giảm thời gian gọi từ DB
var sMes = [];

/*************************************************************/
mongoose.connect('mongodb://localhost/CustomerMonitor');

var SnapshotData = mongoose.model('SnapshotData', { time: String, formattedData: {} });
var Dist = mongoose.model("Dist", { id: String, data: { os: String, bundle: String, app: String } });
var LoginData = mongoose.model('LoginData', { time: Date, formattedData: {} });
// Những thông tin dưới đây chưa lọc theo version, thật nguy hiểm
var LoginFailed = mongoose.model('LoginFailed', { time: Date, app: String, bundle: String, os: String, host: String, gameid: Number, username: String, errorcode: Number, errormsg: String, d: Number });
var LoadConfig = mongoose.model('LoadConfig', { time: Date, app: String, bundle: String, os: String, 'r1': Number, 'r2': Number, 'r3': Number, 'r4': Number, 'r5': Number });
var LoginSuccess = mongoose.model('LoginSuccess', { time: Date, app: String, bundle: String, os: String, 'd1r1': Number, 'd1r2': Number, 'd1r3': Number, 'd1r4': Number, 'd1r5': Number, 'd2r1': Number, 'd2r2': Number, 'd2r3': Number, 'd2r4': Number, 'd2r5': Number });
var LoginReport = mongoose.model('LoginReport', { time: Date, duration: Number, apps: [] });
// {'event':'payment_success', type:type, amount:amount, d:0.1}
// {'event':'payment_failed', type:type, amount:amount, errcode:'', d:0.1}
// {'event':'send_sms', add:'+8028'}
var OpenPayment = mongoose.model('OpenPayment', { time: Date, app: String, bundle: String, os: String, fromScene: String, vip: Number, gold: Number, duration: Number }); // -> chưa ghi
var PaymentSuccess = mongoose.model('PaymentSuccess', { time: Date, app: String, bundle: String, os: String, type: String, amount: Number, d: Number });
var PaymentFailed = mongoose.model('PaymentFailed', { time: Date, app: String, bundle: String, os: String, type: String, amount: Number, errcode: String, d: Number });
var SendSMS = mongoose.model('SendSMS', { time: Date, app: String, bundle: String, os: String, add: String });

var SiamAction = mongoose.model('SiamAction', { date: Date, clicksuggestdummy: Number, showsuggestdummy: Number, timeleftdummy: {}, timeplaydummy: {} });

var SMessage = mongoose.model('SMessage', { app: String, date: Date, type: Number, title: String, url: String, urllink: String, pos: { x: Number, y: Number } });

// chuẩn bị thống kê lượt cài đặt ở đây?
// d1: createdDate, d2: lastActiveDate, 
// disid: [{id:Number, lastActive:Date}]
// device: [{id:Number, lastActive:Date}]
// fFB: [Number]
var MUser = mongoose.model('User', {
    uid: Number,
    app: String,
    operator: Number,
    email: String,
    name: String, // không biết có nên thêm vip và gold vào ko
    vip: Number,
    gold: Number,
    fbName: String,
    fbID: String,
    d1: Date,
    d2: Date,
    disid: [], // list disid mà user đã active
    dev: [], // list device mà user đã active
    lDisid: String, // disid cuối cùng user active
    lDev: String, // Device cuối cùng mà user active
    fFB: [], // danh sách nhanh các bạn từ fFB cũng chơi game, limit 200 bạn
    fFBSize: Number, // để truy vấn nhanh
    // ban đầu fG bao gồm fFB, fG: [{fbid:Number}]
    // sau đó sẽ đc cập nhật thành, fG: [{fbid:Number, uid:Number, name:String, }]
    lastUpdateFB: Date,
    lastSentNotify: Date,
    // sMsg: [{ mid: String, beh: Number, date: Date }], // danh sách system message -> ko cần thiết lắm
    // beh:0 - đã gửi, 1 - in, 2 - out
    // date: ngày user có tương tác, dexp: ngày mà msg hết hiệu lực, nên xóa trong mảng này đi
    cp: [{ pid: String, gid: Number, n: String, c: Number, d: Date }], // danh sách player hay choi cùng, Ghi vào Db lúc user thoát
    // gid: gameid, n:name, c: count, d: last date phát sinh ván chơi cùng
    fl: [{ pid: String, gid: Number, n: String, d: Date }] // follow list
        // đối với biến user,
        // player đc chọn sẽ đưa vào follow list.
        // d: ngày kết bạn
});

// init data when server startup
/*************************************************************/
var lastHours = moment().subtract(1, 'hours').format("YYYY-MM-DD HH:mm:ss");

SnapshotData.find({})
    .select('time formattedData')
    // .where('time').gt(lastHours)
    .sort({ time: -1 })
    .limit(2880)
    .lean().exec(function(err, docs) {
        if (err) return console.log(err);
        timelineFormattedData = docs;
        console.log("timelineFormattedData length " + docs.length);
    });

Dist.find({})
    // .select({ id: 1, data: 1, _id: 0 })
    .lean().exec(function(err, docs) {
        if (err) return console.log(err);
        _.forEach(docs, function(doc) {
            distsInfo[doc.id] = doc.data; // nếu ko dùng lean thì phải dùng doc.data.toJSON()
            // console.log(`${doc.id} -> ${distsInfo[doc.id]}`)
        });
    });

SMessage.find({})
    .lean().exec(function(err, docs) {
        sMes = format_sMes(docs, err);
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

app.set('view engine', 'ejs');

/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function getTimeStamp() {
    return (moment().format("YYYY-MM-DD HH:mm:ss"));
}

function format_sMes(docs, err) {
    if (err) {
        console.log(err);
        return {};
    }

    var sMes = {};
    // docs là array, lọc theo date cập nhật vào sMes
    _.forEach(docs, function(doc) {
        // filter by time
        var dexp = moment(doc.dexp);
        var dsta = moment(doc.date);
        if (moment().isAfter(dexp) || moment().isBefore(dsta))
            return;
        var app = doc.app;
        if (app) {
            if (!sMes[app]) {
                sMes[app] = []; // new array
            }
            sMes[app].push(doc);
        }
    });

    return sMes;
}

function addDistInfo(_info, app) {
    var _distid = _info.disid; //

    if (!_.has(distsInfo, _distid)) {
        // insert
        distsInfo[_distid] = {
            os: _info.device_OS,
            bundle: _info.bundle,
            app: app // update 15/10/16 op: _info.app || app
        };
        var dist = new Dist({ id: _distid, data: distsInfo[_distid] });
        dist.save(function(err, logDoc) {
            if (err) return console.error(err);
            console.log('+dist');
        });
    } else if (!Boolean(distsInfo[_distid].app)) { //if(a) để check nếu a != null, a != 0, a != undefined
        // update
        distsInfo[_distid] = {
            os: _info.device_OS,
            bundle: _info.bundle,
            app: app // update 15/10/16 op: _info.app || app
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
        var host = (cd.logged_in_game_host ? cd.logged_in_game_host : "0.0.0.0." + cd.app).replace(/\;$/, '').replace(/\./g, '_');
        host = (sceneName == "LOGIN_VIEW") ? "0_0_0_0_" + cd.app : host; // thêm dòng này, cần thiết để đếm số bạn đang ở ngoài
        var gameid = cd.gameid ? cd.gameid : "0000";
        gameid = (sceneName == "LOGIN_VIEW") ? "0000_" + cd.app : gameid;
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
    var host = (cd.logged_in_game_host ? cd.logged_in_game_host : "0.0.0.0." + cd.app).replace(/\;$/, '').replace(/\./g, '_');
    host = (sceneName == "LOGIN_VIEW") ? "0_0_0_0_" + cd.app : host; // thêm dòng này, cần thiết để đếm số bạn đang ở ngoài
    var gameid = cd.gameid ? cd.gameid : "0000";
    gameid = (sceneName == "LOGIN_VIEW") ? "0000_" + cd.app : gameid;
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

    if (!ccus_byapp[cd.app]) ccus_byapp[cd.app] = 0; // init
    if (!ccus_byip[host]) ccus_byip[host] = 0; // init
    if (!ccus_bydisid[disid]) ccus_bydisid[disid] = 0; // init
    if (!ccus_bygame[gameid]) ccus_bygame[gameid] = 0; // init
    ccus_byapp[cd.app]++;
    ccus_byip[host]++;
    ccus_bydisid[disid]++;
    ccus_bygame[gameid]++;
}

function removeDevice(cd) { // connectedDevice  
    var sceneName = cd.scene_name ? cd.scene_name : "LOGIN_VIEW";
    var disid = cd.disid ? cd.disid : 0;
    var host = (cd.logged_in_game_host ? cd.logged_in_game_host : "0.0.0.0." + cd.app).replace(/\;$/, '').replace(/\./g, '_');
    host = (sceneName == "LOGIN_VIEW") ? "0_0_0_0_" + cd.app : host; // thêm dòng này, cần thiết để đếm số bạn đang ở ngoài
    var gameid = cd.gameid ? cd.gameid : "0000";
    gameid = (sceneName == "LOGIN_VIEW") ? "0000_" + cd.app : gameid;
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

    if (!ccus_byapp[cd.app]) ccus_byapp[cd.app] = 0; // init
    if (!ccus_byip[host]) ccus_byip[host] = 0; // init
    if (!ccus_bydisid[disid]) ccus_bydisid[disid] = 0; // init
    if (!ccus_bygame[gameid]) ccus_bygame[gameid] = 0; // init

    if (ccus_byapp[cd.app] >= 1) ccus_byapp[cd.app]--; // check điều kiện đề phòng trường hợp ccu âm
    if (ccus_byip[host] >= 1) ccus_byip[host]--;
    if (ccus_bydisid[disid] >= 1) ccus_bydisid[disid]--;
    if (ccus_bygame[gameid] >= 1) ccus_bygame[gameid]--;
}

function sendNotifyToFriendsOfUser(user) {
    // chỉ thử nghiệm ở đấu trường
    // lưu ý sau này khi mở lại thì phải sửa message
    if (user.app != 'dautruong')
        return;
    var messagegroup = 2;
    var title = 'Đấu Trường';
    var message = 'đang chơi game.';

    // cloneDeep vì tránh trường hợp user bị delete sau này.
    var iuser = _.cloneDeep(user);
    // if (iuser.fFB && iuser.fFB.length > 0)
    //     console.log('prepare sendNotifyToFriendsOfUser ' + iuser.username + ' friends: ' + iuser.fFB.length);
    // đây là trường hợp đều đã có fFB, tuy nhiên vẫn nên check lại
    _.forEach(iuser.fFB, function(friendItem) {
        // trySendToFriend(friendItem.id);
        // 1. tìm các user khác là bạn ở trong list.
        MUser.findOne({ fbID: friendItem.id }).exec(function(err, ruser) {
            if (err) {
                console.log('find { fbID: friendItem.id } err : ' + JSON.stringify(err));
            } else if (ruser) {
                // TODO:* send notify cho ruser, Có một vài cách:
                // 1. Gửi cho ruser qua tag name
                // 2. Gửi cho ruser qua tag uid
                // 3. Gửi cho tất cả device ruser đã chơi qua mảng dev
                // triển khai cách 2.

                // nhớ dùng cmessage kẻo nhầm với message
                var cmessage = "to " + ruser.name + " (" + ruser.fbName + "): " + iuser.username + " (" + iuser.fbName + ") " + message;

                var campaign = {
                    "name": "notset",
                    "targetType": "FBFriends",
                    "selectedGroup": messagegroup,
                    "selectedApp": -1, // -1 nghĩa là ko chọn một distribution cụ thể mà chọn theo cả group luôn
                    "recipients": [{
                        "username": ruser.name,
                        "userid": ruser.uid,
                        "title": title,
                        "message": cmessage
                    }]
                };

                var options = {
                    method: 'POST',
                    url: 'http://203.162.121.174:3003/notify',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    json: campaign
                };

                function callback(error, response, body) {
                    // TODO
                    if (error) {
                        console.log('sendNotifyToFriendsOfUser ' + JSON.stringify(error));
                        return;
                    }
                    // console.log('<---- sendNotifyToFriendsOfUser ' + JSON.stringify(body));
                }

                // mặc định khoảng thời gian tối thiểu một user nhận notity liên tiếp là 5'
                if (!sendpulse.minDurationSentNotify) sendpulse.minDurationSentNotify = 5;
                if (!ruser.lastSentNotify || moment.duration(moment().diff(ruser.lastSentNotify)).asMinutes() > sendpulse.minDurationSentNotify) {
                    // console.log('----> sendNotifyToFriendsOfUser ' + cmessage);
                    // TODO: An, tạm thời dừng bắn notify
                    // request(options, callback);

                    // if (user) user.lastSentNotify = new Date(); --> đoạn này bị sai, cần cẩn thận, ta chỉ quan tâm đến ruser mà thôi.
                    MUser.findOneAndUpdate({ _id: ruser._id }, {
                        $set: {
                            lastSentNotify: new Date(),
                        }
                    }, { new: true }, function(err, doc) {
                        if (err) {
                            console.log("MUser update lastSentNotify failed!");
                        }
                    });
                }
            } else {
                // không tìm thấy
            }
        });
    });

}

function captureUserAction(socket, user, user_update) {
    if (user.scene_name && user_update && user_update.scene_name && user.scene_name == user_update.scene_name) {
        // trường hợp bị gửi dup
        return;
    }

    if (!user.username) { // đây là tình huống user chưa login
        var success;
        //2016-06-11 22:59:22
        var loginTime = moment(user.loginTime, "YYYY-MM-DD HH:mm:ss");
        var duration = moment.duration(moment().diff(loginTime)).asSeconds();
        if (user_update != null) {
            // 1. user chưa login, từ màn hình login vào màn hình trong
            success = true;

            socket.emit('event', { event: 'info', data: 'home view first time' });

            // update User vào DB
            var iuser = _.cloneDeep(user);
            _.extend(iuser, user_update);
            addOrUpdateUserToDB(iuser, function(ruser) {
                // ruser có thể là null, nên phải check trước
                if (ruser && user) { // update ngược lại lastUpdateFB vào input, để dễ dàng quyết định có sử dụng getExtraInfo hay ko
                    // ở đây user chính là connectedDevices[socket.id]
                    // nên hy vọng ở call back vẫn trỏ đc đến connectedDevices[socket.id]
                    // đồng thời phải lưu ý, vì connectedDevices[socket.id] có thể đã bị remove, nên phải check luôn đk này
                    if (ruser.lastUpdateFB) user.lastUpdateFB = ruser.lastUpdateFB;
                    if (ruser.lastSentNotify) user.lastSentNotify = ruser.lastSentNotify;
                    if (ruser.email) user.email = ruser.email;
                    if (ruser.fbID) user.fbID = ruser.fbID;
                    if (ruser.fbName) user.fbName = ruser.fbName;
                    // if (ruser.sMsg) user.sMsg = ruser.sMsg;
                    if (ruser.dev) user.ldev = ruser.dev;
                    if (ruser.disid) user.ldis = ruser.disid;
                    if (ruser.fFB) {
                        user.fFB = ruser.fFB;
                        sendNotifyToFriendsOfUser(user);
                    }

                    // thời điểm bắn sMes
                    // kiểm tra những smes mà user đã nhận so với sMes của server
                    // order lại thứ tự nhận rồi emit về cho user

                    var sMesData = sMes[user.app];
                    if (!sMesData)
                        return;

                    // kiểm tra firstlogin để trả về news
                    var YESTERDAY = moment().clone().subtract(1, 'days').startOf('day');
                    if (moment(ruser.d2).isSame(YESTERDAY, 'd')) // d2 là last online time
                    {
                        // hiện news
                        if (sMesData.length > 0)
                            socket.emit('event', { event: 'news', data: sMesData });
                    } else {
                        // nếu dùng chính sách khác, có thể cho vào đây. 
                        // CS1: đấu trường chỉ cần ko bắn dầy
                        if (user.app == "dautruong") {
                            var NOW = moment();
                            var lastActiveDate = moment(ruser.d2);
                            var duration = moment.duration(NOW.diff(lastActiveDate)).asMinutes();
                            if (duration > 60*2) {
                                if (sMesData.length > 0)
                                    socket.emit('event', { event: 'news', data: sMesData });
                            }
                        }
                    }

                    // bắn tin random cho Lâm
                    // if (user.app == "siam") {
                    //     var sMesData = _.cloneDeep(goitinlam.data);
                    //     var n = getRandomInt(1, goitinlam.data.length);
                    //     sMesData = shuffle(sMesData);
                    //     sMesData = sMesData.splice(0, n);
                    //     socket.emit('event', { event: 'news', data: sMesData });
                    // }
                }
            });
        } else {
            // 2. user chưa login, disconnect
            success = false;
        }

        var disid = user.disid;
        if (!_.has(avgLoginData, disid)) {
            avgLoginData[disid] = {
                success: success ? 1 : 0,
                failed: success ? 0 : 1,
                successTime: success ? duration : 0,
                failedTime: success ? 0 : duration,
                minST: success ? duration : undefined,
                maxST: success ? duration : undefined,
                minFT: success ? undefined : duration,
                maxFT: success ? undefined : duration
            }
        } else {
            if (success) {
                avgLoginData[disid].successTime = (avgLoginData[disid].success * avgLoginData[disid].successTime + 1 * duration) / (avgLoginData[disid].success + 1);
                avgLoginData[disid].success += 1;

                if (avgLoginData[disid].minST > duration || avgLoginData[disid].minST == undefined)
                    avgLoginData[disid].minST = duration;

                if (avgLoginData[disid].maxST < duration || avgLoginData[disid].maxST == undefined)
                    avgLoginData[disid].maxST = duration;
            } else {
                avgLoginData[disid].failedTime = (avgLoginData[disid].failed * avgLoginData[disid].failedTime + 1 * duration) / (avgLoginData[disid].failed + 1);
                avgLoginData[disid].failed += 1;

                if (avgLoginData[disid].minFT > duration || avgLoginData[disid].minFT == undefined)
                    avgLoginData[disid].minFT = duration;

                if (avgLoginData[disid].maxFT < duration || avgLoginData[disid].maxFT == undefined)
                    avgLoginData[disid].maxFT = duration;
            }
        }
    }

    if (user.username) {
        if (user_update != null && user_update.scene_name != undefined && user_update.scene_name.includes('LOGIN_VIEW')) {
            // tình huống user back ra home để đăng nhập lại
            // => xóa username, làm như vậy thì khi user đăng nhập lại, có thể detect đc vào save vào bảng user.
            var app = user.app;
            user = {};
            user_update = { app: app }

            socket.emit('event', { event: 'info', data: 'back to login view' });
        }
        if (user_update != null && user_update.scene_name != undefined && user_update.scene_name.includes('GAMELIST_VIEW')) {
            socket.emit('event', { event: 'info', data: 'back to home view' });
        }
    }

    // trường hợp scene_name undefined là khi device ở màn hình Login và ở bản cũ thì ko gửi scene_name lên
    // check scene_name != undefined vì một số bản client đầu ko gửi scene_name lúc reg_info
    if (user_update != null && user_update.scene_name != undefined && user_update.scene_name.includes('GAME_VIEW')) { // tình huống user chuyển vào trong game
        // console.log(`${user_update.username} join game ${user_update.gameid}`);
    }

    if (user.scene_name != undefined && user.scene_name.includes('GAME_VIEW')) { // tình huống user leave table
        // console.log(`${user.username} leave game ${user.gameid}`);
    }

    // ###### TODO: còn tính tiếp. CÓ thể sẽ cho vào event user thoát game.
    // event user thoát game sẽ tương đối nhạy cảm, liệu có lẫn với event server tracking down?

    // note1: client chưa gửi lên vip và gold, thứ 2 là thông tin này lấy ở DB anh Việt đc, nên bỏ qua vậy. hic
    // if (user_update != null && user_update.scene_name != undefined && user_update.scene_name.includes('PAYMENT')) {
    //     // { time: Date, app: String, bundle: String, os: String, fromScene: String, vip: Number, gold: Number, duration: Number }
    //     var loginTime = moment(user.loginTime, "YYYY-MM-DD HH:mm:ss");
    //     var duration = moment.duration(moment().diff(loginTime)).asSeconds();

    //     var data = {};
    //     _.extend(data, distsInfo[user_update.disid]); // nếu khai báo data = distsInfo[user_update.disid], sợ rằng khi thay đổi data sẽ thay đổi distsInfo
    //     data.time = new Date();
    //     data.duration = duration;
    //     data.fromScene = user.scene_name;
    //     data.vip = user_update.vip;
    //     data.gold = user_update.gold;

    //     var appnPayment = new OpenPayment(data);
    //     appnPayment.save(function(err, logDoc) {
    //         if (err) return console.error(err);
    //     });
    // }


    // 3. user đã login, đổi màn hình

    // 3.1 user đổi từ màn hình login vào game

    // 3.2  
}

app.get('/', function(req, res) {
    // res.sendFile(__dirname + '/../client/home.html');
    res.sendFile(path.resolve(__dirname + '/../client/home.html'));
});

app.get('/users', function(req, res) {
    var buffer = { count: _.size(connectedDevices), users: [] }
    _.forEach(connectedDevices, function(device) {
        buffer.users.push(device.username);
    });
    // res.json(buffer);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(buffer, null, 3));
});

app.get('/fullusers', function(req, res) {
    // res.json(connectedDevices);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(connectedDevices, null, 3));
});

app.get('/users/:username', function(req, res) {
    var username = req.params.username;
    var result = {};
    _.forEach(connectedDevices, function(device) {
        if (_.has(device, 'username') && device.username == username) {
            result = device;
            return false;
        }
    });

    // res.json(result);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(result, null, 3));
});


app.post('/testevent', function(req, res) {
    var username = req.body.name;

    var found = false;
    var sid = '_';
    _.forEach(connectedDevices, function(device, socketid) {
        if (_.has(device, 'username') && device.username == username) {
            client52.to(socketid).emit('event', req.body);
            clientdt.to(socketid).emit('event', req.body);
            clientsiam.to(socketid).emit('event', req.body);
            clientindo.to(socketid).emit('event', req.body);
            client3C.to(socketid).emit('event', req.body);
            sid = socketid;
            found = true;
            return false;
        }
    });


    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ found: found, socketid: sid }, null, 3));
});

app.get('/sendpulse', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(sendpulse, null, 3));
});

app.get('/sMes', function(req, res) {
    // cập nhật lại sMes list
    SMessage.find({})
        .lean().exec(function(err, docs) {
            if (err) {
                res.send(JSON.stringify(err, null, 3));
                return;
            }

            sMes = format_sMes(docs, err);

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(sMes, null, 3));
        });

});

app.get('/dist', function(req, res) {
    // res.json(distsInfo);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(distsInfo, null, 3));
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

// ***** đoạn này để trả về response 200 cho client ***** //

app.get('/client3C', function(req, res) {
    res.json({});
});
app.get('/client52', function(req, res) {
    res.json({});
});
app.get('/clientdt', function(req, res) {
    res.json({});
});
app.get('/clientuwin', function(req, res) {
    res.json({});
});
app.get('/clientsiam', function(req, res) {
    res.json({});
});
app.get('/clientindo', function(req, res) {
    res.json({});
});

// ************************* END ************************* //

app.get('/clients', function(req, res) {
    var _formattedData = formatClientData();
    // res.json(_formattedData);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(_formattedData, null, 3));
});

app.get('/clients2', function(req, res) {
    var _formattedData = _.cloneDeep(formattedData);
    _.forOwn(_formattedData, function(fd, key) {
        if (!_.has(fd, 'info')) {
            fd['info'] = distsInfo[key];
        }
    });

    // res.json(_formattedData);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(_formattedData, null, 3));
});

app.get('/logindata', function(req, res) {
    // res.json(avgLoginData);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(avgLoginData, null, 3));
});

app.get('/load_config', function(req, res) {
    // res.json(avgNetworkPerformanceData.load_config);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(avgNetworkPerformanceData.load_config, null, 3));
});

function analyze_login_api() {
    var r = [];
    var duration = moment.duration(moment().diff(lastReportTime)).asSeconds();
    // avgNetworkPerformanceData.login_failed

    // tạm fix cái này
    var apps = ["3c", "52", "dautruong", "siam", "indo"];
    for (var i = 0; i < apps.length; i++) {
        var appid = apps[i];

        var count_loginFailed = 0;
        if (avgNetworkPerformanceData.login_failed && avgNetworkPerformanceData.login_failed[appid])
            count_loginFailed = avgNetworkPerformanceData.login_failed[appid];
        var count_loginSuccess = 0;
        var count_d1r1 = 0;
        var count_d1r2 = 0;
        var count_d1r3 = 0;
        var count_d1r4 = 0;
        var count_d1r5 = 0;
        var count_d2r1 = 0;
        var count_d2r2 = 0;
        var count_d2r3 = 0;
        var count_d2r4 = 0;
        var count_d2r5 = 0;

        if (avgNetworkPerformanceData.login_success)
            _.forEach(avgNetworkPerformanceData.login_success, function(value, key) {
                if (key.endsWith(appid)) {
                    count_d1r1 += (value.d1r1 || 0);
                    count_d1r2 += (value.d1r2 || 0);
                    count_d1r3 += (value.d1r3 || 0);
                    count_d1r4 += (value.d1r4 || 0);
                    count_d1r5 += (value.d1r5 || 0);
                    count_d2r1 += (value.d2r1 || 0);
                    count_d2r2 += (value.d2r2 || 0);
                    count_d2r3 += (value.d2r3 || 0);
                    count_d2r4 += (value.d2r4 || 0);
                    count_d2r5 += (value.d2r5 || 0);
                }
            });

        count_loginSuccess = count_d1r1 + count_d1r2 + count_d1r3 + count_d1r4 + count_d1r5;

        r.push({
            appid: appid,
            res: {
                success: count_loginSuccess,
                failed: count_loginFailed,
                failedRate: count_loginFailed / (count_loginSuccess + count_loginFailed),
                d1r1: count_d1r1,
                d1r2: count_d1r2,
                d1r3: count_d1r3,
                d1r4: count_d1r4,
                d1r5: count_d1r5,
                d2r1: count_d2r1,
                d2r2: count_d2r2,
                d2r3: count_d2r3,
                d2r4: count_d2r4,
                d2r5: count_d2r5
            }
        });
    }

    return {
        time: new Date(),
        duration: duration,
        apps: r,
        details: avgNetworkPerformanceData.login_success
    };
}

app.get('/login_report', function(req, res) {
    // res.json(analyze_login_api());
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(analyze_login_api(), null, 3));
});

function getccus() {
    var appsbyapp = {
        "500": "Đấu Trường",
        "1000": "Siam Play",
        "1001": "Siam Play 1001",
        "5000": "Game 3C",
        "5200": "52 Fun",
        "1020": "Indo"
    };

    var gamesbyid = {
        "8002": "BACAY",
        "8003": "XITO",
        "8004": "BINH",
        "8005": "TIENLEN",
        "8006": "TALA",
        "8007": "CHAN",
        "8008": "POKER",
        "8009": "CARO",
        "8010": "LIENG",
        "8011": "GATE",
        "8012": "SAM",
        "8013": "XOCDIA",
        "8006": "PHOM",
        "8801": "LUCKYCARD",
        "8802": "AUCTION",
        "9006": "ROULETTE",
        "8020": "POKER9K",
        "8021": "DUMMY",
        "8022": "HILO",
        "8023": "POKDENG",
        "8024": "DUMMY_FAST",
        "8014": "PAYPOCK",
        "8015": "CUOIKHUN",
        "8026": "NEWPOKER",
        "8025": "POKER9K"
    };

    var c_ccus_byapp = _.cloneDeep(ccus_byapp);
    _.forEach(c_ccus_byapp, function(value, key) {
        if (!appsbyapp[key])
            return;
        var newkey = appsbyapp[key];
        c_ccus_byapp[newkey] = value;
        delete c_ccus_byapp[key];
    });

    var c_ccus_bygame = _.cloneDeep(ccus_bygame);
    _.forEach(c_ccus_bygame, function(value, key) {
        if (!gamesbyid[key])
            return;
        var newkey = gamesbyid[key];
        c_ccus_bygame[newkey] = value;
        delete c_ccus_bygame[key];
    });

    var c_ccus_bydisid = _.cloneDeep(ccus_bydisid);
    _.forEach(c_ccus_bydisid, function(value, key) {
        _.extend(c_ccus_bydisid[key], distsInfo[key]);
    });

    return {
        c_ccus_byapp: c_ccus_byapp,
        c_ccus_bygame: c_ccus_bygame,
        c_ccus_bydisid: c_ccus_bydisid,
        ccus_byip: ccus_byip
    }
}

app.get('/ccus', function(req, res) {
    var ccus = getccus();
    // res.json({ date: new Date(), app: ccus.c_ccus_byapp, ip: ccus.ccus_byip, game: ccus.c_ccus_bygame, distribution:ccus.c_ccus_bydisid });
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ date: new Date(), app: ccus.c_ccus_byapp, ip: ccus.ccus_byip, game: ccus.c_ccus_bygame, distribution: ccus.c_ccus_bydisid }, null, 3));
});

app.get('/ccus_view', function(req, res) {
    var ccus = getccus();
    res.render('view_ccus', {
        date: new Date(),
        app: ccus.c_ccus_byapp,
        ip: ccus.ccus_byip,
        game: ccus.c_ccus_bygame,
        distribution: ccus.c_ccus_bydisid,
        moment: moment // pass thư viện qua
    });
});

app.get('/testSendWarningMail', function(req, res) {
    jsonfile.readFile(sendpulse.config, function(err, config) {
        if (err) {
            res.json({ err: err });
        } else {
            var msg = "App " + 000 + " Warning login failed rate " + 0.1;
            sendWarningMail(config.maillist, 1, msg, { name: 'full report', content: 'test', values: [1, 2, 3, 4, 5] }, 'mailonly')
            res.json({ status: 'ok' });
        };
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

function addOrUpdateUserToDB(iuser, callback) {
    // một số trường hợp iuser.did có thể undefined, do bản cũ
    var idid = iuser.did ? iuser.did : 'undefined';
    if (idid.length < 10)
        idid = "malformed";
    MUser.findOne({ uid: iuser.userid, app: iuser.app }).exec(function(err, ruser) {
        callback(ruser);

        if (err) {
            console.log('err: ' + JSON.stringify(err));
        } else if (!ruser) {
            // console.log('ruser == null');
            // thực hiện insert

            var data = {
                uid: iuser.userid,
                app: iuser.app,
                name: iuser.username,
                d1: new Date(),
                d2: new Date(),
                lDisid: iuser.disid,
                lDev: idid,
                disid: [{ id: iuser.disid, la: new Date() }],
                dev: [{ id: idid, la: new Date() }]
            }
            if (iuser.ag) data.gold = iuser.ag;
            if (iuser.vip) data.vip = iuser.vip;

            var mUser = new MUser(data);
            mUser.save(function(err, doc) {
                if (err) {
                    console.log("Something wrong when insert mUser! ");
                    console.log(err);
                }
            });
        } else {
            // console.log('ruser: ' + JSON.stringify(ruser));            
            // thực hiện update
            var disid = ruser.disid;
            var dev = ruser.dev;

            if (!disid) {
                disid: [{ id: iuser.disid, la: new Date() }];
            }
            else {
                var found = false;
                for (var i = disid.length - 1; i >= 0; i--) {
                    if (disid[i].id == iuser.disid) {
                        disid[i].la = new Date();
                        found = true;
                        break;
                    }
                };
                if (!found) {
                    disid.push({ id: iuser.disid, la: new Date() });
                }
            }

            if (!dev) {
                dev: [{ id: idid, la: new Date() }];
            }
            else {
                var found = false;
                for (var i = dev.length - 1; i >= 0; i--) {
                    if (dev[i].id == idid) {
                        dev[i].la = new Date();
                        found = true;
                        break;
                    }
                };
                if (!found) {
                    dev.push({ id: idid, la: new Date() });
                }
            }


            var data = {
                d2: new Date(),
                lDisid: iuser.disid,
                lDev: idid,
                disid: disid,
                dev: dev
            }
            if (iuser.ag) data.gold = iuser.ag;
            if (iuser.vip) data.vip = iuser.vip;

            MUser.findOneAndUpdate({ _id: ruser._id }, {
                $set: data
            }, { new: true }, function(err, doc) {
                if (err) {
                    console.log("Something wrong when updating mUser! ");
                    console.log(err);
                }
                // console.log(doc);
            });
        }
    });
}

function getFBExtraData(FB, iuser, callback) {
    if (!iuser['ac']) {
        console.log('user does not have access token');
        return;
    }

    // cập nhật lại thông tin từ FB sau 1 ngày
    var yesterday = moment().add(-1, 'days');
    if (!iuser.lastUpdateFB || moment(iuser.lastUpdateFB).isBefore(yesterday)) {
        // console.log('step 1 ' + iuser.username + ' ac: ' + iuser.ac);
        var fb = FB.withAccessToken(iuser.ac);
        // FB.setAccessToken(iuser.ac);

        fb.api('', 'post', {
            batch: [
                { method: 'get', relative_url: 'me' },
                { method: 'get', relative_url: 'me/friends?limit=200' }
            ]
        }, function(res) {
            var res0, res1;

            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                callback(null, null);
                return;
            }

            res0 = JSON.parse(res[0].body);
            res1 = JSON.parse(res[1].body);
            // res0 = {
            //     id: '974492469236118',
            //     email: 'nguyenhaian@outlook.com',
            //     first_name: 'An',
            //     gender: 'male',
            //     last_name: 'Nguyễn',
            //     link: 'https://www.facebook.com/app_scappd_user_id/974492469236118/',
            //     locale: 'en_US',
            //     name: 'An Nguyễn',
            //     quotes: 'Chưa thích câu nào cả.',
            //     timezone: 7,
            //     updated_time: '2016-01-30T17:29:44+0000',
            //     verified: true
            // }

            // res1 = {
            //     data: [{ name: 'Anh Tuấn', id: '10153217538279830' },
            //         { name: 'Nguyen Duc Viet', id: '10153406034664184' },
            //         { name: 'Chien Eric', id: '10206074069586758' },
            //         { name: 'Nguyen Trung Hieu', id: '10204365501593804' },
            //         { name: 'Nguyễn Sơn Tùng', id: '10205084397049338' },
            //         { name: 'Thanh Phuong', id: '10204946235121768' },
            //         { name: 'Linh Nguyen Duc', id: '10202737658361890' },
            //         { name: 'Hoàn Ộp', id: '10201920552975202' },
            //         { name: 'Hai Phan', id: '1285937068087792' },
            //         { name: 'Đạt Lex', id: '1198844253464750' },
            //         { name: 'Ho Hai Phuc', id: '1192327600784286' },
            //         { name: 'Sen Nguyen', id: '1031104880250669' },
            //         { name: 'Hieu Nguyen Trung', id: '1038681489497079' },
            //         { name: 'Độ Carrot', id: '1000936379940467' },
            //         { name: 'Hà Nhím', id: '977908178922460' },
            //         { name: 'Củ Sắn DÂy', id: '905531396161027' },
            //         { name: 'Đào Đình Giang', id: '866668070048820' },
            //         { name: 'Coi Tho', id: '829274250460418' },
            //         { name: 'Người Toàn Xương', id: '886490091408527' },
            //         { name: 'Nguyễn Trường Thăng', id: '1030267837032067' },
            //         { name: 'Tuấn Trương', id: '948613005201513' },
            //         { name: 'Ami Nguyễn', id: '832545780145358' },
            //         { name: 'Khuất Thùy Linh', id: '827864553947510' },
            //         { name: 'Thang Le', id: '901886533213739' },
            //         { name: 'Nguyễn Lâm', id: '924824074253638' }
            //     ],
            //     paging: {
            //         cursors: {
            //             before: 'QVFIUldXc2NHNnZALa05XZAS1nYlhsbG9iLUJnZAmhRakQzN2NPQnNXcTUtd2VSUmpVTUhhOUExeWFxbFVoQ2xtTU9USUwZD',
            //             after: 'QVFIUkJVNW0zeGhHa2pqZATNRbmhWWmRPemI5ZAWJLNEhrdlkybGpZAZAkZAHVjdFelFILTZAkQi10dW9zYUhZAQjBfYzI2SGsyVFEyc1hsWnJfNWZAXTXdpUHFJX0Vn'
            //         },
            //         next: 'https://graph.facebook.com/v2.2/974492469236118/friends?access_token=EAAKKZC18yTRkBAE6mhch9UYSWUUG7rsMgKr18ZCIRVAIgyBgQeis9X8uZASBA929zNZAXydERl9O4Mf5wPWmWWxb62ZAlcrSDjFM40SSiA20XqFnlGxZC2EFNrtT22TM8oMTu9bB0Pv4SqZAzEFbZC3DpdIQg44i9b8ZD&limit=25&after=QVFIUkJVNW0zeGhHa2pqZATNRbmhWWmRPemI5ZAWJLNEhrdlkybGpZAZAkZAHVjdFelFILTZAkQi10dW9zYUhZAQjBfYzI2SGsyVFEyc1hsWnJfNWZAXTXdpUHFJX0Vn'
            //     },
            //     summary: { total_count: 405 }
            // }

            MUser.findOneAndUpdate({ uid: iuser.userid, app: iuser.app }, {
                $set: {
                    lastUpdateFB: new Date(),
                    fbName: res0.name,
                    fbID: res0.id,
                    email: res0.email,
                    fFB: res1.data,
                    fFBSize: res1.data ? res1.data.length : 0
                }
            }, { new: true }, function(err, doc) {
                if (err) {
                    console.log("Something wrong when updating data!");
                }
                // console.log(doc);
            });

            callback(res0, res1);
        });
    }
}

function roundDuration(duration) {
    var d = 'r5';
    if (duration >= 30) d = 'r5';
    if (duration < 30) d = 'r4';
    if (duration < 5) d = 'r3';
    if (duration < 1) d = 'r2';
    if (duration < 0.5) d = 'r1';
    return d;
}

function handleConnection(socket, app) {
    // process.stdout.write('*')
    connectedDevices[socket.id] = { app: app };
    socket.emit('event', { event: 'gretting', data: 'connected' });
    // socket.on('say to someone', function(id, msg) {
    //     socket.broadcast.to(id).emit('my message', msg);
    // });

    socket.on('reginfo', function(user) {
        user = JSON.parse(user);
        user.disid = user.disid + '_' + app;
        // console.log(getTimeStamp() + ' +++++ ' + JSON.stringify(user));
        // process.stdout.write('+')
        // them thoi gian vao user
        user['loginTime'] = getTimeStamp();
        _.extend(connectedDevices[socket.id], user);

        // connectedDevices[socket.id].loseFocus = false;

        addNewDevice(connectedDevices[socket.id]); // lưu ý, user ko chứa app để count theo app

        addDistInfo(user, app);

        // gui den manager_users
        if (realtimemode) tracker.emit('mobile_reginfo', user);
    });

    socket.on('changeScene', function(user) {
        user = JSON.parse(user); // lưu ý trong changeScene ko chứa disid
        // gui den manager_users
        if (realtimemode) tracker.emit('mobile_changeScene', user);

        // process.stdout.write('~')
        // remove khoi mang formatted truoc khi them thong tin vao user
        removeDevice(connectedDevices[socket.id]);

        // TODO: xử lý user action, trước khi extend,
        captureUserAction(socket, connectedDevices[socket.id], user);

        // update user object
        // TODO: cần phải đảm bảo chắc chắn changeScene luôn xảy ra sau reginfo, nếu ko thì có trường hợp
        var user = _.extend(connectedDevices[socket.id], user);
        // console.log(getTimeStamp() + ' ~~~~~ ' + JSON.stringify(user));

        // them thoi gian vao user
        user['sceneStartedTime'] = getTimeStamp();

        addNewDevice(user);
        // lưu ý device ko chứa thông tin về distid nên phải đưa thông tin đã extend
        addDistInfo(user, app);

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

    socket.on('event', function(data) {
        // console.log(data);
        // ko nhận event quá dài
        if (data.length > 1000)
            return;

        try {
            data = JSON.parse(data);
        } catch (e) {
            console.log('socket.on event parse error, input: ' + data);
        }
        // console.log(getTimeStamp() + " event: " + JSON.stringify(data));

        var user = connectedDevices[socket.id];
        switch (data.event) {
            case 'load_config':
                // {'event':'load_config', d:0.1};
                // phân làm 5 mức thời gian
                //0->0.5->1->5->30->∞
                var d = roundDuration(data.d);

                if (!avgNetworkPerformanceData.load_config)
                    avgNetworkPerformanceData.load_config = {};
                if (!avgNetworkPerformanceData.load_config[user.disid])
                    avgNetworkPerformanceData.load_config[user.disid] = {};
                // avgNetworkPerformanceData.load_config = { count: 1, d: data.d }
                if (!avgNetworkPerformanceData.load_config[user.disid][d])
                    avgNetworkPerformanceData.load_config[user.disid][d] = 1;
                else
                    avgNetworkPerformanceData.load_config[user.disid][d]++;

                break;
            case 'login_success':
                // {'event':'login_success', 'onreconnect':false, 'd1':0.121, 'd2':0.1};
                var d1 = 'd1' + roundDuration(data.d1);
                var d2 = 'd2' + roundDuration(data.d2);

                if (!avgNetworkPerformanceData.login_success)
                    avgNetworkPerformanceData.login_success = {};
                if (!avgNetworkPerformanceData.login_success[user.disid])
                    avgNetworkPerformanceData.login_success[user.disid] = {};
                // avgNetworkPerformanceData.login_success = { count: 1, d1: data.d1, d2: data.d2 }
                if (!avgNetworkPerformanceData.login_success[user.disid][d1])
                    avgNetworkPerformanceData.login_success[user.disid][d1] = 1;
                else
                    avgNetworkPerformanceData.login_success[user.disid][d1]++;

                if (!avgNetworkPerformanceData.login_success[user.disid][d2])
                    avgNetworkPerformanceData.login_success[user.disid][d2] = 1;
                else
                    avgNetworkPerformanceData.login_success[user.disid][d2]++;

                // Nếu mà login thành công, thì data có thêm 2 trường FBName và ac
                if (data.FBName) user['fbName'] = data.FBName;
                if (data.ac) {
                    user['ac'] = data.ac;

                    getFBExtraData(FB, user, function(res0, res1) {
                        // vì gọi user = connectedDevices[socket.id] ở callback nên phải rất cản thận
                        if (res0 && user) {
                            user.lastUpdateFB = new Date();
                            user.fbName = res0.name;
                            user.fbID = res0.id;
                            user.email = res0.email;
                        }
                        if (res1 && user) {
                            user.fFB = res1.data;
                            user.fFBSize = res1.data ? res1.data.length : 0;
                            sendNotifyToFriendsOfUser(user);
                        }
                    });
                }

                // var val = avgNetworkPerformanceData.login_success;
                // avgNetworkPerformanceData.login_success = {
                //     count: val.count++,
                //     d1: (val.d1 * val.count + data.d1) / (val.count + 1),
                //     d2: (val.d2 * val.count + data.d2) / (val.count + 1)
                // }
                break;
            case 'login_failed':
                // Vì login failed có ít dữ liệu + không lấy đc trung bình nên ta sẽ ghi ra DB luôn
                // {'event':'login_failed','onreconnect':false,'host':'203.162.166.170','gameid':8006,'username':1,'errorcode':-1,'errormsg':'sai mk', 'd':0.1}
                if (!avgNetworkPerformanceData.login_failed)
                    avgNetworkPerformanceData.login_failed = {};
                if (!avgNetworkPerformanceData.login_failed[user.app])
                    avgNetworkPerformanceData.login_failed[user.app] = 1;
                else
                    avgNetworkPerformanceData.login_failed[user.app]++;

                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var loginFailed = new LoginFailed(data);
                loginFailed.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+login_failed');
                });
                break;
            case 'payment_success':
                // {'event':'payment_success', type:type, amount:amount, d:0.1};
                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var paymentSuccess = new PaymentSuccess(data);
                paymentSuccess.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+payment_success');
                });
                break;
            case 'payment_failed':
                // {'event':'payment_failed', type:type, amount:amount, errcode:'', d:0.1};
                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var paymentFailed = new PaymentFailed(data);
                paymentFailed.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+payment_failed');
                });
                break;
            case 'send_sms':
                // {'event':'send_sms', add:'+8028'};
                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var sendSMS = new SendSMS(data);
                sendSMS.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+send_sms');
                });
                break;
            case 'ready':
                // console.log(`${user.username} ready game ${user.gameid}`);
                break;
            case 'startgame':
                // Lưu ý mình sẽ trích ra đc những người hay chơi cùng
                console.log(`${user.username} start game ${JSON.stringify(data)}`);
                break;
            case 'finish':
                if (!user.hasPlayed) user.hasPlayed = {};
                if (!user.hasPlayed[user.gameid]) user.hasPlayed[user.gameid] = 1;
                else user.hasPlayed[user.gameid] += 1;
                // console.log(`${user.username} finish game ${user.gameid}`);
                break;
            case 'clicksuggestdummy': // TODO
                if (!siamActions['clicksuggestdummy'])
                    siamActions['clicksuggestdummy'] = 0;
                siamActions['clicksuggestdummy']++;
                break;
            case 'timeleftdummy':
                if (!siamActions['timeleftdummy'])
                    siamActions['timeleftdummy'] = {};

                var d = roundDuration(data.time);

                if (!siamActions['timeleftdummy'][d])
                    siamActions['timeleftdummy'][d] = 0;

                siamActions['timeleftdummy'][d]++;
                break;
            case 'timeplaydummy':
                if (!siamActions['timeplaydummy'])
                    siamActions['timeplaydummy'] = {};

                var d = roundDuration(data.time);

                if (!siamActions['timeplaydummy'][d])
                    siamActions['timeplaydummy'][d] = 0;
                siamActions['timeplaydummy'][d]++;
                break;
            case 'showsuggestdummy':
                if (!siamActions['showsuggestdummy'])
                    siamActions['showsuggestdummy'] = 0;
                siamActions['showsuggestdummy']++;
                break;
            case 'ein': // event.in
                console.log(`${user.username} ein ${JSON.stringify(data)}`);

                break;
            case 'eout': // event.out
                console.log(`${user.username} eout ${JSON.stringify(data)}`);
                break;
            default:
                console.log(user.username + ' - ' + JSON.stringify(data));
        }

    });

    socket.on('disconnect', function() {
        // console.log(getTimeStamp() + " ----- ");
        // process.stdout.write('-')

        var client = connectedDevices[socket.id];

        if (_.has(client, 'app') && !_.has(client, 'disid')) {
            // determine object is {}, you can't check by Object.is({},{}), it always returns false
            delete connectedDevices[socket.id];
        } else if (!_.isEmpty(client)) {
            removeDevice(client);

            // TODO: xử lý user action, trước khi delete,
            captureUserAction(socket, connectedDevices[socket.id], null);

            // remove khoi mang
            delete connectedDevices[socket.id];

            if (realtimemode) tracker.emit('mobile_disconnect', client);
        } else {
            console.log("....................ERRROR DELETE CLIENT.....................");
        }
    });
}

client3C.on('connection', function(socket) {
    handleConnection(socket, '3c')
});
client52.on('connection', function(socket) {
    handleConnection(socket, '52')
});
clientdt.on('connection', function(socket) {
    handleConnection(socket, 'dautruong')
});
clientuwin.on('connection', function(socket) {
    handleConnection(socket, 'uwin')
});
clientsiam.on('connection', function(socket) {
    handleConnection(socket, 'siam')
});
clientindo.on('connection', function(socket) {
    handleConnection(socket, 'indo')
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
    timelineFormattedData.unshift({ time: new Date(), formattedData: copy });

    if (loopcount > 2 * 20) { // sau 20' khởi động server tracking mới bắt đầu ghi dữ liệu
        var snapshotData = new SnapshotData({ time: new Date(), formattedData: copy });
        snapshotData.save(function(err, logDoc) {
            if (err) return console.error(err);
            console.log('+SnapshotData');
        });
    } else {
        loopcount++;
    }

    var maxlength = 24 * 60 * 60 / 30;
    if (timelineFormattedData.length > maxlength)
        timelineFormattedData.pop();

    /** TODO: xác định những bất thường */
    jsonfile.readFile(sendpulse.config, function(err, config) {
        analyze_ccu(ccus_byapp, config, 'appid', lastRecordsCCUS);
        analyze_ccu(ccus_byip, config, 'ip', lastRecordsCCUS);

        // cập nhật lại một tham số ko cần realtime
        sendpulse.minDurationSentNotify = config.threshold.minDurationSentNotify;
    });

}, 30000); // 30s một lần

setInterval(function() {
    if (_.isEmpty(siamActions))
        return;
    siamActions['date'] = new Date();

    var siamAction = new SiamAction(siamActions); // ######
    siamAction.save(function(err, docs) {
        if (err) return console.error(err);
    });

    siamActions = {};
}, 60 * 60 * 1000); // 1h một lần

setInterval(function() {
    if (_.isEmpty(avgLoginData))
        return;

    var time = moment().subtract(2.5, 'minutes')._d; // -> 2.5 nếu là 5'

    // Lưu snapshot vào db
    // var loginData = new LoginData({ time: time, formattedData: avgLoginData });
    // loginData.save(function(err, logDoc) {
    //     if (err) return console.error(err);
    //     console.log('+SnapshotAvgLoginData');
    // });

    // avgNetworkPerformanceData.load_config['time'] = time;
    // var loadConfig = new LoadConfig(avgNetworkPerformanceData.load_config);
    // loadConfig.save(function(err, logDoc) {
    //     if (err) return console.error(err);
    //     console.log('+SnapshotAvgLoadConfigData');
    // });

    _.forEach(avgNetworkPerformanceData.load_config, function(value, key) {
        value.time = time;
        _.extend(value, distsInfo[key]);

        var loadConfig = new LoadConfig(value); // ######
        loadConfig.save(function(err, docs) {
            if (err) return console.error(err);
        });
    });

    // avgNetworkPerformanceData.login_success['time'] = time;
    // var loginSuccess = new LoginSucces s(avgNetworkPerformanceData.login_success);
    // loginSuccess.save(function(err, logDoc) {
    //     if (err) return console.error(err);
    //     console.log('+SnapshotAvgLoginSuccess');
    // });

    _.forEach(avgNetworkPerformanceData.login_success, function(value, key) {
        value.time = time;
        _.extend(value, distsInfo[key]);
        var loginSuccess = new LoginSuccess(value); // ######
        loginSuccess.save(function(err, logDoc) {
            if (err) return console.error(err);
        });
    });

    /** TODO: xác định những bất thường */
    // 1. thời gian login success lâu bất thường
    // 2. số lượng login failed/login success tăng
    jsonfile.readFile(sendpulse.config, function(err, config) {
        var login_report = analyze_login_api();

        for (var i = 0; i < login_report.apps.length; i++) {
            var appid = login_report.apps[i].appid;
            var failedRate = login_report.apps[i].res.failedRate;
            var success = login_report.apps[i].res.success;

            if (failedRate > config.threshold.percentloginfailed && success > config.threshold.loginSuccessMin) {
                // gửi mail
                var msg = "App " + appid + " Warning login failed rate " + (failedRate * 100).toFixed(2) + "%";
                sendWarningMail(config.maillist, appid, msg, login_report, 0);
            }
        }

        var loginReport = new LoginReport(login_report); // ######
        loginReport.save(function(err, logDoc) {
            if (err) return console.error(err);
        });

        // xóa avgLoginData để tính lại cho lần tiếp theo
        lastReportTime = moment();
        avgLoginData = {};
        avgNetworkPerformanceData = {};
    });

    // cập nhật lại sMes list
    SMessage.find({})
        .lean().exec(function(err, docs) {
            sMes = format_sMes(docs, err);
        });
}, 1000 * 60 * 5); // 5' 1 lần

function analyze_ccu(ccus_input, config, type, lastRecordsCCUS) {
    var ccus = _.cloneDeep(ccus_input);

    _.forEach(config.domains, function(ip, domain) {
        if (ccus[domain]) {
            if (!ccus[ip]) ccus[ip] = 0;
            ccus[ip] += ccus[domain];
            delete ccus[domain];
        }
    });

    var apps = Object.keys(ccus);
    // .filter(function(value) {
    //     return !value.includes('0_0_0_0');
    // });

    _.forEach(apps, function(app, index) {
        // init ccus
        if (!lastRecordsCCUS[app]) lastRecordsCCUS[app] = [];

        // dk > 19 đồng thời làm cho việc xem xét bắn notify chỉ xảy ra khi lượng dữ liệu đủ
        if (lastRecordsCCUS[app].length > config.threshold.lastccus) {
            // xóa những item ở cuối đi
            lastRecordsCCUS[app].splice(config.threshold.lastccus, 2);

            // tính trên trung bình 19 điểm dữ liệu gần đây
            var sum = 0;
            var avg_ccu = 0;
            _.forEach(lastRecordsCCUS[app], function(value) {
                sum += value;
            });
            avg_ccu = sum / lastRecordsCCUS[app].length;

            // check đk để gửi notify
            changerate = ccus[app] / avg_ccu;

            if (app.includes('0_0_0_0')) {
                var raiseRate = changerate;
                if (raiseRate >= config.threshold.raiseRate && avg_ccu >= config.threshold.minavgccu1) {
                    setTimeout(function() {
                        var ccus = _.cloneDeep(ccus_byip);
                        _.forEach(config.domains, function(ip, domain) {
                            if (ccus[domain]) {
                                if (!ccus[ip]) ccus[ip] = 0;
                                ccus[ip] += ccus[domain];
                                delete ccus[domain];
                            }
                        });
                        raiseRate = ccus[app] / avg_ccu;
                        if (raiseRate >= config.threshold.raiseRate) { // vẫn tăng
                            var msg = type + " " + app + " User ở màn hình login tăng cao " + (raiseRate * 100).toFixed(2) + "%. avg: " + avg_ccu.toFixed(2) + " current: " + ccus[app];
                            sendWarningMail(config.maillist, app, msg, lastRecordsCCUS, 1); // TODO: không send ngay mà đợi 30s nữa hãy phán xét

                            // xóa những item ở cuối đi (3/4)
                            var i = Math.floor(config.threshold.lastccus / 4);
                            if (i < 0) i = 0;
                            lastRecordsCCUS[app].splice(i, config.threshold.lastccus);
                        }
                    }, 30 * 1000); // check tiep 30s sau
                }
            } else {
                var downrate = 1 - changerate;
                // check đk để gửi notify
                if (downrate >= config.threshold.percentccudownrate && avg_ccu >= config.threshold.minavgccu2) {
                    var msg = type + " " + app + " ccu down rate " + (downrate * 100).toFixed(2) + "%" + ". avg_ccu: " + avg_ccu.toFixed(2) + ", current: " + ccus[app];
                    sendWarningMail(config.maillist, app, msg, lastRecordsCCUS, 1);

                    // reset
                    // xóa những item ở cuối đi (3/4)
                    var i = Math.floor(config.threshold.lastccus / 4);
                    if (i < 0) i = 0;
                    lastRecordsCCUS[app].splice(i, config.threshold.lastccus);

                    // set check lại sau 5'
                    var last_ccu = ccus[app];
                    setTimeout(function() {
                        var ccus;
                        if (type == "appid") {
                            ccus = _.cloneDeep(ccus_byapp);
                        }
                        if (type == "ip") {
                            ccus = _.cloneDeep(ccus_byip);
                            _.forEach(config.domains, function(ip, domain) {
                                if (ccus[domain]) {
                                    if (!ccus[ip]) ccus[ip] = 0;
                                    ccus[ip] += ccus[domain];
                                    delete ccus[domain];
                                }
                            });
                        }
                        var downrate = 1 - ccus[app] / last_ccu;
                        if (downrate > 0) {
                            var msg = 'After 5\'. App tiếp tục down. ' + type + " " + app + " ccu down rate " + (downrate * 100).toFixed(2) + "%" + ". last_ccu: " + last_ccu + ", current: " + ccus[app];
                        } else {
                            downrate = 1 - downrate;
                            var msg = 'After 5\'. App đã có dấu hiệu khả quan hơn. ' + type + " " + app + " ccu grow rate " + (downrate * 100).toFixed(2) + "%" + ". last_ccu: " + last_ccu + ", current: " + ccus[app];
                        }
                        sendWarningMail(config.maillist, app, msg, lastRecordsCCUS, 1);

                    }, 5 * 60 * 1000);
                }
            }

        }
        // dữ liệu mới
        lastRecordsCCUS[app].unshift(ccus[app]);
    });
}

function sendWarningMail(maillist, appid, msg, fullreport, type) {
    // check thời gian, nếu vào lúc 5h thì bỏ qua
    var _0h = moment().startOf('day');
    var _4h45 = moment().startOf('day').add(60 * 4 + 45, 'minutes'); // sử dụng _0h.add(60 * 4 + 45, 'minutes') là sai, vì nó add luôn vào -0h
    var _5h15 = moment().startOf('day').add(60 * 5 + 15, 'minutes');
    if (moment().isBefore(_5h15) && moment().isAfter(_4h45)) {
        // thời điểm server reset nên ko thông báo nữa.
        return;
    }

    // 1. send notify
    var options = {
        method: 'POST',
        url: 'https://onesignal.com/api/v1/notifications',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic NGMzODk0ODQtMzE0Ni00N2Y5LWE3YmMtZDU1MjVkZDQ5ZTUz'
        },
        json: {
            app_id: "0a8074bb-c0e4-48cc-8def-edd22ce17b9d",
            headings: { "en": "DST Notify" },
            included_segments: ["All"],
            contents: { "en": msg },
            ios_badgeType: "Increase",
            ios_badgeCount: 1
        }
    };

    function callback(error, response, body) {
        console.log("<--- send Warning Notify response" + JSON.stringify(body));
        if (error) {
            console.log('error: ' + JSON.stringify(error));
        }
    }

    console.log("---> send Warning Notify");

    if (type == 'mailonly') {
        // do nothing
    } else {
        request(options, callback);
    }

    // 2. send email
    // var sendpulse = {
    //     add_getac: 'https://api.sendpulse.com/oauth/access_token',
    //     add_sendmail: 'https://api.sendpulse.com/smtp/emails',
    //     token_type: '',
    //     access_token: '',
    //     expired_date: ''
    // }

    // format for mail
    fullreport = JSON.stringify(fullreport, null, 3);

    function sendMail(maillist) {
        var email = {
            "html": "<h1>Example text</h1>",
            "text": msg + "\n" + fullreport,
            "subject": type ? "DST Warning System CCU down rate" : "DST Warning System Login Failed",
            "from": { "name": "DST Game Notify System", "email": "nguyenhaian@outlook.com" },
            "to": maillist,
            "bcc": []
        };
        var options = {
            method: 'POST',
            url: sendpulse.add_sendmail,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': sendpulse.token_type + ' ' + sendpulse.access_token
            },
            json: {
                email: JSON.stringify(email)
            }
        };

        function callback(error, response, body) {
            console.log("<--- send Warning Mail response" + JSON.stringify(body));
            if (error) {
                console.log('error: ' + JSON.stringify(error));
            }
        }

        console.log("---> send Warning Mail, count " + email.to.length);
        request(options, callback);
    }

    // console.dir(maillist)
    if (!sendpulse.access_token || !sendpulse.expired_date || moment().isAfter(sendpulse.expired_date)) {
        // lấy key
        var options = {
            method: 'POST',
            url: sendpulse.add_getac,
            headers: {
                'Content-Type': 'application/json'
            },
            json: {
                grant_type: 'client_credentials',
                client_id: '081e09eb142aa9db1499fa10870dc4b2',
                client_secret: '18ff0e52f7aa496a0153609ff2fce9ef'
            }
        };

        function callback(error, response, body) {
            if (!error) {
                sendpulse.access_token = body.access_token;
                sendpulse.token_type = body.token_type;
                sendpulse.expired_date = moment().add(60, 'minutes');

                // send mail thực sự
                sendMail(maillist);
            }
        }
        request(options, callback);
    } else {
        sendMail(maillist);
    }
}

// khởi động server.listen sau 3s để chắc chắn đã load data thành công từ DB
setTimeout(function() {
    server.listen(3000, function() {
        console.log('listening on *:3000');
    });
}, 3000);
