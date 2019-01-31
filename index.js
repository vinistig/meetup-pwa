const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
var privateKey = fs.readFileSync('./server.key', 'utf8');
var certificate = fs.readFileSync('./server.cert', 'utf8');
var credentials = { key: privateKey, cert: certificate };

app.use(express.static('scripts'))
app.use(express.static('styles'))
app.use(express.static('images'))
app.use(express.static('./'))

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// app.listen(port, () => console.log(`Example app listening on port ${port}!`));

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);
var portHttp = 8080;
var portHttps = 8443;
httpServer.listen(portHttp, () => console.log(`Example app listening on port ${portHttp}!`));
httpsServer.listen(portHttps, () => console.log(`Example app listening on port ${portHttps}!`));