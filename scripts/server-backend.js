const path = require("path");

const config = require("./config");
const WhiteboardServerSideInfo = require("./WhiteboardServerSideInfo");

function startBackendServer(port) {
    var fs = require("fs-extra");
    var express = require("express");
    var formidable = require("formidable"); //form upload processing

    const createDOMPurify = require("dompurify"); //Prevent xss
    const { JSDOM } = require("jsdom");
    const window = new JSDOM("").window;
    const DOMPurify = createDOMPurify(window);

    const { createClient } = require("webdav");

    var s_whiteboard = require("./s_whiteboard.js");

    var app = express();
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));
    var server = require("http").Server(app);
    server.listen(port);
    var io = require("socket.io")(server, { path: "/ws-api" });
    console.log("Webserver & socketserver running on port:" + port);

    const { accessToken, webdav } = config.backend;

    app.get("/api/loadwhiteboard", function (req, res) {
        var wid = req["query"]["wid"];
        var at = req["query"]["at"]; //accesstoken
        if (accessToken === "" || accessToken == at) {
            var ret = s_whiteboard.loadStoredData(wid);
            res.send(ret);
            res.end();
        } else {
            res.status(401); //Unauthorized
            res.end();
        }
    });

    app.post("/api/upload", function (req, res) {
        //File upload
        var form = new formidable.IncomingForm(); //Receive form
        var formData = {
            files: {},
            fields: {},
        };

        form.on("file", function (name, file) {
            formData["files"][file.name] = file;
        });

        form.on("field", function (name, value) {
            formData["fields"][name] = value;
        });

        form.on("error", function (err) {
            console.log("File uplaod Error!");
        });

        form.on("end", function () {
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
                res.status(401); //Unauthorized
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
        var date = fields["date"] || +new Date();
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
            if (imagedata && imagedata != "") {
                //Save from base64 data
                imagedata = imagedata
                    .replace(/^data:image\/png;base64,/, "")
                    .replace(/^data:image\/jpeg;base64,/, "");
                console.log(filename, "uploaded");
                fs.writeFile("./public/uploads/" + filename, imagedata, "base64", function (err) {
                    if (err) {
                        console.log("error", err);
                        callback(err);
                    } else {
                        if (webdavaccess) {
                            //Save image to webdav
                            if (webdav) {
                                saveImageToWebdav(
                                    "./public/uploads/" + filename,
                                    filename,
                                    webdavaccess,
                                    function (err) {
                                        if (err) {
                                            console.log("error", err);
                                            callback(err);
                                        } else {
                                            callback();
                                        }
                                    }
                                );
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

            const client = createClient(webdavserver, {
                username: webdavusername,
                password: webdavpassword,
            });
            client
                .getDirectoryContents(webdavpath)
                .then((items) => {
                    var cloudpath = webdavpath + "" + filename;
                    console.log("webdav saving to:", cloudpath);
                    fs.createReadStream(imagepath).pipe(client.createWriteStream(cloudpath));
                    callback();
                })
                .catch((error) => {
                    callback("403");
                    console.log("Could not connect to webdav!");
                });
        } else {
            callback("Error: no access data!");
        }
    }

    /**
     * @type {Map<string, WhiteboardServerSideInfo>}
     */
    const infoByWhiteboard = new Map();

    setInterval(() => {
        infoByWhiteboard.forEach((info, whiteboardId) => {
            if (info.shouldSendInfo()) {
                io.sockets
                    .in(whiteboardId)
                    .compress(false)
                    .emit("whiteboardInfoUpdate", info.asObject());
                info.infoWasSent();
            }
        });
    }, (1 / config.backend.performance.whiteboardInfoBroadcastFreq) * 1000);

    io.on("connection", function (socket) {
        var whiteboardId = null;
        socket.on("disconnect", function () {
            if (infoByWhiteboard.has(whiteboardId)) {
            const whiteboardServerSideInfo = infoByWhiteboard.get(whiteboardId);

            if (socket && socket.id) {
                whiteboardServerSideInfo.deleteScreenResolutionOfClient(socket.id);
            }

            whiteboardServerSideInfo.decrementNbConnectedUsers();

            if (whiteboardServerSideInfo.hasConnectedUser()) {
                socket.compress(false).broadcast.emit("refreshUserBadges", null); //Removes old user Badges
            } else {
                infoByWhiteboard.delete(whiteboardId);
            }
            }
        });

        socket.on("drawToWhiteboard", function (content) {
            content = escapeAllContentStrings(content);
            if (accessToken === "" || accessToken == content["at"]) {
                socket.compress(false).broadcast.to(whiteboardId).emit("drawToWhiteboard", content); //Send to all users in the room (not own socket)
                s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
            } else {
                socket.emit("wrongAccessToken", true);
            }
        });

        socket.on("joinWhiteboard", function (content) {
            content = escapeAllContentStrings(content);
            if (accessToken === "" || accessToken == content["at"]) {
                whiteboardId = content["wid"];
                socket.join(whiteboardId); //Joins room name=wid
                if (!infoByWhiteboard.has(whiteboardId)) {
                    infoByWhiteboard.set(whiteboardId, new WhiteboardServerSideInfo());
                }

                const whiteboardServerSideInfo = infoByWhiteboard.get(whiteboardId);
                whiteboardServerSideInfo.incrementNbConnectedUsers();
                whiteboardServerSideInfo.setScreenResolutionForClient(
                    socket.id,
                    content["windowWidthHeight"] || WhiteboardServerSideInfo.defaultScreenResolution
                );
            } else {
                socket.emit("wrongAccessToken", true);
            }
        });

        socket.on("updateScreenResolution", function (content) {
            content = escapeAllContentStrings(content);
            if (accessToken === "" || accessToken == content["at"]) {
                const whiteboardServerSideInfo = infoByWhiteboard.get(whiteboardId);
                whiteboardServerSideInfo.setScreenResolutionForClient(
                    socket.id,
                    content["windowWidthHeight"] || WhiteboardServerSideInfo.defaultScreenResolution
                );
            }
        });
    });

    //Prevent cross site scripting (xss)
    function escapeAllContentStrings(content, cnt) {
        if (!cnt) cnt = 0;

        if (typeof content === "string") {
            return DOMPurify.sanitize(content);
        }
        for (var i in content) {
            if (typeof content[i] === "string") {
                content[i] = DOMPurify.sanitize(content[i]);
            }
            if (typeof content[i] === "object" && cnt < 10) {
                content[i] = escapeAllContentStrings(content[i], ++cnt);
            }
        }
        return content;
    }

    process.on("unhandledRejection", (error) => {
        // Will print "unhandledRejection err is not defined"
        console.log("unhandledRejection", error.message);
    });
}

module.exports = startBackendServer;
