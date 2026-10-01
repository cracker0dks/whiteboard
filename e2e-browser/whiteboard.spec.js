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

test("sticky note control icons are not clipped by the note frame", async ({ page }) => {
    const wid = boardId("stickyicons");
    await openBoard(page, wid);
    await selectTool(page, "stickynote");
    await page.mouse.click(500, 300);

    const note = page.locator(".stickyNote").first();
    await expect(note).toBeVisible();

    // fresh notes are active, so the control icons are shown
    const moveIcon = note.locator(".moveIcon");
    await expect(moveIcon).toBeVisible();
    const resizeIcon = note.locator(".resizeIcon");
    await expect(resizeIcon).toBeVisible();

    // the icons sit 13px outside the frame; the frame must not clip them
    const noteBox = await note.boundingBox();
    const iconBox = await moveIcon.boundingBox();
    expect(iconBox.y).toBeLessThan(noteBox.y); // icon extends above the frame
    expect(iconBox.x).toBeLessThan(noteBox.x); // and to the left of the frame

    // the original clipping came from overflow on the frame itself
    const overflowY = await note.evaluate((el) => getComputedStyle(el).overflowY);
    expect(overflowY).toBe("visible");
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

test("line tool draws a stored line", async ({ page }) => {
    const wid = boardId("line");
    await openBoard(page, wid);
    await selectTool(page, "line");
    await drag(page, 400, 300, 550, 380);

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "line"));
    const line = board.find((i) => i.t === "line");
    // d = [x1, y1, x2, y2]
    expect(line.d.length).toBe(4);
    await waitForInk(page, (s) => s.count > 0);
});

test("circle tool draws a stored circle", async ({ page }) => {
    const wid = boardId("circle");
    await openBoard(page, wid);
    await selectTool(page, "circle");
    await drag(page, 400, 300, 520, 380);

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "circle"));
    const circle = board.find((i) => i.t === "circle");
    // d = [x, y, r]
    expect(circle.d.length).toBe(3);
    expect(circle.d[2]).toBeGreaterThan(0);
    await waitForInk(page, (s) => s.count > 0);
});

test("eraser tool removes part of a pen stroke", async ({ page }) => {
    const wid = boardId("eraser");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 300, 300, 600, 300);
    const before = await waitForInk(page, (s) => s.count > 0);

    // a thick eraser wipes out the thin stroke section
    await page.locator("#whiteboardThicknessSlider").fill("20");
    await selectTool(page, "eraser");
    await drag(page, 350, 300, 500, 300);

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "eraser"));
    expect(board.find((i) => i.t === "eraser").d.length).toBe(4);
    const after = await inkStats(page);
    expect(after.count).toBeLessThan(before.count);
});

test("hand tool pans the view without changing the board", async ({ page }) => {
    const wid = boardId("hand");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 400, 300, 550, 380);
    const before = await waitForInk(page, (s) => s.count > 0);

    // a smooth pen stroke is stored as several incremental pen items, so
    // compare the count before and after the pan instead of an exact value
    const penCountBefore = (await loadBoard(page, wid)).filter((i) => i.t === "pen").length;

    await selectTool(page, "hand");
    await drag(page, 400, 300, 500, 300); // pan 100px right

    // the re-rendered ink shifts with the view; the board data stays untouched
    const after = await waitForInk(page, (s) => s.cx > before.cx + 80);
    expect(after.cx).toBeLessThan(before.cx + 120);
    const board = await loadBoard(page, wid);
    expect(board.filter((i) => i.t === "pen").length).toBe(penCountBefore);
});

test("recSelect captures a canvas region as a stored recSelect item", async ({ page }) => {
    const wid = boardId("recselect");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 400, 300, 550, 380);
    await waitForInk(page, (s) => s.count > 0);

    await selectTool(page, "recSelect");
    await drag(page, 350, 250, 600, 420);
    // the Drop button appears over the selected region
    await page.locator(".addToCanvasBtn").click();

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "recSelect"));
    // d = [left, top, leftTo, topTo, width, height]
    expect(board.find((i) => i.t === "recSelect").d.length).toBe(6);
});

test("color picker sets the draw color used by the next stroke", async ({ page }) => {
    const wid = boardId("color");
    await openBoard(page, wid);
    await selectTool(page, "pen");

    await page.click("#whiteboardColorpicker");
    await page.locator(".picker_editor input").fill("#ff0000");
    await page.click(".picker_done button");

    await drag(page, 400, 300, 550, 350);
    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "pen"));
    // vanilla-picker prints rgb without spaces: rgba(255,0,0,1)
    expect(board.find((i) => i.t === "pen").c).toBe("rgba(255,0,0,1)");
});

test("thickness slider changes the stroke thickness", async ({ page }) => {
    const wid = boardId("thickness");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await page.locator("#whiteboardThicknessSlider").fill("25");
    await drag(page, 400, 300, 550, 350);

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "pen"));
    // the slider value is a string (input.value)
    expect(Number(board.find((i) => i.t === "pen").th)).toBe(25);
});

test("zoom out shrinks the rendered stroke", async ({ page }) => {
    const wid = boardId("zoomout");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 300, 400, 500, 400);
    const before = await waitForInk(page, (s) => s.count > 0);

    await page.click("#zoomOutBtn");
    await page.click("#zoomOutBtn");
    // thinner line (lineWidth * zoom) and shifted toward the zoom center
    const after = await waitForInk(page, (s) => s.count < before.count * 0.8);
    expect(after.count).toBeLessThan(before.count * 0.75);
});

