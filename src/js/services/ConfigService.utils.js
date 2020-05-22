/**
 * Helper to extract the correct throttling values based on the config and the number of user
 *
 * @param {Array.<{fromUserCount: number, minDistDelta: number, maxFreq: number}>} pointerEventsThrottling
 * @param {number} userCount
 * @return {{minDistDelta: number, minTimeDelta: number}}
 */
export function getThrottling(pointerEventsThrottling, userCount) {
    let tmpOut = pointerEventsThrottling[0];
    let lastDistToUserCount = userCount - tmpOut.fromUserCount;
    if (lastDistToUserCount < 0) lastDistToUserCount = Number.MAX_VALUE;
    for (const el of pointerEventsThrottling) {
        const distToUserCount = userCount - el.fromUserCount;
        if (el.fromUserCount <= userCount && distToUserCount <= lastDistToUserCount) {
            tmpOut = el;
            lastDistToUserCount = distToUserCount;
        }
    }

    return { minDistDelta: tmpOut.minDistDelta, minTimeDelta: 1000 * (1 / tmpOut.maxFreq) };
}
