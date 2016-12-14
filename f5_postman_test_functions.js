/**
 * @file Implement framework to create workflows with Postman collections
 * @author Hitesh Patel, F5 Networks
 * @version 1.0
 *
 * To use these functions you should:
 *  1) Minify this file
 *  2) Take the resulting string and populate the _f5_test_functions global var
 *     in Postman
 *  3) Add 'eval(postman.getGlobalVariable("_f5_test_functions"));' to the test
 *     script in your request
 *
 * A node script is include to auto-generate an importable global environment
 * file to Postman:
 *  $ node gen_postman_global.js
 *
 * The following global environment variables can be used for configuration:
 *
 *  _f5_debug {1|0}               - Enable/disable debug output
 *  _f5_enabled_polled_mode {1|0} - Enable/disable polled mode.  Will mark all
 *                                  tests as successful.  Pass/fail is state is
 *                                  shown in test name text.
 *  _f5_poll_max_tries {Integer}  - The max number of polls
 *  _f5_poll_wait {Integer}       - The time in seconds to wait between polls
 *  _f5_poll_useinternal {1|0}    - Use the internal while() loop to sleep
 *                                  (WARNING: this will block the thread)
 *  _f5_poll_apiurl {String}      - The URL for an API endpoint that implements
 *                                  a delay
 *
 * f5_populate_env_vars JSON param schema
 * @typedef  {Array}      f5_populate_env_vars.vars - JSON schema
 *  @property {Object}
 *   @property {String}   name      - Name of the environment variable to
 *                                    populate
 *   @property {String|Function} value - 1) Name of the response JSON attribute
 *                                       2) function(json) {} that returns value
 *                                          or undefined
 * f5_check_response JSON param schema
 * @typedef  {Array}      f5_check_response.vars - JSON schema
 *  @property {Object}
 *   @property {String}   name     - Name of the JSON attribute to use for
 *                                   comparison
 *   @property {String|Function} value - 1) Value that {name} should be
 *                                       2) function(json) {} for
 *                                          customization.  Should return
 *                                          boolean indicating pass/fail.
 */

/**
 *
 * @function f5_populate_env_vars
 * @param {f5_populate_env_vars.vars} vars
 * @returns null
 * @desc Populate Postman environment variables from a JSON formatted response.
 * Boolean test items are populated as follows:
 *
 */
function f5_populate_env_vars(vars) {
    var poll = parseInt(postman.getGlobalVariable("_f5_enable_polled_mode"),10);

    if(!f5_check_response_code()) {
        f5_debug("response code bad, next is null");
        if(!poll && !parseInt(postman.getGlobalVariable("_f5_poll_bypass_timeout"),10)) {
            postman.setNextRequest(null);
        }
        return;
    }

    var json = JSON.parse(responseBody);
    for (var i = 0; i < vars.length; i++) {
        var test_name = '[Populate Variable] ' + vars[i].name;

        f5_debug("name=" + vars[i].name);

        if (typeof vars[i].value === 'function') {
            f5_debug("running custom function");
            var ret = vars[i].value(json);

            if (ret !== undefined) {
                f5_set_test_result(test_name, 1, ret);
                postman.setEnvironmentVariable(vars[i].name, ret);
            }
            else {
                f5_set_test_result(test_name, 0, undefined);
                postman.setEnvironmentVariable(vars[i].name, "");
            }
        } else if(vars[i].value in json) {
            f5_debug("found attribute");
            postman.setEnvironmentVariable(vars[i].name, json[vars[i].value]);
            f5_set_test_result(test_name, 1, json[vars[i].value]);
        } else {
            f5_debug("did not find attribute");
            f5_set_test_result(test_name, 0, undefined);
            if(!poll && !parseInt(postman.getGlobalVariable("_f5_poll_bypass_timeout"),10)) {
                postman.setNextRequest(null);
            }
        }
    }
    return;
}

