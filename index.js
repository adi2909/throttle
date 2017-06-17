
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
        console.log("New config loaded - percentRequests = " + config.percentRequests);
    });
}, 5000);

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

    if (counter * config.percentRequests >= 1) {
        obj.response = "yes";
        obj.count = counter;
        obj.message = '';
        counter = 0;
    }
    counter++;
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
        message: ''
    };

    if (err) {
        console.log(err);
        return defConfig
    } else {
        try {
            return JSON.parse(data);
        } catch(e) {
            console.log("ERROR reading config file");
            return defConfig;
        }
    }
}
