import config from "../config/config.js";
import ROnlyBackendService from "./ReadOnlyBackendService.js";
const ReadOnlyBackendService = new ROnlyBackendService();

/**
 * Class to hold information related to a whiteboard
 */
export class WhiteboardInfo {
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
     * @type {Map<string, {w: number, h: number}>}
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
     * @param {string} clientId
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

/**
 * Wrapper class around map to treat both the editable whiteboard and its read-only version the same
 */
export class InfoByWhiteBoardMap extends Map {
    get(wid) {
        const readOnlyId = ReadOnlyBackendService.getReadOnlyId(wid);
        return super.get(readOnlyId);
    }

    set(wid, val) {
        const readOnlyId = ReadOnlyBackendService.getReadOnlyId(wid);
        return super.set(readOnlyId, val);
    }

    has(wid) {
        const readOnlyId = ReadOnlyBackendService.getReadOnlyId(wid);
        return super.has(readOnlyId);
    }

    delete(wid) {
        const readOnlyId = ReadOnlyBackendService.getReadOnlyId(wid);
        return super.delete(readOnlyId);
    }
}

export default class WhiteboardInfoBackendService {
    /**
     * @type {Map<string, WhiteboardInfo>}
     */
    #infoByWhiteboard = new InfoByWhiteBoardMap();

    /**
     * Start the auto sending of information to all the whiteboards
     *
     * @param io
     */
    start(io) {
        // auto clean infoByWhiteboard
        setInterval(() => {
            this.#infoByWhiteboard.forEach((info, readOnlyWhiteboardId) => {
                if (info.shouldSendInfo()) {
                    // broadcast to editable whiteboard
                    const wid = ReadOnlyBackendService.getIdFromReadOnlyId(readOnlyWhiteboardId);
                    io.sockets
                        .in(wid)
                        .compress(false)
                        .emit("whiteboardInfoUpdate", info.asObject());

                    // also send to readonly whiteboard
                    io.sockets
                        .in(readOnlyWhiteboardId)
                        .compress(false)
                        .emit("whiteboardInfoUpdate", info.asObject());

                    info.infoWasSent();
                }
            });
        }, (1 / config.backend.performance.whiteboardInfoBroadcastFreq) * 1000);
    }

    /**
     * Track a join event of client to a whiteboard
     *
     * @param {string} clientId
     * @param {string} whiteboardId
     * @param {{w: number, h: number}} screenResolution
     */
    join(clientId, whiteboardId, screenResolution) {
        const infoByWhiteboard = this.#infoByWhiteboard;

        if (!infoByWhiteboard.has(whiteboardId)) {
            infoByWhiteboard.set(whiteboardId, new WhiteboardInfo());
        }

        const whiteboardServerSideInfo = infoByWhiteboard.get(whiteboardId);
        whiteboardServerSideInfo.incrementNbConnectedUsers();
        this.setScreenResolution(clientId, whiteboardId, screenResolution);
    }

    /**
     * Set the screen resolution of a client
     * @param {string} clientId
     * @param {string} whiteboardId
     * @param {{w: number, h: number}} screenResolution
     */
    setScreenResolution(clientId, whiteboardId, screenResolution) {
        const infoByWhiteboard = this.#infoByWhiteboard;

        const whiteboardServerSideInfo = infoByWhiteboard.get(whiteboardId);
        if (whiteboardServerSideInfo) {
            whiteboardServerSideInfo.setScreenResolutionForClient(
                clientId,
                screenResolution || WhiteboardInfo.defaultScreenResolution
            );
        }
    }

    /**
     * Track disconnect from a client
     * @param {string} clientId
     * @param {string} whiteboardId
     */
    leave(clientId, whiteboardId) {
        const infoByWhiteboard = this.#infoByWhiteboard;

        if (infoByWhiteboard.has(whiteboardId)) {
            const whiteboardServerSideInfo = infoByWhiteboard.get(whiteboardId);

            if (clientId) {
                whiteboardServerSideInfo.deleteScreenResolutionOfClient(clientId);
            }

            whiteboardServerSideInfo.decrementNbConnectedUsers();

            if (whiteboardServerSideInfo.hasConnectedUser()) {
            } else {
                infoByWhiteboard.delete(whiteboardId);
            }
        }
    }

    /**
     * Get the number of clients on a whiteboard
     *
     * @param {string} wid
     * @returns number|null
     */
    getNbClientOnWhiteboard(wid) {
        const infoByWhiteboard = this.#infoByWhiteboard;
        const info = infoByWhiteboard.get(wid);

        if (info) return info.nbConnectedUsers;
        else return null;
    }
}
