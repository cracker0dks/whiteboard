import { dom } from "@fortawesome/fontawesome-svg-core";
import Point from "./classes/Point.js";
import ReadOnlyService from "./services/ReadOnlyService.js";
import InfoService from "./services/InfoService.js";
import ThrottlingService from "./services/ThrottlingService.js";
import ConfigService from "./services/ConfigService.js";
import html2canvas from "html2canvas";
import DOMPurify from "dompurify";

const RAD_TO_DEG = 180.0 / Math.PI;
const DEG_TO_RAD = Math.PI / 180.0;
const _45_DEG_IN_RAD = 45 * DEG_TO_RAD;

const whiteboard = {
    canvas: null,
    ctx: null,
    drawcolor: "black",
    previousToolHtmlElem: null, // useful for handling read-only mode
    tool: "mouse",
    thickness: 4,
    /**
     * @type Point
     */
    prevPos: new Point(0, 0),
    /**
     * @type Point
     */
    startCoords: new Point(0, 0),
    viewCoords: { x: 0, y: 0 },
    drawFlag: false,
    oldGCO: null,
    mouseover: false,
    lineCap: "round", //butt, square
    backgroundGrid: null,
    canvasElement: null,
    cursorContainer: null,
    imgContainer: null,
    svgContainer: null, //For draw prev
    mouseOverlay: null,
    ownCursor: null,
    penSmoothLastCoords: [],
    svgLine: null,
    svgRect: null,
    svgCirle: null,
    drawBuffer: [],
    undoBuffer: [],
    drawId: 0, //Used for undo/redo functions
    imgDragActive: false,
    latestActiveTextBoxId: false, //The id of the latest clicked Textbox (for font and color change)
    pressedKeys: {},
    settings: {
        whiteboardId: "0",
        username: "unknown",
        sendFunction: null,
        backgroundGridUrl: "./images/gb_grid.png",
    },
    lastPointerSentTime: 0,
    /**
     * @type Point
     */
    lastPointerPosition: new Point(0, 0),
    loadWhiteboard: function (whiteboardContainer, newSettings) {
        const svgns = "http://www.w3.org/2000/svg";
        const _this = this;
        for (const i in newSettings) {
            this.settings[i] = newSettings[i];
        }
        this.settings["username"] = this.settings["username"].replace(/[^0-9a-z]/gi, "");

        //background grid (repeating image) and smallest screen indication
        _this.backgroundGrid = $(
            `<div style="position: absolute; left:0px; top:0; opacity: 0.2; background-image:url('${_this.settings["backgroundGridUrl"]}'); height: 100%; width: 100%;"></div>`
        );
        // container for background images
        _this.imgContainer = $(
            '<div style="position: absolute; left:0px; top:0; height: 100%; width: 100%;"></div>'
        );
        // whiteboard canvas
        _this.canvasElement = $(
            '<canvas id="whiteboardCanvas" style="position: absolute; left:0px; top:0; cursor:crosshair;"></canvas>'
        );
        // SVG container holding drawing or moving previews
        _this.svgContainer = $(
            '<svg style="position: absolute; top:0px; left:0px;" width="100%" height="100%"></svg>'
        );
        // drag and drop indicator, hidden by default
        _this.dropIndicator = $(
            '<div style="position:absolute; height: 100%; width: 100%; border: 7px dashed gray; text-align: center; top: 0px; left: 0px; color: gray; font-size: 23em; display: none;"><i class="far fa-plus-square" aria-hidden="true"></i></div>'
        );
        // container for other users cursors
        _this.cursorContainer = $(
            '<div style="position: absolute; left:0px; top:0; height: 100%; width: 100%;"></div>'
        );
        // container for texts by users
        _this.textContainer = $(
            '<div class="textcontainer" style="position: absolute; left:0px; top:0; height: 100%; width: 100%; cursor:text;"></div>'
        );
        // mouse overlay for draw callbacks
        _this.mouseOverlay = $(
            '<div id="mouseOverlay" style="cursor:none; position: absolute; left:0px; top:0; height: 100%; width: 100%;"></div>'
        );

        $(whiteboardContainer)
            .append(_this.backgroundGrid)
            .append(_this.imgContainer)
            .append(_this.canvasElement)
            .append(_this.svgContainer)
            .append(_this.dropIndicator)
            .append(_this.cursorContainer)
            .append(_this.textContainer)
            .append(_this.mouseOverlay);

        // render newly added icons
        dom.i2svg();

        this.canvas = $("#whiteboardCanvas")[0];
        this.canvas.height = $(window).height();
        this.canvas.width = $(window).width();
        this.ctx = this.canvas.getContext("2d");
        this.oldGCO = this.ctx.globalCompositeOperation;

        window.addEventListener("resize", function () {
            // Handle resize
            const dbCp = JSON.parse(JSON.stringify(_this.drawBuffer)); // Copy the buffer
            _this.canvas.width = $(window).width();
            _this.canvas.height = $(window).height(); // Set new canvas height
            _this.drawBuffer = [];
            _this.textContainer.empty();
            _this.loadData(dbCp); // draw old content in
        });

        $(_this.mouseOverlay).on("mousedown touchstart", function (e) {
            _this.mousedown(e);
        });

        _this.mousedown = function (e) {
            if (_this.imgDragActive || _this.drawFlag) {
                return;
            }
            if (ReadOnlyService.readOnlyActive) return;

            _this.drawFlag = true;

            const currentPos = Point.fromEvent(e);

            if (_this.tool === "pen") {
                _this.penSmoothLastCoords = [
                    currentPos.x,
                    currentPos.y,
                    currentPos.x,
                    currentPos.y,
                    currentPos.x,
                    currentPos.y,
                ];
            } else if (_this.tool === "hand") {
                _this.startCoords = currentPos;
            } else if (_this.tool === "eraser") {
                _this.drawEraserLine(
                    currentPos.x,
                    currentPos.y,
                    currentPos.x,
                    currentPos.y,
                    _this.thickness
                );
                _this.sendFunction({
                    t: _this.tool,
                    d: [
                        currentPos.x - _this.viewCoords.x,
                        currentPos.y - _this.viewCoords.y,
                        currentPos.x - _this.viewCoords.x,
                        currentPos.y - _this.viewCoords.y,
                    ],
                    th: _this.thickness,
                });
            } else if (_this.tool === "line") {
                _this.startCoords = currentPos;
                _this.svgLine = document.createElementNS(svgns, "line");
                _this.svgLine.setAttribute("stroke", "gray");
                _this.svgLine.setAttribute("stroke-dasharray", "5, 5");
                _this.svgLine.setAttribute("x1", currentPos.x);
                _this.svgLine.setAttribute("y1", currentPos.y);
                _this.svgLine.setAttribute("x2", currentPos.x);
                _this.svgLine.setAttribute("y2", currentPos.y);
                _this.svgContainer.append(_this.svgLine);
            } else if (_this.tool === "rect" || _this.tool === "recSelect") {
                _this.svgContainer.find("rect").remove();
                _this.svgRect = document.createElementNS(svgns, "rect");
                _this.svgRect.setAttribute("stroke", "gray");
                _this.svgRect.setAttribute("stroke-dasharray", "5, 5");
                _this.svgRect.setAttribute("style", "fill-opacity:0.0;");
                _this.svgRect.setAttribute("x", currentPos.x);
                _this.svgRect.setAttribute("y", currentPos.y);
                _this.svgRect.setAttribute("width", 0);
                _this.svgRect.setAttribute("height", 0);
                _this.svgContainer.append(_this.svgRect);
                _this.startCoords = currentPos;
            } else if (_this.tool === "circle") {
                _this.svgCirle = document.createElementNS(svgns, "circle");
                _this.svgCirle.setAttribute("stroke", "gray");
                _this.svgCirle.setAttribute("stroke-dasharray", "5, 5");
                _this.svgCirle.setAttribute("style", "fill-opacity:0.0;");
                _this.svgCirle.setAttribute("cx", currentPos.x);
                _this.svgCirle.setAttribute("cy", currentPos.y);
                _this.svgCirle.setAttribute("r", 0);
                _this.svgContainer.append(_this.svgCirle);
                _this.startCoords = currentPos;
            }

            _this.prevPos = currentPos;
        };

        _this.textContainer.on("mousemove touchmove", function (e) {
            e.preventDefault();

            if (_this.imgDragActive || !$(e.target).hasClass("textcontainer")) {
                return;
            }
            if (ReadOnlyService.readOnlyActive) return;

            const currentPos = Point.fromEvent(e);

            ThrottlingService.throttle(currentPos, () => {
                _this.lastPointerPosition = currentPos;
                _this.sendFunction({
                    t: "cursor",
                    event: "move",
                    d: [currentPos.x, currentPos.y],
                    username: _this.settings.username,
                });
            });
        });

        _this.mouseOverlay.on("mousemove touchmove", function (e) {
            //Move hole canvas
            e.preventDefault();

            if (_this.tool == "hand" && _this.drawFlag) {
                let currentPos = Point.fromEvent(e);
                let xDif = _this.startCoords.x - currentPos.x;
                let yDif = _this.startCoords.y - currentPos.y;

                _this.viewCoords.x -= xDif;
                _this.viewCoords.y -= yDif;

                _this.startCoords.x = currentPos.x;
                _this.startCoords.y = currentPos.y;

                const dbCp = JSON.parse(JSON.stringify(_this.drawBuffer)); // Copy the buffer
                _this.canvas.width = $(window).width();
                _this.canvas.height = $(window).height(); // Set new canvas height
                _this.drawBuffer = [];
                _this.textContainer.empty();
                _this.imgContainer.empty();
                _this.loadData(dbCp); // draw old content in
            }

            if (ReadOnlyService.readOnlyActive) return;
            _this.triggerMouseMove(e);
        });

        _this.mouseOverlay.on("mouseup touchend touchcancel", function (e) {
            _this.mouseup(e);
        });

        _this.mouseup = function (e) {
            if (_this.imgDragActive) {
                return;
            }
            if (ReadOnlyService.readOnlyActive) return;
            _this.drawFlag = false;
            _this.ctx.globalCompositeOperation = _this.oldGCO;

            let currentPos = Point.fromEvent(e);

            if (currentPos.isZeroZero) {
                _this.sendFunction({
                    t: "cursor",
                    event: "out",
                    username: _this.settings.username,
                });
            }

            if (_this.tool === "line") {
                if (_this.pressedKeys.shift) {
                    currentPos = _this.getRoundedAngles(currentPos);
                }
                _this.drawPenLine(
                    currentPos.x,
                    currentPos.y,
                    _this.startCoords.x,
                    _this.startCoords.y,
                    _this.drawcolor,
                    _this.thickness
                );
                _this.sendFunction({
                    t: _this.tool,
                    d: [
                        currentPos.x - _this.viewCoords.x,
                        currentPos.y - _this.viewCoords.y,
                        _this.startCoords.x - _this.viewCoords.x,
                        _this.startCoords.y - _this.viewCoords.y,
                    ],
                    c: _this.drawcolor,
                    th: _this.thickness,
                });
                _this.svgContainer.find("line").remove();
            } else if (_this.tool === "pen") {
                _this.pushPointSmoothPen(currentPos.x, currentPos.y);
            } else if (_this.tool === "rect") {
                if (_this.pressedKeys.shift) {
                    if (
                        (currentPos.x - _this.startCoords.x) *
                            (currentPos.y - _this.startCoords.y) >
                        0
                    ) {
                        currentPos = new Point(
                            currentPos.x,
                            _this.startCoords.y + (currentPos.x - _this.startCoords.x)
                        );
                    } else {
                        currentPos = new Point(
                            currentPos.x,
                            _this.startCoords.y - (currentPos.x - _this.startCoords.x)
                        );
                    }
                }
                _this.drawRec(
                    _this.startCoords.x,
                    _this.startCoords.y,
                    currentPos.x,
                    currentPos.y,
                    _this.drawcolor,
                    _this.thickness
                );
                _this.sendFunction({
                    t: _this.tool,
                    d: [
                        _this.startCoords.x - _this.viewCoords.x,
                        _this.startCoords.y - _this.viewCoords.y,
                        currentPos.x - _this.viewCoords.x,
                        currentPos.y - _this.viewCoords.y,
                    ],
                    c: _this.drawcolor,
                    th: _this.thickness,
                });
                _this.svgContainer.find("rect").remove();
            } else if (_this.tool === "circle") {
                const r = currentPos.distTo(_this.startCoords);
                _this.drawCircle(
                    _this.startCoords.x,
                    _this.startCoords.y,
                    r,
                    _this.drawcolor,
                    _this.thickness
                );
                _this.sendFunction({
                    t: _this.tool,
                    d: [
                        _this.startCoords.x - _this.viewCoords.x,
                        _this.startCoords.y - _this.viewCoords.y,
                        r,
                    ],
                    c: _this.drawcolor,
                    th: _this.thickness,
                });
                _this.svgContainer.find("circle").remove();
            } else if (_this.tool === "recSelect") {
                _this.imgDragActive = true;
                if (_this.pressedKeys.shift) {
                    if (
                        (currentPos.x - _this.startCoords.x) *
                            (currentPos.y - _this.startCoords.y) >
                        0
                    ) {
                        currentPos = new Point(
                            currentPos.x,
                            _this.startCoords.y + (currentPos.x - _this.startCoords.x)
                        );
                    } else {
                        currentPos = new Point(
                            currentPos.x,
                            _this.startCoords.y - (currentPos.x - _this.startCoords.x)
                        );
                    }
                }

                const width = Math.abs(_this.startCoords.x - currentPos.x);
                const height = Math.abs(_this.startCoords.y - currentPos.y);
                const left =
                    _this.startCoords.x < currentPos.x ? _this.startCoords.x : currentPos.x;
                const top = _this.startCoords.y < currentPos.y ? _this.startCoords.y : currentPos.y;
                _this.mouseOverlay.css({ cursor: "default" });
                const imgDiv = $(
                    `<div class="dragMe" style="position:absolute; left: ${left}px; top: ${top}px; width: ${width}px; border: 2px dotted gray; overflow: hidden; height: ${height}px;" cursor:move;">
                    <canvas style="cursor:move; position:absolute; top:0px; left:0px;" width="${width}" height="${height}"></canvas>
                    <div style="position:absolute; right:5px; top:3px;">
                    <button draw="1" style="margin: 0px 0px; background: #03a9f4; padding: 5px; margin-top: 3px; color: white;" class="addToCanvasBtn btn btn-default">Drop</button>
                    <button style="margin: 0px 0px; background: #03a9f4; padding: 5px; margin-top: 3px; color: white;" class="xCanvasBtn btn btn-default">x</button>
                    </div>
                    </div>`
                );
                const dragCanvas = $(imgDiv).find("canvas");
                const dragOutOverlay = $(
                    `<div class="dragOutOverlay" style="position:absolute; left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px; background:white;"></div>`
                );
                _this.mouseOverlay.append(dragOutOverlay);
                _this.mouseOverlay.append(imgDiv);

                const destCanvasContext = dragCanvas[0].getContext("2d");
                destCanvasContext.drawImage(
                    _this.canvas,
                    left,
                    top,
                    width,
                    height,
                    0,
                    0,
                    width,
                    height
                );
                imgDiv
                    .find(".xCanvasBtn")
                    .off("click")
                    .click(function () {
                        _this.imgDragActive = false;
                        _this.refreshCursorAppearance();
                        imgDiv.remove();
                        dragOutOverlay.remove();
                    });
                imgDiv
                    .find(".addToCanvasBtn")
                    .off("click")
                    .click(function () {
                        _this.imgDragActive = false;
                        _this.refreshCursorAppearance();
                        const p = imgDiv.position();
                        const leftT = Math.round(p.left * 100) / 100;
                        const topT = Math.round(p.top * 100) / 100;
                        _this.drawId++;
                        _this.sendFunction({
                            t: _this.tool,
                            d: [
                                left - _this.viewCoords.x, //left from
                                top - _this.viewCoords.y,
                                leftT - _this.viewCoords.x, //Left too
                                topT - _this.viewCoords.y,
                                width,
                                height,
                            ],
                        });

                        _this.dragCanvasRectContent(left, top, leftT, topT, width, height);
                        imgDiv.remove();
                        dragOutOverlay.remove();
                    });
                imgDiv.draggable();
                _this.svgContainer.find("rect").remove();
            }
            _this.drawId++;
        };

        _this.mouseOverlay.on("mouseout", function (e) {
            if (ReadOnlyService.readOnlyActive) return;
            _this.triggerMouseOut();
        });

        _this.mouseOverlay.on("mouseover", function (e) {
            if (ReadOnlyService.readOnlyActive) return;
            _this.triggerMouseOver();
        });

        // On text container click (Add a new textbox)
        _this.textContainer.on("click", function (e) {
            const currentPos = Point.fromEvent(e);
            const fontsize = _this.thickness * 0.5;
            const txId = "tx" + +new Date();
            const isStickyNote = _this.tool === "stickynote";
            _this.sendFunction({
                t: "addTextBox",
                d: [
                    _this.drawcolor,
                    _this.textboxBackgroundColor,
                    fontsize,
                    currentPos.x - _this.viewCoords.x,
                    currentPos.y - _this.viewCoords.y,
                    txId,
                    isStickyNote,
                ],
            });
            _this.addTextBox(
                _this.drawcolor,
                _this.textboxBackgroundColor,
                fontsize,
                currentPos.x - _this.viewCoords.x,
                currentPos.y - _this.viewCoords.y,
                txId,
                isStickyNote,
                true
            );
        });
    },
    /**
     * For drawing lines at 0,45,90° ....
     * @param {Point} currentPos
     * @returns {Point}
     */
    getRoundedAngles: function (currentPos) {
        const { startCoords } = this;

        // these transformations operate in the standard coordinate system
        // y goes from bottom to up, x goes left to right
        const dx = currentPos.x - startCoords.x; // browser x is reversed
        const dy = startCoords.y - currentPos.y;

        const angle = Math.atan2(dy, dx);
        const angle45 = Math.round(angle / _45_DEG_IN_RAD) * _45_DEG_IN_RAD;

        const dist = currentPos.distTo(startCoords);
        let outX = startCoords.x + dist * Math.cos(angle45);
        let outY = startCoords.y - dist * Math.sin(angle45);

        return new Point(outX, outY);
    },
    triggerMouseMove: function (e) {
        const _this = this;
        if (_this.imgDragActive) {
            return;
        }

        let currentPos = Point.fromEvent(e);

        window.requestAnimationFrame(function () {
            // update position
            currentPos = Point.fromEvent(e);

            if (_this.drawFlag) {
                if (_this.tool === "pen") {
                    _this.pushPointSmoothPen(currentPos.x, currentPos.y);
                } else if (_this.tool === "eraser") {
                    _this.drawEraserLine(
                        currentPos.x,
                        currentPos.y,
                        _this.prevPos.x,
                        _this.prevPos.y,
                        _this.thickness
                    );
                    _this.sendFunction({
                        t: _this.tool,
                        d: [
                            currentPos.x - _this.viewCoords.x,
                            currentPos.y - _this.viewCoords.y,
                            _this.prevPos.x - _this.viewCoords.x,
                            _this.prevPos.y - _this.viewCoords.y,
                        ],
                        th: _this.thickness,
                    });
                }
            }

            if (_this.tool === "eraser") {
                const left = currentPos.x - _this.thickness;
                const top = currentPos.y - _this.thickness;
                if (_this.ownCursor) _this.ownCursor.css({ top: top + "px", left: left + "px" });
            } else if (_this.tool === "pen") {
                const left = currentPos.x - _this.thickness / 2;
                const top = currentPos.y - _this.thickness / 2;
                if (_this.ownCursor) _this.ownCursor.css({ top: top + "px", left: left + "px" });
            } else if (_this.tool === "line") {
                if (_this.svgLine) {
                    let posToUse = currentPos;
                    if (_this.pressedKeys.shift) {
                        posToUse = _this.getRoundedAngles(currentPos);
                    }
                    _this.svgLine.setAttribute("x2", posToUse.x);
                    _this.svgLine.setAttribute("y2", posToUse.y);
                }
            } else if (_this.tool === "rect" || (_this.tool === "recSelect" && _this.drawFlag)) {
                if (_this.svgRect) {
                    const width = Math.abs(currentPos.x - _this.startCoords.x);
                    let height = Math.abs(currentPos.y - _this.startCoords.y);
                    if (_this.pressedKeys.shift) {
                        height = width;
                        const x =
                            currentPos.x < _this.startCoords.x
                                ? _this.startCoords.x - width
                                : _this.startCoords.x;
                        const y =
                            currentPos.y < _this.startCoords.y
                                ? _this.startCoords.y - width
                                : _this.startCoords.y;
                        _this.svgRect.setAttribute("x", x);
                        _this.svgRect.setAttribute("y", y);
                    } else {
                        const x =
                            currentPos.x < _this.startCoords.x ? currentPos.x : _this.startCoords.x;
                        const y =
                            currentPos.y < _this.startCoords.y ? currentPos.y : _this.startCoords.y;
                        _this.svgRect.setAttribute("x", x);
                        _this.svgRect.setAttribute("y", y);
                    }

                    _this.svgRect.setAttribute("width", width);
                    _this.svgRect.setAttribute("height", height);
                }
            } else if (_this.tool === "circle") {
                const r = currentPos.distTo(_this.startCoords);
                if (_this.svgCirle) {
                    _this.svgCirle.setAttribute("r", r);
                }
            }

            _this.prevPos = currentPos;
        });

        ThrottlingService.throttle(currentPos, () => {
            currentPos.x -= _this.viewCoords.x;
            currentPos.y -= _this.viewCoords.y;
            _this.lastPointerPosition = currentPos;
            _this.sendFunction({
                t: "cursor",
                event: "move",
                d: [currentPos.x, currentPos.y],
                username: _this.settings.username,
            });
        });
    },
    triggerMouseOver: function () {
        var _this = this;
        if (_this.imgDragActive) {
            return;
        }
        if (!_this.mouseover) {
            var color = _this.drawcolor;
            var widthHeight = _this.thickness;
            if (_this.tool === "eraser") {
                color = "#00000000";
                widthHeight = widthHeight * 2;
            }
            if (_this.tool === "eraser" || _this.tool === "pen") {
                _this.ownCursor = $(
                    '<div id="ownCursor" style="background:' +
                        color +
                        "; border:1px solid gray; position:absolute; width:" +
                        widthHeight +
                        "px; height:" +
                        widthHeight +
                        'px; border-radius:50%;"></div>'
                );
                _this.cursorContainer.append(_this.ownCursor);
            }
        }
        _this.mouseover = true;
    },
    triggerMouseOut: function () {
        var _this = this;
        if (_this.imgDragActive) {
            return;
        }
        _this.drawFlag = false;
        _this.mouseover = false;
        _this.ctx.globalCompositeOperation = _this.oldGCO;
        if (_this.ownCursor) _this.ownCursor.remove();
        _this.svgContainer.find("line").remove();
        _this.svgContainer.find("rect").remove();
        _this.svgContainer.find("circle").remove();
        _this.sendFunction({ t: "cursor", event: "out" });
    },
    redrawMouseCursor: function () {
        const _this = this;
        _this.triggerMouseOut();
        _this.triggerMouseOver();
        _this.triggerMouseMove({ offsetX: _this.prevPos.x, offsetY: _this.prevPos.y });
    },
    delKeyAction: function () {
        var _this = this;
        $.each(_this.mouseOverlay.find(".dragOutOverlay"), function () {
            var width = $(this).width();
            var height = $(this).height();
            var p = $(this).position();
            var left = Math.round(p.left * 100) / 100;
            var top = Math.round(p.top * 100) / 100;
            _this.drawId++;
            _this.sendFunction({
                t: "eraseRec",
                d: [left - _this.viewCoords.x, top - _this.viewCoords.y, width, height],
            });

            _this.eraseRec(left, top, width, height);
        });
        _this.mouseOverlay.find(".xCanvasBtn").click(); //Remove all current drops
        _this.textContainer
            .find("#" + _this.latestActiveTextBoxId)
            .find(".removeIcon")
            .click();
    },
    escKeyAction: function () {
        var _this = this;
        if (!_this.drawFlag) {
            _this.svgContainer.empty();
        }
        _this.mouseOverlay.find(".xCanvasBtn").click(); //Remove all current drops
    },
    pushPointSmoothPen: function (X, Y) {
        var _this = this;
        if (_this.penSmoothLastCoords.length >= 8) {
            _this.penSmoothLastCoords = [
                _this.penSmoothLastCoords[2],
                _this.penSmoothLastCoords[3],
                _this.penSmoothLastCoords[4],
                _this.penSmoothLastCoords[5],
                _this.penSmoothLastCoords[6],
                _this.penSmoothLastCoords[7],
            ];
        }
        _this.penSmoothLastCoords.push(X, Y);
        if (_this.penSmoothLastCoords.length >= 8) {
            _this.drawPenSmoothLine(_this.penSmoothLastCoords, _this.drawcolor, _this.thickness);
            let sendArray = [];
            for (let i = 0; i < _this.penSmoothLastCoords.length; i++) {
                sendArray.push(_this.penSmoothLastCoords[i]);
                if (i % 2 == 0) {
                    sendArray[i] -= this.viewCoords.x;
                } else {
                    sendArray[i] -= this.viewCoords.y;
                }
            }
            _this.sendFunction({
                t: _this.tool,
                d: sendArray,
                c: _this.drawcolor,
                th: _this.thickness,
            });
        }
    },
    dragCanvasRectContent: function (xf, yf, xt, yt, width, height, remote) {
        var _this = this;
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        var tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        var tempCanvasContext = tempCanvas.getContext("2d");
        tempCanvasContext.drawImage(
            this.canvas,
            xf + xOffset,
            yf + yOffset,
            width,
            height,
            0,
            0,
            width,
            height
        );
        this.eraseRec(xf + xOffset, yf + yOffset, width, height);
        this.ctx.drawImage(tempCanvas, xt + xOffset, yt + yOffset);
    },
    eraseRec: function (fromX, fromY, width, height, remote) {
        var _this = this;
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        _this.ctx.beginPath();
        _this.ctx.rect(fromX + xOffset, fromY + yOffset, width, height);
        _this.ctx.fillStyle = "rgba(0,0,0,1)";
        _this.ctx.globalCompositeOperation = "destination-out";
        _this.ctx.fill();
        _this.ctx.closePath();
        _this.ctx.globalCompositeOperation = _this.oldGCO;
    },
    drawPenLine: function (fromX, fromY, toX, toY, color, thickness, remote) {
        var _this = this;
        _this.ctx.beginPath();
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        _this.ctx.moveTo(fromX + xOffset, fromY + yOffset);
        _this.ctx.lineTo(toX + xOffset, toY + yOffset);
        _this.ctx.strokeStyle = color;
        _this.ctx.lineWidth = thickness;
        _this.ctx.lineCap = _this.lineCap;
        _this.ctx.stroke();
        _this.ctx.closePath();
    },
    drawPenSmoothLine: function (coords, color, thickness, remote) {
        var _this = this;
        var xm1 = coords[0];
        var ym1 = coords[1];
        var x0 = coords[2];
        var y0 = coords[3];
        var x1 = coords[4];
        var y1 = coords[5];
        var x2 = coords[6];
        var y2 = coords[7];
        var length = Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
        var steps = Math.ceil(length / 5);
        _this.ctx.beginPath();
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        _this.ctx.moveTo(x0 + xOffset, y0 + yOffset);
        if (steps == 0) {
            _this.ctx.lineTo(x0 + xOffset, y0 + yOffset);
        }
        for (var i = 0; i < steps; i++) {
            var point = lanczosInterpolate(xm1, ym1, x0, y0, x1, y1, x2, y2, (i + 1) / steps);
            _this.ctx.lineTo(point[0] + xOffset, point[1] + yOffset);
        }
        _this.ctx.strokeStyle = color;
        _this.ctx.lineWidth = thickness;
        _this.ctx.lineCap = _this.lineCap;
        _this.ctx.stroke();
        _this.ctx.closePath();
    },
    drawEraserLine: function (fromX, fromY, toX, toY, thickness, remote) {
        var _this = this;
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        _this.ctx.beginPath();
        _this.ctx.moveTo(fromX + xOffset, fromY + yOffset);
        _this.ctx.lineTo(toX + xOffset, toY + yOffset);
        _this.ctx.strokeStyle = "rgba(0,0,0,1)";
        _this.ctx.lineWidth = thickness * 2;
        _this.ctx.lineCap = _this.lineCap;
        _this.ctx.globalCompositeOperation = "destination-out";
        _this.ctx.stroke();
        _this.ctx.closePath();
        _this.ctx.globalCompositeOperation = _this.oldGCO;
    },
    drawRec: function (fromX, fromY, toX, toY, color, thickness, remote) {
        var _this = this;
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        toX = toX - fromX - xOffset;
        toY = toY - fromY - yOffset;
        _this.ctx.beginPath();
        _this.ctx.rect(fromX + xOffset, fromY + yOffset, toX + xOffset, toY + yOffset);
        _this.ctx.strokeStyle = color;
        _this.ctx.lineWidth = thickness;
        _this.ctx.lineCap = _this.lineCap;
        _this.ctx.stroke();
        _this.ctx.closePath();
    },
    drawCircle: function (fromX, fromY, radius, color, thickness, remote) {
        var _this = this;
        let xOffset = remote ? _this.viewCoords.x : 0;
        let yOffset = remote ? _this.viewCoords.y : 0;
        _this.ctx.beginPath();
        _this.ctx.arc(fromX + xOffset, fromY + yOffset, radius, 0, 2 * Math.PI, false);
        _this.ctx.lineWidth = thickness;
        _this.ctx.strokeStyle = color;
        _this.ctx.stroke();
    },
    clearWhiteboard: function () {
        var _this = this;
        if (ReadOnlyService.readOnlyActive) return;
        _this.canvas.height = _this.canvas.height;
        _this.imgContainer.empty();
        _this.textContainer.empty();
        _this.sendFunction({ t: "clear" });
        _this.drawBuffer = [];
        _this.undoBuffer = [];
        _this.drawId = 0;
    },
    setStrokeThickness(thickness) {
        var _this = this;
        _this.thickness = thickness;

        if ((_this.tool == "text" || this.tool === "stickynote") && _this.latestActiveTextBoxId) {
            _this.sendFunction({
                t: "setTextboxFontSize",
                d: [_this.latestActiveTextBoxId, thickness],
            });
            _this.setTextboxFontSize(_this.latestActiveTextBoxId, thickness);
        }
    },
    imgWithSrc(url) {
        return $(
            DOMPurify.sanitize('<img src="' + url + '">', {
                ALLOWED_TAGS: ["img"],
                ALLOWED_ATTR: ["src"], // kill any attributes malicious url introduced
            })
        );
    },
    addImgToCanvasByUrl: function (url) {
        var _this = this;
        var oldTool = _this.tool;

        const { imageURL } = ConfigService;
        var finalURL = url;
        if (imageURL && url.startsWith("/uploads/")) {
            finalURL = imageURL + url;
        }

        var img = this.imgWithSrc(finalURL).css({ width: "100%", height: "100%" });
        finalURL = img.attr("src");

        _this.setTool("mouse"); //Set to mouse tool while dropping to prevent errors
        _this.imgDragActive = true;
        _this.mouseOverlay.css({ cursor: "default" });
        var imgDiv = $(
            '<div class="dragMe" style="border: 2px dashed gray; position:absolute; left:200px; top:200px; min-width:160px; min-height:100px; cursor:move;">' +
                '<div style="position:absolute; right:5px; top:3px;">' +
                '<button draw="1" style="margin: 0px 0px; background: #03a9f4; padding: 5px; margin-top: 3px; color: white;" class="addToCanvasBtn btn btn-default">Draw to canvas</button> ' +
                '<button draw="0" style="margin: 0px 0px; background: #03a9f4; padding: 5px; margin-top: 3px; color: white;" class="addToBackgroundBtn btn btn-default">Add to background</button> ' +
                '<button style="margin: 0px 0px; background: #03a9f4; padding: 5px; margin-top: 3px; color: white;" class="xCanvasBtn btn btn-default">x</button>' +
                "</div>" +
                '<i style="position:absolute; bottom: -4px; right: 2px; font-size: 2em; color: gray; transform: rotate(-45deg);" class="fas fa-sort-down" aria-hidden="true"></i>' +
                '<div class="rotationHandle" style="position:absolute; bottom: -30px; left: 0px; width:100%; text-align:center; cursor:ew-resize;"><i class="fa fa-undo"></i></div>' +
                "</div>"
        );
        imgDiv.prepend(img);
        imgDiv
            .find(".xCanvasBtn")
            .off("click")
            .click(function () {
                _this.imgDragActive = false;
                _this.refreshCursorAppearance();
                imgDiv.remove();
                _this.setTool(oldTool);
            });
        var rotationAngle = 0;
        var recoupLeft = 0;
        var recoupTop = 0;
        var p = imgDiv.position();
        var left = 200;
        var top = 200;
        imgDiv
            .find(".addToCanvasBtn,.addToBackgroundBtn")
            .off("click")
            .click(function () {
                var draw = $(this).attr("draw");
                _this.imgDragActive = false;

                var width = imgDiv.width();
                var height = imgDiv.height();

                if (draw == "1") {
                    //draw image to canvas
                    _this.drawImgToCanvas(finalURL, width, height, left, top, rotationAngle);
                } else {
                    //Add image to background
                    _this.drawImgToBackground(finalURL, width, height, left, top, rotationAngle);
                }
                _this.sendFunction({
                    t: "addImgBG",
                    draw: draw,
                    url: finalURL,
                    d: [width, height, left, top, rotationAngle],
                });
                _this.drawId++;
                imgDiv.remove();
                _this.refreshCursorAppearance();
                _this.setTool(oldTool);
            });
        _this.mouseOverlay.append(imgDiv);

        imgDiv.draggable({
            start: function (event, ui) {
                var left = parseInt($(this).css("left"), 10);
                left = isNaN(left) ? 0 : left;
                var top = parseInt($(this).css("top"), 10);
                top = isNaN(top) ? 0 : top;
                recoupLeft = left - ui.position.left;
                recoupTop = top - ui.position.top;
            },
            drag: function (event, ui) {
                ui.position.left += recoupLeft;
                ui.position.top += recoupTop;
            },
            stop: function (event, ui) {
                left = ui.position.left - _this.viewCoords.x;
                top = ui.position.top - _this.viewCoords.y;
            },
        });
        imgDiv.resizable();
        var params = {
            // Callback fired on rotation start.
            start: function (event, ui) {},
            // Callback fired during rotation.
            rotate: function (event, ui) {
                //console.log(ui)
            },
            // Callback fired on rotation end.
            stop: function (event, ui) {
                rotationAngle = ui.angle.current;
            },
            handle: imgDiv.find(".rotationHandle"),
        };
        imgDiv.rotatable(params);

        // render newly added icons
        dom.i2svg();
    },
    drawImgToBackground(url, width, height, left, top, rotationAngle) {
        var _this = this;
        const px = (v) => Number(v).toString() + "px";
        this.imgContainer.append(
            this.imgWithSrc(url).css({
                width: px(width),
                height: px(height),
                top: px(top + _this.viewCoords.y),
                left: px(left + _this.viewCoords.x),
                position: "absolute",
                transform: "rotate(" + Number(rotationAngle) + "rad)",
            })
        );
    },
    addTextBox(
        textcolor,
        textboxBackgroundColor,
        fontsize,
        left,
        top,
        txId,
        isStickyNote,
        newLocalBox,
        remote
    ) {
        var _this = this;
        var cssclass = "textBox";
        if (isStickyNote) {
            cssclass += " stickyNote";
        }

        left = left + _this.viewCoords.x;
        top = top + _this.viewCoords.y;
        let editable = _this.tool == "text" || _this.tool === "stickynote" ? "true" : "false";
        var textBox = $(
            '<div id="' +
                txId +
                '" class="' +
                cssclass +
                '" style="font-family: Monospace; position:absolute; top:' +
                top +
                "px; left:" +
                left +
                "px;" +
                "background-color:" +
                textboxBackgroundColor +
                ';">' +
                '<div contentEditable="' +
                editable +
                '" spellcheck="false" class="textContent" style="outline: none; font-size:' +
                fontsize +
                "em; color:" +
                textcolor +
                '; min-width:50px; min-height:100%;"></div>' +
                '<div title="remove textbox" class="removeIcon" style="position:absolute; cursor:pointer; top:-3px; right:2px;"><b>🗑</b></div>' +
                '<div title="move textbox" class="moveIcon" style="position:absolute; cursor:move; top:1px; left:2px; font-size: 0.5em;"><i class="fas fa-expand-arrows-alt"></i></div>' +
                "</div>"
        );
        _this.latestActiveTextBoxId = txId;
        textBox.click(function (e) {
            e.preventDefault();
            _this.latestActiveTextBoxId = txId;
            return false;
        });
        textBox.on("mousemove touchmove", function (e) {
            e.preventDefault();
            if (_this.imgDragActive) {
                return;
            }
            var textBoxPosition = textBox.position();
            var currX = e.offsetX + textBoxPosition.left;
            var currY = e.offsetY + textBoxPosition.top;
            if ($(e.target).hasClass("removeIcon")) {
                currX += textBox.width() - 4;
            }

            const newPointerPosition = new Point(currX, currY);

            ThrottlingService.throttle(newPointerPosition, () => {
                _this.lastPointerPosition = newPointerPosition;
                _this.sendFunction({
                    t: "cursor",
                    event: "move",
                    d: [newPointerPosition.x, newPointerPosition.y],
                    username: _this.settings.username,
                });
            });
        });
        this.textContainer.append(textBox);
        textBox.draggable({
            handle: ".moveIcon",
            stop: function () {
                var textBoxPosition = textBox.position();
                _this.sendFunction({
                    t: "setTextboxPosition",
                    d: [
                        txId,
                        textBoxPosition.top - _this.viewCoords.y,
                        textBoxPosition.left - _this.viewCoords.x,
                    ],
                });
            },
            drag: function () {
                var textBoxPosition = textBox.position();
                _this.sendFunction({
                    t: "setTextboxPosition",
                    d: [
                        txId,
                        textBoxPosition.top - _this.viewCoords.y,
                        textBoxPosition.left - _this.viewCoords.x,
                    ],
                });
            },
        });
        textBox.find(".textContent").on("input", function () {
            var text = btoa(unescape(encodeURIComponent($(this).html()))); //Get html and make encode base64 also take care of the charset
            _this.sendFunction({ t: "setTextboxText", d: [txId, text] });
        });
        textBox
            .find(".removeIcon")
            .off("click")
            .click(function (e) {
                $("#" + txId).remove();
                _this.sendFunction({ t: "removeTextbox", d: [txId] });
                e.preventDefault();
                return false;
            });
        if (newLocalBox) {
            //per https://stackoverflow.com/questions/2388164/set-focus-on-div-contenteditable-element
            setTimeout(() => {
                textBox.find(".textContent").focus();
            }, 0);
        }
        if (this.tool === "text" || this.tool === "stickynote") {
            textBox.addClass("active");
        }

        // render newly added icons
        dom.i2svg();
    },
    setTextboxText(txId, text) {
        $("#" + txId)
            .find(".textContent")
            .html(decodeURIComponent(escape(atob(text)))); //Set decoded base64 as html
    },
    removeTextbox(txId) {
        $("#" + txId).remove();
    },
    setTextboxPosition(txId, top, left) {
        $("#" + txId).css({
            top: top + this.viewCoords.y + "px",
            left: left + this.viewCoords.x + "px",
        });
    },
    setTextboxFontSize(txId, fontSize) {
        $("#" + txId)
            .find(".textContent")
            .css({ "font-size": fontSize + "em" });
    },
    setTextboxFontColor(txId, color) {
        $("#" + txId)
            .find(".textContent")
            .css({ color: color });
    },
    setTextboxBackgroundColor(txId, textboxBackgroundColor) {
        $("#" + txId)
            .find(".textContent")
            .css({ "background-color": textboxBackgroundColor });
    },
    drawImgToCanvas(url, width, height, left, top, rotationAngle, doneCallback) {
        top = Number(top); // probably not as important here
        left = Number(left); // as it is when generating html
        width = Number(width);
        height = Number(height);
        rotationAngle = Number(rotationAngle);

        var _this = this;
        var img = document.createElement("img");
        img.onload = function () {
            rotationAngle = rotationAngle ? rotationAngle : 0;
            if (rotationAngle === 0) {
                _this.ctx.drawImage(
                    img,
                    left + _this.viewCoords.x,
                    top + _this.viewCoords.y,
                    width,
                    height
                );
            } else {
                _this.ctx.save();
                _this.ctx.translate(
                    left + _this.viewCoords.x + width / 2,
                    top + _this.viewCoords.y + height / 2
                );
                _this.ctx.rotate(rotationAngle);
                _this.ctx.drawImage(img, -(width / 2), -(height / 2), width, height);
                _this.ctx.restore();
            }
            if (doneCallback) {
                doneCallback();
            }
        };

        img.src = this.imgWithSrc(url).attr("src"); // or here - but consistent
    },
    undoWhiteboard: function (username) {
        //Not call this directly because you will get out of sync whith others...
        var _this = this;
        if (!username) {
            username = _this.settings.username;
        }
        for (var i = _this.drawBuffer.length - 1; i >= 0; i--) {
            if (_this.drawBuffer[i]["username"] == username) {
                var drawId = _this.drawBuffer[i]["drawId"];
                for (var i = _this.drawBuffer.length - 1; i >= 0; i--) {
                    if (
                        _this.drawBuffer[i]["drawId"] == drawId &&
                        _this.drawBuffer[i]["username"] == username
                    ) {
                        _this.undoBuffer.push(_this.drawBuffer[i]);
                        _this.drawBuffer.splice(i, 1);
                    }
                }
                break;
            }
        }
        if (_this.undoBuffer.length > 1000) {
            _this.undoBuffer.splice(0, _this.undoBuffer.length - 1000);
        }
        _this.canvas.height = _this.canvas.height;
        _this.imgContainer.empty();
        _this.loadDataInSteps(_this.drawBuffer, false, function (stepData) {
            //Nothing to do
        });
    },
    redoWhiteboard: function (username) {
        //Not call this directly because you will get out of sync whith others...
        var _this = this;
        if (!username) {
            username = _this.settings.username;
        }
        for (var i = _this.undoBuffer.length - 1; i >= 0; i--) {
            if (_this.undoBuffer[i]["username"] == username) {
                var drawId = _this.undoBuffer[i]["drawId"];
                for (var i = _this.undoBuffer.length - 1; i >= 0; i--) {
                    if (
                        _this.undoBuffer[i]["drawId"] == drawId &&
                        _this.undoBuffer[i]["username"] == username
                    ) {
                        _this.drawBuffer.push(_this.undoBuffer[i]);
                        _this.undoBuffer.splice(i, 1);
                    }
                }
                break;
            }
        }
        _this.canvas.height = _this.canvas.height;
        _this.imgContainer.empty();
        _this.loadDataInSteps(_this.drawBuffer, false, function (stepData) {
            //Nothing to do
        });
    },
    undoWhiteboardClick: function () {
        if (ReadOnlyService.readOnlyActive) return;
        this.sendFunction({ t: "undo" });
        this.undoWhiteboard();
    },
    redoWhiteboardClick: function () {
        if (ReadOnlyService.readOnlyActive) return;
        this.sendFunction({ t: "redo" });
        this.redoWhiteboard();
    },
    setTool: function (tool) {
        this.tool = tool;
        if (this.tool === "text" || this.tool === "stickynote") {
            $(".textBox").addClass("active");
            this.textContainer.appendTo($(whiteboardContainer)); //Bring textContainer to the front
            $(".textContent").attr("contenteditable", "true");
        } else {
            $(".textBox").removeClass("active");
            this.mouseOverlay.appendTo($(whiteboardContainer));
            $(".textContent").attr("contenteditable", "false");
        }
        this.refreshCursorAppearance();
        this.mouseOverlay.find(".xCanvasBtn").click();
        this.latestActiveTextBoxId = null;
    },
    setDrawColor(color) {
        var _this = this;
        _this.drawcolor = color;
        $("#whiteboardColorpicker").css({ background: color });
        if ((_this.tool == "text" || _this.tool === "stickynote") && _this.latestActiveTextBoxId) {
            _this.sendFunction({
                t: "setTextboxFontColor",
                d: [_this.latestActiveTextBoxId, color],
            });
            _this.setTextboxFontColor(_this.latestActiveTextBoxId, color);
        }
    },
    setTextBackgroundColor(textboxBackgroundColor) {
        var _this = this;
        _this.textboxBackgroundColor = textboxBackgroundColor;
        $("#textboxBackgroundColorPicker").css({ background: textboxBackgroundColor });
        if ((_this.tool == "text" || this.tool === "stickynote") && _this.latestActiveTextBoxId) {
            _this.sendFunction({
                t: "setTextboxBackgroundColor",
                d: [_this.latestActiveTextBoxId, textboxBackgroundColor],
            });
            _this.setTextboxBackgroundColor(_this.latestActiveTextBoxId, textboxBackgroundColor);
        }
    },
    updateSmallestScreenResolution() {
        const { smallestScreenResolution } = InfoService;
        const { showSmallestScreenIndicator } = ConfigService;
        if (showSmallestScreenIndicator && smallestScreenResolution) {
            const { w: width, h: height } = smallestScreenResolution;
            this.backgroundGrid.empty();
            if (width < $(window).width() || height < $(window).height()) {
                this.backgroundGrid.append(
                    '<div style="position:absolute; left:0px; top:0px; border-right:3px dotted black; border-bottom:3px dotted black; width:' +
                        width +
                        "px; height:" +
                        height +
                        'px;"></div>'
                );
                this.backgroundGrid.append(
                    '<div style="position:absolute; left:' +
                        (width + 5) +
                        'px; top:0px;">smallest screen participating</div>'
                );
            }
        }
    },
    handleEventsAndData: function (content, isNewData, doneCallback) {
        var _this = this;
        var tool = content["t"];
        var data = content["d"];
        var color = content["c"];
        var username = content["username"];
        var thickness = content["th"];

        window.requestAnimationFrame(function () {
            if (tool === "line" || tool === "pen") {
                if (data.length == 4) {
                    //Only used for old json imports
                    _this.drawPenLine(data[0], data[1], data[2], data[3], color, thickness, true);
                } else {
                    _this.drawPenSmoothLine(data, color, thickness, true);
                }
            } else if (tool === "rect") {
                _this.drawRec(data[0], data[1], data[2], data[3], color, thickness, true);
            } else if (tool === "circle") {
                _this.drawCircle(data[0], data[1], data[2], color, thickness, true);
            } else if (tool === "eraser") {
                _this.drawEraserLine(data[0], data[1], data[2], data[3], thickness, true);
            } else if (tool === "eraseRec") {
                _this.eraseRec(data[0], data[1], data[2], data[3], true);
            } else if (tool === "recSelect") {
                _this.dragCanvasRectContent(
                    data[0],
                    data[1],
                    data[2],
                    data[3],
                    data[4],
                    data[5],
                    true
                );
            } else if (tool === "addImgBG") {
                if (content["draw"] == "1") {
                    _this.drawImgToCanvas(
                        content["url"],
                        data[0],
                        data[1],
                        data[2],
                        data[3],
                        data[4],
                        doneCallback
                    );
                } else {
                    _this.drawImgToBackground(
                        content["url"],
                        data[0],
                        data[1],
                        data[2],
                        data[3],
                        data[4]
                    );
                }
            } else if (tool === "addTextBox") {
                _this.addTextBox(
                    data[0],
                    data[1],
                    data[2],
                    data[3],
                    data[4],
                    data[5],
                    data[6],
                    true
                );
            } else if (tool === "setTextboxText") {
                _this.setTextboxText(data[0], data[1]);
            } else if (tool === "removeTextbox") {
                _this.removeTextbox(data[0]);
            } else if (tool === "setTextboxPosition") {
                _this.setTextboxPosition(data[0], data[1], data[2]);
            } else if (tool === "setTextboxFontSize") {
                _this.setTextboxFontSize(data[0], data[1]);
            } else if (tool === "setTextboxFontColor") {
                _this.setTextboxFontColor(data[0], data[1]);
            } else if (tool === "setTextboxBackgroundColor") {
                _this.setTextboxBackgroundColor(data[0], data[1]);
            } else if (tool === "clear") {
                _this.canvas.height = _this.canvas.height;
                _this.imgContainer.empty();
                _this.textContainer.empty();
                _this.drawBuffer = [];
                _this.undoBuffer = [];
                _this.drawId = 0;
            } else if (tool === "cursor" && _this.settings) {
                if (content["event"] === "move") {
                    if (_this.cursorContainer.find("." + content["username"]).length >= 1) {
                        _this.cursorContainer.find("." + content["username"]).css({
                            left: data[0] + _this.viewCoords.x + "px",
                            top: data[1] + _this.viewCoords.y - 15 + "px",
                        });
                    } else {
                        _this.cursorContainer.append(
                            '<div style="font-size:0.8em; padding-left:2px; padding-right:2px; background:gray; color:white; border-radius:3px; position:absolute; left:' +
                                (data[0] + _this.viewCoords.x) +
                                "px; top:" +
                                (data[1] + _this.viewCoords.y - 151) +
                                'px;" class="userbadge ' +
                                content["username"] +
                                '">' +
                                '<div style="width:4px; height:4px; background:gray; position:absolute; top:13px; left:-2px; border-radius:50%;"></div>' +
                                decodeURIComponent(atob(content["username"])) +
                                "</div>"
                        );
                    }
                } else {
                    _this.cursorContainer.find("." + content["username"]).remove();
                }
            } else if (tool === "undo") {
                _this.undoWhiteboard(username);
            } else if (tool === "redo") {
                _this.redoWhiteboard(username);
            }
        });

        if (
            isNewData &&
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
                "setTextboxBackgroundColor",
            ].includes(tool)
        ) {
            content["drawId"] = content["drawId"] ? content["drawId"] : _this.drawId;
            content["username"] = content["username"]
                ? content["username"]
                : _this.settings.username;
            _this.drawBuffer.push(content);
        }
    },
    userLeftWhiteboard(username) {
        this.cursorContainer.find("." + username).remove();
    },
    refreshUserBadges() {
        this.cursorContainer.find(".userbadge").remove();
    },
    getImageDataBase64(options, callback) {
        var _this = this;
        var width = this.mouseOverlay.width();
        var height = this.mouseOverlay.height();
        var copyCanvas = document.createElement("canvas");
        copyCanvas.width = width;
        copyCanvas.height = height;
        var imageFormat = options.imageFormat || "png";
        var drawBackgroundGrid = options.drawBackgroundGrid || false;

        var brackGroundImg = new Image();
        brackGroundImg.src = _this.settings.backgroundGridUrl;

        brackGroundImg.onload = function () {
            var destCtx = copyCanvas.getContext("2d"); //Draw the maincanvas to the exportcanvas

            if (imageFormat === "jpeg") {
                //Set white background for jpeg images
                destCtx.fillStyle = "#FFFFFF";
                destCtx.fillRect(0, 0, width, height);
            }

            if (drawBackgroundGrid) {
                destCtx.globalAlpha = 0.8;
                var ptrn = destCtx.createPattern(brackGroundImg, "repeat"); // Create a pattern with this image, and set it to "repeat".
                destCtx.fillStyle = ptrn;
                destCtx.fillRect(0, 0, copyCanvas.width, copyCanvas.height); // context.fillRect(x, y, width, height);
                destCtx.globalAlpha = 1;
            }

            $.each(_this.imgContainer.find("img"), function () {
                //Draw Backgroundimages to the export canvas
                var width = $(this).width();
                var height = $(this).height();
                var p = $(this).position();
                var left = Math.round(p.left * 100) / 100;
                var top = Math.round(p.top * 100) / 100;
                destCtx.drawImage(this, left, top, width, height);
            });

            //Copy drawings
            destCtx.drawImage(_this.canvas, 0, 0);

            var textBoxCnt = 0;
            $.each($(".textBox"), function () {
                //Draw the text on top
                textBoxCnt++;

                var textContainer = $(this);
                var p = textContainer.position();

                var left = Math.round(p.left * 100) / 100;
                var top = Math.round(p.top * 100) / 100;

                html2canvas(this, {
                    backgroundColor: "rgba(0, 0, 0, 0)",
                    removeContainer: true,
                }).then(function (canvas) {
                    console.log("canvas", canvas);

                    destCtx.drawImage(canvas, left, top);
                    textBoxCnt--;
                    checkForReturn();
                });
            });

            function checkForReturn() {
                if (textBoxCnt == 0) {
                    var url = copyCanvas.toDataURL("image/" + imageFormat);
                    callback(url);
                }
            }
            checkForReturn();
        };
    },
    getImageDataJson() {
        var sendObj = [];
        for (var i = 0; i < this.drawBuffer.length; i++) {
            sendObj.push(JSON.parse(JSON.stringify(this.drawBuffer[i])));
            delete sendObj[i]["username"];
            delete sendObj[i]["wid"];
            delete sendObj[i]["drawId"];
        }
        return JSON.stringify(sendObj, null, 2);
    },
    loadData: function (content) {
        var _this = this;
        _this.loadDataInSteps(content, true, function (stepData) {
            if (
                stepData["username"] == _this.settings.username &&
                _this.drawId < stepData["drawId"]
            ) {
                _this.drawId = stepData["drawId"] + 1;
            }
        });
    },
    loadDataInSteps(content, isNewData, callAfterEveryStep) {
        var _this = this;

        function lData(index) {
            for (var i = index; i < content.length; i++) {
                if (content[i]["t"] === "addImgBG" && content[i]["draw"] == "1") {
                    _this.handleEventsAndData(content[i], isNewData, function () {
                        callAfterEveryStep(content[i], i);
                        lData(i + 1);
                    });
                    break;
                } else {
                    _this.handleEventsAndData(content[i], isNewData);
                    callAfterEveryStep(content[i], i);
                }
            }
        }
        lData(0);
    },
    loadJsonData(content, doneCallback) {
        var _this = this;
        _this.loadDataInSteps(content, false, function (stepData, index) {
            _this.sendFunction(stepData);
            if (index >= content.length - 1) {
                //Done with all data
                _this.drawId++;
                if (doneCallback) {
                    doneCallback();
                }
            }
        });
    },
    sendFunction: function (content) {
        //Sends every draw to server
        var _this = this;
        content["wid"] = _this.settings.whiteboardId;
        content["username"] = _this.settings.username;
        content["drawId"] = _this.drawId;

        var tool = content["t"];
        if (_this.settings.sendFunction) {
            _this.settings.sendFunction(content);
        }
        if (
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
                "setTextboxBackgroundColor",
            ].includes(tool)
        ) {
            _this.drawBuffer.push(content);
        }
    },
    refreshCursorAppearance() {
        //Set cursor depending on current active tool
        var _this = this;
        if (_this.tool === "pen" || _this.tool === "eraser") {
            _this.mouseOverlay.css({ cursor: "none" });
        } else if (_this.tool === "mouse") {
            this.mouseOverlay.css({ cursor: "default" });
        } else {
            //Line, Rec, Circle, Cutting
            _this.mouseOverlay.css({ cursor: "crosshair" });
        }
    },
};

