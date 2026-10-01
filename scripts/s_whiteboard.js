//This file is only for saving the whiteboard.
import fs from "fs";
import config from "./config/config.js";
import ReadOnlyBackendService from "./services/ReadOnlyBackendService.js";
import { getSafeFilePath } from "./utils.js";
const FILE_DATABASE_FOLDER = "savedBoards";

var savedBoards = {};
var savedUndos = {};
var saveDelay = {};
// last activity (ms timestamp) per whiteboard, used for idle auto-delete
var lastActivity = {};

/**
 * Translate the coords of a single saved board item by (dx, dy)
 * (same formats as on the client, see whiteboard.js translateItem)
 */
function translateItem(item, dx, dy) {
    const d = item["d"];
    // d and the deltas come from client-controlled socket data; refuse
    // anything that is not an all-numeric array (type-confusion guard)
    if (
        !Array.isArray(d) ||
        d.length === 0 ||
        d.some((n) => !Number.isFinite(n)) ||
        !Number.isFinite(dx) ||
        !Number.isFinite(dy)
    ) {
        return;
    }
    const t = item["t"];
    if (t === "pen" || t === "line" || t === "eraser") {
        for (let i = 0; i + 1 < d.length; i += 2) {
            d[i] += dx;
            d[i + 1] += dy;
        }
    } else if (t === "rect") {
        d[0] += dx;
        d[1] += dy;
        d[2] += dx;
        d[3] += dy;
    } else if (t === "circle") {
        d[0] += dx;
        d[1] += dy;
    } else if (t === "addImgBG") {
        d[2] += dx;
        d[3] += dy;
    }
}

if (config.backend.enableFileDatabase) {
    // make sure that folder with saved boards exists
    fs.mkdirSync(FILE_DATABASE_FOLDER, {
        // this option also mutes an error if path exists
        recursive: true,
    });
}

/**
 * Get the file path for a whiteboard.
 * @param {string} wid Whiteboard id to get the path for
 * @returns {string} File path to the whiteboard
 * @throws {Error} if wid contains potentially unsafe directory characters
 */
function fileDatabasePath(wid) {
    return getSafeFilePath(FILE_DATABASE_FOLDER, wid + ".json");
}

