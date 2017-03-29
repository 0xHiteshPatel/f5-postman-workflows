// Minify f5_postman_test_functions.js and generate a Postman
// global environment variable file.

var fs = require('fs');
var UglifyJS = require("uglify-js");
var globals = require("./globals.json");

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
