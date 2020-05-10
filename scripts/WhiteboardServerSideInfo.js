class WhiteboardServerSideInfo {
    constructor() {
        /**
         * @type {number}
         * @private
         */
        this._nbConnectedUsers = 0;

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

    asObject() {
        return { nbConnectedUsers: this._nbConnectedUsers };
    }

    infoWasSent() {
        this._hasNonSentUpdates = false;
    }

    shouldSendInfo() {
        return this._hasNonSentUpdates;
    }
}

module.exports = WhiteboardServerSideInfo;
