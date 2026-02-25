import ReadOnlyBackendService from "./ReadOnlyBackendService.js";
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
    const wid = "2";
    const service = new WhiteboardInfoBackendService();
    const rOservice = new ReadOnlyBackendService();
    const readOnlyWid = rOservice.getReadOnlyId(wid);
    console.log("BLA", readOnlyWid);

    expect(service.getNbClientOnWhiteboard(wid)).toBe(null);
    expect(service.getNbClientOnWhiteboard(readOnlyWid)).toBe(null);

    service.join("toto", wid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(1);
    expect(service.getNbClientOnWhiteboard(readOnlyWid)).toBe(1);

    service.join("tata", readOnlyWid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(2);
    expect(service.getNbClientOnWhiteboard(readOnlyWid)).toBe(2);

    service.leave("tata", readOnlyWid, null);
    expect(service.getNbClientOnWhiteboard(wid)).toBe(1);
    expect(service.getNbClientOnWhiteboard(readOnlyWid)).toBe(1);

    service.leave("toto", wid, null);
    // no more user on whiteboard
    expect(service.getNbClientOnWhiteboard(wid)).toBe(null);
    expect(service.getNbClientOnWhiteboard(readOnlyWid)).toBe(null);
});
