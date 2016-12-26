var reload = require('require-reload')(require);
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
var request = require('request');
var async = require("async");
var utils = reload('./utils.js')

var FB = require('fb');
FB.options({ version: 'v2.7' });

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

mongoose.connect('mongodb://localhost/CustomerMonitor');
var SMessage = mongoose.model('SMessage', { app: String, date: Date, type: Number, title: String, url: String, urllink: String, pos: { x: Number, y: Number } });
var GreetingPopup = mongoose.model('GreetingPopup', {
    type: Number,
    title: String,
    LQ: [Number],
    Vip: [Number],
    AG: [Number],
    requirePayment: Number,
    date: Date,
    dexp: Date,
    app: String,
    url: String,
    urllink: String,
    countBtn: Number,
    valueSms: Number,
    valueCard: Number,
    valueIAP: Number,
    bonusSms: Number,
    bonusCard: Number,
    bonusIAP: Number,
    showPopup: Boolean,
    arrUrlBtn: [String],
    arrPos: [{ Number, Number }],
    result: {
        //     {
        //     clickButtonBanner: Number,
        //     closeBanner: Number,
        //     clickButtonIAP: Number,
        //     clickButtonSms: Number,
        //     clickButtonCard: Number
        // }
    }
});

var Type10Popup = mongoose.model('Type10Popup', {
    type: Number,
    title: String,
    date: Date,
    dexp: Date,
    app: String,
    url: String,
    urllink: String,
    countBtn: Number,
    arrValue: [Number],
    arrBonus: [Number],
    arrUrlBtn: [String],
    arrTypeBtn: [String],
    arrPos: [{ Number, Number }],
    result: {}
});

