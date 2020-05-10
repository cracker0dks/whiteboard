class ConfigService {
    /**
     * @readonly
     * @type {boolean}
     */
    readOnlyOnWhiteboardLoad = false;

    /**
     * @readonly
     * @type {boolean}
     */
    showSmallestScreenIndicator = true;

    /**
     * @readonly
     * @type {number}
     */
    pointerEventsThresholdMinDistDelta = 0;

    /**
     * @readonly
     * @type {number}
     */
    pointerEventsThresholdMinTimeDelta = 0;

    /**
     * @readonly
     * @type {number}
     */
    refreshInfoInterval = 1000;

    /**
     * Init the service from the config sent by the server
     *
     * @param {object} serverResponse
     */
    initFromServer(serverResponse) {
        const { common } = serverResponse;
        const { readOnlyOnWhiteboardLoad, showSmallestScreenIndicator, performance } = common;

        this.readOnlyOnWhiteboardLoad = readOnlyOnWhiteboardLoad;
        this.showSmallestScreenIndicator = showSmallestScreenIndicator;
        this.pointerEventsThresholdMinDistDelta = performance.pointerEventsThreshold.minDistDelta;
        this.pointerEventsThresholdMinTimeDelta = performance.pointerEventsThreshold.minTimeDelta;
        this.refreshInfoInterval = 1000 / performance.refreshInfoFreq;

        console.log("Whiteboard config from server:", serverResponse, "parsed:", this);
    }
}

export default new ConfigService();
