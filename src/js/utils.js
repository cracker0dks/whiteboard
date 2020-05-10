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

/**
 * get 'GET' parameter by variable name
 * @param variable
 * @return {boolean|*}
 */
export function getQueryVariable(variable) {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
        const pair = vars[i].split("=");
        if (pair[0] === variable) {
            return pair[1];
        }
    }
    return false;
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
