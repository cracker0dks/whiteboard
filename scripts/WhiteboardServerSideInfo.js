const config = require("./config/config");

/**
 * Class to hold information related to a whiteboard
 */
class WhiteboardServerSideInfo {
    static defaultScreenResolution = { w: 1000, h: 1000 };

    constructor() {
        /**
         * @type {number}
         * @private
         */
        this._nbConnectedUsers = 0;

        /**
         * @type {Map<int, {w: number, h: number}>}
         * @private
         */
        this._screenResolutionByClients = new Map();

        /**
         * Variable to tell if these info have been sent or not
         *
         * @private
         * @type {boolean}
         */
        this._hasNonSentUpdates = false;
    }

    incrementNbConnectedUsers() {
        this._nbConnectedUsers++;
        this._hasNonSentUpdates = true;
    }

    decrementNbConnectedUsers() {
        this._nbConnectedUsers--;
        this._hasNonSentUpdates = true;
    }

    hasConnectedUser() {
        return this._nbConnectedUsers > 0;
    }

    /**
     * Store information about the client's screen resolution
     *
     * @param {number} clientId
     * @param {number} w client's width
     * @param {number} h client's hight
     */
    setScreenResolutionForClient(clientId, { w, h }) {
        this._screenResolutionByClients.set(clientId, { w, h });
        this._hasNonSentUpdates = true;
    }

    /**
     * Delete the stored information about the client's screen resoltion
     * @param clientId
     */
    deleteScreenResolutionOfClient(clientId) {
        this._screenResolutionByClients.delete(clientId);
        this._hasNonSentUpdates = true;
    }

    /**
     * Get the smallest client's screen size on a whiteboard
     * @return {{w: number, h: number}}
     */
    getSmallestScreenResolution() {
        const { _screenResolutionByClients: resolutions } = this;
        return {
            w: Math.min(...Array.from(resolutions.values()).map((res) => res.w)),
            h: Math.min(...Array.from(resolutions.values()).map((res) => res.h)),
        };
    }

    infoWasSent() {
        this._hasNonSentUpdates = false;
    }

    shouldSendInfo() {
        return this._hasNonSentUpdates;
    }

    asObject() {
        const out = {
            nbConnectedUsers: this._nbConnectedUsers,
        };

        if (config.frontend.showSmallestScreenIndicator) {
            out.smallestScreenResolution = this.getSmallestScreenResolution();
        }

        return out;
    }
}

module.exports = WhiteboardServerSideInfo;
