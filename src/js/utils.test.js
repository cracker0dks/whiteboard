import { distToSegment, distToRectBorder } from "./utils.js";

describe("distToSegment (object eraser hit test for pen/line/eraser)", () => {
    test("point on the segment has distance 0", () => {
        expect(distToSegment(5, 5, 0, 5, 10, 5)).toBe(0);
    });

    test("perpendicular distance", () => {
        expect(distToSegment(5, 8, 0, 5, 10, 5)).toBe(3);
    });

    test("clamps to the nearest endpoint", () => {
        expect(distToSegment(13, 5, 0, 5, 10, 5)).toBe(3);
        expect(distToSegment(-2, 5, 0, 5, 10, 5)).toBe(2);
    });

    test("degenerate segment falls back to the point distance", () => {
        expect(distToSegment(3, 4, 0, 0, 0, 0)).toBe(5);
    });
});

describe("distToRectBorder (object eraser hit test for rect/textbox)", () => {
    test("point inside the rect has distance 0", () => {
        expect(distToRectBorder(5, 5, 0, 0, 10, 10)).toBe(0);
    });

    test("point outside below", () => {
        expect(distToRectBorder(5, 13, 0, 0, 10, 10)).toBe(3);
    });

    test("corner distance", () => {
        expect(distToRectBorder(13, 13, 0, 0, 10, 10)).toBeCloseTo(Math.sqrt(18));
    });
});
