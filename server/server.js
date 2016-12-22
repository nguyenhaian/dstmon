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
var request = require('request');
var FB = require('fb');
var async = require("async");
var models = require('./models.js')
var iprange = reload('./iprange.js')
var utils = reload('./utils.js')
var appconfig = reload('./appconfig.js')

/*************************************************************/
// socketio namespaces
var tracker = io.of('/tracker');
// client namespace
var cns = appconfig.socketclients.map(function(clientns, index) {
    clientns = '/' + clientns;

    // ***** đoạn này để trả về response 200 cho client ***** //
    app.get(clientns, function(req, res) {
        res.json({});
    });

    var client = io.of(clientns);
    client.on('connection', function(socket) {
        handleConnection(socket, appconfig.clientsname[index]);
    });

    return client;
});

appconfig.loadpaymentconfig(appconfig);

// socketio vars
var connectedDevices = {};

var formattedData = {}, // là phiên bản đã format của connectedDevices
    avgLoginData = {},
    avgNetworkPerformanceData = {},
    timelineFormattedData = [],
    distsInfo = {}, // thông tin của các dist
    realtimemode = false,
    lastReportTime = moment(),
    siamActions = {};

var ccus_byapp = {},
    ccus_byip = {},
    ccus_bygame = {},
    ccus_bydisid = {},
    lastRecordsCCUS = {};

var loopcount = 0; // phục vụ việc lưu vào DB muộn, để có dữ liệu tương đối sạch
var indexLoop = 0; // phục vụ việc làm thưa DB khi query

var sendpulse = {
    token_type: '',
    access_token: '',
    expired_date: ''
}

// system message được lưu vào mảng này, nhằm giảm thời gian gọi từ DB
var sMesData0 = {}; // cái này chứa system message dạng login
var sMesData1 = {}; // message dạng hết tiền
var sMesData2 = {}; // message lúc lên vip
var gpResult = {}; //lưu phản hồi của khách ở object này
var uaResult = {}; //Lưu dữ liệu thống kê tương tác theo ngày

/*************************************************************/
mongoose.connect('mongodb://localhost/CustomerMonitor');

// init data when server startup
/*************************************************************/
var lastHours = moment().subtract(1, 'hours').format("YYYY-MM-DD HH:mm:ss");

models.SnapshotData.find({})
    .select('time formattedData')
    // .where('time').gt(lastHours)
    .sort({ time: -1 })
    .limit(120)
    .lean().exec(function(err, docs) {
        if (err) return console.log(err);
        timelineFormattedData = docs;
        console.log("timelineFormattedData length " + docs.length);
    });

models.Dist.find({})
    // .select({ id: 1, data: 1, _id: 0 })
    .lean().exec(function(err, docs) {
        if (err) return console.log(err);
        _.forEach(docs, function(doc) {
            distsInfo[doc.id] = doc.data; // nếu ko dùng lean thì phải dùng doc.data.toJSON()
            // console.log(`${doc.id} -> ${distsInfo[doc.id]}`)
        });
    });

models.BannerShowLimitRule.find({})
    // .select({ id: 1, data: 1, _id: 0 })
    .lean().exec(function(err, docs) {
        if (err) return console.log(err);
        appconfig.bannerShowLimitRule = docs;
    });

var getGPAsycn = {
    query: function(queryObject, callback) {
        queryObject.find({ date: { $lte: new Date() }, dexp: { $gte: new Date() } }) //.select('-result')
            .limit(100).lean().exec(function(err, docs) {
                docs = docs.filter(function(item) {
                    if (_.has(item, 'showDaily') && item.showDaily.length > 0) {
                        // filter daily time
                        var hour = moment().hour();
                        var pass = false;
                        _.forEach(item.showDaily, function(hourRange) {
                            if (hourRange.length == 2) {
                                if (hour >= hourRange[0] && hour < hourRange[1]) {
                                    pass = true;
                                    // break forEach
                                    return false;
                                }
                            }
                        });

                        return pass;
                    } else {
                        // nếu ko có dailyTime thì mặc định là passfilter
                        return true;
                    }
                });
                callback(err, docs);
            });
    }
};

