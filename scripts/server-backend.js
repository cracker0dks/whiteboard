var PORT = 8080; //Set port for the app
var accessToken = ""; //Can be set here or as start parameter (node server.js --accesstoken=MYTOKEN)
var disableSmallestScreen = false; //Can be set to true if you dont want to show (node server.js --disablesmallestscreen=true)
var webdav = false; //Can be set to true if you want to allow webdav save (node server.js --webdav=true)

var fs = require("fs-extra");
var express = require('express');
var formidable = require('formidable'); //form upload processing

const createDOMPurify = require('dompurify'); //Prevent xss
const { JSDOM } = require('jsdom');
const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

const { createClient } = require("webdav");

var s_whiteboard = require("./s_whiteboard.js");

var app = express();
app.use(express.static(__dirname + '/public'));
var server = require('http').Server(app);
server.listen(PORT);
var io = require('socket.io')(server);
console.log("Webserver & socketserver running on port:" + PORT);

if (process.env.accesstoken) {
    accessToken = process.env.accesstoken;
}
if (process.env.disablesmallestscreen) {
    disablesmallestscreen = true;
}
if (process.env.webdav) {
    webdav = true;
}

var startArgs = getArgs();
if (startArgs["accesstoken"]) {
    accessToken = startArgs["accesstoken"];
}
if (startArgs["disablesmallestscreen"]) {
    disableSmallestScreen = true;
}
if (startArgs["webdav"]) {
    webdav = true;
}

if (accessToken !== "") {
    console.log("AccessToken set to: " + accessToken);
}
if (disableSmallestScreen) {
    console.log("Disabled showing smallest screen resolution!");
}
if (webdav) {
    console.log("Webdav save is enabled!");
}

app.get('/loadwhiteboard', function (req, res) {
    var wid = req["query"]["wid"];
    var at = req["query"]["at"]; //accesstoken
    if (accessToken === "" || accessToken == at) {
        var ret = s_whiteboard.loadStoredData(wid);
        res.send(ret);
        res.end();
    } else {
        res.status(401);  //Unauthorized
        res.end();
    }
});

app.post('/upload', function (req, res) { //File upload
    var form = new formidable.IncomingForm(); //Receive form
    var formData = {
        files: {},
        fields: {}
    }

    form.on('file', function (name, file) {
        formData["files"][file.name] = file;
    });

    form.on('field', function (name, value) {
        formData["fields"][name] = value;
    });

    form.on('error', function (err) {
        console.log('File uplaod Error!');
    });

    form.on('end', function () {
        if (accessToken === "" || accessToken == formData["fields"]["at"]) {
            progressUploadFormData(formData, function (err) {
                if (err) {
                    if (err == "403") {
                        res.status(403);
                    } else {
                        res.status(500);
                    }
                    res.end();
                } else {
                    res.send("done");
                }
            });
        } else {
            res.status(401);  //Unauthorized
            res.end();
        }
        //End file upload
    });
    form.parse(req);
});

function progressUploadFormData(formData, callback) {
    console.log("Progress new Form Data");
    var fields = escapeAllContentStrings(formData.fields);
    var files = formData.files;
    var whiteboardId = fields["whiteboardId"];

    var name = fields["name"] || "";
    var date = fields["date"] || (+new Date());
    var filename = whiteboardId + "_" + date + ".png";
    var webdavaccess = fields["webdavaccess"] || false;
    try {
        webdavaccess = JSON.parse(webdavaccess);
    } catch (e) {
        webdavaccess = false;
    }
    fs.ensureDir("./public/uploads", function (err) {
        if (err) {
            console.log("Could not create upload folder!", err);
            return;
        }
        var imagedata = fields["imagedata"];
        if (imagedata && imagedata != "") { //Save from base64 data
            imagedata = imagedata.replace(/^data:image\/png;base64,/, "").replace(/^data:image\/jpeg;base64,/, "");
            console.log(filename, "uploaded");
            fs.writeFile('./public/uploads/' + filename, imagedata, 'base64', function (err) {
                if (err) {
                    console.log("error", err);
                    callback(err);
                } else {
                    if (webdavaccess) { //Save image to webdav
                        if (webdav) {
                            saveImageToWebdav('./public/uploads/' + filename, filename, webdavaccess, function (err) {
                                if (err) {
                                    console.log("error", err);
                                    callback(err);
                                } else {
                                    callback();
                                }
                            })
                        } else {
                            callback("Webdav is not enabled on the server!");
                        }
                    } else {
                        callback();
                    }
                }
            });
        } else {
            callback("no imagedata!");
            console.log("No image Data found for this upload!", name);
        }
    });
}

