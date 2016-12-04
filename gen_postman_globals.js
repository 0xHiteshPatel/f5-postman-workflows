var fs = require('fs');
var UglifyJS = require("uglify-js")

var onReadTmplFile = function(err, data) {
	if(err) {
		return console.log(err);
	}
	//console.log(data);
	//console.log(result.code);

	var code = result.code;
	code = result.code.replace(/\"/g, '\\"');

	out = data.replace('{{f5_test_functions}}', code);
	//console.log(code);
	//console.log(out);
	fs.writeFileSync('globals.postman_globals.json', out);
};

var result = UglifyJS.minify('f5_postman_test_functions.js', {
    mangle: true,
    compress: true
});

fs.readFile('globals.postman_globals.json.tmpl', 'utf8', onReadTmplFile);