async.map([models.SMessage, models.GreetingPopup, models.Type10Popup, models.BannerV2], getGPAsycn.query.bind(getGPAsycn), function(err, result) {
    if (err) {
        res.send(JSON.stringify(err, null, 3));
        return;
    }

    var data = [];
    result.map(function(value, index) {
        data = data.concat(result[index]);
    });
    // vì type10 được sử dụng thường xuyên nên mình format luôn
    sMesData0 = data.filter(function(item) {
        if (!_.has(item, 'showType'))
            item.showType = 0; // hiện lúc login

        return item.showType == 0;
    });

    sMesData1 = data.filter(function(item) {
        if (!_.has(item, 'showType'))
            item.showType = 0; // hiện lúc hết tiền

        return item.showType == 1;
    });

    sMesData2 = data.filter(function(item) {
        if (!_.has(item, 'showType'))
            item.showType = 0; // hiện lúc thay đổi vip

        return item.showType == 2;
    });


    sMesData0 = format_sMes(sMesData0);
    sMesData1 = format_sMes(sMesData1);
    sMesData2 = format_sMes(sMesData2);
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
    res.header("Access-Control-Allow-Origin", "*");
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

function format_sMes(docs) {
    return format_sMes(docs, null);
}

function format_sMes(docs, err) {
    if (err) {
        console.log(err);
        return {};
    }

    var sMes = {};
    // docs là array, lọc theo date cập nhật vào sMes
    _.forEach(docs, function(doc) {
        // filter by time, -> ko cần nữa, đã làm ở bước query
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
        var dist = new models.Dist({ id: _distid, data: distsInfo[_distid] });
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
        models.MUser.findOne({ fbID: friendItem.id }).exec(function(err, ruser) {
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
                    url: appconfig.manapp + '/notify',
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
                if (!appconfig.threshold.minDurationSentNotify) appconfig.threshold.minDurationSentNotify = 5;
                if (!ruser.lastSentNotify || moment.duration(moment().diff(ruser.lastSentNotify)).asMinutes() > appconfig.threshold.minDurationSentNotify) {
                    // console.log('----> sendNotifyToFriendsOfUser ' + cmessage);
                    // TODO: An, tạm thời dừng bắn notify
                    // request(options, callback);

                    // if (user) user.lastSentNotify = new Date(); --> đoạn này bị sai, cần cẩn thận, ta chỉ quan tâm đến ruser mà thôi.
                    models.MUser.findOneAndUpdate({ _id: ruser._id }, {
                        $set: {
                            lastSentNotify: new Date(),
                        }
                    }, { new: true }, function(err, doc) {
                        if (err) {
                            console.log("models.MUser update lastSentNotify failed!");
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
                // user.ruser = ruser;
                // ruser có thể là null, nên phải check trước
                if (!ruser || !user)
                    return;
                // update ngược lại lastUpdateFB vào input, để dễ dàng quyết định có sử dụng getExtraInfo hay ko
                // ở đây user chính là connectedDevices[socket.id]
                // nên hy vọng ở call back vẫn trỏ đc đến connectedDevices[socket.id]
                // đồng thời phải lưu ý, vì connectedDevices[socket.id] có thể đã bị remove, nên phải check luôn đk này
                if (ruser.lastUpdateFB) user.lastUpdateFB = ruser.lastUpdateFB;
                if (ruser.lastSentNotify) user.lastSentNotify = ruser.lastSentNotify;
                if (ruser.email) user.email = ruser.email;
                if (ruser.fbID) user.fbID = ruser.fbID;
                if (ruser.fbName) user.fbName = ruser.fbName;
                // if (ruser.sMsg) user.sMsg = ruser.sMsg;
                if (ruser.dev) user._dev = ruser.dev;
                if (ruser.disid) user._dis = ruser.disid;
                if (ruser.ip) user._ip = ruser.ip;
                if (ruser._id) user._id = ruser._id;
                if (ruser.lqc) user.lqc = ruser.lqc;
                if (ruser.fFB) {
                    user.fFB = ruser.fFB;
                    sendNotifyToFriendsOfUser(user);
                }

                if (ruser.bannerShowedHistory) {
                    // => comment1: lưu ý là check như này luôn đúng, nên ko thể phát hiện user ko có history
                    // vì ruser ko thay đổi được nên phải cloneDeep
                    user.bannerShowedHistory = { session: [] };
                    _.extend(user.bannerShowedHistory, ruser.bannerShowedHistory);
                    if (!user.bannerShowedHistory.date)
                        user.bannerShowedHistory.date = moment().format("YYYY-MM-DD");
                } else {
                    // comment2: Vẫn có trường hợp user mới lần đầu đăng nhập, ruser = iuser => user.bannerShowedHistory = undefined
                    user.bannerShowedHistory = { date: moment().format("YYYY-MM-DD"), session: [], day: [], lifetime: [] };
                }

                // biến phục vụ NOTE 28/10x
                user.increaseLQ = ruser.increaseLQ || 0;
                user.popupHasShowed = ruser.popupHasShowed || {};
                user.loginCount = (ruser.loginCount || 0) + 1;

                if (moment().day() > moment(ruser.d2).day()) {
                    // lần đầu tiên login ngày mới.
                    user.increaseLQ = 0;
                    user.popupHasShowed = {};
                    user.loginCount = 1;
                }

                user.lastSaveToDB = new Date();

                socket.emit('event', { event: 'friends', data: ["an", "huu anh", "lam", "giang"], vip: [1, 2, 3, 4] });

                // thời điểm bắn sMes
                // kiểm tra những sMes mà user đã nhận so với sMes của server
                // order lại thứ tự nhận rồi emit về cho user
                var sMesData = sMesData0;
                var sMes = [];
                Object.keys(sMesData).map(function(appnames) {
                    if (appnames.includes(user.app)) {
                        sMes = sMes.concat(sMesData[appnames]);
                    }
                });
                utils.sendPopups(socket, models.MUser, user, sMes, appconfig, gpResult);

                // kiểm tra firstlogin để trả về news
                // var YESTERDAY = moment().clone().subtract(1, 'days').startOf('day');
                // if (moment(ruser.d2).isSame(YESTERDAY, 'd')) // d2 là last online time
                // {   
                // kiểm tra cách ngày
                // } else {
                // nếu dùng chính sách khác, có thể cho vào đây. 
                // CS1: đấu trường chỉ cần ko bắn dầy

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

        if (user_update != null) {
            // 1. phát hiện thay đổi LQ
            if (_.has(user, 'lq') && _.has(user_update, 'lq')) {
                var lq1 = user.lq;
                var lq2 = user_update.lq;
                if (lq2 != lq1) {
                    user.increaseLQ += (lq2 - lq1);
                    // thay đổi LQ, 
                    if (!_.has(user, 'lqc'))
                        user.lqc = [];
                    user.lqc.push({
                        d: new Date(),
                        lq: lq1,
                        plus: (lq2 - lq1)
                    });
                    user.lqc.filter(function(item) {
                        var date = moment(item.d);
                        return moment.duration(moment().diff(date)).asDays() <= 30;
                    });
                    // lưu vào DB luôn
                    var data = {
                        lqc: user.lqc,
                        increaseLQ: user.increaseLQ
                    }

                    if (user.hasOwnProperty('_id')) {
                        models.MUser.findOneAndUpdate({ _id: user._id }, {
                            $set: data
                        }, { new: true }, function(err, doc) {
                            if (err) {
                                console.log("Something wrong when updating lqc mUser! ");
                                console.log(err);
                            }
                        });
                    }
                }
            }
            // 2. phát hiện thay đổi VIP
            if (user_update.vip != user.vip) {
                // Xem xét bắn banner showType = 1
                user.lastChangeVip = {
                        value: user_update.vip,
                        before: user.vip,
                        date: Date()
                    }
                    // thực hiện gán giá trị luôn ở đây để đáp ứng lọc sendpopup
                user.vip = user_update.vip;
                var sMesData = sMesData2;
                var sMes = [];
                Object.keys(sMesData).map(function(appnames) {
                    if (appnames.includes(user.app)) {
                        sMes = sMes.concat(sMesData[appnames]);
                    }
                });
                // user.lastGame = { gameid: user.gameid, stake: stake };
                sMes = utils.filterShowType2(sMes, user);
                utils.sendPopups(socket, models.MUser, user, sMes, appconfig, gpResult);
            }
        }
        // 3. Tình Huống thoát game cũng đo được, nhưng đo chỗ khác.
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

    //     var appnPayment = new models.OpenPayment(data);
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
    var result = [];
    _.forEach(connectedDevices, function(device) {
        if (_.has(device, 'username') && device.username == username) {
            result.push(device);
            // return false;
        }
    });

    if (_.isEmpty(result)) {
        models.MUser.find({ name: username }).exec(function(err, ruser) {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ status: 'OFFLINE', user: ruser }, null, 3));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(result, null, 3));
    }

});

app.get('/userbyip/:ip', function(req, res) {
    //::ffff:1.46.227.9
    var userip = '::ffff:' + req.params.ip;
    var result = [];
    _.forEach(connectedDevices, function(device) {
        if (_.has(device, 'ip') && device.ip == userip) {
            result.push(device);
            // return false;
        }
    });

    if (_.isEmpty(result)) {
        models.MUser.find({ lIP: userip }).exec(function(err, ruser) {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ status: 'OFFLINE', user: ruser }, null, 3));
        });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(result, null, 3));
    }

});

app.get('/checkIPVN/:ip', function(req, res) {
    var ip = req.params.ip;
    // load lại iprange
    iprange = reload('./iprange.js')

    var result = { inVN: iprange.inVietnam(ip) };
    // res.json(result);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(result, null, 3));
});

app.get('/gpResult', function(req, res) {
    // res.json(result);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(gpResult, null, 3));
});


app.get('/uaResult', function(req, res) {
    // res.json(result);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(uaResult, null, 3));
});

app.post('/testevent', function(req, res) {
    var username = req.body.name;
    var usercarrier = req.body.carrier;
    // var userapp = req.body.app | 'unkown';

    var found = false;
    var sid = '_';
    var edata = [];
    var body = req.body;
    var banners = body.data;

    if (body.event == 'news') {
        if (!_.isEmpty(banners)) {
            banners = banners.map(function(bannerItem) {
                return utils.formatBannerButton({
                    app: appconfig.clientsname[1],
                    provider: usercarrier,
                    username: username
                }, appconfig, bannerItem);
            });

            body.data = banners;
        }

        edata = banners;
    }

    _.forEach(connectedDevices, function(device, socketid) {
        if (_.has(device, 'username') && device.username == username) {

            cns.map(function(client) {
                client.to(socketid).emit('event', body);
            });
            sid = socketid;
            found = true;
            // ko return, như vậy là phải đi hết danh sách
            return false;
        }
    });


    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ found: found, socketid: sid, body: edata }, null, 3));
});

