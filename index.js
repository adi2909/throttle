
"use strict";

/**
 * IMPORTS
 */
const fs = require('fs');
const http = require('http');
const express = require('express');
const app = express();
const argv = require('minimist')(process.argv.slice(2));
const bodyParser = require('body-parser');

/**
 * Pass the port using the -port switch
 */
const port = argv.port || 1337;
const RELOAD_MS = 60000;

/**
 * Load config on startup, then set a timer to reload the config every RELOAD_MS
 */
let config = loadConfig();  // load async first time
console.log("CONFIG");
console.log(config);

setInterval(() => {
    loadConfig((err, data) => {
        config = data;
        console.log ("New config loaded", config);
        //console.log("New config loaded - serving " + config.numerator + " out of " + config.denominator + " requests.");
    });
}, RELOAD_MS);

/**
 * Set up bodyParser to make it easy to read url paramaters
 */
app.use(bodyParser.urlencoded({ extended: false }));


/*********************************************************
 *  ROUTES
 *
 *  /mayi
 *  TODO: support POST as well for cache busting
 *
 *  Add specific configs here, if an unknown path is used
 *  then the default config is used
 *
 *  URL PARAMATERS
 *
 *  delay=<delay in ms> - this will delay the response for testing circuit breakers on client
 *  status=<http status code> - this will return back the provided status for client side testing
 *
*/

app.get('/mayi', function(req, res) {
    return processRequest(req, res, config.default);
});

app.post('/mayi', function(req, res) {
    return processRequest(req, res, config.default);
});

app.get('/mayi/sync', function(req, res) {
    if (config.sync) {
        return processRequest(req, res, config.sync);
    } else {
        return processRequest(req, res, config.default);
    }
});
app.post('/mayi/sync', function(req, res) {
    if (config.sync) {
        return processRequest(req, res, config.sync);
    } else {
        return processRequest(req, res, config.default);
    }
});

app.get('/mayi/polling', function(req, res) {
    if (config.polling) {
        return processRequest(req, res, config.polling);
    } else {
        return processRequest(req, res, config.default);
    }
});
app.post('/mayi/polling', function(req, res) {
    if (config.polling) {
        return processRequest(req, res, config.polling);
    } else {
        return processRequest(req, res, config.default);
    }
});

app.get('/syncRecommendation', function(req, res) {

    let retObj = config.syncRecommendation || { earliestDate : null, monthsToSync: null };
    if (config.syncRecommendation) {
        retObj = {
            earliestDate: config.syncRecommendation.earliestDate,
            monthsToSync: config.syncRecommendation.monthsToSync
        }
    }
    return writeAPIResponse(null, retObj, req, res);
});
app.post('/syncRecommendation', function(req, res) {

    let retObj = config.syncRecommendation || { earliestDate : null, monthsToSync: null };
    if (config.syncRecommendation) {
        retObj = {
            earliestDate: config.syncRecommendation.earliestDate,
            monthsToSync: config.syncRecommendation.monthsToSync
        }
    }
    return writeAPIResponse(null, retObj, req, res);
});

app.get('/mayi/*', function(req, res) {
    return processRequest(req, res, config.default);
});
app.post('/mayi/*', function(req, res) {
    return processRequest(req, res, config.default);
});

/**
 * LISTENER for the server
*/
var httpServer = http.createServer(app).listen(port);

console.log('Server running at http://' + (port || '*')
    + ':' +  port);


/***************************************************
 * processRequest
 *
 * @param req - request object
 * @param res - response object
 * @param configRecord - specific config record for request identifier based on route
 */
function processRequest(req, res, configRecord) {

    let forceDelay = 0;

    /**
     * Process delay paramater, if set, delay the response
     */
    if (req.query.delay) {
        forceDelay = parseInt(req.query.delay);
    }

    setTimeout(() => {
        const obj = {response: "no", count: configRecord.counter};
        obj.message = configRecord.rejectionMessage;

        if (configRecord.counter < configRecord.numerator) {
            obj.response = "yes";
            obj.count = configRecord.counter;
            obj.message = '';
        }
        configRecord.counter++;
        if (configRecord.counter >= configRecord.denominator) {
            configRecord.counter = 0;
        }
        writeAPIResponse(null, obj, req, res);
    }, forceDelay);
}


/****************************************************
 * SUPPORT FUNCTIONS
 */

function writeAPIResponse(err, jsObj, req, res) {
    var retObj = {};

    /**
     * If status param is set, return the provided status instead of the proper response
     */
    if (req.query.status) {
        res.writeHead(parseInt(req.query.status), {"Content-Type": "application/json"});
    } else if (err) {
        res.writeHead(400, {"Content-Type": "application/json"});
        res.write(JSON.stringify({ error: "Bad Request" }));
	} else {
		retObj.response = jsObj;
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retObj));
    }

    console.log("SENDING API RESULTS ");

    res.end();
}

/**
 * loadConfig
 *
 * @param cb - optional callback when completed, otherwise processed as sync
 * @returns nothing if async, otherwise returns the config object
 */
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

/**
 * processConfig
 *
 * @param err - since this may be called as a return from readFile, may contain a file read error
 * @param data - the config data read in from the config.json file
 * @returns the configuration object as defined in config.json, or the default config object if something goes wrong
 */
function processConfig(err, data) {

    let defConfig = {
        default: {
            percentRequests: 1,
            numerator: 1,
            denominator: 1,
            message: '',
            counter: 0,
        },
    };

    if (err) {
        console.log('ERROR reading config file');
        console.log(err);
        return defConfig
    } else {
        try {
            const cfgObj = JSON.parse(data);
            for (let key in cfgObj) {
                const numerator = Math.min(100, cfgObj[key].percentRequests * 100);
                const denominator = 100;
                const frac = reduce(numerator, denominator);
                cfgObj[key].numerator = frac[0];
                cfgObj[key].denominator = frac[1];
                cfgObj[key].counter = 0;
            }
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
