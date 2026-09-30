/**
 * End-to-end tests: real backend server + real socket.io clients.
 *
 * Covers the wire protocol and the server-side state for:
 * - pen drawing + broadcast (basic collaboration)
 * - object eraser (removeDraw) + normalized stored state
 * - stroke move (moveDraw) + normalized stored state
 * - undo/redo of an erase
 * - textbox resize (setTextboxSize)
 * - XSS sanitization of string content
 * - idle whiteboard auto-delete (issue #53)
 */
import { once } from "events";
import io from "socket.io-client";
import startBackendServer from "./server-backend.js";
import s_whiteboard from "./s_whiteboard.js";
import config from "./config/config.js";

const SOCKET_PATH = "/ws-api";
const TIMEOUT = 5000;

let server;
let ioServer;
let baseUrl;
const clients = [];

function connect() {
    const client = io(baseUrl, { path: SOCKET_PATH, transports: ["websocket"] });
    clients.push(client);
    return client;
}

function join(client, wid) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(
            () => reject(new Error("timeout waiting for whiteboardConfig")),
            TIMEOUT,
        );
        client.once("whiteboardConfig", () => {
            clearTimeout(t);
            resolve();
        });
        client.emit("joinWhiteboard", { wid });
    });
}

function waitFor(client, event, ms = TIMEOUT) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
        client.once(event, (data) => {
            clearTimeout(t);
            resolve(data);
        });
    });
}

async function loadBoard(wid) {
    const res = await fetch(`${baseUrl}/api/loadwhiteboard?wid=${wid}`);
    expect(res.status).toBe(200);
    return res.json();
}

beforeAll(async () => {
    const backend = startBackendServer(0);
    ({ server, io: ioServer } = backend);
    await once(server, "listening");
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
    clients.forEach((client) => client.close());
    if (ioServer) ioServer.close();
    if (server) {
        server.closeAllConnections?.();
        await once(server, "close");
    }
});

test("health endpoint returns 200", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
});

test("pen stroke is broadcast to other clients and stored", async () => {
    const wid = "e2e-broadcast";
    const a = connect();
    const b = connect();
    await Promise.all([join(a, wid), join(b, wid)]);

    const received = waitFor(b, "drawToWhiteboard");
    a.emit("drawToWhiteboard", {
        wid,
        username: "alice",
        drawId: 1,
        t: "pen",
        d: [10, 10, 20, 20, 30, 30],
        c: "#ff0000",
        th: 4,
    });

    const data = await received;
    expect(data.t).toBe("pen");
    expect(data.username).toBe("alice");
    expect(data.d).toEqual([10, 10, 20, 20, 30, 30]);

    const board = await loadBoard(wid);
    expect(board).toHaveLength(1);
    expect(board[0].t).toBe("pen");
});

test("string content is sanitized (XSS)", async () => {
    const wid = "e2e-xss";
    const a = connect();
    const b = connect();
    await Promise.all([join(a, wid), join(b, wid)]);

    const received = waitFor(b, "drawToWhiteboard");
    a.emit("drawToWhiteboard", {
        wid,
        username: "<script>alert(1)</script>",
        drawId: 1,
        t: "pen",
        d: [0, 0, 5, 5],
        c: "#000000",
        th: 2,
    });

    const data = await received;
    expect(JSON.stringify(data)).not.toContain("<script>");
});

test("removeDraw (object eraser) removes the group and stores normalized state", async () => {
    const wid = "e2e-erase";
    const a = connect();
    const b = connect();
    await Promise.all([join(a, wid), join(b, wid)]);

    // one pen stroke group made of two segments
    a.emit("drawToWhiteboard", {
        wid,
        username: "carol",
        drawId: 1,
        t: "pen",
        d: [0, 0, 10, 10],
        c: "#000000",
        th: 2,
    });
    a.emit("drawToWhiteboard", {
        wid,
        username: "carol",
        drawId: 1,
        t: "pen",
        d: [10, 10, 20, 20],
        c: "#000000",
        th: 2,
    });
    const before = await loadBoard(wid);
    expect(before).toHaveLength(2);

    // the client sends one removeDraw per item of the erased group
    const broadcast = waitFor(b, "drawToWhiteboard");
    a.emit("drawToWhiteboard", {
        wid,
        username: "carol",
        drawId: 2,
        t: "removeDraw",
        d: [0, before[0]],
    });
    a.emit("drawToWhiteboard", {
        wid,
        username: "carol",
        drawId: 2,
        t: "removeDraw",
        d: [1, before[1]],
    });
    const marker = await broadcast;
    expect(marker.t).toBe("removeDraw");

    // stored board must hold the final state: group gone, markers for undo only
    const after = await loadBoard(wid);
    expect(after.filter((item) => item.t === "pen")).toHaveLength(0);
    expect(after.filter((item) => item.t === "removeDraw")).toHaveLength(2);
});

