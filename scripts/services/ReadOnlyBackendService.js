const { v4: uuidv4 } = require("uuid");

class ReadOnlyBackendService {
    /**
     * Mapping from an editable whiteboard id to the matching read-only whiteboard id
     * @type {Map<string, string>}
     * @private
     */
    _idToReadOnlyId = new Map();

    /**
     * Mapping from a read-only whiteboard id to the matching editable whiteboard id
     *
     * @type {Map<string, string>}
     * @private
     */
    _readOnlyIdToId = new Map();

    /**
     * Make sure a whiteboardId is ignited in the service
     *
     * If it's not found in the service, we assume that it's an editable whiteboard
     *
     * @param {string} whiteboardId
     */
    init(whiteboardId) {
        const idToReadOnlyId = this._idToReadOnlyId;
        const readOnlyIdToId = this._readOnlyIdToId;

        if (!idToReadOnlyId.has(whiteboardId) && !readOnlyIdToId.has(whiteboardId)) {
            const readOnlyId = uuidv4();
            idToReadOnlyId.set(whiteboardId, readOnlyId);
            readOnlyIdToId.set(readOnlyId, whiteboardId);
        }
    }

    /**
     * Get the read-only id corresponding to a whiteboard id
     *
     * @param {string} whiteboardId
     * @return {string}
     */
    getReadOnlyId(whiteboardId) {
        // make sure it's inited
        if (this.isReadOnly(whiteboardId)) return whiteboardId;
        // run in isReadOnly
        // this.init(whiteboardId);
        return this._idToReadOnlyId.get(whiteboardId);
    }

    /**
     * Get the id corresponding to readonly id
     *
     * @param {string} readOnlyId
     * @return {string}
     */
    getIdFromReadOnlyId(readOnlyId) {
        return this._readOnlyIdToId.get(readOnlyId);
    }

    /**
     * Tell is whiteboard id corresponds to a read-only whiteboard
     *
     * @param whiteboardId
     * @return {boolean}
     */
    isReadOnly(whiteboardId) {
        this.init(whiteboardId);
        return this._readOnlyIdToId.has(whiteboardId);
    }
}

module.exports = new ReadOnlyBackendService();
