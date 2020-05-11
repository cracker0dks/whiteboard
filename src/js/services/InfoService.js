import ConfigService from "./ConfigService";

/**
 * Class the handle the information about the whiteboard
 */
class InfoService {
    /**
     * @type {boolean}
     * @private
     */
    _infoAreDisplayed = false;

    /**
     * Holds the number of user connected to the server
     *
     * @type {number}
     * @readonly
     */
    nbConnectedUsers = -1;

    /**
     *
     * @type {{w: number, h: number}}
     * @private
     */
    _smallestScreenResolution = undefined;

    /**
     * @type {number}
     * @private
     */
    _nbMessagesSent = 0;

    /**
     * @type {number}
     * @private
     */
    _nbMessagesReceived = 0;

    /**
     * Holds the interval Id
     * @type {number}
     * @private
     */
    _refreshInfoIntervalId = undefined;

    /**
     * @param {number} nbConnectedUsers
     * @param {{w: number, h: number}} smallestScreenResolution
     */
    updateInfoFromServer({ nbConnectedUsers, smallestScreenResolution = undefined }) {
        if (this.nbConnectedUsers !== nbConnectedUsers) {
            // Refresh config service parameters on nb connected user change
            ConfigService.refreshNbUserDependant(nbConnectedUsers);
        }
        this.nbConnectedUsers = nbConnectedUsers;
        if (smallestScreenResolution) {
            this._smallestScreenResolution = smallestScreenResolution;
        }
    }

    /**
     * @returns {(undefined|{w: number, h: number})}
     */
    get smallestScreenResolution() {
        return this._smallestScreenResolution;
    }

    incrementNbMessagesReceived() {
        this._nbMessagesReceived++;
    }

    incrementNbMessagesSent() {
        this._nbMessagesSent++;
    }

    refreshDisplayedInfo() {
        $("#messageReceivedCount")[0].innerText = String(this._nbMessagesReceived);
        $("#messageSentCount")[0].innerText = String(this._nbMessagesSent);
        $("#connectedUsersCount")[0].innerText = String(this.nbConnectedUsers);
        const { _smallestScreenResolution: ssr } = this;
        $("#smallestScreenResolution")[0].innerText = ssr ? `(${ssr.w}, ${ssr.h})` : "Unknown";
    }

    displayInfo() {
        $("#whiteboardInfoContainer").toggleClass("displayNone", false);
        $("#displayWhiteboardInfoBtn").toggleClass("active", true);
        this._infoAreDisplayed = true;

        this.refreshDisplayedInfo();
        this._refreshInfoIntervalId = setInterval(() => {
            // refresh only on a specific interval to reduce
            // refreshing cost
            this.refreshDisplayedInfo();
        }, ConfigService.refreshInfoInterval);
    }

    hideInfo() {
        $("#whiteboardInfoContainer").toggleClass("displayNone", true);
        $("#displayWhiteboardInfoBtn").toggleClass("active", false);
        this._infoAreDisplayed = false;
        if (this._refreshInfoIntervalId) {
            clearInterval(this._refreshInfoIntervalId);
            this._refreshInfoIntervalId = undefined;
        }
    }

    toggleDisplayInfo() {
        if (this._infoAreDisplayed) {
            this.hideInfo();
        } else {
            this.displayInfo();
        }
    }
}

export default new InfoService();
