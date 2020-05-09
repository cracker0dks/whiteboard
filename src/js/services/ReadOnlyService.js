/**
 * Class the handle the read-only logic
 */
class ReadOnlyService {
    /**
     * @type {boolean}
     * @private
     */
    _readOnlyActive = true;

    /**
     * @type {object}
     * @private
     */
    _previousToolHtmlElem = null;

    /**
     * Activate read-only mode
     */
    activateReadOnlyMode() {
        this._readOnlyActive = true;

        this._previousToolHtmlElem = $(".whiteboard-tool.active");

        // switch to mouse tool to prevent the use of the
        // other tools
        $(".whiteboard-tool[tool=mouse]").click();
        $(".whiteboard-tool").prop("disabled", true);
        $(".whiteboard-edit-group > button").prop("disabled", true);
        $(".whiteboard-edit-group").addClass("group-disabled");
        $("#whiteboardUnlockBtn").hide();
        $("#whiteboardLockBtn").show();
    }

    /**
     * Deactivate read-only mode
     */
    deactivateReadOnlyMode() {
        this._readOnlyActive = false;

        $(".whiteboard-tool").prop("disabled", false);
        $(".whiteboard-edit-group > button").prop("disabled", false);
        $(".whiteboard-edit-group").removeClass("group-disabled");
        $("#whiteboardUnlockBtn").show();
        $("#whiteboardLockBtn").hide();

        // restore previously selected tool
        if (this._previousToolHtmlElem) this._previousToolHtmlElem.click();
    }

    /**
     * Get the read-only status
     * @returns {boolean}
     */
    get readOnlyActive() {
        return this._readOnlyActive;
    }
}

export default new ReadOnlyService();