/**
 *
 * @function f5_check_response
 * @param {f5_check_response.vars} vars
 * @returns null
 * @desc Check HTTP response code and JSON response body.
 *
 */
function f5_check_response(vars) {
    var poll = parseInt(postman.getGlobalVariable("_f5_enable_polled_mode"),10);

    if(vars === undefined) {
        f5_check_response_code();
        return;
    }

    if (!f5_check_response_code()) {
        f5_debug("response code bad, next is null");
        if(!poll && !parseInt(postman.getGlobalVariable("_f5_poll_bypass_timeout"),10)) {
            postman.setNextRequest(null);
        }
        return;
    }

    var json = JSON.parse(responseBody);
    for (var i = 0; i < vars.length; i++) {
        var check_test_name = "[Check Value] " + vars[i].name;
        if (vars[i].name in json) {
            f5_set_test_result("[Current Value] " + vars[i].name, 1, json[vars[i].name]);
        }

        if (typeof vars[i].value === 'function') {
            f5_debug("running custom function");
            var ret = vars[i].value(json);

            if (ret) {
                f5_set_test_result(check_test_name, 1, '[custom function]');
            }
            else {
                f5_set_test_result(check_test_name, 0, '[custom function]');
            }
        } else {
            var match = (json[vars[i].name] == vars[i].value);
            f5_set_test_result(check_test_name, match, vars[i].value);
        }
    }
    return;
}

/**
 *
 * @function f5_poll_until_all_tests_pass
 * @param {String} next  - The Item in the Postman Collection to execute once
 *                         all tests pass
 * @param {String} curr  - [Optional] The name of the current Item.  Normally
 *                         auto-populated with current Item name
 * @returns null
 * @desc Implements a polling mechanism in Postman/Collection Runner/Newman.
 *
 * The following Postman global environment variables are used for config:
 *  _f5_poll_max_tries:   The max number of polls
 *  _f5_poll_wait:        The time in seconds to wait between polls
 *  _f5_poll_useinternal: Use the internal while() loop to sleep (WARNING: this
 *                        will block the thread)
 *  _f5_poll_apiurl:      The URL for an API endpoint that implements a delay
 *  _f5_poll_bypass_timeout: Bypass a poller timeout and continue instead of exit
 *
 * The following Postman global environment variables are used for runtime
 * execution:
 *  _f5_poll_interator: The current iterator value
 *  _f5_poll_curr:      Name of the current Item in the Postman Collection
 *
 * When using the external delay mechanism (_f5_poll_apiurl) this function
 * expects a Item in the Collection named '_F5_POLL_DELAY'.  This Item will be
 * shimmed into the execution flow and that Item will them callback into
 * the {curr} item to retry.
 *
 * If _f5_poll_max_tries is reached then '[Poller] Max Tries Reached' test will
 * be marked as FAIL.  If _f5_poll_bypass_timeout is NOT set the next request
 * will be set to NULL to stop execution, otherwise execution will continue.
 *
 */