app.get('/sMes', function(req, res) {
    utils = reload('./utils.js');

    models.BannerShowLimitRule.find({})
        // .select({ id: 1, data: 1, _id: 0 })
        .lean().exec(function(err, docs) {
            if (err) return console.log(err);
            appconfig.bannerShowLimitRule = docs;
        });

    async.map([models.SMessage, models.GreetingPopup, models.Type10Popup, models.BannerV2], getGPAsycn.query.bind(getGPAsycn), function(err, result) {
        if (err) {
            res.send(JSON.stringify(err, null, 3));
            return;
        }

        var data = [];
        result.map(function(value, index) {
            data = data.concat(result[index]);
        });
        // vì type10 được sử dụng thường xuyên nên mình format luôn
        sMesData0 = data.filter(function(item) {
            if (!_.has(item, 'showType'))
                item.showType = 0; // hiện lúc login

            return item.showType == 0;
        });

        sMesData1 = data.filter(function(item) {
            if (!_.has(item, 'showType'))
                item.showType = 0; // hiện lúc hết tiền

            return item.showType == 1;
        });

        sMesData2 = data.filter(function(item) {
            if (!_.has(item, 'showType'))
                item.showType = 0; // hiện lúc thay đổi vip

            return item.showType == 2;
        });


        sMesData0 = format_sMes(sMesData0);
        sMesData1 = format_sMes(sMesData1);
        sMesData2 = format_sMes(sMesData2);

        var ret = {
            sMesData0: sMesData0,
            sMesData1: sMesData1,
            sMesData2: sMesData2
        }

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(ret, null, 3));

    });
});

