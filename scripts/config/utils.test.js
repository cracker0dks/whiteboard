const { getDefaultConfig, deepMergeConfigs, isConfigValid } = require("./utils");

test("Load default config", () => {
    const defaultConfig = getDefaultConfig();
    expect(typeof defaultConfig).toBe("object");
});

test("Full config override", () => {
    const defaultConfig = getDefaultConfig();
    expect(deepMergeConfigs(defaultConfig, defaultConfig)).toEqual(defaultConfig);
});

test("Simple partial config override", () => {
    expect(deepMergeConfigs({ test: true }, { test: false }).test).toBe(false);
    expect(deepMergeConfigs({ test: false }, { test: true }).test).toBe(true);
});

test("Simple deep config override", () => {
    expect(deepMergeConfigs({ stage1: { stage2: true } }, { stage1: { stage2: false } })).toEqual({
        stage1: { stage2: false },
    });
});

test("Complex object config override", () => {
    expect(
        deepMergeConfigs({ stage1: { stage2: true, stage2b: true } }, { stage1: { stage2: false } })
    ).toEqual({
        stage1: { stage2: false, stage2b: true },
    });
});

test("Override default config", () => {
    const defaultConfig = getDefaultConfig();
    const overrideConfig1 = { frontend: { onWhiteboardLoad: { setReadOnly: true } } };

    expect(
        deepMergeConfigs(defaultConfig, overrideConfig1).frontend.onWhiteboardLoad.setReadOnly
    ).toBe(true);
});

test("Dumb config is not valid", () => {
    expect(isConfigValid({}, false)).toBe(false);
});

test("Default config is valid", () => {
    const defaultConfig = getDefaultConfig();
    expect(isConfigValid(defaultConfig)).toBe(true);
});
