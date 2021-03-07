//This file is only for saving the whiteboard.
const fs = require("fs");
const config = require("./config/config");

var savedBoards = {};
var savedUndos = {};
var saveDelay = false;

if (config.backend.enableFileDatabase) {
    //read saved boards from file
    fs.readFile("savedBoards.json", (err, data) => {
        if (err) {
            return console.log(
                "Not persistend Whiteboard Datafile found... this is not a problem on the first start!"
            );
        }
        savedBoards = JSON.parse(data);
    });
}

module.exports = {
    handleEventsAndData: function (content) {
        var tool = content["t"]; //Tool witch is used
        var wid = content["wid"]; //whiteboard ID
        var username = content["username"];
        if (tool === "clear") {
            //Clear the whiteboard
            delete savedBoards[wid];
            delete savedUndos[wid];
        } else if (tool === "undo") {
            //Undo an action
            if (!savedUndos[wid]) {
                savedUndos[wid] = [];
            }
            if (savedBoards[wid]) {
                for (var i = savedBoards[wid].length - 1; i >= 0; i--) {
                    if (savedBoards[wid][i]["username"] == username) {
                        var drawId = savedBoards[wid][i]["drawId"];
                        for (var i = savedBoards[wid].length - 1; i >= 0; i--) {
                            if (
                                savedBoards[wid][i]["drawId"] == drawId &&
                                savedBoards[wid][i]["username"] == username
                            ) {
                                savedUndos[wid].push(savedBoards[wid][i]);
                                savedBoards[wid].splice(i, 1);
                            }
                        }
                        break;
                    }
                }
                if (savedUndos[wid].length > 1000) {
                    savedUndos[wid].splice(0, savedUndos[wid].length - 1000);
                }
            }
        } else if (tool === "redo") {
            if (!savedUndos[wid]) {
                savedUndos[wid] = [];
            }
            if (!savedBoards[wid]) {
                savedBoards[wid] = [];
            }
            for (var i = savedUndos[wid].length - 1; i >= 0; i--) {
                if (savedUndos[wid][i]["username"] == username) {
                    var drawId = savedUndos[wid][i]["drawId"];
                    for (var i = savedUndos[wid].length - 1; i >= 0; i--) {
                        if (
                            savedUndos[wid][i]["drawId"] == drawId &&
                            savedUndos[wid][i]["username"] == username
                        ) {
                            savedBoards[wid].push(savedUndos[wid][i]);
                            savedUndos[wid].splice(i, 1);
                        }
                    }
                    break;
                }
            }
        } else if (
            [
                "line",
                "pen",
                "rect",
                "circle",
                "eraser",
                "addImgBG",
                "recSelect",
                "eraseRec",
                "addTextBox",
                "setTextboxText",
                "removeTextbox",
                "setTextboxPosition",
                "setTextboxFontSize",
                "setTextboxFontColor",
            ].includes(tool)
        ) {
            //Save all this actions
            savedBoards[wid] = savedBoards[wid] ? savedBoards[wid] : [];
            delete content["wid"]; //Delete id from content so we don't store it twice
            if (tool === "setTextboxText") {
                for (var i = savedBoards[wid].length - 1; i >= 0; i--) {
                    //Remove old textbox tex -> dont store it twice
                    if (
                        savedBoards[wid][i]["t"] === "setTextboxText" &&
                        savedBoards[wid][i]["d"][0] === content["d"][0]
                    ) {
                        savedBoards[wid].splice(i, 1);
                    }
                }
            }
            savedBoards[wid].push(content);
        }

        if (config.backend.enableFileDatabase) {
            //Save whiteboard to file
            if (!saveDelay) {
                saveDelay = true;
                setTimeout(function () {
                    saveDelay = false;
                    fs.writeFile("savedBoards.json", JSON.stringify(savedBoards), (err) => {
                        if (err) {
                            return console.log(err);
                        }
                    });
                }, 1000 * 10); //Save after 10 sec
            }
        }
    },
    loadStoredData: function (wid) {
        //Load saved whiteboard
        return savedBoards[wid] ? savedBoards[wid] : [];
    },
};
