import { computeDist } from "../utils";

class Point {
    /**
     * @type {number}
     */
    #x;
    get x() {
        return this.#x;
    }

    /**
     * @type {number}
     */
    #y;
    get y() {
        return this.#y;
    }

    /**
     * @type {Point}
     */
    static #lastKnownPos = new Point(0, 0);
    static get lastKnownPos() {
        return Point.#lastKnownPos;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.#x = x;
        this.#y = y;
    }

    get isZeroZero() {
        return this.#x === 0 && this.#y === 0;
    }

    /**
     * Get a Point object from an event
     * @param {event} e
     * @returns {Point}
     */
    static fromEvent(callerEvent) {
        let e;
        // check for HammerJS Event
        if (callerEvent.srcEvent) e = callerEvent.srcEvent;
        else e = callerEvent;

        // the epsilon hack is required to detect touches
        const epsilon = 0.0001;

        const parent = document.getElementById("whiteboardContainer");
        var scaleX;
        var scaleY;
        var skewX; // not used
        var skewY; // not used
        var translateX;
        var translateY;

        try {
            var transform = window
                .getComputedStyle(parent, null)
                .getPropertyValue("-webkit-transform")
                .toString();
            var matrix = transform
                .slice(transform.indexOf("(") + 1, transform.indexOf(")" - 1))
                .split(", ");
            if (matrix != undefined && matrix[0] != "non") {
                scaleX = 1 / Number(matrix[0]);
                skewX = Number(matrix[1]);
                skewY = Number(matrix[2]);
                scaleY = 1 / Number(matrix[3]);
                translateX = Number(matrix[4]);
                translateY = Number(matrix[5]);
            } else {
                scaleX = 1;
                scaleY = 1;
                skewX = 0;
                skewY = 0;
                translateX = 0;
                translateY = 0;
            }
        } catch (err) {
            console.log(err);
        }
        var rect = parent.getBoundingClientRect();

        let xOffset = window.Event
            ? e.pageX
            : e.clientX +
              epsilon +
              (document.documentElement.scrollLeft
                  ? document.documentElement.scrollLeft
                  : document.body.scrollLeft);
        let yOffset = window.Event
            ? e.pageY
            : e.clientY +
              epsilon +
              (document.documentElement.scrollTop
                  ? document.documentElement.scrollTop
                  : document.body.scrollTop);

        let x = (xOffset - translateX) * scaleX - ((scaleX - 1) / (2 * (1 / scaleX))) * rect.width; // last part works but don't know why
        let y = (yOffset - translateY) * scaleY - ((scaleY - 1) / (2 * (1 / scaleY))) * rect.height; // short Form: scale(offset-translate-((scale-1)*width/2))

        if (Number.isNaN(x) || Number.isNaN(y) || (x === epsilon && y === epsilon)) {
            // if it's a touch actually
            if (e.touches && e.touches.length && e.touches.length > 0) {
                const touch = e.touches[0];
                x = (touch.clientX - rect.x - translateX) * scaleX;
                y = (touch.clientY - rect.y - translateY) * scaleY;
            } else {
                // if it's a touchend event
                return Point.#lastKnownPos;
            }
        }

        Point.#lastKnownPos = new Point(x - epsilon, y - epsilon);
        return Point.#lastKnownPos;
    }

    /**
     * Compute euclidean distance between points
     *
     * @param {Point} otherPoint
     * @returns {number}
     */
    distTo(otherPoint) {
        return computeDist(this, otherPoint);
    }
}

export default Point;
