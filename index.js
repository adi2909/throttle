
"use strict";

var http = require('http');
var express = require('express');
var app = express();

var bodyParser = require('body-parser');

// Our algorithm is simple, we let 1 out of THROTTLE_MAX people in the door
// if THROTTLE_MAX is 0 or 1, then everyone comes through.

var counter = 0;


// bodyParser middleware for parsing req paramaters and making them easily avaialble
app.use(bodyParser.urlencoded({ extended: false }));


//--------------------------------------------------------
// /mayi
//--------------------------------------------------------
app.get('/mayi', function(req,res) {

    let answer = "yes";

    if (counter <= THROTTLE_MAX) {
        answer = "yes"
        counter = 0;
    }
    counter++;
	renderPage(req, res, "validate");
});

//--------------------------------------------------------
// LISTENER for the server
//--------------------------------------------------------
var httpServer = http.createServer(app).listen(80);

console.log('Server running at http://' + (80 || '*')
		+ ':' +  80);

//============================================================================================
// SUPPORT FUNCTIONS
//============================================================================================

//--------------------------------------------------------
// renderPage
//
// Helper function to render a view/page, and centralize
// some housekeeping
//--------------------------------------------------------
function renderPage(req, res, page) {

    const obj={response: "yes"};
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


