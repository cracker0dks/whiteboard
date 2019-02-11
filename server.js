var PORT = 8080; //Set port for the app
var accessToken = ""; //Can be set here or as start parameter (node server.js --accesstoken=MYTOKEN)

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

if(process.env.accesstoken) {
    accessToken = process.env.accesstoken;
}

var startArgs = getArgs ();
if(startArgs["accesstoken"]) {
    accessToken = startArgs["accesstoken"];
}
if(accessToken!=="") {
    console.log("AccessToken set to: "+accessToken);
}

app.get('/loadwhiteboard', function(req, res) {
    var wid = req["query"]["wid"];
    var at = req["query"]["at"]; //accesstoken
    if(accessToken==="" || accessToken==at) {
        var ret = s_whiteboard.loadStoredData(wid);
        res.send(ret);
        res.end();
    } else {
        res.status(401);  //Unauthorized
        res.end();
    }
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
        if(accessToken==="" || accessToken==formData["fields"]["at"]) {
            progressUploadFormData(formData);
            res.send("done");
        } else {
            res.status(401);  //Unauthorized
            res.end();
        }
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
        if(err) {
            console.log("Could not create upload folder!", err);
            return;
        }
        var imagedata = fields["imagedata"];
        if(imagedata && imagedata != "") { //Save from base64 data
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
        socket.broadcast.emit('refreshUserBadges', null); //Removes old user Badges
    });

    socket.on('drawToWhiteboard', function(content) {
        content = escapeAllContentStrings(content);
        if(accessToken==="" || accessToken==content["at"]) {
            socket.broadcast.to(content["wid"]).emit('drawToWhiteboard', content); //Send to all users in the room (not own socket)
            s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
        } else {
            socket.emit('wrongAccessToken', true);
        }     
    });

    socket.on('joinWhiteboard', function(content) {
        content = escapeAllContentStrings(content);
        if(accessToken==="" || accessToken==content["at"]) {
            socket.join(content["wid"]); //Joins room name=wid
        } else {
            socket.emit('wrongAccessToken', true);
        }
    });
});

//Prevent cross site scripting
function escapeAllContentStrings(content, cnt) {
    if(!cnt)
        cnt = 0;

    if(typeof(content)=="string") {
        return content.replace(/<\/?[^>]+(>|$)/g, "");
    }
    for(var i in content) {
        if(typeof(content[i])=="string") {
            content[i] = content[i].replace(/<\/?[^>]+(>|$)/g, "");
        } if(typeof(content[i])=="object" && cnt < 10) {
            content[i] = escapeAllContentStrings(content[i], ++cnt);
        }
    }
    return content;
}

function getArgs () {
    const args = {}
    process.argv
      .slice(2, process.argv.length)
      .forEach( arg => {
        // long arg
        if (arg.slice(0,2) === '--') {
          const longArg = arg.split('=')
          args[longArg[0].slice(2,longArg[0].length)] = longArg[1]
        }
       // flags
        else if (arg[0] === '-') {
          const flags = arg.slice(1,arg.length).split('')
          flags.forEach(flag => {
            args[flag] = true
          })
        }
      })
    return args
  }