var MUser = mongoose.model('User', {
    uid: Number,
    app: String,
    operator: Number,
    email: String,
    name: String, // không biết có nên thêm vip và gold vào ko
    vip: Number,
    gold: Number,
    lq: Number,
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


var getGPAsycn = {
    query: function(queryObject, callback) {
        queryObject.find({})
            .limit(20).lean().exec(function(err, docs) {
                callback(err, docs);
            });
    }
};

async.map([SMessage, GreetingPopup, Type10Popup], getGPAsycn.query.bind(getGPAsycn), function(err, result) {
    if (err) {
        // res.send(JSON.stringify(err, null, 3));
        console.log("err");
        return;
    }

    var sMes = format_sMes(result[0], null);
    var greetingPopups = format_sMes(result[1], null);
    var type10Popups = format_sMes(result[2], null);

    var c1 = Object.keys(sMes).length;
    var c2 = Object.keys(greetingPopups).length;
    var c3 = Object.keys(type10Popups).length;

    var ret = _.cloneDeep(sMes);
    _.extend(ret, greetingPopups);
    _.extend(ret, type10Popups);
    console.log(c1)
    console.log(c2)
    console.log(c3)
    console.log(greetingPopups)
        // var user = {
        //         app: 'siam',
        //         gameid: 8006,
        //         vip: 1
        //     },
        //     gold = 50000,
        //     stake = 20000;
        // var sMesData = utils.gettype10popup(user.app, type10Popups, user.gameid, gold, user.vip, stake);
        // console.log('after');
        // console.log(sMesData);

    // var ret = _.cloneDeep(sMes);
    // _.extend(ret, greetingPopups);
    // res.setHeader('Content-Type', 'application/json');
    // res.send(JSON.stringify(ret, null, 3));

});

return;

var data = {
    "type": 10,
    "title": "nap Gold",
    "url": "http://203.162.166.19:5000/Siam/image/km200_5.png",
    "urllink": "https://www.google.com.vn/",

    "countBtn": 3,

    "arrValue": [
        0,
        0,
        3
    ],

    "arrBonus": [
        0,
        0,
        0
    ],
    "date": new Date(),
    "dexp": new Date(),

    "arrUrlBtn": [
        "http://203.162.166.19:5000/Siam/image/btn_sms.png",
        "http://203.162.166.19:5000/Siam/image/btn_card.png",
        "http://203.162.166.19:5000/Siam/image/btn_sms.png"
    ],

    "arrTypeBtn": [
        "sms",
        "card",
        "sms"
    ],

    "arrPos": [{
        "x": 0,
        "y": -0.3
    }, {
        "x": -0.3,
        "y": -0.3
    }, {
        "x": 0.3,
        "y": -0.3
    }]

};


// var popup = new Type10Popup(data);
//        popup.save(function(err, logDoc) {
//            if (err) return console.error(err);
//            console.log('+popup');
//        });

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


function test() {

    var sMesData = [{
        priority: 1,
        x: 1,
        y: 4
    }, {
        priority: 1,
        x: 2,
        y: 2
    }, {
        x: 8,
        y: 4
    }, {
        x: 9,
        y: 4
    }, {
        priority: 6,
        x: 0,
        y: 4
    }];


    sMesData = shuffle(sMesData);

    function uniqBy(a, key) {
        var seen = {};
        return a.filter(function(item) {
            var k = key(item);
            return seen.hasOwnProperty(k) ? false : (seen[k] = true);
        })
    }

    sMesData = uniqBy(sMesData, function(item) {
        return item.priority;
    });

    sMesData.sort(function(a, b) {
        // if (!_.has(a, 'priority'))
        //     a.priority = 1000;
        // if (!_.has(b, 'priority'))
        //     b.priority = 1000;
        return a.priority - b.priority;
    });

    console.log(sMesData);
}

for (var i = 5 - 1; i >= 0; i--) {
    console.log("test " + i);
    test();
};

return;
var updateGPAsycn = {
    query: function(item, callback) { // fbkey: feedbackkey
        // item.data = {"clickButtonBanner":12, "clickButtonCard":1}
        GreetingPopup.update({ _id: item.id }, { $inc: item.data }, function(err, res) {
            callback(err, res);
        });
    }
};
var keys = Object.keys(gpResult);
keys = keys.map(function(key) {
    return {
        id: key,
        data: gpResult[key] // -> object
    };
});
async.map(keys, updateGPAsycn.query.bind(updateGPAsycn), function(err, result) {
    if (err) {
        console.log("updateGPAsycn err " + JSON.stringify(err));
        return;
    }
    // sMes = format_sMes(result[0], null);
    // greetingPopups = format_GP(result[1], null);

    // clear lại bộ đếm tương tác
    gpResult = {};

    // sau khi có dữ liệu đủ, mình cập nhật lại gp mới, vì đã có thể thêm hoặc xóa gp rồi.
    GreetingPopup.find({})
        .lean().exec(function(err, docs) {
            console.log(docs);
            // greetingPopups = format_GP(docs, err);
        });
});

return;

// var SMessage = mongoose.model('SMessage', { date: Date, type: Number, title: String, url: String, urllink: String, pos: { x: Number, y: Number } });
// var smsg = new SMessage({
//     date: new Date(),
//     type: 1,
//     title: "nạp Gold",
//     url: "http://mobile.tracking.dautruong.info/img/banner/banner140916.jpg",
//     urllink: "",
//     pos:{
//         x:200,
//         y:100
//     }
// });
// smsg.save(function(err, logDoc) {
//     if (err) return console.error("smsg.save err: " + JSON.stringify(err));
//     console.log('+smsg');
// });


return;


// var options = {
//     method: 'POST',
//     url: 'https://onesignal.com/api/v1/notifications',
//     headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Basic NGMzODk0ODQtMzE0Ni00N2Y5LWE3YmMtZDU1MjVkZDQ5ZTUz'
//     },
//     json: {
//         app_id: "0a8074bb-c0e4-48cc-8def-edd22ce17b9d",
//         headings: { "en": "DST Notify" },
//         included_segments: ["All"],
//         contents: { "en": "App  Warning login failed rate - Test"},
//         ios_badgeType: "Increase",
//         ios_badgeCount: 1
//     }
// };
// console.log("---> sendWarningMail");

// function callback(error, response, body) {
//     console.log("<--- sendWarningMail response");
//     if (error) {
//         console.log('error: ' + JSON.stringify(error));
//     } else {
//         console.log(body)
//     }
// }

// request(options, callback);

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

// sql.on('error', function(err) {
//     // ... error handler
//     console.log(err)
// });


FB.setAccessToken('EAAKKZC18yTRkBAMAHfDob9zifpeusoOoexpTaHiCBpj11JTp02zcrtsUyeM4lWtMDkbHQj4OqnIx0FYYOg3YgZByKQDcpWh4uPOemmDRf72QbdYvckG7LQlJuzLk71mke6JExdzhffU5bcXwjIasrLaCQZCCDEZD');
// FB.api('me', function(res) {
//     if (!res || res.error) {
//         console.log(!res ? 'error occurred' : res.error);
//         return;
//     }
//     console.log(res);
//     FB.api('me/friends', function(res) {
//         if (!res || res.error) {
//             console.log(!res ? 'error occurred' : res.error);
//             return;
//         }
//         console.log(res);
//     });
// });

// FB.api('', 'post', {
//     batch: [
//         { method: 'get', relative_url: 'me' },
//         { method: 'get', relative_url: 'me/friends?limit=200' }
//     ]
// }, function(res) {
//     var res0, res1;

//     if (!res || res.error) {
//         console.log(!res ? 'error occurred' : res.error);
//         return;
//     }

//     res0 = JSON.parse(res[0].body);
//     res1 = JSON.parse(res[1].body);
//     console.log(res0);
//     console.log(res1);
// });

var user1 = {
    operator: 500,
    disid: "2974_500",
    bundle: "com.danhbai.dautruong",
    app_version: "2.14",
    did: "0DE5C3F6-F316-43FE-8D5C-4B2CB42FDFC7",
    device_OS: "iOS",
    device_OS_version: "9.3.2",
    scene_name: "GAME_VIEW",
    loginTime: "2016-08-19 10:05:33",
    username: "annguyenpro",
    userid: 1100079258,
    logged_in_game_host: "servergame14.club;",
    gameid: 8004,
    sceneStartedTime: "2016-08-19 10:08:32"
}

var user2 = {
    operator: 500,
    disid: "2974_500",
    bundle: "com.danhbai.dautruong",
    app_version: "2.14",
    did: "0DE5C3F6-F316-43FE-8D5C-4B2CB42FDFC7",
    device_OS: "iOS",
    device_OS_version: "9.3.2",
    scene_name: "GAME_VIEW",
    loginTime: "2016-08-19 10:05:33",
    username: "annguyenpro",
    userid: 1100079258,
    logged_in_game_host: "servergame14.club;",
    gameid: 8004,
    sceneStartedTime: "2016-08-19 10:08:32",
    ac: "EAAKKZC18yTRkBAMAHfDob9zifpeusoOoexpTaHiCBpj11JTp02zcrtsUyeM4lWtMDkbHQj4OqnIx0FYYOg3YgZByKQDcpWh4uPOemmDRf72QbdYvckG7LQlJuzLk71mke6JExdzhffU5bcXwjIasrLaCQZCCDEZD"
}

console.log('server has started');

function addOrUpdateUserToDB(iuser, callback) {
    var appid = (iuser.operator == 1001 ? 1000 : iuser.operator);
    MUser.findOne({ uid: iuser.userid, app: appid }).exec(function(err, ruser) {
        callback(ruser);

        if (err) {
            console.log('err: ' + JSON.stringify(err));
        } else if (!ruser) {
            // console.log('ruser == null');
            // thực hiện insert
            var mUser = new MUser({
                uid: iuser.userid,
                app: appid,
                name: iuser.username,
                d1: new Date(),
                d2: new Date(),
                lDisid: iuser.disid,
                lDev: iuser.did,
                disid: [{ id: iuser.disid, la: new Date() }],
                dev: [{ id: iuser.did, la: new Date() }]
            });
            mUser.save(function(err, doc) {
                if (err) return console.error(err);
                // console.log('+muser ' + doc.name);
            });
        } else {
            // console.log('ruser: ' + JSON.stringify(ruser));            
            // thực hiện update
            var disid = ruser.disid;
            var dev = ruser.dev;

            for (var i = disid.length - 1; i >= 0; i--) {
                if (disid[i].id == iuser.disid) {
                    disid[i].la = new Date();
                    break;
                }
            };
            for (var i = dev.length - 1; i >= 0; i--) {
                if (dev[i].id == iuser.did) {
                    dev[i].la = new Date();
                    break;
                }
            };
            MUser.findOneAndUpdate({ _id: ruser._id }, {
                $set: {
                    d2: new Date(),
                    lDisid: iuser.disid,
                    lDev: iuser.did,
                    disid: disid,
                    dev: dev
                }
            }, { new: true }, function(err, doc) {
                if (err) {
                    console.log("Something wrong when updating data!");
                }
                // console.log(doc);
            });
        }
    });
}

function getFBExtraData(FB, iuser, callback) {
    var appid = (iuser.operator == 1001 ? 1000 : iuser.operator);
    if (!iuser['ac']) {
        console.log('user does not have access token');
        return;
    }

    // cập nhật lại thông tin từ FB sau 1 ngày
    var yesterday = moment().add(-1, 'days');
    if (!iuser.lastUpdateFB || moment(iuser.lastUpdateFB).isBefore(yesterday)) {
        FB.setAccessToken(iuser.ac);

        FB.api('', 'post', {
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
            //     link: 'https://www.facebook.com/app_scoped_user_id/974492469236118/',
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

            MUser.findOneAndUpdate({ uid: iuser.userid, app: appid }, {
                $set: {
                    lastUpdateFB: new Date(),
                    fbName: res0.name,
                    fbID: res0.id,
                    email: res0.email,
                    fFB: res1.data
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

addOrUpdateUserToDB(user1, function(ruser) {
    if (ruser)
        console.log(JSON.stringify(ruser));

});

getFBExtraData(FB, user2, function(res0, res1) {
    if (res0)
        console.log(JSON.stringify(res0));
    if (res1)
        console.log(JSON.stringify(res1));
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
