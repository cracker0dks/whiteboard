//This file is only for saving the whiteboard.
const fs = require("fs");
const config = require("./config/config");

var savedBoards = {};
var savedUndos = {};
var saveDelay = {};

if (config.backend.enableFileDatabase) {
    // make sure that folder with saved boards exists
    fs.mkdirSync("savedBoards", {
        // this option also mutes an error if path exists
        recursive: true,
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
            // delete the corresponding file too
            fs.unlink("savedBoards/" + wid + ".json", function (err) {
                if (err) {
                    return console.log(err);
                }
            });
        } else if (tool === "undo") {
            //Undo an action
            if (!savedUndos[wid]) {
                savedUndos[wid] = [];
            }
            let savedBoard = this.loadStoredData(wid);
            if (savedBoard) {
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
            let savedBoard = this.loadStoredData(wid);
            for (var i = savedUndos[wid].length - 1; i >= 0; i--) {
                if (savedUndos[wid][i]["username"] == username) {
                    var drawId = savedUndos[wid][i]["drawId"];
                    for (var i = savedUndos[wid].length - 1; i >= 0; i--) {
                        if (
                            savedUndos[wid][i]["drawId"] == drawId &&
                            savedUndos[wid][i]["username"] == username
                        ) {
                            savedBoard.push(savedUndos[wid][i]);
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
            let savedBoard = this.loadStoredData(wid);
            //Save all this actions
            delete content["wid"]; //Delete id from content so we don't store it twice
            if (tool === "setTextboxText") {
                for (var i = savedBoard.length - 1; i >= 0; i--) {
                    //Remove old textbox tex -> dont store it twice
                    if (
                        savedBoard[i]["t"] === "setTextboxText" &&
                        savedBoard[i]["d"][0] === content["d"][0]
                    ) {
                        savedBoard.splice(i, 1);
                    }
                }
            }
            savedBoard.push(content);
        }
        this.saveToDB(wid);
    },
    saveToDB: function (wid) {
        if (config.backend.enableFileDatabase) {
            //Save whiteboard to file
            if (!saveDelay[wid]) {
                saveDelay[wid] = true;
                setTimeout(function () {
                    saveDelay[wid] = false;
                    if (savedBoards[wid]) {
                        fs.writeFile(
                            "savedBoards/" + wid + ".json",
                            JSON.stringify(savedBoards[wid]),
                            (err) => {
                                if (err) {
                                    return console.log(err);
                                }
                            }
                        );
                    }
                }, 1000 * 10); //Save after 10 sec
            }
        }
    },
    // Load saved whiteboard
    loadStoredData: function (wid) {
        if (wid in savedBoards) {
            return savedBoards[wid];
        }

        savedBoards[wid] = [];

        // try to load from DB
        if (config.backend.enableFileDatabase) {
            //read saved board from file
            var filePath = "savedBoards/" + wid + ".json";
            if (fs.existsSync(filePath)) {
                var data = fs.readFileSync(filePath);
                if (data) {
                    savedBoards[wid] = JSON.parse(data);
                }
            }
        }

        return savedBoards[wid];
    },
    copyStoredData: function (sourceWid, targetWid) {
        const sourceData = this.loadStoredData(sourceWid);
        if (sourceData.length === 0 || this.loadStoredData(targetWid).lenght > 0) {
            return;
        }
        savedBoards[targetWid] = sourceData.slice();
        this.saveToDB(targetWid);
    },
    saveData: function (wid, data) {
        const existingData = this.loadStoredData(wid);
        if (existingData.length > 0 || !data) {
            return;
        }
        savedBoards[wid] = JSON.parse(data);
        this.saveToDB(wid);
    },
};
