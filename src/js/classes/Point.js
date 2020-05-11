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
    static fromEvent(e) {
        // the epsilon hack is required to detect touches
        const epsilon = 0.0001;
        let x = (e.offsetX || e.pageX - $(e.target).offset().left) + epsilon;
        let y = (e.offsetY || e.pageY - $(e.target).offset().top) + epsilon;

        if (Number.isNaN(x) || Number.isNaN(y) || (x === epsilon && y === epsilon)) {
            // if it's a touch actually
            if (e.touches && e.touches.length && e.touches.length > 0) {
                const touch = e.touches[0];
                x = touch.clientX - $("#mouseOverlay").offset().left;
                y = touch.clientY - $("#mouseOverlay").offset().top;
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