function f5_poll_until_all_tests_pass(next, curr) {
    if (curr === undefined) {
        curr = request.name;
    }

    f5_debug("curr=" + curr);
    f5_debug("next=" + next);
    f5_debug("_f5_poll_max_tries=" +
        postman.getGlobalVariable("_f5_poll_max_tries"));
    f5_debug("_f5_poll_iterator=" +
        postman.getGlobalVariable("_f5_poll_iterator"));

    if (f5_all_tests_passed() === 1) {
        f5_debug("tests passed, next is '" + next + "'");
        postman.setGlobalVariable("_f5_poll_iterator", "1");
        postman.setNextRequest(next);
        return;
    }
    if (parseInt(postman.getGlobalVariable("_f5_poll_iterator"), 10) >=
        parseInt(postman.getGlobalVariable("_f5_poll_max_tries"), 10)) {
        f5_debug("reached max_tries, next is null");
        tests['[Poller] Max Tries Reached'] = 0;
        postman.setGlobalVariable("_f5_poll_iterator", "1");
        if (!parseInt(postman.getGlobalVariable("_f5_poll_bypass_timeout"), 10)){
            postman.setNextRequest(null);
        }
        return;
    }
    if (parseInt(postman.getGlobalVariable("_f5_poll_iterator"), 10) !=
        parseInt(postman.getGlobalVariable("_f5_poll_max_tries"), 10)) {
        f5_debug("tests NOT passed, trying again");
        var i = parseInt(postman.getGlobalVariable("_f5_poll_iterator"), 10);
        i++;
        postman.setGlobalVariable("_f5_poll_iterator", i);

        f5_debug("useinternal=" + parseInt(postman.getGlobalVariable("_f5_poll_useinternal"), 10));
        if(parseInt(postman.getGlobalVariable("_f5_poll_useinternal"), 10)===1){
            f5_debug("using internal sleep");
            f5_sleep(parseInt(postman.getGlobalVariable("_f5_poll_wait"), 10)*1000)
            postman.setNextRequest(curr);
            postman.setGlobalVariable("_f5_poll_curr", "");
        } else {
            f5_debug("using external sleep");
            postman.setGlobalVariable("_f5_poll_curr", curr);
            postman.setNextRequest("_F5_POLL_DELAY");
        }
    }
}

/**
 *
 * @function f5_all_tests_passed
 * @returns {Boolean}
 * @desc Iterates thru the Postman tests[] array and determines if all specified
 * tests have failed or passed.  The function will account for both polled and
 * non-polled requests
 *
 */
function f5_all_tests_passed() {
    for (var test in tests) {
        if(test.startsWith("[Polled]") && test.endsWith("[FAIL]")) {
            f5_debug("polled test '" + test + "' not passed, return 0");
            return 0;
        }
        if(tests[test] === 0) {
            f5_debug("test '" + test + "' not passed, return 0");
            return 0;
        }
    }
    f5_debug("all passed, return 1");
    return 1;
}

/**
 *
 * @function f5_check_response_code
 * @param {Integer} mode - If defined a '404' response code will be added to the
 *                         okCodes for a HTTP GET
 * @returns {Integer} - 1 if response code is in okCodes[{http.method}], 2 if
 *                      response code is 2xx, 0 if other
 * @desc Checks the response code of the request and determines success based on
 * the HTTP method and the valid reponse codes in the okCodes object.
 *
 * Polled Mode (all tests marked passing, poller throws error):
 *  polled_response_code_{code}_[pass|fail]: Indicates pass/fail of test
 * Non-polled Mode:
 *  response_code_{code}_[pass|fail]: Indicates pass/fail of test
 *
 */
function f5_check_response_code(mode) {
    okCodes = {
        "GET":[200,204],
        "POST":[200,201,202],
        "PUT":[200,202],
        "PATCH":[200,202],
        "DELETE":[200,202,204]
    };

    if (mode !== undefined) {
        f5_debug("got mode, adding 404 to GET okCodes");
        okCodes.GET.push(404);
    }

    var test_name = "[" + request.method + " Response Code]";

    if (request.method in okCodes &&
        okCodes[request.method].indexOf(responseCode.code) > -1) {
        f5_debug("response code in okCodes, return 1");
        f5_set_test_result(test_name, 1, responseCode.code);
        return 1;
    }

    if (responseCode.code >= 200 && responseCode.code < 300) {
        f5_debug("response code was 2xx, return 2");
        f5_set_test_result(test_name, 1, responseCode.code);
        return 2;
    }

    f5_set_test_result(test_name, 0, responseCode.code);
    f5_debug("response code bad, return 0");
    return 0;
}

