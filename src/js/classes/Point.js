import {computeDist} from "../utils";

class Point {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        /**
         * @type {number}
         * @private
         */
        this._x = x;

        /**
         * @type {number}
         * @private
         */
        this._y = y;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get isZeroZero() {
        return this._x === 0 && this._y === 0;
    }

    /**
     * Get a Point object from an event
     * @param {event} e
     * @returns {Point}
     */
    static fromEvent(e) {
        // the epsilon hack is required to detect touches
        const epsilon = 0.0001;
        let x = (e.offsetX || e.pageX - $(e.target).offset().left) + epsilon;
        let y = (e.offsetY || e.pageY - $(e.target).offset().top) + epsilon;

        if (Number.isNaN(x) || Number.isNaN(y) || (x === epsilon && y === epsilon)) { // if it's a touch actually
            if (e.touches && e.touches.length && e.touches.length > 0) {
                const touch = e.touches[0];
                x = touch.clientX - $("#mouseOverlay").offset().left;
                y = touch.clientY - $("#mouseOverlay").offset().top;
            } else {
                // if it's a touchend event
                return Point._lastKnownPos;
            }
        }

        Point._lastKnownPos = new Point(x - epsilon, y - epsilon);
        return Point._lastKnownPos;
    }

    /**
     * @type {Point}
     * @private
     */
    static _lastKnownPos = new Point(0, 0);

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