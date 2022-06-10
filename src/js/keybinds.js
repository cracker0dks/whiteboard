/* -----------
 KEYBINDINGS
----------- */

//> defmod is "command" on OS X and "ctrl" elsewhere
//Advanced Example: 'defmod-k j' -> For this to fire you have to first press both ctrl and k, and then j.

const keybinds = {
    // 'key(s)' : 'function',
    "defmod-shift-del": "clearWhiteboard",
    "defmod-z": "undoStep",
    "defmod-y": "redoStep",
    "defmod-x": "setTool_recSelect",
    "defmod-m": "setTool_mouse",
    "defmod-p": "setTool_pen",
    "defmod-l": "setTool_line",
    "defmod-r": "setTool_rect",
    "defmod-c": "setTool_circle",
    "defmod-shift-f": "toggleLineRecCircle",
    "defmod-shift-x": "togglePenEraser",
    "defmod-shift-r": "toggleMainColors",
    "defmod-a": "setTool_text",
    "defmod-e": "setTool_eraser",
    "defmod-up": "thickness_bigger",
    "defmod-down": "thickness_smaller",
    "defmod-shift-c": "openColorPicker",
    "defmod-shift-1": "setDrawColorBlack",
    "defmod-shift-2": "setDrawColorBlue",
    "defmod-shift-3": "setDrawColorGreen",
    "defmod-shift-4": "setDrawColorYellow",
    "defmod-shift-5": "setDrawColorRed",
    "defmod-s": "saveWhiteboardAsImage",
    "defmod-shift-k": "saveWhiteboardAsJson",
    "defmod-shift-i": "uploadWhiteboardToWebDav",
    "defmod-shift-j": "uploadJsonToWhiteboard",
    "defmod-shift-s": "shareWhiteboard",
    tab: "hideShowControls",
    up: "moveDraggableUp",
    down: "moveDraggableDown",
    left: "moveDraggableLeft",
    right: "moveDraggableRight",
    "defmod-enter": "dropDraggable",
    "shift-enter": "addToBackground",
    escape: "cancelAllActions",
    del: "deleteSelection",
};

export default keybinds;
