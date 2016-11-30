var request = require('request');
var _ = require('lodash');

request('http://mobile.tracking.88club.org/paymentconfig.json', function(error, response, data) {
    if (!error && response.statusCode == 200) {
        try {
            data = JSON.parse(data);
            console.log(Object.keys(data));
        } catch (e) {
            console.log("err ", err);
        }

    } else {
        console.log("err ", err);
    }
})
