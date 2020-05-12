const config = require("./config/config");

/**
 * Class to hold information related to a whiteboard
 */
class WhiteboardServerSideInfo {
    static defaultScreenResolution = { w: 1000, h: 1000 };

    /**
     * @type {number}
     * @private
     */
    #nbConnectedUsers = 0;
    get nbConnectedUsers() {
        return this.#nbConnectedUsers;
    }

    /**
     * @type {Map<int, {w: number, h: number}>}
     * @private
     */
    #screenResolutionByClients = new Map();
    get screenResolutionByClients() {
        return this.#screenResolutionByClients;
    }

    /**
     * Variable to tell if these info have been sent or not
     *
     * @private
     * @type {boolean}
     */
    #hasNonSentUpdates = false;
    get hasNonSentUpdates() {
        return this.#hasNonSentUpdates;
    }

    incrementNbConnectedUsers() {
        this.#nbConnectedUsers++;
        this.#hasNonSentUpdates = true;
    }

    decrementNbConnectedUsers() {
        this.#nbConnectedUsers--;
        this.#hasNonSentUpdates = true;
    }

    hasConnectedUser() {
        return this.#nbConnectedUsers > 0;
    }

    /**
     * Store information about the client's screen resolution
     *
     * @param {number} clientId
     * @param {number} w client's width
     * @param {number} h client's hight
     */
    setScreenResolutionForClient(clientId, { w, h }) {
        this.#screenResolutionByClients.set(clientId, { w, h });
        this.#hasNonSentUpdates = true;
    }

    /**
     * Delete the stored information about the client's screen resoltion
     * @param clientId
     */
    deleteScreenResolutionOfClient(clientId) {
        this.#screenResolutionByClients.delete(clientId);
        this.#hasNonSentUpdates = true;
    }

    /**
     * Get the smallest client's screen size on a whiteboard
     * @return {{w: number, h: number}}
     */
    getSmallestScreenResolution() {
        const { screenResolutionByClients: resolutions } = this;
        return {
            w: Math.min(...Array.from(resolutions.values()).map((res) => res.w)),
            h: Math.min(...Array.from(resolutions.values()).map((res) => res.h)),
        };
    }

    infoWasSent() {
        this.#hasNonSentUpdates = false;
    }

    shouldSendInfo() {
        return this.#hasNonSentUpdates;
    }

    asObject() {
        const out = {
            nbConnectedUsers: this.#nbConnectedUsers,
        };

        if (config.frontend.showSmallestScreenIndicator) {
            out.smallestScreenResolution = this.getSmallestScreenResolution();
        }

        return out;
    }
}

module.exports = WhiteboardServerSideInfo;
