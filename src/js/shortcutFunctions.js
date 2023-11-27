import whiteboard from "./whiteboard.js";
import ReadOnlyService from "./services/ReadOnlyService.js";

/**
 * @param {function} callback
 * @param {boolean} readOnlySensitive should the shortcut function be active event when the whiteboard is in read-only mode
 */
function defineShortcut(callback, readOnlySensitive = true) {
    return () => {
        if (readOnlySensitive && ReadOnlyService.readOnlyActive) return;
        callback();
    };
}

const shortcutFunctions = {
    clearWhiteboard: defineShortcut(() => whiteboard.clearWhiteboard()),
    undoStep: defineShortcut(() => whiteboard.undoWhiteboardClick()),
    redoStep: defineShortcut(() => whiteboard.redoWhiteboardClick()),
    setTool_mouse: defineShortcut(() => $(".whiteboard-tool[tool=mouse]").click()),
    setTool_recSelect: defineShortcut(() => $(".whiteboard-tool[tool=recSelect]").click()),
    setTool_pen: defineShortcut(() => {
        $(".whiteboard-tool[tool=pen]").click();
        whiteboard.redrawMouseCursor();
    }),
    setTool_line: defineShortcut(() => $(".whiteboard-tool[tool=line]").click()),
    setTool_rect: defineShortcut(() => $(".whiteboard-tool[tool=rect]").click()),
    setTool_circle: defineShortcut(() => $(".whiteboard-tool[tool=circle]").click()),
    setTool_text: defineShortcut(() => $(".whiteboard-tool[tool=text]").click()),
    setTool_eraser: defineShortcut(() => {
        $(".whiteboard-tool[tool=eraser]").click();
        whiteboard.redrawMouseCursor();
    }),
    thickness_bigger: defineShortcut(() => {
        const thickness = parseInt($("#whiteboardThicknessSlider").val()) + 1;
        $("#whiteboardThicknessSlider").val(thickness);
        whiteboard.setStrokeThickness(thickness);
        whiteboard.redrawMouseCursor();
    }),
    thickness_smaller: defineShortcut(() => {
        const thickness = parseInt($("#whiteboardThicknessSlider").val()) - 1;
        $("#whiteboardThicknessSlider").val(thickness);
        whiteboard.setStrokeThickness(thickness);
        whiteboard.redrawMouseCursor();
    }),
    openColorPicker: defineShortcut(() => $("#whiteboardColorpicker").click()),
    saveWhiteboardAsImage: defineShortcut(() => $("#saveAsImageBtn").click(), false),
    saveWhiteboardAsJson: defineShortcut(() => $("#saveAsJSONBtn").click(), false),
    uploadWhiteboardToWebDav: defineShortcut(() => $("#uploadWebDavBtn").click()),
    uploadJsonToWhiteboard: defineShortcut(() => $("#uploadJsonBtn").click()),
    shareWhiteboard: defineShortcut(() => $("#shareWhiteboardBtn").click(), false),
    hideShowControls: defineShortcut(() => $("#minMaxBtn").click(), false),

    setDrawColorBlack: defineShortcut(() => {
        whiteboard.setDrawColor("black");
        whiteboard.redrawMouseCursor();
    }),
    setDrawColorRed: defineShortcut(() => {
        whiteboard.setDrawColor("red");
        whiteboard.redrawMouseCursor();
    }),
    setDrawColorGreen: defineShortcut(() => {
        whiteboard.setDrawColor("green");
        whiteboard.redrawMouseCursor();
    }),
    setDrawColorBlue: defineShortcut(() => {
        whiteboard.setDrawColor("blue");
        whiteboard.redrawMouseCursor();
    }),
    setDrawColorYellow: defineShortcut(() => {
        whiteboard.setDrawColor("yellow");
        whiteboard.redrawMouseCursor();
    }),
    toggleLineRecCircle: defineShortcut(() => {
        const activeTool = $(".whiteboard-tool.active").attr("tool");
        if (activeTool === "line") {
            $(".whiteboard-tool[tool=rect]").click();
        } else if (activeTool === "rect") {
            $(".whiteboard-tool[tool=circle]").click();
        } else {
            $(".whiteboard-tool[tool=line]").click();
        }
    }),
    togglePenEraser: defineShortcut(() => {
        const activeTool = $(".whiteboard-tool.active").attr("tool");
        if (activeTool === "pen") {
            $(".whiteboard-tool[tool=eraser]").click();
        } else {
            $(".whiteboard-tool[tool=pen]").click();
        }
    }),
    toggleMainColors: defineShortcut(() => {
        const bgColor = $("#whiteboardColorpicker")[0].style.backgroundColor;
        if (bgColor === "blue") {
            shortcutFunctions.setDrawColorGreen();
        } else if (bgColor === "green") {
            shortcutFunctions.setDrawColorYellow();
        } else if (bgColor === "yellow") {
            shortcutFunctions.setDrawColorRed();
        } else if (bgColor === "red") {
            shortcutFunctions.setDrawColorBlack();
        } else {
            shortcutFunctions.setDrawColorBlue();
        }
    }),
    moveDraggableUp: defineShortcut(() => {
        const elm =
            whiteboard.tool === "text"
                ? $("#" + whiteboard.latestActiveTextBoxId)
                : $(".dragMe")[0];
        const p = $(elm).position();
        if (p) $(elm).css({ top: p.top - 5, left: p.left });
    }),
    moveDraggableDown: defineShortcut(() => {
        const elm =
            whiteboard.tool === "text"
                ? $("#" + whiteboard.latestActiveTextBoxId)
                : $(".dragMe")[0];
        const p = $(elm).position();
        if (p) $(elm).css({ top: p.top + 5, left: p.left });
    }),
    moveDraggableLeft: defineShortcut(() => {
        const elm =
            whiteboard.tool === "text"
                ? $("#" + whiteboard.latestActiveTextBoxId)
                : $(".dragMe")[0];
        const p = $(elm).position();
        if (p) $(elm).css({ top: p.top, left: p.left - 5 });
    }),
    moveDraggableRight: defineShortcut(() => {
        const elm =
            whiteboard.tool === "text"
                ? $("#" + whiteboard.latestActiveTextBoxId)
                : $(".dragMe")[0];
        const p = $(elm).position();
        if (p) $(elm).css({ top: p.top, left: p.left + 5 });
    }),
    dropDraggable: defineShortcut(() => {
        $($(".dragMe")[0]).find(".addToCanvasBtn").click();
    }),
    addToBackground: defineShortcut(() => {
        $($(".dragMe")[0]).find(".addToBackgroundBtn").click();
    }),
    cancelAllActions: defineShortcut(() => whiteboard.escKeyAction()),
    deleteSelection: defineShortcut(() => whiteboard.delKeyAction()),
};

export default shortcutFunctions;
