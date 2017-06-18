
"use strict";

var fs = require('fs');
var http = require('http');
var express = require('express');
var app = express();
var argv = require('minimist')(process.argv.slice(2));

var config = loadConfig();  // load async first time
console.log("CONFIG");
console.log(config);

setInterval(function() {
    loadConfig(function(err, data) {
        config = data;
        console.log("New config loaded - serving " + config.numerator + " out of " + config.denominator + " requests.");
    });
}, 60000);

var bodyParser = require('body-parser');

// Our algorithm is simple, we let 1 out of THROTTLE_MAX people in the door
// if THROTTLE_MAX is 0 or 1, then everyone comes through.

var counter = 0;
var port = argv.port || 1337;

// bodyParser middleware for parsing req paramaters and making them easily avaialble
app.use(bodyParser.urlencoded({ extended: false }));


//--------------------------------------------------------
// /mayi
// will support POST as well for cache busting
//
//--------------------------------------------------------
app.get('/mayi', function(req, res) {

    const obj={response: "no", count: counter};
    obj.message = config.rejectionMessage;

    if (counter < config.numerator) {
        obj.response = "yes";
        obj.count = counter;
        obj.message = '';
    }
    counter++;
    if (counter >= config.denominator) {
        counter = 0;
    }
	renderPage(obj, res, "validate");
});

//--------------------------------------------------------
// LISTENER for the server
//--------------------------------------------------------
var httpServer = http.createServer(app).listen(port);

console.log('Server running at http://' + (port || '*')
		+ ':' +  port);

//============================================================================================
// SUPPORT FUNCTIONS
//============================================================================================

//--------------------------------------------------------
// renderPage
//
// Helper function to render a view/page, and centralize
// some housekeeping
//--------------------------------------------------------
function renderPage(obj, res, page) {
    writeAPIResponse(null, obj, res);
}

//--------------------------------------------------------
// writeAPIResponse
//
function writeAPIResponse(err, jsObj, res) {
    var retObj = {};

    if (err) {
        res.writeHead(400, {"Content-Type": "application/json"});
        res.write({error: "Bad Request"});

	} else {
		retObj.response = jsObj;
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retObj));
    }

    console.log("SENDING API RESULTS ");

    res.end();
}

//--------------------------------------------------------
// loadConfig
//
function loadConfig(cb) {

    if (cb) {
        fs.readFile('./config.json', function(err, data) {
            cb(null, processConfig(err, data));
        });
    } else {
        var data = fs.readFileSync('./config.json');
        return processConfig(null, data);
    }
}

//--------------------------------------------------------
// processConfig
//
function processConfig(err, data) {

    var defConfig = {
        percentRequests: 1,
        numerator: 1,
        denominator: 1,
        message: ''
    };

    if (err) {
        console.log('ERROR reading config file');
        console.log(err);
        return defConfig
    } else {
        try {
            var cfgObj = JSON.parse(data);
            var numerator = Math.min(100, cfgObj.percentRequests*100);
            var denominator = 100;
            var frac = reduce(numerator, denominator);
            cfgObj.numerator = frac[0];
            cfgObj.denominator = frac[1];
            return cfgObj;
        } catch(e) {
            console.log("ERROR reading config file");
            return defConfig;
        }
    }
}

//--------------------------------------------------------
// reduce -  https://stackoverflow.com/questions/4652468/is-there-a-javascript-function-that-reduces-a-fraction
//
function reduce(numerator,denominator){
    var gcd = function gcd(a,b){
        return b ? gcd(b, a%b) : a;
    };
    gcd = gcd(numerator,denominator);
    return [numerator/gcd, denominator/gcd];
}
