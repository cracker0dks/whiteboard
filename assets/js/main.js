var whiteboardId = getQueryVariable("whiteboardid");
var randomid = getQueryVariable("randomid");
if (randomid && !whiteboardId) { //set random whiteboard on empty whiteboardid
    whiteboardId = Array(2).fill(null).map(() => Math.random().toString(36).substr(2)).join('');
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('whiteboardid', whiteboardId);
    window.location.search = urlParams;
}

whiteboardId = whiteboardId || "myNewWhiteboard";
whiteboardId = unescape(encodeURIComponent(whiteboardId)).replace(/[^a-zA-Z0-9 ]/g, "");
var myUsername = getQueryVariable("username");
var accessToken = getQueryVariable("accesstoken");
myUsername = myUsername || "unknown" + (Math.random() + "").substring(2, 6);
accessToken = accessToken || "";
var accessDenied = false;

// Custom Html Title
var title = getQueryVariable("title");
if (!title === false) {
    document.title = decodeURIComponent(title);
}

var url = document.URL.substr(0, document.URL.lastIndexOf('/'));
var signaling_socket = null;
var urlSplit = url.split("/");
var subdir = "";
for (var i = 3; i < urlSplit.length; i++) {
    subdir = subdir + '/' + urlSplit[i];
}
if (subdir != "") {
    signaling_socket = io("", { "path": subdir + "/socket.io" }); //Connect even if we are in a subdir behind a reverse proxy
} else {
    signaling_socket = io();
}

signaling_socket.on('connect', function () {
    console.log("Websocket connected!");

    signaling_socket.on('drawToWhiteboard', function (content) {
        whiteboard.handleEventsAndData(content, true);
    });

    signaling_socket.on('refreshUserBadges', function () {
        whiteboard.refreshUserBadges();
    });

    signaling_socket.on('wrongAccessToken', function () {
        if (!accessDenied) {
            accessDenied = true;
            showBasicAlert("Access denied! Wrong accessToken!")
        }
    });

    signaling_socket.on('updateSmallestScreenResolution', function (widthHeight) {
        whiteboard.updateSmallestScreenResolution(widthHeight["w"], widthHeight["h"]);
    });

    signaling_socket.emit('joinWhiteboard', { wid: whiteboardId, at: accessToken, windowWidthHeight: { w: $(window).width(), h: $(window).height() } });
});

