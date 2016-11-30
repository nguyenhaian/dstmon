const mongoose = require('mongoose');


exports.SnapshotData = mongoose.model('SnapshotData', {
    time: { type: String, index: true },
    si: { type: Number, index: true },
    formattedData: {}
});
exports.Dist = mongoose.model("Dist", {
    id: { type: String, index: true },
    data: {
        os: String,
        bundle: String,
        app: { type: String, index: true }
    }
});
exports.LoginData = mongoose.model('LoginData', {
    time: { type: Date, index: true },
    formattedData: {}
});
// Những thông tin dưới đây chưa lọc theo version, thật nguy hiểm
exports.LoginFailed = mongoose.model('LoginFailed', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    host: { type: String, index: true },
    gameid: { type: Number, index: true },
    username: String,
    errorcode: Number,
    errormsg: String,
    d: Number
});
exports.LoadConfig = mongoose.model('LoadConfig', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    'r1': Number,
    'r2': Number,
    'r3': Number,
    'r4': Number,
    'r5': Number
});
exports.LoginSuccess = mongoose.model('LoginSuccess', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    'd1r1': Number,
    'd1r2': Number,
    'd1r3': Number,
    'd1r4': Number,
    'd1r5': Number,
    'd2r1': Number,
    'd2r2': Number,
    'd2r3': Number,
    'd2r4': Number,
    'd2r5': Number
});

exports.LoginReport = mongoose.model('LoginReport', {
    time: { type: Date, index: true },
    duration: { type: Number, index: true },
    apps: []
});
// {'event':'payment_success', type:type, amount:amount, d:0.1}
// {'event':'payment_failed', type:type, amount:amount, errcode:'', d:0.1}
// {'event':'send_sms', add:'+8028'}
exports.OpenPayment = mongoose.model('OpenPayment', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    fromScene: String,
    vip: Number,
    gold: Number,
    duration: Number
}); // -> chưa ghi
exports.PaymentSuccess = mongoose.model('PaymentSuccess', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    type: String,
    amount: Number,
    d: Number
});
exports.PaymentFailed = mongoose.model('PaymentFailed', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    type: String,
    amount: Number,
    errcode: String,
    d: Number
});
exports.SendSMS = mongoose.model('SendSMS', {
    time: { type: Date, index: true },
    app: { type: String, index: true },
    bundle: String,
    os: String,
    add: String
});

exports.SiamAction = mongoose.model('SiamAction', {
    date: { type: Date, index: true },
    clicksuggestdummy: Number,
    showsuggestdummy: Number,
    timeleftdummy: {},
    timeplaydummy: {}
});
exports.CCU = mongoose.model('CCU', {
    date: { type: Date, index: true },
    si: { type: Number, index: true },
    app: {},
    ip: {}
});
// {
//     "type": 1,
//     "title": "nạp gold",
//     "url": "http://mobile.tracking.dautruong.info/img/banner/banner140916.jpg"
// }

var UserScheme = new mongoose.Schema({
    uid: { type: Number, index: true },
    app: { type: String, index: true },
    operator: Number,
    email: String,
    name: { type: String, index: true }, // không biết có nên thêm vip và gold vào ko
    vip: { type: Number, index: true },
    gold: Number,
    lq: Number,
    lqc: [{ d: Date, lq: Number, plus: Number }], // mảng thay đổi LQ
    increaseLQ: Number, // -> tính lại increaseLQ theo từng lần thay đổi, ko tính theo lần đăng nhập nữa.
    popupHasShowed: {}, // số popup đã nhận đc trong ngày.
    loginCount: { type: Number, index: true },
    fbName: { type: String, index: true },
    fbID: { type: String, index: true },
    d1: { type: Date, index: true },
    d2: { type: Date, index: true },
    disid: [], // list disid mà user đã active
    dev: [], // list device mà user đã active
    ip: [],
    lDisid: { type: String, index: true }, // disid cuối cùng user active
    lDev: { type: String, index: true }, // Device cuối cùng mà user active
    lIP: { type: String, index: true },
    fFB: [], // danh sách nhanh các bạn từ fFB cũng chơi game, limit 200 bạn
    fFBSize: { type: Number, index: true }, // để truy vấn nhanh
    // videoWatched: Number,
    // ban đầu fG bao gồm fFB, fG: [{fbid:Number}]
    // sau đó sẽ đc cập nhật thành, fG: [{fbid:Number, uid:Number, name:String, }]
    lastUpdateFB: Date,
    lastSentNotify: Date,
    // sMsg: [{ mid: String, beh: Number, date: { type: Date, index: true } }], // danh sách system message -> ko cần thiết lắm
    // beh:0 - đã gửi, 1 - in, 2 - out
    // date: ngày user có tương tác, dexp: ngày mà msg hết hiệu lực, nên xóa trong mảng này đi
    // lastGame:{gid:String, stake:Number},
    cp: [{ pid: String, gid: Number, n: String, c: Number, d: Date }], // danh sách player hay choi cùng, Ghi vào Db lúc user thoát
    // gid: gameid, n:name, c: count, d: last date phát sinh ván chơi cùng
    fl: [{ pid: String, gid: Number, n: String, d: Date }] // follow list
        // đối với biến user,
        // player đc chọn sẽ đưa vào follow list.
        // d: ngày kết bạn
});
UserScheme.index({ uid: 1, app: 1 }, { unique: true });
exports.MUser = mongoose.model('User', UserScheme);


