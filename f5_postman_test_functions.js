function f5_populate_env_vars(vars) {
    if(parseInt(postman.getGlobalVariable("f5_enable_polled_mode")) === 1) {
        f5_populate_env_vars_polled(vars);
    } else {
        f5_populate_env_vars_nonpolled(vars);
    }
}

function f5_populate_env_vars_nonpolled(vars) {
    if(!f5_check_response_code()) {
        f5_debug("response code bad, next is null");
        postman.setNextRequest(null);
        return;
    }

    var json = JSON.parse(responseBody);
    for (var i = 0; i < vars.length; i++) {
        var test_name = 'populate_' + vars[i].name + '_variable';
        if (vars[i].itemindex >= 0) {
            jsontemp = json.items[vars[i].itemindex];
        } else {
            jsontemp = json;
        }
        tests[vars[i].value + '_attribute_present'] = 0;
        tests[test_name] = 0;

        if (vars[i].value in jsontemp) {
            tests[vars[i].value + '_attribute_present'] = 1;
            if ("function" in vars[i]) {
                postman.setEnvironmentVariable(vars[i].name, vars[i].function(jsontemp[vars[i].value]));
            } else {
                postman.setEnvironmentVariable(vars[i].name, jsontemp[vars[i].value]);
            }
            tests[test_name] = 1;
        } else {
            postman.setNextRequest(null);    
        }
    }
    return;
}

function f5_populate_env_vars_polled(vars) {
    if(!f5_check_response_code()) {
        f5_debug("response code bad, next is null");
        postman.setNextRequest(null);
        return;
    }

    var json = JSON.parse(responseBody);
    for (var i = 0; i < vars.length; i++) {
        var test_name = 'polled_populate_' + vars[i].name + '_variable';
        if (vars[i].itemindex >= 0) {
            jsontemp = json.items[vars[i].itemindex];
        } else {
            jsontemp = json;
        }
        
        if (vars[i].value in jsontemp) {
            tests['polled_' + vars[i].value + '_attribute_present_pass'] = 1;
            if ("function" in vars[i]) {
                postman.setEnvironmentVariable(vars[i].name, vars[i].function(jsontemp[vars[i].value]));
            } else {
                postman.setEnvironmentVariable(vars[i].name, jsontemp[vars[i].value]);
            }
            tests[test_name] = 1;
        } else {
            tests['polled_' + vars[i].value + '_attribute_present_fail'] = 1;
        }
    }
    return;
}

function f5_check_response(vars) {
    if(parseInt(postman.getGlobalVariable("f5_enable_polled_mode")) === 1) {
        f5_check_response_polled(vars);
    } else {
        f5_check_response_nonpolled(vars);
    }
}

function f5_check_response_nonpolled(vars) {
    if (!f5_check_response_code()) {
        f5_debug("response code bad, next is null");
        postman.setNextRequest(null);
        return;
    }
    
    var json = JSON.parse(responseBody);
    
    for (var i = 0; i < vars.length; i++) {
        var test_name = vars[i].name + '_is_' + vars[i].value;
        tests[vars[i].name + '_val_' + json[vars[i].name]] = 1;
        
        tests[test_name] = 0;
        if ("function" in vars[i]) {
            tests[test_name] = vars[i].function(json[vars[i].name]);
        } else {
            if (json[vars[i].name] == vars[i].value) {
                tests[test_name] = 1;
            }
        }
    }
    return;
}

function f5_check_response_polled(vars) {
    if (!f5_check_response_code()) {
        f5_debug("response code bad, next is null");
        postman.setNextRequest(null);
        return;
    }
    
    var json = JSON.parse(responseBody);
    
    for (var i = 0; i < vars.length; i++) {
        var test_name = vars[i].name + '_is_' + vars[i].value;
        var poll_test_name = 'polled_' + test_name;
        tests[vars[i].name + '_val_' + json[vars[i].name]] = 1;
        
        if ("function" in vars[i]) {
            if (vars[i].function(json[vars[i].name])) {
                tests[test_name] = tests[poll_test_name + '_pass'] = 1;
            } else {
                tests[poll_test_name + '_fail'] = 1;
            }
        } else {
            if (json[vars[i].name] == vars[i].value) {
                tests[test_name] = tests[poll_test_name + '_pass'] = 1;
            } else {
                tests[poll_test_name + '_fail'] = 1;
            }
        }
    }
    return;
}

