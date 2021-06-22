const path = require("path");

const config = require("./config/config");
const ReadOnlyBackendService = require("./services/ReadOnlyBackendService");
const WhiteboardInfoBackendService = require("./services/WhiteboardInfoBackendService");

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

    var server = require("http").Server(app);
    server.listen(port);
    var io = require("socket.io")(server, { path: "/ws-api" });
    WhiteboardInfoBackendService.start(io);

    console.log("Webserver & socketserver running on port:" + port);

    const { accessToken, enableWebdav } = config.backend;

    //Expose static folders
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.use("/uploads", express.static(path.join(__dirname, "..", "public", "uploads")));

    /**
     * @api {get} /api/loadwhiteboard Get Whiteboard Data
     * @apiDescription This returns all the Available Data ever drawn to this Whiteboard
     * @apiName loadwhiteboard
     * @apiGroup WhiteboardAPI
     *
     * @apiParam {Number} wid WhiteboardId you find in the Whiteboard URL
     * @apiParam {Number} [at] Accesstoken (Only if activated for this server)
     *
     * @apiSuccess {String} body returns the data as JSON String
     * @apiError {Number} 401 Unauthorized
     *
     * @apiExample {curl} Example usage:
     *     curl -i http://[rootUrl]/api/loadwhiteboard?wid=[MyWhiteboardId]
     */
    app.get("/api/loadwhiteboard", function (req, res) {
        let query = escapeAllContentStrings(req["query"]);
        const wid = query["wid"];
        const at = query["at"]; //accesstoken
        if (accessToken === "" || accessToken == at) {
            const widForData = ReadOnlyBackendService.isReadOnly(wid)
                ? ReadOnlyBackendService.getIdFromReadOnlyId(wid)
                : wid;
            const ret = s_whiteboard.loadStoredData(widForData);
            res.send(ret);
            res.end();
        } else {
            res.status(401); //Unauthorized
            res.end();
        }
    });

    /**
     * @api {get} /api/getReadOnlyWid Get the readOnlyWhiteboardId
     * @apiDescription This returns the readOnlyWhiteboardId for a given WhiteboardId
     * @apiName getReadOnlyWid
     * @apiGroup WhiteboardAPI
     *
     * @apiParam {Number} wid WhiteboardId you find in the Whiteboard URL
     * @apiParam {Number} [at] Accesstoken (Only if activated for this server)
     *
     * @apiSuccess {String} body returns the readOnlyWhiteboardId as text
     * @apiError {Number} 401 Unauthorized
     *
     * @apiExample {curl} Example usage:
     *     curl -i http://[rootUrl]/api/getReadOnlyWid?wid=[MyWhiteboardId]
     */
    app.get("/api/getReadOnlyWid", function (req, res) {
        let query = escapeAllContentStrings(req["query"]);
        const wid = query["wid"];
        const at = query["at"]; //accesstoken
        if (accessToken === "" || accessToken == at) {
            res.send(ReadOnlyBackendService.getReadOnlyId(wid));
            res.end();
        } else {
            res.status(401); //Unauthorized
            res.end();
        }
    });

    /**
     * @api {post} /api/upload Upload Images
     * @apiDescription Upload Image to the server. Note that you need to add the image to the board after upload by calling "drawToWhiteboard" with addImgBG set as tool
     * @apiName upload
     * @apiGroup WhiteboardAPI
     *
     * @apiParam {Number} wid WhiteboardId you find in the Whiteboard URL
     * @apiParam {Number} [at] Accesstoken (Only if activated for this server)
     * @apiParam {Number} current timestamp
     * @apiParam {Boolean} webdavaccess set true to upload to webdav (Optional; Only if activated for this server)
     * @apiParam {String} imagedata The imagedata base64 encoded
     *
     * @apiSuccess {String} body returns "done"
     * @apiError {Number} 401 Unauthorized
     */
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

    /**
     * @api {get} /api/drawToWhiteboard Draw on the Whiteboard
     * @apiDescription Function draw on whiteboard with different tools and more...
     * @apiName drawToWhiteboard
     * @apiGroup WhiteboardAPI
     *
     * @apiParam {Number} wid WhiteboardId you find in the Whiteboard URL
     * @apiParam {Number} [at] Accesstoken (Only if activated for this server)
     * @apiParam {String} t The tool you want to use:  "line",
     * "pen",
     * "rect",
     * "circle",
     * "eraser",
     * "addImgBG",
     * "recSelect",
     * "eraseRec",
     * "addTextBox",
     * "setTextboxText",
     * "removeTextbox",
     * "setTextboxPosition",
     * "setTextboxFontSize",
     * "setTextboxFontColor",
     * @apiParam {String} [username] The username performing this action. Only relevant for the undo/redo function
     * @apiParam {Number} [draw] Only has a function if t is set to "addImgBG". Set 1 to draw on canvas; 0  to draw into background
     * @apiParam {String} [url] Only has a function if t is set to "addImgBG", then it has to be set to: [rootUrl]/uploads/[ReadOnlyWid]/[ReadOnlyWid]_[date].png
     * @apiParam {String} [c] Color: Only used if color is needed (pen, rect, circle, addTextBox ... )
     * @apiParam {String} [th] Thickness: Only used if Thickness is needed (pen, rect ... )
     * @apiParam {Number[]} d has different function on every tool you use:
     * pen: [width, height, left, top, rotation]
     *
     * @apiSuccess {String} body returns "done" as text
     * @apiError {Number} 401 Unauthorized
     */
    app.get("/api/drawToWhiteboard", function (req, res) {
        let query = escapeAllContentStrings(req["query"]);
        const wid = query["wid"];
        const at = query["at"]; //accesstoken
        if (!wid || ReadOnlyBackendService.isReadOnly(wid)) {
            res.status(401); //Unauthorized
            res.end();
        }

        if (accessToken === "" || accessToken == at) {
            const broadcastTo = (wid) => io.compress(false).to(wid).emit("drawToWhiteboard", query);
            // broadcast to current whiteboard
            broadcastTo(wid);
            // broadcast the same query to the associated read-only whiteboard
            const readOnlyId = ReadOnlyBackendService.getReadOnlyId(wid);
            broadcastTo(readOnlyId);
            s_whiteboard.handleEventsAndData(query); //save whiteboardchanges on the server
            res.send("done");
        } else {
            res.status(401); //Unauthorized
            res.end();
        }
    });

    function progressUploadFormData(formData, callback) {
        console.log("Progress new Form Data");
        const fields = escapeAllContentStrings(formData.fields);
        const wid = fields["whiteboardId"];
        if (ReadOnlyBackendService.isReadOnly(wid)) return;

        const readOnlyWid = ReadOnlyBackendService.getReadOnlyId(wid);

        const date = fields["date"] || +new Date();
        const filename = `${readOnlyWid}_${date}.png`;
        let webdavaccess = fields["webdavaccess"] || false;
        try {
            webdavaccess = JSON.parse(webdavaccess);
        } catch (e) {
            webdavaccess = false;
        }

        const savingDir = path.join("./public/uploads", readOnlyWid);
        fs.ensureDir(savingDir, function (err) {
            if (err) {
                console.log("Could not create upload folder!", err);
                return;
            }
            let imagedata = fields["imagedata"];
            if (imagedata && imagedata != "") {
                //Save from base64 data
                imagedata = imagedata
                    .replace(/^data:image\/png;base64,/, "")
                    .replace(/^data:image\/jpeg;base64,/, "");
                console.log(filename, "uploaded");
                const savingPath = path.join(savingDir, filename);
                fs.writeFile(savingPath, imagedata, "base64", function (err) {
                    if (err) {
                        console.log("error", err);
                        callback(err);
                    } else {
                        if (webdavaccess) {
                            //Save image to webdav
                            if (enableWebdav) {
                                saveImageToWebdav(
                                    savingPath,
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
                console.log("No image Data found for this upload!", filename);
            }
        });
    }

    function saveImageToWebdav(imagepath, filename, webdavaccess, callback) {
        if (webdavaccess) {
            const webdavserver = webdavaccess["webdavserver"] || "";
            const webdavpath = webdavaccess["webdavpath"] || "/";
            const webdavusername = webdavaccess["webdavusername"] || "";
            const webdavpassword = webdavaccess["webdavpassword"] || "";

            const client = createClient(webdavserver, {
                username: webdavusername,
                password: webdavpassword,
            });
            client
                .getDirectoryContents(webdavpath)
                .then((items) => {
                    const cloudpath = webdavpath + "" + filename;
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

    io.on("connection", function (socket) {
        let whiteboardId = null;
        socket.on("disconnect", function () {
            WhiteboardInfoBackendService.leave(socket.id, whiteboardId);
            socket.compress(false).broadcast.to(whiteboardId).emit("refreshUserBadges", null); //Removes old user Badges
        });

        socket.on("drawToWhiteboard", function (content) {
            if (!whiteboardId || ReadOnlyBackendService.isReadOnly(whiteboardId)) return;

            content = escapeAllContentStrings(content);
            if (accessToken === "" || accessToken == content["at"]) {
                const broadcastTo = (wid) =>
                    socket.compress(false).broadcast.to(wid).emit("drawToWhiteboard", content);
                // broadcast to current whiteboard
                broadcastTo(whiteboardId);
                // broadcast the same content to the associated read-only whiteboard
                const readOnlyId = ReadOnlyBackendService.getReadOnlyId(whiteboardId);
                broadcastTo(readOnlyId);
                s_whiteboard.handleEventsAndData(content); //save whiteboardchanges on the server
            } else {
                socket.emit("wrongAccessToken", true);
            }
        });

        socket.on("joinWhiteboard", function (content) {
            content = escapeAllContentStrings(content);
            if (accessToken === "" || accessToken == content["at"]) {
                whiteboardId = content["wid"];

                socket.emit("whiteboardConfig", {
                    common: config.frontend,
                    whiteboardSpecific: {
                        correspondingReadOnlyWid:
                            ReadOnlyBackendService.getReadOnlyId(whiteboardId),
                        isReadOnly: ReadOnlyBackendService.isReadOnly(whiteboardId),
                    },
                });

                socket.join(whiteboardId); //Joins room name=wid
                const screenResolution = content["windowWidthHeight"];
                WhiteboardInfoBackendService.join(socket.id, whiteboardId, screenResolution);
            } else {
                socket.emit("wrongAccessToken", true);
            }
        });

        socket.on("updateScreenResolution", function (content) {
            content = escapeAllContentStrings(content);
            if (accessToken === "" || accessToken == content["at"]) {
                const screenResolution = content["windowWidthHeight"];
                WhiteboardInfoBackendService.setScreenResolution(
                    socket.id,
                    whiteboardId,
                    screenResolution
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