test("image upload stores an addImgBG item drawn to the canvas", async ({ page }) => {
    const wid = boardId("img");
    await openBoard(page, wid);

    // a 1x1 PNG is enough to exercise the upload pipeline
    const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64",
    );
    await page.click("#addImgToCanvasBtn");
    await page.locator("#manualFileUpload").setInputFiles({
        name: "pw-test.png",
        mimeType: "image/png",
        buffer: png,
    });

    // the uploaded image appears as a draggable div; drop it onto the canvas
    const dropBtn = page.locator(".addToCanvasBtn");
    await expect(dropBtn).toBeVisible();
    await dropBtn.click();

    const board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "addImgBG"));
    const img = board.find((i) => i.t === "addImgBG");
    expect(img.draw).toBe("1");
    expect(img.url).toContain("/uploads/");
    expect(img.d.length).toBe(5);
});

test("trash button clears the board", async ({ page }) => {
    const wid = boardId("clear");
    await openBoard(page, wid);
    await selectTool(page, "pen");
    await drag(page, 400, 300, 550, 350);
    await waitForBoard(page, wid, (b) => b.some((i) => i.t === "pen"));

    await page.click("#whiteboardTrashBtn");
    await page.click("#whiteboardTrashBtnConfirm");

    const board = await waitForBoard(page, wid, (b) => b.length === 0);
    expect(board.length).toBe(0);
    const stats = await inkStats(page);
    expect(stats.count).toBe(0);
});

test("change username button prompts, stores the new name and reloads", async ({ page }) => {
    const wid = boardId("username");
    await openBoard(page, wid);

    page.on("dialog", (d) => d.accept("pwnewuser"));
    await page.click("#changeUsernameBtn");
    await page.waitForURL(/username=pwnewuser/);
    // the reloaded page reconnects to the same board
    await page.waitForEvent("console", {
        predicate: (m) => m.text() === "Websocket connected!",
        timeout: 15000,
    });
});

test("textbox: type text, move it and delete it", async ({ page }) => {
    const wid = boardId("textboxfull");
    await openBoard(page, wid);
    await selectTool(page, "text");
    await page.mouse.click(400, 300);

    const textBox = page.locator(".textBox").first();
    await expect(textBox).toBeVisible();

    // typing sends setTextboxText with the base64-encoded html
    await textBox.locator(".textContent").fill("hello pw");
    let board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "setTextboxText"));
    const text = board.find((i) => i.t === "setTextboxText");
    expect(Buffer.from(text.d[1], "base64").toString("utf8")).toContain("hello pw");

    // dragging the move icon sends setTextboxPosition
    const moveIcon = textBox.locator(".moveIcon");
    const mb = await moveIcon.boundingBox();
    await drag(page, mb.x + mb.width / 2, mb.y + mb.height / 2, mb.x + 80, mb.y + 60);
    board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "setTextboxPosition"));
    const pos = board.find((i) => i.t === "setTextboxPosition");
    expect(pos.d[1]).toBeGreaterThan(300); // top moved down

    // the remove icon deletes the box on the server
    await textBox.locator(".removeIcon").click();
    board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "removeTextbox"));
    expect(board.find((i) => i.t === "removeTextbox").d[0]).toBe(pos.d[0]);
    await expect(textBox).toHaveCount(0);
});

test("sticky note: type text, resize, move and delete it", async ({ page }) => {
    const wid = boardId("stickyfull");
    await openBoard(page, wid);
    await selectTool(page, "stickynote");
    await page.mouse.click(500, 300);

    const note = page.locator(".stickyNote").first();
    await expect(note).toBeVisible();

    // the addTextBox item flags sticky notes
    let board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "addTextBox"));
    expect(board.find((i) => i.t === "addTextBox").d[6]).toBe(true);

    // typing
    await note.locator(".textContent").fill("note text");
    board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "setTextboxText"));
    expect(
        Buffer.from(board.find((i) => i.t === "setTextboxText").d[1], "base64").toString("utf8"),
    ).toContain("note text");

    // resize sends setTextboxSize
    const resizeIcon = note.locator(".resizeIcon");
    const rb = await resizeIcon.boundingBox();
    await drag(page, rb.x + rb.width / 2, rb.y + rb.height / 2, rb.x + 80, rb.y + 60);
    board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "setTextboxSize"));
    expect(board.find((i) => i.t === "setTextboxSize").d[1]).toBeGreaterThanOrEqual(60);

    // move sends setTextboxPosition
    const moveIcon = note.locator(".moveIcon");
    const mb = await moveIcon.boundingBox();
    await drag(page, mb.x + mb.width / 2, mb.y + mb.height / 2, mb.x + 60, mb.y + 50);
    board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "setTextboxPosition"));

    // delete
    await note.locator(".removeIcon").click();
    board = await waitForBoard(page, wid, (b) => b.some((i) => i.t === "removeTextbox"));
    expect(board.find((i) => i.t === "removeTextbox").d[0]).toBe(
        board.find((i) => i.t === "setTextboxPosition").d[0],
    );
    await expect(note).toHaveCount(0);
});

test("a second client receives new strokes in real time", async ({ page, context }) => {
    const wid = boardId("livesync");
    await openBoard(page, wid);
    const page2 = await context.newPage();
    await openBoard(page2, wid);
    // both clients are connected to the same board; the canvas of the second
    // is still empty
    expect((await inkStats(page2)).count).toBe(0);

    // the first client now draws; the second must render it without a reload
    await selectTool(page, "pen");
    await drag(page, 400, 300, 550, 350);
    await waitForInk(page2, (s) => s.count > 0);
    await page2.close();
});