function f5_poll_until_all_tests_pass(curr, next) {
    f5_debug("curr=" + curr);
    f5_debug("next=" + next);
    f5_debug("_f5_poll_max_tries=" + postman.getGlobalVariable("_f5_poll_max_tries"));
    f5_debug("_f5_poll_iterator=" + postman.getGlobalVariable("_f5_poll_iterator"));
    
    if (f5_all_tests_passed() === 1) {
        f5_debug("tests passed, next is '" + next + "'");
        postman.setGlobalVariable("_f5_poll_iterator", "1");
        postman.setNextRequest(next);        
        return;
    } 
    if (parseInt(postman.getGlobalVariable("_f5_poll_iterator")) >= parseInt(postman.getGlobalVariable("_f5_poll_max_tries"))) {     
        f5_debug("reached max_tries, next is null");
        tests['poller_max_tries_reached'] = 0;
        postman.setGlobalVariable("_f5_poll_iterator", "1");
        postman.setNextRequest(null);
        return;
    }
    if (parseInt(postman.getGlobalVariable("_f5_poll_iterator")) != parseInt(postman.getGlobalVariable("_f5_poll_max_tries"))) {
        f5_debug("tests NOT passed, trying again");
        var i = parseInt(postman.getGlobalVariable("_f5_poll_iterator"));
        i++;
        postman.setGlobalVariable("_f5_poll_iterator", i);

        if(parseInt(postman.getGlobalVariable("_f5_poll_useinternal")) === 1) {
            f5_sleep(parseInt(postman.getGlobalVariable("_f5_poll_wait")) * 1000)
            postman.setNextRequest(curr);
            postman.setGlobalVariable("_f5_poll_curr", "");
        } else {
            postman.setGlobalVariable("_f5_poll_curr", curr);
            postman.setNextRequest("_F5_POLL_DELAY");
        }
    }
}

function f5_all_tests_passed() {
    for (var test in tests) {
        if(test.startsWith("polled_") && test.endsWith("_fail")) {
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

function f5_check_response_code(mode) {
    okCodes = {
        "GET":[200,204],
        "POST":[200,201,202],
        "PUT":[200,202],
        "PATCH":[200,202],
        "DELETE":[200,202,204]
    };

    if(mode !== undefined) {
        f5_debug("got mode, adding 404 to GET okCodes");
        okCodes.GET.push(404);  
    }

    tests["response_code_" + responseCode.code + "_ok"] = 0;
    if (request.method in okCodes && okCodes[request.method].indexOf(responseCode.code) > -1) { 
        f5_debug("response code in okCodes, return 1"); 
        tests["response_code_" + responseCode.code + "_ok"] = 1;
        return 1;
    }
    if (responseCode.code >= 200 && responseCode.code < 300) { 
        f5_debug("response code was 2xx, return 2");
        tests["response_code_" + responseCode.code + "_ok"] = 2;
        return 2;
    }
    
    f5_debug("response code bad, return 0");
    return 0;
}

function f5_debug(msg) {
    if(postman.getGlobalVariable("_f5_debug") == "1") {
        console.log('[' + arguments.callee.caller.name + '] ' + msg);
    }    
}

function f5_clear_runtime_vars() {
    var envKeys = Object.keys(environment);
    for(var i = 0; i < envKeys.length; i++) {
        if(envKeys[i].startsWith("_rt_")) {
            f5_debug("clearing env variable: " + envKeys[i]);
            postman.setEnvironmentVariable(envKeys[i], "");
        }
    }
    tests["cleared_runtime_env_vars"] = 1;
}

function f5_sleep (time) {
    f5_debug("sleeping for " + time);
    var now = new Date().getTime();
    while(new Date().getTime() < now + time){ } 
}
