import { getThrottling } from "./ConfigService.utils";

class ConfigService {
    /**
     * @type {object}
     * @private
     */
    _configFromServer = {};

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
     * @type {{minDistDelta: number, minTimeDelta: number}}
     */
    pointerEventsThrottling = { minDistDelta: 0, minTimeDelta: 0 };

    /**
     * @readonly
     * @type {number}
     */
    refreshInfoInterval = 1000;

    /**
     * Init the service from the config sent by the server
     *
     * @param {object} configFromServer
     */
    initFromServer(configFromServer) {
        this._configFromServer = configFromServer;

        const { common } = configFromServer;
        const { readOnlyOnWhiteboardLoad, showSmallestScreenIndicator, performance } = common;

        this.readOnlyOnWhiteboardLoad = readOnlyOnWhiteboardLoad;
        this.showSmallestScreenIndicator = showSmallestScreenIndicator;
        this.refreshInfoInterval = 1000 / performance.refreshInfoFreq;

        console.log("Whiteboard config from server:", configFromServer, "parsed:", this);
    }

    /**
     * TODO
     */
    refreshNbUserDependant(nbUser) {
        const { _configFromServer } = this;
        const { common } = _configFromServer;
        const { performance } = common;
        const { pointerEventsThrottling } = performance;

        this.pointerEventsThrottling = getThrottling(pointerEventsThrottling, nbUser);
    }
}

export default new ConfigService();
