import { getThrottling } from "./ConfigService.utils";

test("Simple throttling config", () => {
    const throttling = [{ fromUserCount: 0, minDistDelta: 1, maxFreq: 1 }];

    const target0 = { minDistDelta: 1, minTimeDelta: 1000 };
    expect(getThrottling(throttling, 0)).toEqual(target0);

    const target100 = { minDistDelta: 1, minTimeDelta: 1000 };
    expect(getThrottling(throttling, 100)).toEqual(target100);
});

test("Complex throttling config", () => {
    // mix ordering
    const throttling = [
        { fromUserCount: 100, minDistDelta: 100, maxFreq: 1 },
        { fromUserCount: 0, minDistDelta: 1, maxFreq: 1 },
        { fromUserCount: 50, minDistDelta: 50, maxFreq: 1 },
    ];

    const target0 = { minDistDelta: 1, minTimeDelta: 1000 };
    expect(getThrottling(throttling, 0)).toEqual(target0);

    const target50 = { minDistDelta: 50, minTimeDelta: 1000 };
    expect(getThrottling(throttling, 50)).toEqual(target50);

    const target100 = { minDistDelta: 100, minTimeDelta: 1000 };
    expect(getThrottling(throttling, 100)).toEqual(target100);
});
