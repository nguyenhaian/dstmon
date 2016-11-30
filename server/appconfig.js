var request = require('request');
var _ = require('lodash');

var clientsname = ["3C", "52fun", "dautruong", "UWin", "siam", "indo", "hilosea"];
var paymentconfigurl = [
    "http://mobile.tracking.88club.org/paymentconfig.json",
    "http://mobile.tracking.88club.org/paymentconfig.json",
    "http://mobile.tracking.88club.org/paymentconfig.json",
    "http://mobile.tracking.88club.org/paymentconfig.json",
    "http://mobile.tracking.88club.org/paymentconfig.json",
    "http://mobile.tracking.88club.org/paymentconfig.json",
    "http://mobile.tracking.88club.org/paymentconfig.json"
];


exports.socketapp = "http://app.dstmon.space";
exports.manapp = "http://man.dstmon.space";
exports.socketclients = ["client3C", "client52", "clientdt", "clientuwin", "clientsiam", "clientindo", "clienthilosea"];
exports.clientsname = clientsname;
exports.paymentconfigurl = paymentconfigurl;
exports.add_getac = 'https://api.sendpulse.com/oauth/access_token';
exports.add_sendmail = 'https://api.sendpulse.com/smtp/emails';
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
    paymentconfigurl.map(function(url, index) {
        var appname = clientsname[index];
        if (!_.has(appconfig, appname)) {
            appconfig[appname] = {};
        }
        request(url, function(error, response, data) {
            if (!error && response.statusCode == 200) {
                try {
                    data = JSON.parse(data);
                    appconfig[appname].paymentconfig = data;
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