const s_whiteboard = {
    handleEventsAndData: function (content) {
        var tool = content["t"]; //Tool witch is used
        var wid = content["wid"]; //whiteboard ID
        var username = content["username"];
        this.touchWhiteboard(wid);
        if (tool === "clear") {
            //Clear the whiteboard
            delete savedBoards[wid];
            delete savedUndos[wid];
            // delete the corresponding file too
            fs.unlink(fileDatabasePath(wid), function (err) {
                if (err) {
                    return console.log(err);
                }
            });
        } else if (tool === "undo") {
            //Undo an action
            if (!savedUndos[wid]) {
                savedUndos[wid] = [];
            }
            const savedBoard = this.loadStoredData(wid);
            for (let i = savedBoard.length - 1; i >= 0; i--) {
                if (savedBoard[i]["username"] == username) {
                    const drawId = savedBoard[i]["drawId"];
                    for (let j = savedBoard.length - 1; j >= 0; j--) {
                        if (
                            savedBoard[j]["drawId"] == drawId &&
                            savedBoard[j]["username"] == username
                        ) {
                            const item = savedBoard[j];
                            savedBoard.splice(j, 1);
                            if (item["t"] === "removeDraw" && item["d"] && item["d"][1]) {
                                // undo of a stroke removal: put the removed stroke back
                                const removed = JSON.parse(JSON.stringify(item["d"][1]));
                                const idx = Math.min(item["d"][0] || 0, savedBoard.length);
                                savedBoard.splice(idx, 0, removed);
                            }
                            if (item["t"] === "moveDraw" && item["d"]) {
                                // undo of a stroke move: move the group back
                                savedBoard.forEach(function (other) {
                                    if (
                                        other["drawId"] === item["d"][2] &&
                                        other["username"] === item["d"][3]
                                    ) {
                                        translateItem(other, -item["d"][0], -item["d"][1]);
                                    }
                                });
                            }
                            savedUndos[wid].push(item);
                        }
                    }
                    break;
                }
            }
            if (savedUndos[wid].length > 1000) {
                savedUndos[wid].splice(0, savedUndos[wid].length - 1000);
            }
        } else if (tool === "redo") {
            if (!savedUndos[wid]) {
                savedUndos[wid] = [];
            }
            const savedBoard = this.loadStoredData(wid);
            for (let i = savedUndos[wid].length - 1; i >= 0; i--) {
                if (savedUndos[wid][i]["username"] == username) {
                    const drawId = savedUndos[wid][i]["drawId"];
                    for (let j = savedUndos[wid].length - 1; j >= 0; j--) {
                        if (
                            savedUndos[wid][j]["drawId"] == drawId &&
                            savedUndos[wid][j]["username"] == username
                        ) {
                            const item = savedUndos[wid][j];
                            if (item["t"] === "removeDraw" && item["d"] && item["d"][1]) {
                                // redo of a stroke removal: remove the stroke again
                                const removed = item["d"][1];
                                for (let k = savedBoard.length - 1; k >= 0; k--) {
                                    if (
                                        savedBoard[k]["drawId"] === removed["drawId"] &&
                                        savedBoard[k]["username"] === removed["username"]
                                    ) {
                                        savedBoard.splice(k, 1);
                                    }
                                }
                            }
                            if (item["t"] === "moveDraw" && item["d"]) {
                                // redo of a stroke move: move the group again
                                savedBoard.forEach(function (other) {
                                    if (
                                        other["drawId"] === item["d"][2] &&
                                        other["username"] === item["d"][3]
                                    ) {
                                        translateItem(other, item["d"][0], item["d"][1]);
                                    }
                                });
                            }
                            savedBoard.push(item);
                            savedUndos[wid].splice(j, 1);
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
                "setTextboxSize",
                "removeDraw",
                "moveDraw",
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
            if (tool === "removeDraw") {
                // normalize: remove the stroke group from the saved log so
                // the stored board holds the final state (the marker pushed
                // below only exists for undo/redo)
                const removed = content["d"] && content["d"][1];
                if (removed && removed["drawId"] !== undefined) {
                    for (let i = savedBoard.length - 1; i >= 0; i--) {
                        if (
                            savedBoard[i]["drawId"] === removed["drawId"] &&
                            savedBoard[i]["username"] === removed["username"]
                        ) {
                            savedBoard.splice(i, 1);
                        }
                    }
                }
            } else if (tool === "moveDraw") {
                // normalize: move the stroke group to its final position
                savedBoard.forEach(function (item) {
                    if (
                        item["drawId"] === content["d"][2] &&
                        item["username"] === content["d"][3]
                    ) {
                        translateItem(item, content["d"][0], content["d"][1]);
                    }
                });
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
                            fileDatabasePath(wid),
                            JSON.stringify(savedBoards[wid]),
                            (err) => {
                                if (err) {
                                    return console.log(err);
                                }
                            },
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
            var filePath = fileDatabasePath(wid);
            if (fs.existsSync(filePath)) {
                var data = fs.readFileSync(filePath);
                if (data) {
                    savedBoards[wid] = JSON.parse(data);
                }
            }
        }

        return savedBoards[wid];
    },
    /**
     * Record activity on a whiteboard (used for idle auto-delete, see issue #53)
     * @param {string} wid whiteboard ID
     */
    touchWhiteboard: function (wid) {
        if (wid) {
            lastActivity[wid] = Date.now();
        }
    },
    /**
     * Delete whiteboards that have been idle for longer than
     * config.backend.autoDeleteIdleMinutes (0 = feature disabled).
     * Removes the in-memory state, the saved board file (if the file database
     * is enabled) and the per-board uploads directory.
     * @returns {string[]} the ids of the deleted whiteboards
     */
    cleanupExpiredBoards: function () {
        const idleMinutes = config.backend.autoDeleteIdleMinutes;
        if (!idleMinutes || idleMinutes <= 0) {
            return [];
        }
        const idleMs = idleMinutes * 60 * 1000;
        const now = Date.now();
        const expired = [];
        // key on lastActivity: boards that were only joined (never drawn on)
        // are not in savedBoards yet would leak otherwise
        for (const wid of Object.keys(lastActivity)) {
            if (now - lastActivity[wid] > idleMs) {
                expired.push(wid);
            }
        }
        expired.forEach(function (wid) {
            console.log("Auto-deleting idle whiteboard:", wid);
            delete savedBoards[wid];
            delete savedUndos[wid];
            delete lastActivity[wid];
            if (config.backend.enableFileDatabase) {
                fs.unlink(fileDatabasePath(wid), function (err) {
                    if (err && err.code !== "ENOENT") {
                        console.log(err);
                    }
                });
            }
            // remove the per-board uploads dir (public/uploads/<readOnlyWid>)
            const uploadsDir = getSafeFilePath(
                "public/uploads",
                ReadOnlyBackendService.getReadOnlyId(wid),
            );
            fs.rm(uploadsDir, { recursive: true, force: true }, function (err) {
                if (err && err.code !== "ENOENT") {
                    console.log(err);
                }
            });
        });
        return expired;
    },
};

export { s_whiteboard as default };
