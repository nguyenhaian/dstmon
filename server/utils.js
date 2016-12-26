const iprange = require('./iprange.js');
const moment = require('moment');
const _ = require('lodash');
const mongoose = require('mongoose')
const chalk = require('chalk');
const numeral = require('numeral');

console.log('*******************');
console.log('init Utils.js');

function getTimeStamp() {
    return (moment().format("YYYY-MM-DD HH:mm:ss"));
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uniqBy(a, key) {
    var seen = {};
    return a.filter(function(item) {
        var k = key(item);
        return seen.hasOwnProperty(k) ? false : (seen[k] = true);
    })
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

function sendPopups(socket, MUser, user, sMes, appconfig, gpResult) {
    var history = user.bannerShowedHistory;

    // return true nếu bắn thành công, return false ngược lại
    if (!sMes || sMes.length < 1)
        return false;

    var sMesData = _.cloneDeep(sMes);

    // if (user.app == "dautruong") {
    //     if (user.device_OS == "Android" && user.app_version < "4.0") {
    //         // những bản này chỉ handle message kiểu cũ, chứa 'pos'
    //         sMesData = sMesData.filter(function(item) {
    //             return _.has(item, 'pos');
    //         });
    //     } else {
    //         // những bản còn lại chỉ hiện popup chứa arrPos
    //         sMesData = sMesData.filter(function(item) {
    //             return _.has(item, 'arrPos');
    //         });
    //     }
    // }

    user.pendingBanners = [];
    user.initBanners = {};
    sMesData.map(function(banner) {
        user.initBanners[banner._id] = { detail: appconfig.socketapp + "/sMes/" + banner._id };
    });

    //&& !iprange.inVietnam(user.ip)) {
    // nếu user cũ (ko gửi lq lên) thì ko gửi về
    var userag = 0;
    var userdm = 0;
    if (_.has(user, 'ag')) userag = user.ag;
    if (_.has(user, 'gold')) userag = user.gold;
    if (_.has(user, 'dm')) userdm = user.dm;

    if (!_.has(user, 'lq') || !_.has(user, 'vip'))
    // cái này để xác nhận user đã login, tránh trường hợp user mới, user = ruser = iuser
        return;

    if (history.date != moment().format("YYYY-MM-DD")) {
        // trường hợp dữ liệu của ngày trước, thì xóa dữ liệu history.day
        history.date = moment().format("YYYY-MM-DD");
        history.day = [];
    };
    // lọc sMesData
    sMesData = sMesData.filter(function(d) {
        if (!d.hasOwnProperty('requirePayment'))
            d.requirePayment = 3;
        // 0 -> chưa nạp tiền -> hiển thị banner này. 
        // 1 -> nạp tiền rồi -> ko hiển thị banner này.
        // 2 -> nạp tiền rồi -> hiển thị banner này.
        // 3 -> ko quan tâm

        var pass_lqcheck = (user.increaseLQ == 0 && d.requirePayment == 0) || !(user.increaseLQ > 0 && d.requirePayment == 1) || (user.increaseLQ > 0 && d.requirePayment == 2) || (d.requirePayment == 3)

        if (!d.hasOwnProperty('os'))
            d.os = 0;
        // 0 -> không quan tâm
        // 1 -> iOS
        // 2 -> Android
        var pass_oscheck = (user.device_OS == 'iOS' && d.os == 1) || (user.device_OS == 'Android' && d.os == 2) || (d.os == 0);
        user.initBanners[d._id].pass_oscheck = pass_oscheck;

        var version = parseFloat(user.app_version)
        if (!d.hasOwnProperty('version'))
            d.version = [0, 1000];
        var pass_versioncheck = (version >= d.version[0] && version <= d.version[1]);
        user.initBanners[d._id].pass_versioncheck = pass_versioncheck;

        if (!_.has(d, 'LQ')) {
            d.LQ = [0, 100000000];
        }
        if (!_.has(d, 'DM')) {
            d.DM = [0, 100000000];
        }
        if (!_.has(d, 'Vip')) {
            d.Vip = [0, 100000000];
        }
        if (!_.has(d, 'AG')) {
            d.AG = [0, 100000000];
        }
        if (!_.has(d, 'videoWatched') || d.videoWatched.length == 0) {
            d.videoWatched = [0, 100000000];
        }

        var videoWatched = user.videoWatched || 0;

        var pass_lq = user.lq >= d.LQ[0] && user.lq <= d.LQ[1];
        user.initBanners[d._id].pass_lq = { res: pass_lq, userlq: user.lq, min: d.LQ[0], max: d.LQ[1] };

        var pass_ag = userag >= d.AG[0] && userag <= d.AG[1];
        user.initBanners[d._id].pass_ag = { res: pass_ag, userag: userag, min: d.AG[0], max: d.AG[1] };

        var pass_dm = userdm >= d.DM[0] && userdm <= d.DM[1];
        user.initBanners[d._id].pass_dm = { res: pass_dm, userdm: userdm, min: d.DM[0], max: d.DM[1] };

        var pass_vip = user.vip >= d.Vip[0] && user.vip <= d.Vip[1];
        user.initBanners[d._id].pass_vip = { res: pass_vip, uservip: user.vip, min: d.Vip[0], max: d.Vip[1] };

        var pass_videoWatched = videoWatched >= d.videoWatched[0] && videoWatched <= d.videoWatched[1];
        user.initBanners[d._id].pass_videoWatched = { res: pass_videoWatched, uservideoWatched: videoWatched, min: d.videoWatched[0], max: d.videoWatched[1] };

        var pass_filter = pass_lq && pass_ag && pass_dm && pass_vip && pass_videoWatched;

        var pass_limitrule = true;

        function findRuleByNumber(rules, ruleNumber) {
            for (var i = rules.length - 1; i >= 0; i--) {
                var rule = rules[i];
                if (rule.ruleNumber == ruleNumber) {
                    return rule;
                }
            };
            return { err: "not found" };
        }
        if (_.has(d, 'bannerShowLimitRule') && d.bannerShowLimitRule > 0) {
            // tìm rule của banner
            var ruleNumber = d.bannerShowLimitRule;
            var rule = findRuleByNumber(appconfig.bannerShowLimitRule, ruleNumber);
            // {
            //     _id: "585224186a338c122855a6c7",
            //     date: "2016-12-15T05:03:20.000Z",
            //     ruleNumber: 1,
            //     rule: "day",
            //     description: "test rule",
            //     limit: 1,
            //     __v: 0
            // },
            // check với cả history 
            if (!rule.err) { // trong trường hợp xóa hết rule, thì rule = {err: 'not found'}
                var ruletype = rule.rule;
                var showed = findRuleByNumber(history[ruletype], ruleNumber);
                // showed = {
                //     ruleNumber: 0,
                //     count: 5
                // }
                if (showed.count >= rule.limit)
                    pass_limitrule = false;
            }
        }

        user.initBanners[d._id].pass_limitrule = pass_limitrule;

        pass_filter &= pass_lqcheck;
        pass_filter &= pass_oscheck;
        pass_filter &= pass_versioncheck;
        pass_filter &= pass_limitrule;

        user.initBanners[d._id].pass_filter = pass_filter;
        return pass_filter;
    });
    // NOTE 28/10: một số popup hoạt động theo kiểu
    // 1. đăng nhập lần đầu ở ngày mới sẽ hiện, user.increaseLQ = 0
    // 2. các lần đăng nhập mới, nhưng ngày hôm đó chưa nạp tiền -> hiện tiếp, user.increaseLQ = 0

    // -> giải pháp: 
    // Lưu LQ lần đăng nhập đầu lại, sau đó check thay đổi với lần đầu.

    if (sMesData.length > 0) {
        // mục đích của 3 bước sau là random lựa chọn một trong những popup có priority giống nhau
        // 1. trộn ngẫu nhiên
        sMesData = shuffle(sMesData);

        // 2. sort theo priority
        sMesData.sort(function(a, b) {
            if (!_.has(a, 'priority'))
                a.priority = 1000;
            if (!_.has(b, 'priority'))
                b.priority = 1000;
            return a.priority - b.priority;
        });

        // 3. lấy unique theo priority
        sMesData = uniqBy(sMesData, function(bannerItem) {
            return bannerItem.priority;
        });

        if (!user.hasOwnProperty('popupHasShowed'))
            user.popupHasShowed = {};

        var sMesData = sMesData.map(function(banner) {
            var urls = banner.url.split(";");
            urls = urls.filter(function(d) {
                return (/\S/.test(d));
            });
            // if (urls.length > 1) {
            var n = getRandomInt(0, urls.length - 1);
            if (!_.has(user, banner._id)) {
                user[banner._id] = {};
            }
            // user[banner._id].urls = banner.url;
            banner.url = urls[n];
            user[banner._id].sMesIndex = n; // cái này quan trọng để cập nhật vào gpReport
            user[banner._id].url = banner.url;

            // console.log('#########RANDOM########## ' + user.username + ' ' + n + '/' + urls.length);
            // }
            if (!user.popupHasShowed.hasOwnProperty(banner.showType)) {
                user.popupHasShowed[banner.showType] = 0;
            }
            user.popupHasShowed[banner.showType]++;

            if (_.has(banner, 'result'))
                delete banner.result;

            banner = formatBannerButton(user, appconfig, banner);
            user.pendingBanners.push(appconfig.socketapp + "/sMes/" + banner._id);

            // thêm data vào gpResult
            var ev = 'sent';
            var id = banner._id; // banner id;
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

            return banner;
        });

        // if (user.username == 'giangvp11') {
        // console.log('#########RANDOM########## ' + user.username);


        socket.emit('event', { event: 'news', data: sMesData });
        user.hasGetPopup = { date: new Date(), title: sMesData[0].title, type: sMesData[0].type, size: sMesData.length };

        return true;
    }


    return false;
}

exports.filterShowType1 = (sMesData, user, ag, dm, stake, staketype) => {
    if (!sMesData || sMesData.length < 1)
        return [];
    user.lastag = ag;
    user.lastdm = dm;
    user.ag = ag;
    user.dm = dm;
    var gameid = user.gameid;
    var check_hettien0 = (ag < stake * 10 && staketype == 0);
    var check_hettien1 = (dm < stake * 10 && staketype == 1);

    user.check_hettien0 = check_hettien0;
    user.check_hettien1 = check_hettien1;

    // biến này lưu giá trị đồng tiền còn lại
    // var currency2 = check_hettien0 ? dm : (check_hettien1 ? ag : 0);


    if (check_hettien0 || check_hettien1) {
        // đáng lẽ phải xét theo game nữa, không phải game nào cũng là x 10
        return sMesData.filter(function(d) {
            if (!d.hasOwnProperty('st1_game')) // thoát từ game nào
                d.st1_game = [];
            var pass_gamecheck = d.st1_game.indexOf(gameid) >= 0 || d.st1_game.length == 0;

            if (!d.hasOwnProperty('st1_staketype')) // thoát từ loại cược nào
                d.st1_staketype = [0, 1];
            var pass_staketypecheck = d.st1_staketype.indexOf(staketype) >= 0 || d.st1_staketype.length == 0;

            // if (!d.hasOwnProperty('st1_currencyrange')) // thoát từ loại cược nào
            //     d.st1_currencyrange = [0, 10000000];
            // var pass_currencyrangecheck = (currency2 >= d.st1_currencyrange[0] && currency2 <= d.st1_currencyrange[1]) || d.st1_currencyrange.length == 0;

            if (!d.hasOwnProperty('st1_stake')) // trong khoảng stake nào
                d.st1_stake = [0, 10000000];
            var pass_stakecheck = (stake >= d.st1_stake[0] && stake <= d.st1_stake[1]) || d.st1_stake.length == 0;

            return pass_gamecheck && pass_staketypecheck && pass_stakecheck;
        });
    }

    return [];
}

exports.filterShowType2 = (sMesData, user) => {
    if (!sMesData || sMesData.length < 1)
        return [];


    return sMesData.filter(function(d) {
        if (!d.hasOwnProperty('vipchange'))
            d.vipchange = [];

        return d.vipchange.indexOf(user.vip) >= 0 || d.vipchange.length == 0;
    });
}

exports.handleEvent = (MUser, user, data, sMesData, uaResult) => {
    // if (user.username != 'giangvp11' || user.username == 'annguyen01')
    //     return;
    var hasConsumed = false;

    function findBannerByID(bannerid) {
        var result = { err: 'not found' };
        _.forEach(sMesData, function(banner) {
            if (banner._id == bannerid) {
                result = banner;
                return false;
            }
        })

        return result;
    }

    function updateBannerShowedHistory(history, banner) {
        // trường hợp dị dạng là user.bannerShowedHistory.session = undefined;
        if (!history)
            return;

        var bannerShowLimitRule = banner.bannerShowLimitRule || 0;
        var found = false;
        for (var i = history.length - 1; i >= 0; i--) {
            var sbanner = history[i];
            // console.log("matching sbanner.ruleNumber %d vs banner.bannerShowLimitRule %d",sbanner.ruleNumber, banner.bannerShowLimitRule);
            // note: bannerShowLimitRule = NaN

            if (sbanner.ruleNumber == bannerShowLimitRule) {
                // console.log("found = true");
                // found
                found = true;
                sbanner.count++;
                break;
            }
        };
        if (!found) {
            history.push({ ruleNumber: bannerShowLimitRule || 0, count: 1 });
        }
    }

    switch (data.event) {
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

                // ev = user.username +' '+ id+ '.result.' + date + '.' + os + '.' + sindex + '.' + ev;
            ev = date + '.' + os + '.' + sindex + '.' + ev;

            if (!_.has(user, id))
                user[id] = {};
            if (!_.has(user[id], 'result'))
                user[id]['result'] = [];

            user[id]['result'].push(ev);

            // TODO: add banner này vào nhóm kia bannerShowedHistory
            var banner = findBannerByID(id);
            if (!banner.err) {
                user[id].limitRuleNumber = banner.bannerShowLimitRule || 0;

                updateBannerShowedHistory(user.bannerShowedHistory.session, banner);
                updateBannerShowedHistory(user.bannerShowedHistory.day, banner);
                updateBannerShowedHistory(user.bannerShowedHistory.lifetime, banner);
            }

            MUser.findOneAndUpdate({ _id: user._id }, {
                $set: {
                    popupHasShowed: user.popupHasShowed,
                    bannerShowedHistory: user.bannerShowedHistory
                }
            }, { new: true }, function(err, doc) {
                if (err) {
                    console.log("Something wrong when updating user.popupHasShowed ");
                    console.log(err);
                }
            });
            break;
        case 'receivegift':
            console.log(user.username + ' - ' + JSON.stringify(data));
            hasConsumed = true;

            var keys = Object.keys(data);
            keys.sort(function(x, y) {
                if (x == 'receivegift') return 0;
                return 1;
            });
            var subevent = keys[1];
            var value = data[subevent];

            handleReceiveGift(uaResult, user, subevent, value);
            break;
        case "statepayment":
            console.log(user.username + ' - ' + JSON.stringify(data));
            break;
    }

    return hasConsumed;
}

function handleReceiveGift(uaResult, user, event, value) {
    // ví dụ:
    // {
    //     event: 'video',
    //     value: 9000
    // }

    console.log('handleReceiveGift(uaResult, ' + user.username + ', ' + event + ', ' + value + ')');

    switch (event) {
        case 'video':
        case 'hasnt_money':
        case 'gift_from_admin':
        case 'upvip':
        case 'online':
        case 'facebook':
        case 'giftcode':
        case 'luckyspin':
            var date = moment().format("YYYY-MM-DD");
            // if (!_.has(user, 'ad')) user.ad = { date: date };
            // if (!_.has(use['ad'], event)) user['ad'][event] = {};
            // if (!_.has(user['ad'][event], 'totalValue')) user['ad'][event]['totalValue'] = 0;
            // if (!_.has(user['ad'][event], 'todayValue')) user['ad'][event]['todayValue'] = 0;
            // if (!_.has(user['ad'][event], 'count')) user['ad'][event]['count'] = 0;
            var ev = event;
            var os = user.device_OS;
            var f1 = 'result.' + date + '.' + os + '.totalValue';
            var f2 = 'result.' + date + '.' + os + '.count';

            if (!_.has(uaResult, ev)) {
                uaResult[ev] = {};
            }

            if (!_.has(uaResult[ev], 'users')) {
                uaResult[ev][f1]['users'] = [];
            }
            if (!_.has(uaResult[ev], f1)) {
                uaResult[ev][f1] = 0;
            }
            if (!_.has(uaResult[ev], f2)) {
                uaResult[ev][f2] = 0;
            }

            uaResult[ev][f1] += value;
            uaResult[ev][f2]++;
            if (uaResult[ev][f1]['users'].indexOf(user._id) === -1) {
                uaResult[ev][f1]['users'].push(user._id);
            }

            break;
    }
}

exports.sendPopups = sendPopups;
var formatBannerButton = function(user, appconfig, bannerItem) { // op là provider, ví dụ: VIETTEL
    var app = user.app;
    var usercarrier = user.provider;
    if (!usercarrier) usercarrier = 'unknown';
    var username = user.username;
    // "type": "sms",
    // "btn": "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
    // "pos": [-0.3, -0.3],
    // "ctype": 1,
    // "ccost": 10000,
    // "btype": 0,
    // "bvalue": 200,
    // "bstyle": 200,
    // console.log("************************** formatBannerButton ", bannerItem);
    // if (!_.has(user, 'pendingBanner'))
    //     user.pendingBanner = [];
    // if (!_.has(user, 'sendingBanner'))
    //     user.sendingBanner = [];

    // user.pendingBanner.push(bannerItem);

    function formatButton(button, paymentitems, paymentitemsbonus, iap) {
        function findItemByCCost(paymentitems, ccost) {
            var ret = {};
            _.forEach(paymentitems, function(item) {
                if (item.ccost == ccost) {
                    ret = item;
                    // break;
                    return false;
                }
            });
            return ret;
        }

        var item = findItemByCCost(paymentitems, button.ccost);
        var itembonus = findItemByCCost(paymentitemsbonus, button.ccost);
        // "value": "40K Gold",
        // "bonus": "+80K Chip",
        // "cost": "10K VND",
        // "syntax": "mw 10000 teen NAP 52fun-ann2009-1",
        // "add": "+9029",
        button['carrier'] = usercarrier;
        var value = item["value"]; // cần format cái này
        button['value'] = numeral(value).format('0,0');
        if (button.ctype == 0) // chip
            button['value'] += ' Chip';
        else // ctype == 1 -> Gold
            button['value'] += ' Gold';
        if (iap) {
            button['cost'] = item["USD"];
        } else {
            button['cost'] = button["ccost"] + " VND";
        }
        if (button.bstyle == 1) { // giá cũ/ giá mới
            var newvalue = itembonus["value"] * (100 + button['bvalue']) / 100;
            button['bonus'] = numeral(newvalue).format('0,0');
        } else { // giá cũ/ bonus
            var bonus = itembonus["value"] * (0 + button['bvalue']) / 100;
            button['bonus'] = "+" + numeral(bonus).format('0,0');
        }
        // button['bonus'] = numeral(button['bonus']).format('0.0a');
        if (button.btype == 0) // chip
            button['bonus'] += ' Chip';
        else
            button['bonus'] += ' Gold';
        if (button.type == "sms") {
            button['add'] = item["add"];
            var smssyntax = item["content"];
            smssyntax = _.replace(smssyntax, new RegExp("%user%", "g"), username);
            button['syntax'] = _.replace(smssyntax, new RegExp("%type%", "g"), button['ctype']);
        }

        if (usercarrier == 'unknown') {
            button['add'] = "";
            button['syntax'] = "";
        }


        return button;
    }

    if (bannerItem.type == 20 && _.has(bannerItem, 'arrButton')) {
        var paymentconfig = appconfig.paymentconfig[app];
        bannerItem.arrButton = bannerItem.arrButton.map(function(button, btnindex) {
            // console.log("************************** bannerItem.arrButton ", btnindex);
            var paymentProviders = [];
            var paymentitemsbonus = [];
            var ctype = (button.ctype == 0) ? "_items" : "_items_gold";
            var btype = (button.btype == 0) ? "_items" : "_items_gold";
            var iap = false;
            switch (button.type) {
                case "iap":
                    var paymentitems = paymentconfig[button.type + ctype];
                    var paymentitemsbonus = paymentconfig[button.type + btype];
                    iap = true;
                    button = formatButton(button, paymentitems, paymentitemsbonus, iap);
                    break;
                case "sms":
                    paymentProviders = paymentconfig[button.type + ctype];
                    paymentProvidersbonus = paymentconfig[button.type + btype];
                    iap = false;
                case "card":
                    paymentProviders = paymentconfig[button.type + ctype];
                    paymentProvidersbonus = paymentconfig[button.type + btype];
                    iap = false;
                    var paymentitems = [];
                    var paymentitemsbonus = [];

                    if (!paymentProviders) {
                        break;
                    }

                    for (var i = paymentProviders.length - 1; i >= 0; i--) {
                        var provider = paymentProviders[i];
                        // console.log("pare provider " + usercarrier + '  vs   ' + provider.op);
                        if (usercarrier == provider.op || usercarrier == 'unknown') {
                            // console.log("match provider ", usercarrier);
                            paymentitems = provider.items;
                            break;
                        }
                    };
                    for (var i = paymentProvidersbonus.length - 1; i >= 0; i--) {
                        var provider = paymentProvidersbonus[i];
                        // console.log("pare provider " + usercarrier + '  vs   ' + provider.op);
                        if (usercarrier == provider.op || usercarrier == 'unknown') {
                            // console.log("match provider ", usercarrier);
                            paymentitemsbonus = provider.items;
                            break;
                        }
                    };

                    button = formatButton(button, paymentitems, paymentitemsbonus, iap);
                    break;
            }

            return button;
        });
    }

    // user.sendingBanner.push(bannerItem);
    return bannerItem;
};

exports.formatBannerButton = formatBannerButton;

exports.formatUser = function(appconfig, app, user) {
    if (_.has(user, 'gold') && !_.has(user, 'ag')) {
        user.ag = user.gold;
        delete user.gold;
    }
    return user;
}
