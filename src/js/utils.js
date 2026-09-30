/**
 * Compute the euclidean distance between two points
 * @param {Point} p1
 * @param {Point} p2
 */
export function computeDist(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Return the current time in ms since 1970
 * @returns {number}
 */
export function getCurrentTimeMs() {
    return new Date().getTime();
}

export function getSubDir() {
    const url = document.URL.substr(0, document.URL.lastIndexOf("/"));
    const urlSplit = url.split("/");
    let subdir = "";
    for (let i = 3; i < urlSplit.length; i++) {
        subdir = subdir + "/" + urlSplit[i];
    }

    return subdir;
}

/**
 * Distance from point (px, py) to the line segment (x1, y1)-(x2, y2)
 */
export function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(Math.pow(px - (x1 + t * dx), 2) + Math.pow(py - (y1 + t * dy), 2));
}

/**
 * Distance from point (x, y) to the border of an axis-aligned rectangle.
 * Returns 0 when the point is inside the rectangle.
 */
export function distToRectBorder(x, y, x1, y1, x2, y2) {
    const dx = Math.max(x1 - x, 0, x - x2);
    const dy = Math.max(y1 - y, 0, y - y2);
    return Math.sqrt(dx * dx + dy * dy);
}
