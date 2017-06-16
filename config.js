

// what % of requests do we let through?  number between 0 and 1.
var PCT_REQUESTS = .25;
var reject = "Quicken is experiencing unusually high loads right now, please try again in 5 minutes";

module.exports = { percentRequests: PCT_REQUESTS, rejectionMessage: reject }