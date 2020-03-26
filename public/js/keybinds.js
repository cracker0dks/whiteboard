/* -----------
 KEYBINDINGS
----------- */ 

//> defmod is "command" on OS X and "ctrl" elsewhere
//Advanced Example: 'defmod-k j' -> For this to fire you have to first press both ctrl and k, and then j. 

var keybinds = {
    // 'key(s)' : 'function',
    'defmod-shift-z' : 'clearWhiteboard',
    'defmod-z' : 'undoStep', 
    'defmod-x' : 'setTool_recSelect',
    'defmod-m' : 'setTool_mouse',
    'defmod-p' : 'setTool_pen',
    'defmod-l' : 'setTool_line',
    'defmod-r' : 'setTool_rect',
    'defmod-c' : 'setTool_circle',
    'defmod-shift-f' : 'toggleLineRecCircle',
    'defmod-shift-p' : 'togglePenEraser',
    'defmod-shift-r' : 'toggleMainColors',
    'defmod-a' : 'setTool_text',
    'defmod-e' : 'setTool_eraser',
    'defmod-up' : 'thickness_bigger',
    'defmod-down' : 'thickness_smaller',
    'defmod-shift-c' : 'openColorPicker',
    'defmod-0' : 'setDrawColorBlack',
    'defmod-1' : 'setDrawColorBlue',
    'defmod-2' : 'setDrawColorGreen',
    'defmod-3' : 'setDrawColorYellow',
    'defmod-4' : 'setDrawColorRed',
    'defmod-s' : 'saveWhiteboardAsImage',
    'defmod-j' : 'saveWhiteboardAsJson',
    'defmod-shift-w' : 'uploadWhiteboardToWebDav',
    'defmod-shift-j' : 'uploadJsonToWhiteboard',
    'defmod-shift-s' : 'shareWhiteboard',
    'tab' : 'hideShowControls',
    'up' : 'moveDraggableUp',
    'down' : 'moveDraggableDown',
    'left' : 'moveDraggableLeft',
    'right' : 'moveDraggableRight',
    'enter' : 'dropDraggable',
    'defmod-enter' : 'addToBackground',
    'escape' : 'cancelAllActions',
    'del' : 'deleteSelection'
}