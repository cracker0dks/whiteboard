import { getThrottling } from "./ConfigService.utils";

class ConfigService {
    /**
     * @type {object}
     */
    #configFromServer = {};
    get configFromServer() {
        return this.#configFromServer;
    }

    /**
     * @type {boolean}
     */
    #readOnlyOnWhiteboardLoad = false;
    get readOnlyOnWhiteboardLoad() {
        return this.#readOnlyOnWhiteboardLoad;
    }

    /**
     * @type {boolean}
     */
    #showSmallestScreenIndicator = true;
    get showSmallestScreenIndicator() {
        return this.#showSmallestScreenIndicator;
    }

    /**
     * @type {{minDistDelta: number, minTimeDelta: number}}
     */
    #pointerEventsThrottling = { minDistDelta: 0, minTimeDelta: 0 };
    get pointerEventsThrottling() {
        return this.#pointerEventsThrottling;
    }

    /**
     * @type {number}
     */
    #refreshInfoInterval = 1000;
    get refreshInfoInterval() {
        return this.#refreshInfoInterval;
    }

    /**
     * Init the service from the config sent by the server
     *
     * @param {object} configFromServer
     */
    initFromServer(configFromServer) {
        this.#configFromServer = configFromServer;

        const { common } = configFromServer;
        const { readOnlyOnWhiteboardLoad, showSmallestScreenIndicator, performance } = common;

        this.#readOnlyOnWhiteboardLoad = readOnlyOnWhiteboardLoad;
        this.#showSmallestScreenIndicator = showSmallestScreenIndicator;
        this.#refreshInfoInterval = 1000 / performance.refreshInfoFreq;

        console.log("Whiteboard config from server:", configFromServer, "parsed:", this);
    }

    /**
     * Refresh config that depends on the number of user connected to whiteboard
     *
     * @param {number} nbUser
     */
    refreshNbUserDependant(nbUser) {
        const { configFromServer } = this;
        const { common } = configFromServer;
        const { performance } = common;
        const { pointerEventsThrottling } = performance;

        this.#pointerEventsThrottling = getThrottling(pointerEventsThrottling, nbUser);
    }
}

export default new ConfigService();
