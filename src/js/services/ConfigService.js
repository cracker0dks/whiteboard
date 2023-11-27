import { getThrottling } from "./ConfigService.utils.js";

/**
 * Class to hold the configuration sent by the backend
 */
class ConfigService {
    /**
     * @type {object}
     */
    #configFromServer = {};
    get configFromServer() {
        return this.#configFromServer;
    }

    /**
     * Associated read-only id for this whiteboad
     * @type {string}
     */
    #correspondingReadOnlyWid = "";
    get correspondingReadOnlyWid() {
        return this.#correspondingReadOnlyWid;
    }

    /**
     * @type {boolean}
     */
    #isReadOnly = true;
    get isReadOnly() {
        return this.#isReadOnly;
    }

    /**
     * @type {{displayInfo: boolean, setReadOnly: boolean}}
     * @readonly
     */
    #onWhiteboardLoad = { setReadOnly: false, displayInfo: false };
    get readOnlyOnWhiteboardLoad() {
        return this.#onWhiteboardLoad.setReadOnly;
    }
    get displayInfoOnWhiteboardLoad() {
        return this.#onWhiteboardLoad.displayInfo;
    }

    /**
     * @type {boolean}
     */
    #showSmallestScreenIndicator = true;
    get showSmallestScreenIndicator() {
        return this.#showSmallestScreenIndicator;
    }

    /**
     * @type {string}
     */
    #imageDownloadFormat = "png";
    get imageDownloadFormat() {
        return this.#imageDownloadFormat;
    }

    /**
     * @type {boolean}
     */
    #drawBackgroundGrid = false;
    get drawBackgroundGrid() {
        return this.#drawBackgroundGrid;
    }

    /**
     * @type {string}
     */
    #backgroundGridImage = "bg_grid.png";
    get backgroundGridImage() {
        return this.#backgroundGridImage;
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
        const {
            onWhiteboardLoad,
            showSmallestScreenIndicator,
            imageDownloadFormat,
            drawBackgroundGrid,
            backgroundGridImage,
            performance,
        } = common;

        this.#onWhiteboardLoad = onWhiteboardLoad;
        this.#showSmallestScreenIndicator = showSmallestScreenIndicator;
        this.#imageDownloadFormat = imageDownloadFormat;
        this.#drawBackgroundGrid = drawBackgroundGrid;
        this.#backgroundGridImage = backgroundGridImage;
        this.#refreshInfoInterval = 1000 / performance.refreshInfoFreq;

        const { whiteboardSpecific } = configFromServer;
        const { correspondingReadOnlyWid, isReadOnly } = whiteboardSpecific;

        this.#correspondingReadOnlyWid = correspondingReadOnlyWid;
        this.#isReadOnly = isReadOnly;

        console.log("Whiteboard config from server:", configFromServer, "parsed:", this);
    }

    /**
     * Refresh config that depends on the number of user connected to whiteboard
     *
     * @param {number} userCount
     */
    refreshUserCountDependant(userCount) {
        const { configFromServer } = this;
        const { common } = configFromServer;
        const { performance } = common;
        const { pointerEventsThrottling } = performance;

        this.#pointerEventsThrottling = getThrottling(pointerEventsThrottling, userCount);
    }
}

export default new ConfigService();