$(document).ready(function () {
    if (getQueryVariable("webdav") == "true") {
        $("#uploadWebDavBtn").show();
    }
    whiteboard.loadWhiteboard("#whiteboardContainer", { //Load the whiteboard
        whiteboardId: whiteboardId,
        username: btoa(myUsername),
        sendFunction: function (content) {
            content["at"] = accessToken;
            signaling_socket.emit('drawToWhiteboard', content);
        }
    });

    // request whiteboard from server
    $.get(subdir + "/loadwhiteboard", { wid: whiteboardId, at: accessToken }).done(function (data) {
        whiteboard.loadData(data)
    });

    $(window).resize(function () {
        signaling_socket.emit('updateScreenResolution', { at: accessToken, windowWidthHeight: { w: $(window).width(), h: $(window).height() } });
    })

    /*----------------/
	Whiteboard actions
    /----------------*/

    //Handle key actions
    $(document).on("keydown", function (e) {
        if (e.which == 16) {
            whiteboard.pressedKeys["shift"] = true; //Used for straight lines...
        }
        //console.log(e.which);
    });
    $(document).on("keyup", function (e) {
        if (e.which == 16) {
            whiteboard.pressedKeys["shift"] = false;
        }
    });

    var shortcutFunctions = {
        clearWhiteboard: function () { whiteboard.clearWhiteboard(); },
        undoStep: function () { whiteboard.undoWhiteboardClick(); },
        redoStep: function () { whiteboard.redoWhiteboardClick(); },
        setTool_mouse: function () { $(".whiteboardTool[tool=mouse]").click(); },
        setTool_recSelect: function () { $(".whiteboardTool[tool=recSelect]").click(); },
        setTool_pen: function () {
            $(".whiteboardTool[tool=pen]").click();
            whiteboard.redrawMouseCursor();
        },
        setTool_line: function () { $(".whiteboardTool[tool=line]").click(); },
        setTool_rect: function () { $(".whiteboardTool[tool=rect]").click(); },
        setTool_circle: function () { $(".whiteboardTool[tool=circle]").click(); },
        setTool_text: function () { $(".whiteboardTool[tool=text]").click(); },
        setTool_eraser: function () {
            $(".whiteboardTool[tool=eraser]").click();
            whiteboard.redrawMouseCursor();
        },
        thickness_bigger: function () {
            var thickness = parseInt($("#whiteboardThicknessSlider").val()) + 1;
            $("#whiteboardThicknessSlider").val(thickness);
            whiteboard.setStrokeThickness(thickness);
            whiteboard.redrawMouseCursor();
        },
        thickness_smaller: function () {
            var thickness = parseInt($("#whiteboardThicknessSlider").val()) - 1;
            $("#whiteboardThicknessSlider").val(thickness);
            whiteboard.setStrokeThickness(thickness);
            whiteboard.redrawMouseCursor();
        },
        openColorPicker: function () { $("#whiteboardColorpicker").click(); },
        saveWhiteboardAsImage: function () { $("#saveAsImageBtn").click(); },
        saveWhiteboardAsJson: function () { $("#saveAsJSONBtn").click(); },
        uploadWhiteboardToWebDav: function () { $("#uploadWebDavBtn").click(); },
        uploadJsonToWhiteboard: function () { $("#uploadJsonBtn").click(); },
        shareWhiteboard: function () { $("#shareWhiteboardBtn").click(); },
        hideShowControls: function () { $("#minMaxBtn").click(); },

        setDrawColorBlack: function () {
            whiteboard.setDrawColor("black");
            whiteboard.redrawMouseCursor();
            $("#whiteboardColorpicker").css({ "background": "black" });
        },
        setDrawColorRed: function () {
            whiteboard.setDrawColor("red");
            whiteboard.redrawMouseCursor();
            $("#whiteboardColorpicker").css({ "background": "red" });
        },
        setDrawColorGreen: function () {
            whiteboard.setDrawColor("green");
            whiteboard.redrawMouseCursor();
            $("#whiteboardColorpicker").css({ "background": "green" });
        },
        setDrawColorBlue: function () {
            whiteboard.setDrawColor("blue");
            whiteboard.redrawMouseCursor();
            $("#whiteboardColorpicker").css({ "background": "blue" });
        },
        setDrawColorYellow: function () {
            whiteboard.setDrawColor("yellow");
            whiteboard.redrawMouseCursor();
            $("#whiteboardColorpicker").css({ "background": "yellow" });
        },

        toggleLineRecCircle: function () {
            var activeTool = $(".whiteboardTool.active").attr("tool");
            if (activeTool == "line") {
                $(".whiteboardTool[tool=rect]").click();
            } else if (activeTool == "rect") {
                $(".whiteboardTool[tool=circle]").click();
            } else {
                $(".whiteboardTool[tool=line]").click();
            }
        },
        togglePenEraser: function () {
            var activeTool = $(".whiteboardTool.active").attr("tool");
            if (activeTool == "pen") {
                $(".whiteboardTool[tool=eraser]").click();
            } else {
                $(".whiteboardTool[tool=pen]").click();
            }
        },
        toggleMainColors: function () {
            var bgColor = $("#whiteboardColorpicker")[0].style.backgroundColor;
            if (bgColor == "blue") {
                shortcutFunctions.setDrawColorGreen();
            } else if (bgColor == "green") {
                shortcutFunctions.setDrawColorYellow();
            } else if (bgColor == "yellow") {
                shortcutFunctions.setDrawColorRed();
            } else if (bgColor == "red") {
                shortcutFunctions.setDrawColorBlack();
            } else {
                shortcutFunctions.setDrawColorBlue();
            }
        },

        moveDraggableUp: function () {
            var elm = whiteboard.tool == "text" ? $("#" + whiteboard.latestActiveTextBoxId) : $(".dragMe")[0];
            var p = $(elm).position();
            $(elm).css({ top: p.top - 5, left: p.left })
        },
        moveDraggableDown: function () {
            var elm = whiteboard.tool == "text" ? $("#" + whiteboard.latestActiveTextBoxId) : $(".dragMe")[0];
            var p = $(elm).position();
            $(elm).css({ top: p.top + 5, left: p.left })
        },
        moveDraggableLeft: function () {
            var elm = whiteboard.tool == "text" ? $("#" + whiteboard.latestActiveTextBoxId) : $(".dragMe")[0];
            var p = $(elm).position();
            $(elm).css({ top: p.top, left: p.left - 5 })
        },
        moveDraggableRight: function () {
            var elm = whiteboard.tool == "text" ? $("#" + whiteboard.latestActiveTextBoxId) : $(".dragMe")[0];
            var p = $(elm).position();
            $(elm).css({ top: p.top, left: p.left + 5 })
        },
        dropDraggable: function () {
            $($(".dragMe")[0]).find('.addToCanvasBtn').click();
        },
        addToBackground: function () {
            $($(".dragMe")[0]).find('.addToBackgroundBtn').click();
        },
        cancelAllActions: function () { whiteboard.escKeyAction(); },
        deleteSelection: function () { whiteboard.delKeyAction(); },
    }

    //Load keybindings from keybinds.js to given functions
    for (var i in keybinds) {
        if (shortcutFunctions[keybinds[i]]) {
            keymage(i, shortcutFunctions[keybinds[i]], { preventDefault: true });
        } else {
            console.error("function you want to keybind on key:", i, "named:", keybinds[i], "is not available!")
        }
    }

    // whiteboard clear button
    $("#whiteboardTrashBtn").click(function () {
        $("#whiteboardTrashBtnConfirm").show().focus();
        $(this).css({ visibility: "hidden" });
    });

    $("#whiteboardTrashBtnConfirm").mouseout(function () {
        $(this).hide();
        $("#whiteboardTrashBtn").css({ visibility: "inherit" });
    });

    $("#whiteboardTrashBtnConfirm").click(function () {
        $(this).hide();
        $("#whiteboardTrashBtn").css({ visibility: "inherit" });
        whiteboard.clearWhiteboard();
    });

    // undo button
    $("#whiteboardUndoBtn").click(function () {
        whiteboard.undoWhiteboardClick();
    });

    // redo button
    $("#whiteboardRedoBtn").click(function () {
        whiteboard.redoWhiteboardClick();
    });

    // switch tool
    $(".whiteboardTool").click(function () {
        $(".whiteboardTool").removeClass("active");
        $(this).addClass("active");
        var activeTool = $(this).attr("tool");
        whiteboard.setTool(activeTool);
        if (activeTool == "mouse" || activeTool == "recSelect") {
            $(".activeToolIcon").empty();
        } else {
            $(".activeToolIcon").html($(this).html()); //Set Active icon the same as the button icon
        }
    });

    // upload image button
    $("#addImgToCanvasBtn").click(function () {
        showBasicAlert("Please drag the image into the browser.");
    });

    // save image as png
    $("#saveAsImageBtn").click(function () {
        var imgData = whiteboard.getImageDataBase64();

        var w = window.open('about:blank'); //Firefox will not allow downloads without extra window
        setTimeout(function () { //FireFox seems to require a setTimeout for this to work.
            var a = document.createElement('a');
            a.href = imgData;
            a.download = 'whiteboard.png';
            w.document.body.appendChild(a);
            a.click();
            w.document.body.removeChild(a);
            setTimeout(function () { w.close(); }, 100);
        }, 0);
    });

    // save image to json containing steps
    $("#saveAsJSONBtn").click(function () {
        var imgData = whiteboard.getImageDataJson();

        var w = window.open('about:blank'); //Firefox will not allow downloads without extra window
        setTimeout(function () { //FireFox seems to require a setTimeout for this to work.
            var a = document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob([imgData], { type: 'text/json' }));
            a.download = 'whiteboard.json';
            w.document.body.appendChild(a);
            a.click();
            w.document.body.removeChild(a);
            setTimeout(function () { w.close(); }, 100);
        }, 0);
    });

    $("#uploadWebDavBtn").click(function () {
        if ($(".webdavUploadBtn").length > 0) {
            return;
        }

        var webdavserver = localStorage.getItem('webdavserver') || ""
        var webdavpath = localStorage.getItem('webdavpath') || "/"
        var webdavusername = localStorage.getItem('webdavusername') || ""
        var webdavpassword = localStorage.getItem('webdavpassword') || ""
        var webDavHtml = $('<div>' +
            '<table>' +
            '<tr>' +
            '<td>Server URL:</td>' +
            '<td><input class="webdavserver" type="text" value="' + webdavserver + '" placeholder="https://yourserver.com/remote.php/webdav/"></td>' +
            '<td></td>' +
            '</tr>' +
            '<tr>' +
            '<td>Path:</td>' +
            '<td><input class="webdavpath" type="text" placeholder="folder" value="' + webdavpath + '"></td>' +
            '<td style="font-size: 0.7em;"><i>path always have to start & end with "/"</i></td>' +
            '</tr>' +
            '<tr>' +
            '<td>Username:</td>' +
            '<td><input class="webdavusername" type="text" value="' + webdavusername + '" placeholder="username"></td>' +
            '<td style="font-size: 0.7em;"></td>' +
            '</tr>' +
            '<tr>' +
            '<td>Password:</td>' +
            '<td><input class="webdavpassword" type="password" value="' + webdavpassword + '" placeholder="password"></td>' +
            '<td style="font-size: 0.7em;"></td>' +
            '</tr>' +
            '<tr>' +
            '<td style="font-size: 0.7em;" colspan="3">Note: You have to generate and use app credentials if you have 2 Factor Auth activated on your dav/nextcloud server!</td>' +
            '</tr>' +
            '<tr>' +
            '<td></td>' +
            '<td colspan="2"><span class="loadingWebdavText" style="display:none;">Saving to webdav, please wait...</span><button class="modalBtn webdavUploadBtn"><i class="fas fa-upload"></i> Start Upload</button></td>' +
            '</tr>' +
            '</table>' +
            '</div>');
        webDavHtml.find(".webdavUploadBtn").click(function () {
            var webdavserver = webDavHtml.find(".webdavserver").val();
            localStorage.setItem('webdavserver', webdavserver);
            var webdavpath = webDavHtml.find(".webdavpath").val();
            localStorage.setItem('webdavpath', webdavpath);
            var webdavusername = webDavHtml.find(".webdavusername").val();
            localStorage.setItem('webdavusername', webdavusername);
            var webdavpassword = webDavHtml.find(".webdavpassword").val();
            localStorage.setItem('webdavpassword', webdavpassword);
            var base64data = whiteboard.getImageDataBase64();
            var webdavaccess = {
                webdavserver: webdavserver,
                webdavpath: webdavpath,
                webdavusername: webdavusername,
                webdavpassword: webdavpassword
            }
            webDavHtml.find(".loadingWebdavText").show();
            webDavHtml.find(".webdavUploadBtn").hide();
            saveWhiteboardToWebdav(base64data, webdavaccess, function (err) {
                if (err) {
                    webDavHtml.find(".loadingWebdavText").hide();
                    webDavHtml.find(".webdavUploadBtn").show();
                } else {
                    webDavHtml.parents(".basicalert").remove();
                }
            });
        })
        showBasicAlert(webDavHtml, {
            header: "Save to Webdav",
            okBtnText: "cancel",
            headercolor: "#0082c9"
        })
    });

    // upload json containing steps
    $("#uploadJsonBtn").click(function () {
        $("#myFile").click();
    });

    $("#shareWhiteboardBtn").click(function () {
        var url = window.location.href;
        var s = url.indexOf("&username=") !== -1 ? "&username=" : "username="; //Remove username from url
        var urlSlpit = url.split(s);
        var urlStart = urlSlpit[0];
        if (urlSlpit.length > 1) {
            var endSplit = urlSlpit[1].split("&");
            endSplit = endSplit.splice(1, 1);
            urlStart += "&" + endSplit.join("&");
        }
        $("<textarea/>").appendTo("body").val(urlStart).select().each(function () {
            document.execCommand('copy');
        }).remove();
        showBasicAlert("Copied Whiteboard-URL to clipboard.", { hideAfter: 2 })
    });

    var btnsMini = false;
    $("#minMaxBtn").click(function () {
        if (!btnsMini) {
            $("#toolbar").find(".btn-group:not(.minGroup)").hide();
            $(this).find("#minBtn").hide();
            $(this).find("#maxBtn").show();
        } else {
            $("#toolbar").find(".btn-group").show();
            $(this).find("#minBtn").show();
            $(this).find("#maxBtn").hide();
        }
        btnsMini = !btnsMini;
    })

    // load json to whiteboard
    $("#myFile").on("change", function () {
        var file = document.getElementById("myFile").files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var j = JSON.parse(e.target.result);
                whiteboard.loadJsonData(j);
            } catch (e) {
                showBasicAlert("File was not a valid JSON!");
            }
        };
        reader.readAsText(file);
        $(this).val("");
    });

    // On thickness slider change
    $("#whiteboardThicknessSlider").on("input", function () {
        whiteboard.setStrokeThickness($(this).val());
    });

    // handle drag&drop
    var dragCounter = 0;
    $('#whiteboardContainer').on("dragenter", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        whiteboard.dropIndicator.show();
    });

    $('#whiteboardContainer').on("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            whiteboard.dropIndicator.hide();
        }
    });

    $('#whiteboardContainer').on('drop', function (e) { //Handle drop
        if (e.originalEvent.dataTransfer) {
            if (e.originalEvent.dataTransfer.files.length) { //File from harddisc
                e.preventDefault();
                e.stopPropagation();
                var filename = e.originalEvent.dataTransfer.files[0]["name"];
                if (isImageFileName(filename)) {
                    var blob = e.originalEvent.dataTransfer.files[0];
                    var reader = new window.FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = function () {
                        base64data = reader.result;
                        uploadImgAndAddToWhiteboard(base64data);
                    }
                } else {
                    showBasicAlert("File must be an image!");
                }
            } else { //File from other browser

                var fileUrl = e.originalEvent.dataTransfer.getData('URL');
                var imageUrl = e.originalEvent.dataTransfer.getData('text/html');
                var rex = /src="?([^"\s]+)"?\s*/;
                var url = rex.exec(imageUrl);
                if (url && url.length > 1) {
                    url = url[1];
                } else {
                    url = "";
                }

                isValidImageUrl(fileUrl, function (isImage) {
                    if (isImage && isImageFileName(url)) {
                        whiteboard.addImgToCanvasByUrl(fileUrl);
                    } else {
                        isValidImageUrl(url, function (isImage) {
                            if (isImage) {
                                if (isImageFileName(url) || url.startsWith("http")) {
                                    whiteboard.addImgToCanvasByUrl(url);
                                } else {
                                    uploadImgAndAddToWhiteboard(url); //Last option maybe its base64
                                }
                            } else {
                                showBasicAlert("Can only upload Imagedata!");
                            }
                        });
                    }
                });
            }
        }
        dragCounter = 0;
        whiteboard.dropIndicator.hide();
    });

    $('#whiteboardColorpicker').colorPicker({
        renderCallback: function (elm) {
            whiteboard.setDrawColor(elm.val());
        }
    });
});