function saveImageToWebdav(imagepath, filename, webdavaccess, callback) {
    if (webdavaccess) {
        var webdavserver = webdavaccess["webdavserver"] || "";
        var webdavpath = webdavaccess["webdavpath"] || "/";
        var webdavusername = webdavaccess["webdavusername"] || "";
        var webdavpassword = webdavaccess["webdavpassword"] || "";

        const client = createClient(
            webdavserver,
            {
                username: webdavusername,
                password: webdavpassword
            }
        )
        client.getDirectoryContents(webdavpath).then((items) => {
            var cloudpath = webdavpath+ '' + filename;
            console.log("webdav saving to:", cloudpath);
            fs.createReadStream(imagepath).pipe(client.createWriteStream(cloudpath));
            callback();
        }).catch((error) => {
            callback("403");
            console.log("Could not connect to webdav!")
        });
    } else {
        callback("Error: no access data!")
    }
}

var smallestScreenResolutions = {};
io.on('connection', function (socket) {
    var whiteboardId = null;

    socket.on('disconnect', function () {
        if (smallestScreenResolutions && smallestScreenResolutions[whiteboardId] && socket && socket.id) {
            delete smallestScreenResolutions[whiteboardId][socket.id];
        }
        socket.broadcast.emit('refreshUserBadges', null); //Removes old user Badges
        sendSmallestScreenResolution();
    });

    socket.on('drawToWhiteboard', function (content) {
        content = escapeAllContentStrings(content);
        if (accessToken === "" || accessToken == content["at"]) {
            socket.broadcast.to(whiteboardId).emit('drawToWhiteboard', content); //Send to all users in the room (not own socket)
            s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
        } else {
            socket.emit('wrongAccessToken', true);
        }
    });

    socket.on('joinWhiteboard', function (content) {
        content = escapeAllContentStrings(content);
        if (accessToken === "" || accessToken == content["at"]) {
            whiteboardId = content["wid"];
            socket.join(whiteboardId); //Joins room name=wid
            smallestScreenResolutions[whiteboardId] = smallestScreenResolutions[whiteboardId] ? smallestScreenResolutions[whiteboardId] : {};
            smallestScreenResolutions[whiteboardId][socket.id] = content["windowWidthHeight"] || { w: 10000, h: 10000 };
            sendSmallestScreenResolution();
        } else {
            socket.emit('wrongAccessToken', true);
        }
    });

    socket.on('updateScreenResolution', function (content) {
        content = escapeAllContentStrings(content);
        if (accessToken === "" || accessToken == content["at"]) {
            smallestScreenResolutions[whiteboardId][socket.id] = content["windowWidthHeight"] || { w: 10000, h: 10000 };
            sendSmallestScreenResolution();
        }
    });

    function sendSmallestScreenResolution() {
        if (disableSmallestScreen) {
            return;
        }
        var smallestWidth = 10000;
        var smallestHeight = 10000;
        for (var i in smallestScreenResolutions[whiteboardId]) {
            smallestWidth = smallestWidth > smallestScreenResolutions[whiteboardId][i]["w"] ? smallestScreenResolutions[whiteboardId][i]["w"] : smallestWidth;
            smallestHeight = smallestHeight > smallestScreenResolutions[whiteboardId][i]["h"] ? smallestScreenResolutions[whiteboardId][i]["h"] : smallestHeight;
        }
        io.to(whiteboardId).emit('updateSmallestScreenResolution', { w: smallestWidth, h: smallestHeight });
    }
});

//Prevent cross site scripting (xss)
function escapeAllContentStrings(content, cnt) {
    if (!cnt)
        cnt = 0;

    if (typeof (content) === "string") {
        return DOMPurify.sanitize(content);
    }
    for (var i in content) {
        if (typeof (content[i]) === "string") {
            content[i] = DOMPurify.sanitize(content[i]);
        } if (typeof (content[i]) === "object" && cnt < 10) {
            content[i] = escapeAllContentStrings(content[i], ++cnt);
        }
    }
    return content;
}

function getArgs() {
    const args = {}
    process.argv
        .slice(2, process.argv.length)
        .forEach(arg => {
            // long arg
            if (arg.slice(0, 2) === '--') {
                const longArg = arg.split('=')
                args[longArg[0].slice(2, longArg[0].length)] = longArg[1]
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1, arg.length).split('')
                flags.forEach(flag => {
                    args[flag] = true
                })
            }
        })
    return args
}

process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.log('unhandledRejection', error.message);
})