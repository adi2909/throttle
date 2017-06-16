
"use strict";

var http = require('http');
var express = require('express');
var app = express();
var argv = require('minimist')(process.argv.slice(2));
var config = require('./config.js');

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


