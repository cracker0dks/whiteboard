import InfoByWhiteBoardMap from "./ReadOnlyBackendService.js";
import WhiteboardInfoBackendService from "./WhiteboardInfoBackendService.js";

test("Clients lifetime same wid", () => {
    const wid = "1";
    const service = new WhiteboardInfoBackendService();
    expect(service.getNbClientOnWhiteboard(wid)).toBe(null);

    service.join("toto", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(1);

    service.join("tata", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(2);

    service.leave("tata", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(1);

    service.leave("toto", wid, null);
    // no more user on whiteboard
    expect(service.getNbClientOnWhiteboard(wid)).toBe(null);
});

test("Clients lifetime both wid and readonly wid", () => {
    const wid = "1";
    const service = new WhiteboardInfoBackendService();
    const rOservice = new InfoByWhiteBoardMap();
    const readOnlyWid = rOservice.getReadOnlyId(wid);
    const widBack = rOservice.getIdFromReadOnlyId(readOnlyWid);

    expect(service.getNbClientOnWhiteboard(wid)).toBe(null);
    expect(service.getNbClientOnWhiteboard(widBack)).toBe(null);

    service.join("toto", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(1);
    expect(service.getNbClientOnWhiteboard(widBack)).toBe(1);

    service.join("tata", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(2);
    expect(service.getNbClientOnWhiteboard(widBack)).toBe(2);

    service.leave("tata", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(1);
    expect(service.getNbClientOnWhiteboard(widBack)).toBe(1);

    service.leave("toto", wid, null);
    // no more user on whiteboard
    expect(service.getNbClientOnWhiteboard(wid)).toBe(null);
    expect(service.getNbClientOnWhiteboard(widBack)).toBe(null);
});