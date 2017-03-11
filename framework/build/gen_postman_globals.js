// Minify f5_postman_test_functions.js and generate a Postman
// global environment variable file.

var fs = require('fs');
var UglifyJS = require("uglify-js")
var globals =
{
  "name": "f5-postman-workflows Globals",
  "values": [
    {
      "key": "_f5_enable_polled_mode",
      "type": "text",
      "value": "0",
      "enabled": true
    },
    {
      "key": "_f5_poll_max_tries",
      "type": "text",
      "value": "60",
      "enabled": true
    },
    {
      "key": "_f5_poll_wait",
      "type": "text",
      "value": "5",
      "enabled": true
    },
    {
      "key": "_f5_poll_useinternal",
      "type": "text",
      "value": "0",
      "enabled": true
    },
    {
      "key": "_f5_poll_apiurl",
      "type": "text",
      "value": "http://echo.getpostman.com/delay",
      "enabled": true
    },
    {
      "key": "_f5_poll_bypass_timeout",
      "type": "text",
      "value": "0",
      "enabled": true
    },
    {
      "key": "_f5_poll_iterator",
      "type": "text",
      "value": "1",
      "enabled": true
    },
    {
      "key": "_f5_poll_curr",
      "type": "text",
      "value": "1",
      "enabled": true
    },
    {
      "key": "_f5_debug",
      "type": "text",
      "value": "1",
      "enabled": true
    }
  ]
};

var result = UglifyJS.minify('./src/f5-postman-workflows.js', {
    mangle: true,
    compress: true
});

eval(result.code);
fs.writeFileSync('./VERSION.md', f5_get_version() + '\n');

globals.values.push(
{
  "key": "_f5_workflow_functions",
  "type": "text",
  "value": result.code,
  "enabled": true
});

fs.writeFileSync('f5-postman-workflows.postman_globals.json', JSON.stringify(globals, null, 2));
