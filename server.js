var PORT = 8080; //Set port for the app

fs = require("fs-extra");
var express = require('express');
var formidable = require('formidable'); //form upload processing
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

app.post('/upload', function(req, res) { //File upload
    var form = new formidable.IncomingForm(); //Receive form
    var formData = {
        files : {},
        fields : {}
    }

    form.on('file', function(name, file) {
        formData["files"][file.name] = file;      
    });

    form.on('field', function(name, value) {
        formData["fields"][name] = value;
    });

    form.on('error', function(err) {
      console.log('File uplaod Error!');
    });

    form.on('end', function() {
        progressUploadFormData(formData);
        res.send("done");
        //End file upload
    });
    form.parse(req);
});

function progressUploadFormData(formData) {
    console.log("Progress new Form Data");
    var fields = formData.fields;
    var files = formData.files;
    var whiteboardId = fields["whiteboardId"];

    var name = fields["name"] || "";
    var date = fields["date"] || (+new Date());
    var filename = whiteboardId+"_"+date+".png";

    fs.ensureDir("./public/uploads", function(err) {
        var imagedata = fields["imagedata"];
        if(imagedata && imagedata != "") { //Save from base64
            imagedata = imagedata.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
            console.log(filename, "uploaded");
            fs.writeFile('./public/uploads/'+filename, imagedata, 'base64', function(err) {
                if(err) {
                    console.log("error", err);
                }
            });
        }
    });
}

io.on('connection', function(socket){
    socket.on('disconnect', function () {
        socket.broadcast.emit('refreshUserBadges', null);
    });

    socket.on('drawToWhiteboard', function(content) {
        socket.broadcast.emit('drawToWhiteboard', content);
        s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
    });
});