//Prevent site from changing tab on drag&drop
window.addEventListener("dragover", function (e) {
    e = e || event;
    e.preventDefault();
}, false);
window.addEventListener("drop", function (e) {
    e = e || event;
    e.preventDefault();
}, false);

function uploadImgAndAddToWhiteboard(base64data) {
    var date = (+new Date());
    $.ajax({
        type: 'POST',
        url: document.URL.substr(0, document.URL.lastIndexOf('/')) + '/upload',
        data: {
            'imagedata': base64data,
            'whiteboardId': whiteboardId,
            'date': date,
            'at': accessToken
        },
        success: function (msg) {
            var filename = whiteboardId + "_" + date + ".png";
            whiteboard.addImgToCanvasByUrl(document.URL.substr(0, document.URL.lastIndexOf('/')) + "/uploads/" + filename); //Add image to canvas
            console.log("Image uploaded!");
        },
        error: function (err) {
            showBasicAlert("Failed to upload frame: " + JSON.stringify(err));
        }
    });
}

function saveWhiteboardToWebdav(base64data, webdavaccess, callback) {
    var date = (+new Date());
    $.ajax({
        type: 'POST',
        url: document.URL.substr(0, document.URL.lastIndexOf('/')) + '/upload',
        data: {
            'imagedata': base64data,
            'whiteboardId': whiteboardId,
            'date': date,
            'at': accessToken,
            'webdavaccess': JSON.stringify(webdavaccess)
        },
        success: function (msg) {
            showBasicAlert("Whiteboard was saved to Webdav!", {
                headercolor: "#5c9e5c"
            });
            console.log("Image uploaded for webdav!");
            callback();
        },
        error: function (err) {
            if (err.status == 403) {
                showBasicAlert("Could not connect to Webdav folder! Please check the credentials and paths and try again!");
            } else {
                showBasicAlert("Unknown Webdav error! ", err);
            }
            callback(err);
        }
    });
}

