var whiteboardId = getQueryVariable("whiteboardid");
whiteboardId = whiteboardId || "myNewWhiteboard";
var myUsername = getQueryVariable("username");
var accessToken = getQueryVariable("accesstoken");
myUsername = myUsername || "unknown" + (Math.random() + "").substring(2, 6);
accessToken = accessToken || "";
var accessDenied = false;

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
        if(!accessDenied) {
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
    whiteboard.loadWhiteboard("#whiteboardContainer", { //Load the whiteboard
        whiteboardId: whiteboardId,
        username: myUsername,
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
        if (e.which == 17) {
            whiteboard.pressedKeys["strg"] = true;
        } else if (e.which == 90) { //z key
            if (whiteboard.pressedKeys["strg"] && !whiteboard.pressedKeys["z"]) {
                whiteboard.undoWhiteboardClick();
            }
            whiteboard.pressedKeys["z"] = true;
        } else if (e.which == 16) {
            whiteboard.pressedKeys["shift"] = true; //Used for straight lines...
        } else if (e.which == 27) { //Esc
            whiteboard.escKeyAction();
        } else if (e.which == 46) { //Remove / Entf
            whiteboard.entfKeyAction();
        }
        //console.log(e.which);
    });
    $(document).on("keyup", function (e) {
        if (e.which == 17) {
            whiteboard.pressedKeys["strg"] = false;
        } else if (e.which == 90) {
            whiteboard.pressedKeys["z"] = false;
        } else if (e.which == 16) {
            whiteboard.pressedKeys["shift"] = false;
        }
    });

    // whiteboard clear button
    $("#whiteboardTrashBtn").click(function () {
        $("#whiteboardTrashBtnConfirm").show().focus();
    });

    $("#whiteboardTrashBtnConfirm").focusout(function () {
        $(this).hide();
    });

    $("#whiteboardTrashBtnConfirm").click(function () {
        $(this).hide();
        whiteboard.clearWhiteboard();
    });

    // undo button
    $("#whiteboardUndoBtn").click(function () {
        whiteboard.undoWhiteboardClick();
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
        showBasicAlert("Copied Whiteboard-URL to clipboard.")
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

// verify if filename refers to an image
function isImageFileName(filename) {
    var extension = filename.split(".")[filename.split(".").length - 1];
    var known_extensions = ["png", "jpg", "jpeg", "gif", "tiff", "bmp"];
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

        if (!imgItemFound && whiteboard.tool!="text") {
            showBasicAlert("Please Drag&Drop the image into the Whiteboard. (Browsers don't allow copy+past from the filesystem directly)");
        }
    }
});

function showBasicAlert(text) {
    var alertHtml = $('<div style="position:absolute; top:0px; left:0px; width:100%; top:70px; font-family: monospace;">' +
        '<div style="width: 30%; margin: auto; background: #aaaaaa; border-radius: 5px; font-size: 1.2em; border: 1px solid gray;">'+
        '<div style="border-bottom: 1px solid #676767; background: #d25d5d; padding-left: 5px; font-size: 0.8em;">INFO MESSAGE</div>'+
        '<div style="padding: 10px;">' + text + '</div>'+
        '<div style="height: 20px; padding: 10px;"><button style="float: right; padding: 5px; border-radius: 5px; border: 0px; min-width: 50px; cursor: pointer;">Ok</button></div>'+
        '</div>' +
        '</div>');
    $("body").append(alertHtml);
    alertHtml.find("button").click(function () {
        alertHtml.remove();
    })
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