import { createRequire } from "module";
const require = createRequire(import.meta.url);
// Listen on a specific host via the HOST environment variable
var host = '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = 3330;

var cors_proxy = require('cors-anywhere');
var p = cors_proxy.createServer({
    originWhitelist: [],
    requireHeader: [],
})
p.on("request", (req, res) =>{
    console.log("URL: "+req.url)
})
p.listen(port, host, function() {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
});