app.get('/sMes/:id', function(req, res) {
    var bannerid = req.params.id;

    function findBannerByID(data, id) {
        var result = { err: 'not found' };
        _.forEach(data, function(banners, app) {
            _.forEach(banners, function(banner) {
                if (banner._id == id) {
                    result = banner;
                    return false;
                };
            });
            // break vòng for lớn.
            if (!result.err)
                return false;
        });
        return result;
    }

    res.setHeader('Content-Type', 'application/json');

    var banner = { err: 'not found' };
    _.forEach([sMesData0, sMesData1, sMesData2], function(sMesData) {
        banner = findBannerByID(sMesData, bannerid);
        if (!banner.err) {
            return false;
        }
    });
    res.send(JSON.stringify(banner, null, 3));
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
    // models.SnapshotData.find({})
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
    var apps = appconfig.clientsname;
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
    var nip = appconfig.domains;
    var gamesbyid = appconfig.gamesbyid;

    var c_ccus_byip = _.cloneDeep(ccus_byip);
    _.forEach(c_ccus_byip, function(value, key) {
        if (!nip[key])
            return;
        var newkey = nip[key]; // new_key đã tồn tại, thực chất là key khác
        c_ccus_byip[newkey] = c_ccus_byip[newkey] + value; // cộng dồn 2 giá trị
        delete c_ccus_byip[key];
    });

    var c_ccus_bygame = _.cloneDeep(ccus_bygame);
    _.forEach(c_ccus_bygame, function(value, key) {
        if (!gamesbyid[key])
            return;
        var newkey = gamesbyid[key];
        c_ccus_bygame[newkey] = value; // đơn thuần là thay thế key
        delete c_ccus_bygame[key];
    });

    var c_ccus_bydisid = _.cloneDeep(ccus_bydisid);
    _.forEach(c_ccus_bydisid, function(value, key) {
        _.extend(c_ccus_bydisid[key], distsInfo[key]);
    });

    return {
        c_ccus_byapp: ccus_byapp,
        c_ccus_bygame: c_ccus_bygame,
        c_ccus_bydisid: c_ccus_bydisid,
        c_ccus_byip: c_ccus_byip
    }
}

app.get('/ccus', function(req, res) {
    var ccus = getccus();
    // res.json({ date: new Date(), app: ccus.c_ccus_byapp, ip: ccus.c_ccus_byip, game: ccus.c_ccus_bygame, distribution:ccus.c_ccus_bydisid });
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ date: new Date(), app: ccus.c_ccus_byapp, ip: ccus_byip, game: ccus.c_ccus_bygame, distribution: ccus.c_ccus_bydisid }, null, 3));
});

