import { REFRESH_INFO_FREQUENCY } from "../const";

const REFRESH_INTERVAL = 1000 / REFRESH_INFO_FREQUENCY;

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
     * @private
     */
    _nbConnectedUsers = 0;

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
     */
    updateInfoFromServer({ nbConnectedUsers }) {
        this._nbConnectedUsers = nbConnectedUsers;
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
        $("#connectedUsersCount")[0].innerText = String(this._nbConnectedUsers);
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
        }, REFRESH_INTERVAL);
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
