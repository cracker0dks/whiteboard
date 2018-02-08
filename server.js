var PORT = 8080; //Set port for the app


var express = require('express');
var s_whiteboard = require("./s_whiteboard.js");

var app = express();
app.use(express.static(__dirname + '/public'));
var server = require('http').Server(app);
server.listen(PORT);
var io = require('socket.io')(server);
console.log("Webserver & socketserver running on port:"+PORT);

app.get('/loadwhiteboard', function(req, res) {
    var wid = req["query"]["wid"];
    var ret = s_whiteboard.loadStoredData(wid);
    res.send(ret);
    res.end();
});

io.on('connection', function(socket){
    socket.on('drawToWhiteboard', function(content) {
        socket.broadcast.emit('drawToWhiteboard', content);
        s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
    });
});