app.get('/config', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    appconfig.indexLoop = indexLoop;
    res.send(JSON.stringify(appconfig, null, 3));
});

app.get('/ccus_view', function(req, res) {
    var ccus = getccus();
    res.render('view_ccus', {
        date: new Date(),
        app: ccus.c_ccus_byapp,
        ip: ccus.c_ccus_byip,
        game: ccus.c_ccus_bygame,
        distribution: ccus.c_ccus_bydisid,
        moment: moment // pass thư viện qua
    });
});

app.get('/testSendWarningMail', function(req, res) {
    var msg = "App " + 000 + " Warning login failed rate " + 0.1;
    sendWarningMail(appconfig.maillist, 1, msg, { name: 'full report', content: 'test', values: [1, 2, 3, 4, 5] }, 'mailonly')
    res.json({ status: 'ok' });
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
    models.MUser.findOne({ uid: iuser.userid, app: iuser.app }).exec(function(err, ruser) {
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
                    lIP: iuser.ip,
                    disid: [{ id: iuser.disid, la: new Date() }],
                    dev: [{ id: idid, la: new Date() }],
                    ip: [{ id: iuser.ip, la: new Date() }]
                }
                // không thể check là if(iuser.ag) vì giá trị ag có thể là 0
            data.ag = iuser.ag || iuser.gold || -1;
            data.dm = iuser.dm;
            if (iuser.hasOwnProperty('vip')) data.vip = iuser.vip;
            if (iuser.hasOwnProperty('lq')) data.lq = iuser.lq;

            callback(iuser);

            var mUser = new models.MUser(data);
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
            var ip = ruser.ip;

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

            if (!ip) {
                ip: [{ id: iuser.ip, la: new Date() }];
            }
            else {
                var found = false;
                for (var i = ip.length - 1; i >= 0; i--) {
                    if (ip[i].id == iuser.ip) {
                        ip[i].la = new Date();
                        found = true;
                        break;
                    }
                };
                if (!found) {
                    ip.push({ id: iuser.ip, la: new Date() });
                    // TODO: xem xét xóa bớt IP cũ
                    if (ip.length > 10) {
                        ip.sort(function(a, b) { // xếp giảm dần theo last active date
                            return -(a.la - b.la); // compare numbers
                        });

                        // removes 3 element from index 10
                        // xóa 
                        ip.splice(10, 3);
                    }
                }
            }

            var increaseLQ = ruser.increaseLQ || 0;
            var popupHasShowed = ruser.popupHasShowed || {};
            var loginCount = ruser.loginCount || 0;

            if (moment().day() > moment(ruser.d2).day()) {
                // lần đầu tiên login ngày mới.
                loginCount = 0;
                increaseLQ = 0;
                popupHasShowed = {};
            }

            // hình như ruser là const

            // lưu ý không tùy tiện đưa callback xuống dưới, vì ở callback có thể xử lí sự khác nhau 
            // giữa user lưu trong DB và user đc gửi lên.
            callback(ruser);

            var data = {
                d2: new Date(),
                name: iuser.username, // vì cái này có thể thay đổi
                lDisid: iuser.disid,
                lDev: idid,
                lIP: iuser.ip,
                disid: disid,
                dev: dev,
                ip: ip,
                increaseLQ: increaseLQ,
                loginCount: loginCount + 1,
                popupHasShowed: popupHasShowed
            }
            data.ag = iuser.ag || iuser.gold || -1;
            data.dm = iuser.dm || -1;
            if (iuser.hasOwnProperty('vip')) data.vip = iuser.vip;
            if (iuser.hasOwnProperty('lq')) data.lq = iuser.lq;

            models.MUser.findOneAndUpdate({ _id: ruser._id }, {
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
        console.log(iuser.ac);
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

            models.MUser.findOneAndUpdate({ uid: iuser.userid, app: iuser.app }, {
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
    connectedDevices[socket.id] = { app: app, ip: socket.request.connection.remoteAddress };
    socket.emit('event', { event: 'gretting', data: 'connected' });
    // socket.on('say to someone', function(id, msg) {
    //     socket.broadcast.to(id).emit('my message', msg);
    // });

    socket.on('reginfo', function(user) {
        user = JSON.parse(user);
        // format user
        user = utils.formatUser(appconfig, app, user);
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
        // format user
        user = utils.formatUser(appconfig, app, user);
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

        // gom banner vào sMesDate
        var sMesData = [];

        _.forEach(sMesData0, function(value, key) {
            sMesData = sMesData.concat(value);
        })
        _.forEach(sMesData1, function(value, key) {
            sMesData = sMesData.concat(value);
        })
        _.forEach(sMesData2, function(value, key) {
            sMesData = sMesData.concat(value);
        })

        var hasConsumed = utils.handleEvent(models.MUser, user, data, sMesData, uaResult);
        if (hasConsumed)
            return;

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
                var loginFailed = new models.LoginFailed(data);
                loginFailed.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+login_failed');
                });
                break;
            case 'payment_success':
                // {'event':'payment_success', type:type, amount:amount, d:0.1};
                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var paymentSuccess = new models.PaymentSuccess(data);
                paymentSuccess.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+payment_success');
                });
                break;
            case 'payment_failed':
                // {'event':'payment_failed', type:type, amount:amount, errcode:'', d:0.1};
                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var paymentFailed = new models.PaymentFailed(data);
                paymentFailed.save(function(err, logDoc) {
                    if (err) return console.error(err);
                    console.log('+payment_failed');
                });
                break;
            case 'send_sms':
                // {'event':'send_sms', add:'+8028'};
                data.time = new Date();
                _.extend(data, distsInfo[user.disid]);
                var sendSMS = new models.SendSMS(data);
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
                // console.log(`${user.username} start game ${JSON.stringify(data)}`);
                break;
            case 'finish':
                if (!user.hasPlayed) user.hasPlayed = {};
                if (!user.hasPlayed[user.gameid]) user.hasPlayed[user.gameid] = 1;
                else user.hasPlayed[user.gameid] += 1;
                user.hasPlayed.player = data.player;
                user.hasPlayed.vip = data.vip;
                // console.log(`${user.username} finish game ${user.gameid}`);
                break;
            case 'leaveTable':
                var ag = data.ag;
                var dm = data.dm;
                var staketype = _.has(data, 'staketype') ? data.staketype : (_.has(data, 'type') ? data.type : undefined);
                var stake = data.stake;
                var sMesData = sMesData1;
                var sMes = [];
                Object.keys(sMesData).map(function(appnames) {
                    if (appnames.includes(user.app)) {
                        sMes = sMes.concat(sMesData[appnames]);
                    }
                });
                user.lastGame = { gameid: user.gameid, stake: stake, staketype: staketype, dm: dm, ag: ag };
                sMes = utils.filterShowType1(sMes, user, ag, dm, stake, staketype);
                utils.sendPopups(socket, models.MUser, user, sMes, appconfig, gpResult);
            case 'videoCount':
                user.videoWatched = data.videoCurrent;
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
            case 'ctable':
                // {"event":"ctable","tid":22261,"stake":100}
                break;
                // Banner kiểu siam
            case 'clickButtonBanner':
            case 'clickButtonIAP':
            case 'clickButtonSms':
            case 'clickButtonCard':
            case 'closeBanner':
            case 'clickButonViewAd':
            case 'clickButtonShowPayment':
            case 'clickButtonHaveNothing':
            case 'clickButtonOpenUrl':
            case 'clickButtonOpenShare':
                var ev = data.event;
                var id = data.id; // gp id;
                var date = moment().format("YYYY-MM-DD");
                var os = user.device_OS;
                var sindex = 0;
                if (_.has(user, id)) // != 0 hoặc đã đc set, trong trường hợp thông thg mình check has atribute chưa
                    if (_.has(user[id], 'sMesIndex'))
                        sindex = user[id].sMesIndex;
                ev = 'result.' + date + '.' + os + '.' + sindex + '.' + ev;

                if (!_.has(gpResult, id)) {
                    gpResult[id] = {};
                }

                if (!_.has(gpResult[id], ev)) {
                    gpResult[id][ev] = 0;
                }

                gpResult[id][ev]++;
                break;
            case 'smsdetail':
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
        var snapshotData = new models.SnapshotData({ time: new Date(), si: indexLoop, formattedData: copy });
        snapshotData.save(function(err, logDoc) {
            if (err) return console.error(err);
            console.log('+models.SnapshotData');
        });
        var ccus = getccus();
        var ccu = new models.CCU({ date: new Date(), si: indexLoop, app: ccus.c_ccus_byapp, ip: ccus.c_ccus_byip });
        ccu.save(function(err, doc) {
            if (err) return console.error("ccu.save err: " + JSON.stringify(err));
        });
        indexLoop++;
        if (indexLoop > 19)
            indexLoop = 0;
    } else {
        loopcount++;
    }

    var maxlength = 24 * 60 * 60 / 30;
    if (timelineFormattedData.length > maxlength)
        timelineFormattedData.pop();

    // update lại BannerShowLimitRule
    models.BannerShowLimitRule.find({})
        // .select({ id: 1, data: 1, _id: 0 })
        .lean().exec(function(err, docs) {
            if (err) return console.log(err);
            appconfig.bannerShowLimitRule = docs;
        });

    try {
        // load lại config
        // note: vì load lại như này, và chưa kịp load lại paymentconfig nên có thời điểm ko tồn tại payment config.
        var paymentconfig = appconfig.paymentconfig;
        appconfig = reload('./appconfig.js');
        // gán lại paymentconfig cũ trước khi lấy đc paymentconfig mới
        appconfig.paymentconfig = paymentconfig;

        // loạd lại paymentconfig
        appconfig.loadpaymentconfig(appconfig);
    } catch (e) {}

    /** TODO: xác định những bất thường */
    analyze_ccu(ccus_byapp, appconfig, 'appid', lastRecordsCCUS);
    analyze_ccu(ccus_byip, appconfig, 'ip', lastRecordsCCUS);


}, 30000); // 30s một lần

setInterval(function() {
    if (_.isEmpty(siamActions))
        return;
    siamActions['date'] = new Date();

    var siamAction = new models.SiamAction(siamActions); // ######
    siamAction.save(function(err, docs) {
        if (err) return console.error(err);
    });

    siamActions = {};
}, 60 * 60 * 1000); // 1h một lần

setInterval(function() {
    // load lại iprange
    iprange = reload('./iprange.js')
    utils = reload('./utils.js')

    if (_.isEmpty(avgLoginData))
        return;

    var time = moment().subtract(2.5, 'minutes')._d; // -> 2.5 nếu là 5'

    // Lưu snapshot vào db
    var loginData = new models.LoginData({ time: time, formattedData: avgLoginData });
    loginData.save(function(err, logDoc) {
        if (err) return console.error(err);
        console.log('+SnapshotAvgLoginData');
    });

    // avgNetworkPerformanceData.load_config['time'] = time;
    // var loadConfig = new models.LoadConfig(avgNetworkPerformanceData.load_config);
    // loadConfig.save(function(err, logDoc) {
    //     if (err) return console.error(err);
    //     console.log('+SnapshotAvgLoadConfigData');
    // });

    _.forEach(avgNetworkPerformanceData.load_config, function(value, key) {
        value.time = time;
        _.extend(value, distsInfo[key]);

        var loadConfig = new models.LoadConfig(value); // ######
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
        var loginSuccess = new models.LoginSuccess(value); // ######
        loginSuccess.save(function(err, logDoc) {
            if (err) return console.error(err);
        });
    });

    /** TODO: xác định những bất thường */
    // 1. thời gian login success lâu bất thường
    // 2. số lượng login failed/login success tăng

    var login_report = analyze_login_api();

    for (var i = 0; i < login_report.apps.length; i++) {
        var appid = login_report.apps[i].appid;
        var failedRate = login_report.apps[i].res.failedRate;
        var success = login_report.apps[i].res.success;

        if (failedRate > appconfig.threshold.percentloginfailed && success > appconfig.threshold.loginSuccessMin) {
            // gửi mail
            var msg = "App " + appid + " Warning login failed rate " + (failedRate * 100).toFixed(2) + "%";
            sendWarningMail(appconfig.maillist, appid, msg, login_report, 0);
        }
    }

    var loginReport = new models.LoginReport(login_report); // ######
    loginReport.save(function(err, logDoc) {
        if (err) return console.error(err);
    });

    // xóa avgLoginData để tính lại cho lần tiếp theo
    lastReportTime = moment();
    avgLoginData = {};
    avgNetworkPerformanceData = {};

    saveSMesResult();
}, 1000 * 60 * 5); // 5' 1 lần

function saveSMesResult() {
    // TODO: đoạn này lưu lại phản hồi của user về popup nữa, trước khi cập nhật lại từ DB
    // -> cập nhật từ DB về mới nhất, rồi mới ghi lại ngay vào DB, kẻo mất thông tin do ng dùng cập nhật

    // gpResult[id][sindex][ev]++;
    console.log(getTimeStamp() + ' saveSMesResult');

    // ### 1. Ghi lại gpResult
    {
        var keys = Object.keys(gpResult);
        keys = keys.map(function(key) {
            return {
                id: key,
                data: gpResult[key] // -> object
            };
        });
        for (var i = 0; i < keys.length; i++) {
            var item = keys[i];
            // item.data = {"clickButtonBanner":12, "clickButtonCard":1}
            // $inc: {
            //     "result.0.closeBanner": 12,
            //     "result.0.clickButtonIAP": 2,
            //     "result.0.clickButtonCard": 6,
            //     "result.1.closeBanner": 12,
            //     "result.1.clickButtonIAP": 2,
            //     "result.1.clickButtonCard": 6
            // }
            models.GreetingPopup.update({ _id: item.id }, { $inc: item.data }, function(err, res) {
                // callback(err, res);
                if (err) {
                    console.log("models.GreetingPopup.update err: " + JSON.stringify(err));
                    console.log(item);
                }
            });

            models.SMessage.update({ _id: item.id }, { $inc: item.data }, function(err, res) {
                if (err)
                    console.log("models.SMessage.update err: " + JSON.stringify(err));
            });

            models.Type10Popup.update({ _id: item.id }, { $inc: item.data }, function(err, res) {
                if (err)
                    console.log("models.Type10Popup.update err: " + JSON.stringify(err));
            });

            models.BannerV2.update({ _id: item.id }, { $inc: item.data }, function(err, res) {
                if (err)
                    console.log("models.BannerV2.update err: " + JSON.stringify(err));
            });

        };
        // ko cần quan tâm result
        // clear lại bộ đếm tương tác
        gpResult = {};
    }

    // ### 2. Ghi lại uaResult
    {
        var keys = Object.keys(uaResult);
        keys = keys.map(function(key) {
            return {
                event: key,
                data: uaResult[key] // -> object
            };
        });
        for (var i = 0; i < keys.length; i++) {
            var item = keys[i];
            // item.data = {"clickButtonBanner":12, "clickButtonCard":1}
            // $inc: {
            //     "result.0.closeBanner": 12,
            //     "result.0.clickButtonIAP": 2,
            //     "result.0.clickButtonCard": 6,
            //     "result.1.closeBanner": 12,
            //     "result.1.clickButtonIAP": 2,
            //     "result.1.clickButtonCard": 6
            // }
            models.UAResult.update({ event: item.event }, { $inc: item.data }, function(err, res) {
                // callback(err, res);
                if (err) {
                    console.log("models.UAResult.update err: " + JSON.stringify(err));
                    console.log(item);
                }
            });

        };
        // ko cần quan tâm result
        // clear lại bộ đếm tương tác
        uaResult = {};
    }

    // sau khi có dữ liệu đủ, mình cập nhật lại gp mới, vì đã có thể thêm hoặc xóa gp rồi.
    async.map([models.SMessage, models.GreetingPopup, models.Type10Popup, models.BannerV2], getGPAsycn.query.bind(getGPAsycn), function(err, result) {
        if (err) {
            res.send(JSON.stringify(err, null, 3));
            return;
        }

        var data = [];
        result.map(function(value, index) {
            data = data.concat(result[index]);
        });
        // vì type10 được sử dụng thường xuyên nên mình format luôn
        sMesData0 = data.filter(function(item) {
            if (!_.has(item, 'showType'))
                item.showType = 0; // hiện lúc login

            return item.showType == 0;
        });

        sMesData1 = data.filter(function(item) {
            if (!_.has(item, 'showType'))
                item.showType = 0; // hiện lúc hết tiền

            return item.showType == 1;
        });

        sMesData2 = data.filter(function(item) {
            if (!_.has(item, 'showType'))
                item.showType = 0; // hiện lúc thay đổi vip

            return item.showType == 2;
        });


        sMesData0 = format_sMes(sMesData0);
        sMesData1 = format_sMes(sMesData1);
        sMesData2 = format_sMes(sMesData2);

    });
}

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
            "subject": type ? "DST Warning System CCU_value down rate" : "DST Warning System Login Failed",
            "from": { "name": "DST Game Notify System", "email": "nguyenhaian@outlook.com" },
            "to": maillist,
            "bcc": []
        };
        var options = {
            method: 'POST',
            url: appconfig.add_sendmail,
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
            url: appconfig.add_getac,
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
