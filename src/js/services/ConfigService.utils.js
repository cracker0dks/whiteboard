/**
 * Helper to extract the correct correct throttling values based on the config and the number of user
 *
 * @param {Array.<{fromNbUser: number, minDistDelta: number, maxFreq: number}>} pointerEventsThrottling
 * @param {number} nbUser
 * @return {{minDistDelta: number, minTimeDelta: number}}
 */
export function getThrottling(pointerEventsThrottling, nbUser) {
    let tmpOut = pointerEventsThrottling[0];
    let lastDistToNbUser = nbUser - tmpOut.fromNbUser;
    if (lastDistToNbUser < 0) lastDistToNbUser = Number.MAX_VALUE;
    for (const el of pointerEventsThrottling) {
        const distToNbUser = nbUser - el.fromNbUser;
        if (el.fromNbUser <= nbUser && distToNbUser <= lastDistToNbUser) {
            tmpOut = el;
            lastDistToNbUser = distToNbUser;
        }
    }

    return { minDistDelta: tmpOut.minDistDelta, minTimeDelta: 1000 * (1 / tmpOut.maxFreq) };
}
