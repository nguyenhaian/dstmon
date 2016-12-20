var mongoose = require('mongoose')
var models = require('./models.js')

mongoose.connect('mongodb://localhost/CustomerMonitor');

var rule = new models.BannerShowLimitRule({
    date: Date(),
    ruleNumber: 1,
    description: 'test rule',
    limit: 1
});

console.log("start");
rule.save(function(err, logDoc) {
	console.log("on return");
    if (err) {
        return console.error(err) 
    };
    console.log('+rule');
});