exports.UAResult = mongoose.model('UAResult', {
    event: String,
    result: {}
});


exports.SMessage = mongoose.model('SMessage', {
    app: { type: String, index: true },
    date: { type: Date, index: true },
    type: Number,
    title: String,
    url: String,
    urllink: String,
    pos: { x: Number, y: Number }
});

exports.GreetingPopup = mongoose.model('GreetingPopup', {
    type: Number,
    title: String,
    LQ: [Number],
    Vip: [Number],
    AG: [Number],
    showLimit: Number,
    requirePayment: Number,
    priority: Number,
    videoWatched: [Number],
    vipchange: [Number],
    st1_stake: [Number],
    st1_game: [Number],
    date: { type: Date, index: true },
    dexp: { type: Date, index: true },
    app: { type: String, index: true },
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
    arrPos: [],
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

// requirePayment:
// 0 -> chưa nạp tiền -> hiển thị banner này. 
// 1 -> nạp tiền rồi -> ko hiển thị banner này.
// 2 -> nạp tiền rồi -> hiển thị banner này.
// 3 -> ko quan tâm
exports.Type10Popup = mongoose.model('Type10Popup', {
    app: { type: String, index: true },
    type: Number,
    showType: Number, // 0: login, 1: lúc hết tiền
    title: String,
    note: String,
    showLimit: Number, // số lần hiển thị tối da trong 1 ngày với 1 user
    LQ: [Number],
    Vip: [Number],
    AG: [Number],
    version: [Number],
    os: Number, // 0: không quan tâm, 1: iOS, 2: android
    requirePayment: Number,
    priority: Number,
    videoWatched: [Number],
    vipchange: [Number],
    st1_stake: [Number],
    st1_game: [Number],
    showDaily: [],
    date: { type: Date, index: true },
    dexp: { type: Date, index: true },
    url: String,
    urllink: String,
    countBtn: Number,
    arrValue: [Number],
    arrBonus: [Number],
    arrUrlBtn: [String],
    arrTypeBtn: [String],
    arrPos: [],
    result: {}
});

exports.BannerV2 = mongoose.model('BannerV2', {
    app: { type: String, index: true },
    type: Number,
    url: String,
    arrButton: [
        // {
        // "type": "sms",
        // "btn": "http://siamplayth.com/mconfig/banner/button/btn_sms.png",
        // "pos": [-0.3, -0.3],
        // "ctype": 1,
        // "ccost": 10000,
        // "btype": 0,
        // "bvalue": 200,
        // "value": "40K Gold",
        // "bonus": "+80K Chip",
        // "cost": "10K VND",
        // "syntax": "mw 10000 teen NAP 52fun-ann2009-1",
        // "add": "+9029",
        // "comment": "nạp Gold, 10K VND, được 40k Gold, bonus Chip "
        // }
    ],
    title: String,
    note: String,
    date: { type: Date, index: true },
    dexp: { type: Date, index: true },
    showLimit: Number,
    os: Number,
    requirePayment: Number,
    videoWatched: [Number],
    priority: Number,
    showType: 0,
    vipchange: [Number],
    st1_stake: [Number],
    st1_game: [Number],
    showDaily: [Array],
    version: [Number],
    AG: [Number],
    Vip: [Number],
    LQ: [Number]
});

exports.GPReport = mongoose.model('GPReport', {
    date: { type: Date, index: true },
    gpid: Number,
    title: String,
    result: {}
});
