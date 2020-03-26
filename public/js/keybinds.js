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
    'defmod-shift-0' : 'setDrawColorBlack',
    'defmod-shift-1' : 'setDrawColorBlue',
    'defmod-shift-2' : 'setDrawColorGreen',
    'defmod-shift-3' : 'setDrawColorYellow',
    'defmod-shift-4' : 'setDrawColorRed',
    'defmod-shift-s' : 'saveWhiteboardAsImage',
    'defmod-shift-j' : 'saveWhiteboardAsJson',
    'defmod-shift-w' : 'uploadWhiteboardToWebDav',
    'defmod-shift-j' : 'uploadJsonToWhiteboard',
    'defmod-shift-s' : 'shareWhiteboard',
    'tab' : 'hideShowControls',
    'up' : 'moveDraggableUp',
    'down' : 'moveDraggableDown',
    'left' : 'moveDraggableLeft',
    'right' : 'moveDraggableRight',
    'enter' : 'dropDraggable',
    'shift-enter' : 'addToBackground',
    'escape' : 'cancelAllActions',
    'del' : 'deleteSelection'
}