// verify if filename refers to an image
function isImageFileName(filename) {
    var extension = filename.split(".")[filename.split(".").length - 1];
    var known_extensions = ["png", "jpg", "jpeg", "gif", "tiff", "bmp", "webp"];
    return known_extensions.includes(extension.toLowerCase());
}

// verify if given url is url to an image
function isValidImageUrl(url, callback) {
    var img = new Image();
    var timer = null;
    img.onerror = img.onabort = function () {
        clearTimeout(timer);
        callback(false);
    };
    img.onload = function () {
        clearTimeout(timer);
        callback(true);
    };
    timer = setTimeout(function () {
        callback(false);
    }, 2000);
    img.src = url;
}

// handle pasting from clipboard
window.addEventListener("paste", function (e) {
    if ($(".basicalert").length > 0) {
        return;
    }
    if (e.clipboardData) {
        var items = e.clipboardData.items;
        var imgItemFound = false;
        if (items) {
            // Loop through all items, looking for any kind of image
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    imgItemFound = true;
                    // We need to represent the image as a file,
                    var blob = items[i].getAsFile();

                    var reader = new window.FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = function () {
                        console.log("Uploading image!");
                        base64data = reader.result;
                        uploadImgAndAddToWhiteboard(base64data);
                    }
                }
            }
        }

        if (!imgItemFound && whiteboard.tool != "text") {
            showBasicAlert("Please Drag&Drop the image into the Whiteboard. (Browsers don't allow copy+past from the filesystem directly)");
        }
    }
});

