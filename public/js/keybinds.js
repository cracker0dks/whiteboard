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
    'defmod-d' : 'switchLineRecCircle',
    'defmod-a' : 'setTool_text',
    'defmod-e' : 'setTool_eraser',
    'defmod-up' : 'thickness_bigger',
    'defmod-down' : 'thickness_smaller',
    'shift-c' : 'openColorPicker',
    'shift-0' : 'setDrawColorBlack',
    'shift-1' : 'setDrawColorBlue',
    'shift-2' : 'setDrawColorGreen',
    'shift-3' : 'setDrawColorYellow',
    'shift-4' : 'setDrawColorRed',
    'defmod-s' : 'saveWhiteboardAsImage',
    'defmod-j' : 'saveWhiteboardAsJson',
    'defmod-w' : 'uploadWhiteboardToWebDav',
    'shift-j' : 'uploadJsonToWhiteboard',
    'shift-s' : 'shareWhiteboard',
    'tab' : 'hideShowControls',
    'up' : 'moveDraggableUp',
    'down' : 'moveDraggableDown',
    'left' : 'moveDraggableLeft',
    'right' : 'moveDraggableRight',
    'enter' : 'dropDraggable',
    'escape' : 'cancelAllActions',
    'del' : 'deleteSelection'
}