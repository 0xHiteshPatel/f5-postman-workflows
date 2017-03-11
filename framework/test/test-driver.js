var newman = require('newman');
var fs = require('fs');
var jsonfile = require('jsonfile');

var check = '\u2714';
var cross = '\u2717';
var fgred = '\x1b[31m';
var orig  = '\x1b[0m';

var origStdout = process.stdout.write;
var exitCode = 0;

var main = function() {

	var tests = [];
	//var results = {};
	var failures = {};

	console.log("Running tests, watch ./test_results.log for details...\n");
	var writeStream = fs.createWriteStream('./test_results.log', {
		encoding: 'utf8',
		flags: 'w'
	});

	process.stdout.write = function(chunk, encoding, callback) {
	    writeStream.write(chunk, encoding, callback);
	};

	var newmanCallback = function(err, summary) {
		process.stdout.write = origStdout;

		summary.run.executions.forEach(function(e) {
			if(e.item.name == '_F5_POLL_DELAY') {
				return;
			}

			if(tests.indexOf(e.item.name) == -1) {
				tests.push(e.item.name);
				failures[e.item.name] = 0;
			}
		});

		summary.run.failures.forEach(function(f) {
			if(f.error.message.indexOf('[Tester] All Tests Passed') > -1) {
				failures[f.source.name] = 1;
			}
		});

		console.log("Result\tTest Name");
		console.log('\u2500'.repeat(60));

		tests.forEach(function(t) {
			if(failures[t]) {
				console.log(fgred + cross + "\t" + t + orig);
				exitCode = 1;
			} else {
				console.error(check + "\t" + t);
			}
		});

		process.exit(exitCode);
	};

	var options = {
		collection: require('../../F5_Postman_Workflows.postman_collection.json'),
		globals: require('../f5-postman-workflows.postman_globals.json'),
		environment: {},
		folder: "Tests",
		insecure: true,
		suppressExitCode: true,
		reporters: ["cli","json"],
		reporter: {
			json: { export: './test_results.json' }
		},
		bail: false,
		noColor: true
	}

	newman.run(options, newmanCallback)
		.on('start', function (err, args) { // on start of run, log to console
	    	console.log('runTest: running Tests folder');
		});

};

main();