test("moveDraw moves the group to its final position in the stored board", async () => {
    const wid = "e2e-move";
    const a = connect();
    const b = connect();
    await Promise.all([join(a, wid), join(b, wid)]);

    a.emit("drawToWhiteboard", {
        wid,
        username: "bob",
        drawId: 1,
        t: "rect",
        d: [10, 10, 50, 50],
        c: "#0000ff",
        th: 3,
    });
    const before = await loadBoard(wid);
    expect(before[0].d).toEqual([10, 10, 50, 50]);

    const broadcast = waitFor(b, "drawToWhiteboard");
    a.emit("drawToWhiteboard", {
        wid,
        username: "bob",
        drawId: 2,
        t: "moveDraw",
        d: [5, 7, 1, "bob"],
    });
    const marker = await broadcast;
    expect(marker.t).toBe("moveDraw");

    const after = await loadBoard(wid);
    const rect = after.find((item) => item.t === "rect");
    expect(rect.d).toEqual([15, 17, 55, 57]);
    expect(after.filter((item) => item.t === "moveDraw")).toHaveLength(1);
});

test("undo restores an erased group, redo erases it again", async () => {
    const wid = "e2e-undo";
    const a = connect();
    await join(a, wid);

    a.emit("drawToWhiteboard", {
        wid,
        username: "dana",
        drawId: 1,
        t: "pen",
        d: [0, 0, 8, 8],
        c: "#000000",
        th: 2,
    });
    const [pen] = await loadBoard(wid);
    a.emit("drawToWhiteboard", {
        wid,
        username: "dana",
        drawId: 2,
        t: "removeDraw",
        d: [0, pen],
    });
    let board = await loadBoard(wid);
    expect(board.filter((item) => item.t === "pen")).toHaveLength(0);

    a.emit("drawToWhiteboard", { wid, username: "dana", t: "undo" });
    board = await loadBoard(wid);
    expect(board.filter((item) => item.t === "pen")).toHaveLength(1);
    expect(board.filter((item) => item.t === "removeDraw")).toHaveLength(0);

    a.emit("drawToWhiteboard", { wid, username: "dana", t: "redo" });
    board = await loadBoard(wid);
    expect(board.filter((item) => item.t === "pen")).toHaveLength(0);
    expect(board.filter((item) => item.t === "removeDraw")).toHaveLength(1);
});

test("setTextboxSize is stored and broadcast", async () => {
    const wid = "e2e-textbox";
    const a = connect();
    const b = connect();
    await Promise.all([join(a, wid), join(b, wid)]);

    const textboxCreated = waitFor(b, "drawToWhiteboard");
    a.emit("drawToWhiteboard", {
        wid,
        username: "erin",
        drawId: 1,
        t: "addTextBox",
        d: ["tx1", 20, 30, 100, 50, "hello", 16],
        c: "#000000",
    });
    await textboxCreated;
    const received = waitFor(b, "drawToWhiteboard");
    a.emit("drawToWhiteboard", {
        wid,
        username: "erin",
        drawId: 2,
        t: "setTextboxSize",
        d: ["tx1", 120, 60],
    });
    const data = await received;
    expect(data.t).toBe("setTextboxSize");
    expect(data.d).toEqual(["tx1", 120, 60]);

    const board = await loadBoard(wid);
    expect(board.some((item) => item.t === "setTextboxSize" && item.d[0] === "tx1")).toBe(true);
});

test("idle whiteboards are auto-deleted (issue #53)", async () => {
    const original = config.backend.autoDeleteIdleMinutes;
    try {
        config.backend.autoDeleteIdleMinutes = 0.001; // 60 ms
        const wid = "e2e-idle";
        const a = connect();
        await join(a, wid);
        a.emit("drawToWhiteboard", {
            wid,
            username: "frank",
            drawId: 1,
            t: "pen",
            d: [0, 0, 1, 1],
            c: "#000000",
            th: 2,
        });
        // a board that was joined but never drawn on must be cleaned up too
        const silent = connect();
        await join(silent, "e2e-idle-nodraw");
        await new Promise((resolve) => setTimeout(resolve, 120));
        const deleted = s_whiteboard.cleanupExpiredBoards();
        expect(deleted).toContain(wid);
        expect(deleted).toContain("e2e-idle-nodraw");
        expect(s_whiteboard.loadStoredData(wid)).toEqual([]);
    } finally {
        config.backend.autoDeleteIdleMinutes = original;
    }
});
