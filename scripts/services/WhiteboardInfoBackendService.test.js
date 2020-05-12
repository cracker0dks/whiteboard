const ReadOnlyBackendService = require("./ReadOnlyBackendService");
const WhiteboardInfoBackendService = require("./WhiteboardInfoBackendService");

test("Clients lifetime same wid", () => {
    const wid = "1";
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(null);

    WhiteboardInfoBackendService.join("toto", wid, null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(1);

    WhiteboardInfoBackendService.join("tata", wid, null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(2);

    WhiteboardInfoBackendService.leave("tata", wid, null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(1);

    WhiteboardInfoBackendService.leave("toto", wid, null);
    // no more user on whiteboard
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(null);
});

test("Clients lifetime both wid and readonly wid", () => {
    const wid = "2";
    const readOnlyWid = ReadOnlyBackendService.getReadOnlyId(wid);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(readOnlyWid)).toBe(null);

    WhiteboardInfoBackendService.join("toto", wid, null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(1);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(readOnlyWid)).toBe(1);

    WhiteboardInfoBackendService.join("tata", readOnlyWid, null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(2);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(readOnlyWid)).toBe(2);

    WhiteboardInfoBackendService.leave("tata", readOnlyWid, null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(1);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(readOnlyWid)).toBe(1);

    WhiteboardInfoBackendService.leave("toto", wid, null);
    // no more user on whiteboard
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(wid)).toBe(null);
    expect(WhiteboardInfoBackendService.getNbClientOnWhiteboard(readOnlyWid)).toBe(null);
});