/**
 *
 * @function f5_set_test_result
 * @param {String} name - Base name of the test
 * @param {Boolean} result - True result of the test
 * @param {String} value - The value to convey in the test name
 * @desc Builds and populates the tests[] object with a test result.  When
 * running in non-polled mode the true test result will be set for the test.
 * When running in polled mode the test result with be conveyed as part of the
 * test name (PASS|FAIL) and the test will be marked successful to allow poller
 * to work correctly.
 *
 */
function f5_set_test_result(name, result, value) {
    if(value !== undefined) {
        if(typeof value === 'object') {
            value = JSON.stringify(value);
        }
        test_name = name + '=' + value;
    } else {
        test_name = name;
    }

    if(!parseInt(postman.getGlobalVariable("_f5_enable_polled_mode"),10)) {
        tests[test_name] = result;
        return;
    }

    if(result) {
        tests["[Polled]" + test_name + " [PASS]"] = 1;
    } else {
        tests["[Polled]" + test_name + " [FAIL]"] = 1;
    }
}

/**
 *
 * @function f5_debug
 * @param {String} msg - The message to log
 * @desc Prepends the function name and dumps the message to
 * console.log().  The Postman global variable '_f5_debug' is used to toggle
 * debug output.
 *
 */
function f5_debug(msg) {
    if(postman.getGlobalVariable("_f5_debug") == "1") {
        console.log('[' + arguments.callee.caller.name + '] ' + msg);
    }
}

/**
 *
 * @function f5_clear_runtime_vars
 * @desc Sets any Postman env variables with names starting
 * with '_rt_' to a blank value.  The 'cleared_runtime_env_vars' test is set
 * to provide feedback
 *
 */
function f5_clear_runtime_vars() {
    var envKeys = Object.keys(environment);
    for(var i = 0; i < envKeys.length; i++) {
        if(envKeys[i].startsWith("_rt_")) {
            f5_debug("clearing env variable: " + envKeys[i]);
            postman.setEnvironmentVariable(envKeys[i], "");
        }
    }
    tests["[Cleared Runtime Env Vars]"] = 1;
}

/**
 *
 * @function f5_poll_next
 * @desc This function is called from the '_F5_POLL_DELAY' item to retry the
 * entry item for a polled request.
 *
 */
function f5_poll_next() {
    f5_debug("_f5_poll_curr=" + globals._f5_poll_curr)

    if(f5_check_response_code()) {
        postman.setNextRequest(globals._f5_poll_curr);
    } else {
        postman.setNextRequest(null);
    }
    postman.setGlobalVariable("_f5_poll_curr", "");
}

/**
 *
 * @function f5_sleep
 * @desc Implements a thread-blocking sleep.
 * @param {Integer} time - The time to sleep in milliseconds
 *
 */
function f5_sleep (time) {
    f5_debug("sleeping for " + time);
    var now = new Date().getTime();
    while(new Date().getTime() < now + time){ }
}

/**
 *
 * @function f5_test_check
 * @desc Checks the current set of tests[] against a reference set
 * @param {Array} test_state
 *  @param {String} test name
 *  @param {Boolean} desired end state
 *
 */
function f5_test_check(test_state) {
    for (var i in test_state) {
        if(tests[test_state[i][0]] !== test_state[i][1]) {
            f5_set_test_result('[Tester] All Tests Passed', 0, undefined);
            if(!parseInt(postman.getGlobalVariable("_f5_enable_polled_mode"),10)) {
                postman.setNextRequest(null);
            }
            return;
        }
    }
    f5_set_test_result('[Tester] All Tests Passed', 1, undefined);
}

/**
 *
 * @function f5_test_state_generate
 * @desc A helper function that generates a final test state array and dumps
 * the text to the console
 *
 */
function f5_test_state_generate() {
    var state_gen = "var test_state = [\\n"
    for (var test in tests) {
        state_gen += "\\t\\t['" + test + "', " + tests[test] + "],\\n";
    }
    state_gen += "\\t];\\n";
    console.log(state_gen);
}

