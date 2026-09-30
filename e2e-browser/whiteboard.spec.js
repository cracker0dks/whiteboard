/**
 * Real-browser e2e tests (Playwright + Chromium).
 *
 * Drives the actual UI: toolbar clicks, mouse drags on the board, zoom
 * buttons, undo/redo. State is asserted against the server via
 * /api/loadwhiteboard (same origin), so these tests cover the full
 * client -> socket -> server -> storage pipeline.
 */
import { test, expect } from "@playwright/test";

// unique per run so a reused server never serves stale in-memory board state
const RUN = Date.now().toString(36);
const boardId = (name) => `${name}-${RUN}`;

async function openBoard(page, wid) {
    // the server drops draws that arrive before joinWhiteboard, so wait for
    // the socket connection plus a short settle for the join round-trip
    const connected = page.waitForEvent("console", {
        predicate: (m) => m.text() === "Websocket connected!",
        timeout: 15000,
    });
    await page.goto(`/?whiteboardid=${wid}&username=pwtester`);
    await connected;
    await page.waitForTimeout(300);
}

async function loadBoard(page, wid) {
    return page.evaluate(async (id) => {
        const res = await fetch(`/api/loadwhiteboard?wid=${id}`);
        return res.json();
    }, wid);
}

async function waitForBoard(page, wid, predicate, ms = 8000) {
    const deadline = Date.now() + ms;
    for (;;) {
        const board = await loadBoard(page, wid);
        if (predicate(board)) return board;
        if (Date.now() > deadline) {
            throw new Error("board state did not converge: " + JSON.stringify(board));
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

async function selectTool(page, tool) {
    await page.click(`button[tool="${tool}"]`);
}

async function drag(page, x1, y1, x2, y2, steps = 10) {
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
        await page.mouse.move(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps);
    }
    await page.mouse.up();
}

/** Count non-transparent pixels and the centroid of the ink on the canvas */
async function inkStats(page) {
    return page.evaluate(() => {
        const canvas = document.querySelector("#whiteboardCanvas");
        const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        let count = 0;
        let sx = 0;
        let sy = 0;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const a = data[(y * canvas.width + x) * 4 + 3];
                if (a > 0) {
                    count++;
                    sx += x;
                    sy += y;
                }
            }
        }
        return { count, cx: count ? sx / count : 0, cy: count ? sy / count : 0 };
    });
}

/** Re-renders (zoom, page load) draw pen strokes in a requestAnimationFrame
 *  tick, so poll until the ink state satisfies the predicate */
async function waitForInk(page, predicate, ms = 5000) {
    const deadline = Date.now() + ms;
    for (;;) {
        const stats = await inkStats(page);
        if (predicate(stats)) return stats;
        if (Date.now() > deadline) {
            throw new Error("ink did not converge: " + JSON.stringify(stats));
        }
        await page.waitForTimeout(50);
    }
}

test("page loads with canvas and toolbar", async ({ page }) => {
    await openBoard(page, boardId("load"));
    await expect(page.locator("#whiteboardCanvas")).toBeVisible();
    await expect(page.locator('button[tool="pen"]')).toBeVisible();
    await expect(page.locator("#zoomInBtn")).toBeVisible();
});

test("pen drag draws a stroke that is stored on the server", async ({ page }) => {
    const wid = boardId("pen");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 400, 300, 600, 400);

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "pen"));
    const pen = board.find((i) => i.t === "pen");
    expect(pen.d.length).toBeGreaterThanOrEqual(4);
    // the client stores usernames base64url-encoded without padding
    // (btoa in main.js, normalized in whiteboard.js loadWhiteboard)
    const b64url = (s) =>
        Buffer.from(s)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    expect(pen.username).toBe(b64url("pwtester"));
});