function lanczosKernel(x) {
    if (x == 0) {
        return 1.0;
    }
    return (2 * Math.sin(Math.PI * x) * Math.sin((Math.PI * x) / 2)) / Math.pow(Math.PI * x, 2);
}

function lanczosInterpolate(xm1, ym1, x0, y0, x1, y1, x2, y2, a) {
    var cm1 = lanczosKernel(1 + a);
    var c0 = lanczosKernel(a);
    var c1 = lanczosKernel(1 - a);
    var c2 = lanczosKernel(2 - a);
    var delta = (cm1 + c0 + c1 + c2 - 1) / 4;
    cm1 -= delta;
    c0 -= delta;
    c1 -= delta;
    c2 -= delta;
    return [cm1 * xm1 + c0 * x0 + c1 * x1 + c2 * x2, cm1 * ym1 + c0 * y0 + c1 * y1 + c2 * y2];
}

function testImage(url, callback, timeout) {
    timeout = timeout || 5000;
    var timedOut = false,
        timer;
    var img = new Image();
    img.onerror = img.onabort = function () {
        if (!timedOut) {
            clearTimeout(timer);
            callback(false);
        }
    };
    img.onload = function () {
        if (!timedOut) {
            clearTimeout(timer);
            callback(true);
        }
    };
    img.src = url;
    timer = setTimeout(function () {
        timedOut = true;
        // reset .src to invalid URL so it stops previous
        // loading, but doesn't trigger new load
        img.src = "//!!!!/test.jpg";
        callback(false);
    }, timeout);
}

export default whiteboard;
