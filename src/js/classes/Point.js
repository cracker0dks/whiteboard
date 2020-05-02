import {computeDist} from "../utils";

class Point {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {Point} otherPoint
     * @returns {number}
     */
    distTo(otherPoint) {
        return computeDist(this, otherPoint);
    }
}

export default Point;