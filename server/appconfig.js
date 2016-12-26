var request = require('request');
var _ = require('lodash');

var apps = [{
    name: "3C",
    paymentconfigurl: "http://mobile.tracking.88club.org/paymentconfig.json",
    socketnamespace: "client3C"
}, {
    name: "52fun",
    paymentconfigurl: "http://mobile.tracking.52fun.club/paymentconfig.json",
    socketnamespace: "client52"
}, {
    name: "dautruong",
    paymentconfigurl: "http://mobile.tracking.52fun.club/paymentconfig.json",
    socketnamespace: "clientdt"
}, {
    name: "UWin",
    paymentconfigurl: "http://mobile.tracking.88club.org/paymentconfig.json",
    socketnamespace: "clientuwin"
}, {
    name: "siam",
    paymentconfigurl: "http://mobile.tracking.88club.org/paymentconfig.json",
    socketnamespace: "clientsiam"
}, {
    name: "indo",
    paymentconfigurl: "http://mobile.tracking.88club.org/paymentconfig.json",
    socketnamespace: "clientindo"
}, {
    name: "hilosea",
    paymentconfigurl: "http://mobile.tracking.88club.org/paymentconfig.json",
    socketnamespace: "clienthilosea"
}];

exports.apps = apps;

exports.socketapp = "http://203.162.166.20:3000";
exports.manapp = "http://203.162.166.20:3001";
exports.port_app = 3000;
exports.port_man = 3001;

exports.mongodbConnection = 'mongodb://localhost/CustomerMonitor';

exports.onesignalAuthKey = 'NGMzODk0ODQtMzE0Ni00N2Y5LWE3YmMtZDU1MjVkZDQ5ZTUz';
exports.onesignalAppID = "0a8074bb-c0e4-48cc-8def-edd22ce17b9d";

exports.sp_client_id = '081e09eb142aa9db1499fa10870dc4b2';
exports.sp_client_secret = '18ff0e52f7aa496a0153609ff2fce9ef';
exports.add_getac = 'https://api.sendpulse.com/oauth/access_token';
exports.add_sendmail = 'https://api.sendpulse.com/smtp/emails';
exports.sp_mailfrom = 'nguyenhaian@outlook.com';
exports.maillist = [{
    name: "An Nguyen",
    email: "nguyenhaian1412@gmail.com"
}, {
    name: "Hoan LV",
    email: "hoanlv1989@gmail.com"
}, {
    name: "Nguyen Trung Hieu",
    email: "nthieu@athena.vn"
}, {
    name: "Nguyen Duc Viet",
    email: "vietnd@athena.vn"
}, {
    name: "Ho Hai Phuc",
    email: "Haplavn@gmail.com"
}, {
    name: "Vu Manh Duy",
    email: "duyvumanh@gmail.com"
}, {
    name: "Tiến Tu Ti",
    email: "dovantien181193@gmail.com"
}];
exports.maillist2 = [{
    name: "An Nguyen",
    email: "nguyenhaian1412@gmail.com"
}];
exports.threshold = {
    "lastccus": 19,
    "percentloginfailed": 0.45,
    "loginSuccessMin": 100,
    "percentccudownrate": 0.25,
    "minavgccu1": 12,
    "minavgccu2": 40,
    "raiseRate": 2.5,
    "minDurationSentNotify": 18
};
exports.domains = {
    "servergame14_club": "203_162_166_14",
    "servergame104_club": "203_162_166_46",
    "servergame003_club": "203_162_166_104"
};
exports.gamesbyid = {
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
exports.sdisid = [2873, 2923];

exports.loadpaymentconfig = function(appconfig) {
    apps.map(function(cfapp) {
        var appname = cfapp.name;
        if (!_.has(appconfig, 'paymentconfig')) {
            appconfig['paymentconfig'] = {};
        }
        request(cfapp.paymentconfigurl, function(error, response, data) {
            if (!error && response.statusCode == 200) {
                try {
                    data = JSON.parse(data);
                    appconfig.paymentconfig[appname] = data;
                    // console.log(Object.keys(data));
                } catch (e) {
                    console.log("loadpaymentconfig err exception ", e);
                }
            } else {
                console.log("loadpaymentconfig err");
            }
        });
    });
}