function showBasicAlert(html, newOptions) {
    var options = {
        header: "INFO MESSAGE",
        okBtnText: "Ok",
        headercolor: "#d25d5d",
        hideAfter: false
    }
    if (newOptions) {
        for (var i in newOptions) {
            options[i] = newOptions[i];
        }
    }
    var alertHtml = $('<div class="basicalert" style="position:absolute; top:0px; left:0px; width:100%; top:70px; font-family: monospace;">' +
        '<div style="width: 30%; margin: auto; background: #aaaaaa; border-radius: 5px; font-size: 1.2em; border: 1px solid gray;">' +
        '<div style="border-bottom: 1px solid #676767; background: ' + options["headercolor"] + '; padding-left: 5px; font-size: 0.8em;">' + options["header"] + '</div>' +
        '<div style="padding: 10px;" class="htmlcontent"></div>' +
        '<div style="height: 20px; padding: 10px;"><button class="modalBtn okbtn" style="float: right;">' + options["okBtnText"] + '</button></div>' +
        '</div>' +
        '</div>');
    alertHtml.find(".htmlcontent").append(html);
    $("body").append(alertHtml);
    alertHtml.find(".okbtn").click(function () {
        alertHtml.remove();
    })
    if (options.hideAfter) {
        setTimeout(function () {
            alertHtml.find(".okbtn").click();
        }, 1000 * options.hideAfter)
    }
}

// get 'GET' parameter by variable name
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
}