test("zoom in enlarges the rendered stroke, zoom reset restores it", async ({ page }) => {
    const wid = boardId("zoom");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    // stroke left of the window center (640,400) so zooming (centered) moves it
    await drag(page, 300, 400, 500, 400);
    const before = await waitForInk(page, (s) => s.count > 0);

    await page.click("#zoomInBtn");
    await page.click("#zoomInBtn");
    // thicker line (lineWidth * zoom) and shifted away from the zoom center
    const zoomed = await waitForInk(page, (s) => s.count > before.count * 1.2);
    expect(zoomed.cx).toBeLessThan(before.cx);

    await page.click("#zoomResetBtn");
    const reset = await waitForInk(
        page,
        (s) => s.count > before.count * 0.8 && s.count < before.count * 1.25,
    );
    expect(reset.cx).toBeCloseTo(before.cx, -1);
});

test("object eraser removes the whole rect stroke", async ({ page }) => {
    const wid = boardId("objeraser");
    await openBoard(page, wid);
    await selectTool(page, "rect");
    await drag(page, 400, 250, 500, 320);
    await waitForBoard(page, wid, (b) => b.some((i) => i.t === "rect"));

    await selectTool(page, "objEraser");
    await page.mouse.click(450, 285); // inside the rect

    const board = await waitForBoard(
        page,
        wid,
        (b) => b.some((i) => i.t === "removeDraw") && !b.some((i) => i.t === "rect"),
    );
    const marker = board.find((i) => i.t === "removeDraw");
    expect(marker.d[1].t).toBe("rect");
});

test("mouse tool moves a rect, undo/redo reverses it", async ({ page }) => {
    const wid = boardId("move");
    await openBoard(page, wid);
    await selectTool(page, "rect");
    await drag(page, 400, 250, 500, 320);
    await waitForBoard(page, wid, (b) => b.some((i) => i.t === "rect"));

    await selectTool(page, "mouse");
    await drag(page, 450, 285, 550, 385); // +100/+100

    let board = await waitForBoard(page, wid, (b) => b.find((i) => i.t === "rect")?.d?.[0] === 500);
    expect(board.find((i) => i.t === "rect").d).toEqual([500, 350, 600, 420]);
    expect(board.some((i) => i.t === "moveDraw")).toBe(true);

    await page.click("#whiteboardUndoBtn");
    board = await waitForBoard(page, wid, (b) => b.find((i) => i.t === "rect")?.d?.[0] === 400);
    expect(board.find((i) => i.t === "rect").d).toEqual([400, 250, 500, 320]);

    await page.click("#whiteboardRedoBtn");
    board = await waitForBoard(page, wid, (b) => b.find((i) => i.t === "rect")?.d?.[0] === 500);
    expect(board.find((i) => i.t === "rect").d).toEqual([500, 350, 600, 420]);
});

test("clicking with the text tool creates a textbox; resizing sends setTextboxSize", async ({
    page,
}) => {
    const wid = boardId("textbox");
    await openBoard(page, wid);
    await selectTool(page, "text");
    await page.mouse.click(400, 300);

    const textBox = page.locator(".textBox").first();
    await expect(textBox).toBeVisible();

    const handle = textBox.locator(".resizeIcon");
    const box = await handle.boundingBox();
    await drag(page, box.x + box.width / 2, box.y + box.height / 2, box.x + 100, box.y + 80);

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "setTextboxSize"));
    const size = board.find((i) => i.t === "setTextboxSize");
    expect(size.d[1]).toBeGreaterThanOrEqual(60); // width, min clamp
    expect(size.d[2]).toBeGreaterThanOrEqual(40); // height, min clamp
    expect(board.some((i) => i.t === "addTextBox")).toBe(true);
});

test("a second client sees the first client's stroke", async ({ page, context }) => {
    const wid = boardId("collab");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 400, 300, 550, 350);
    await waitForBoard(page, wid, (b) => b.some((i) => i.t === "pen"));

    const page2 = await context.newPage();
    await openBoard(page2, wid);
    // the freshly loaded page must render the existing stroke
    await expect(page2.locator("#whiteboardCanvas")).toBeVisible();
    const stats = await waitForInk(page2, (s) => s.count > 0);
    await page2.close();
});
