const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");

const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true });

const configSchema = require("./config-schema.json");

function getArgs() {
    const args = {};
    process.argv.slice(2, process.argv.length).forEach((arg) => {
        // long arg
        if (arg.slice(0, 2) === "--") {
            const longArg = arg.split("=");
            args[longArg[0].slice(2, longArg[0].length)] = longArg[1];
        }
        // flags
        else if (arg[0] === "-") {
            const flags = arg.slice(1, arg.length).split("");
            flags.forEach((flag) => {
                args[flag] = true;
            });
        }
    });
    return args;
}

/**
 * TODO
 *
 * @param path
 * @return {any}
 */
function getConfig(path) {
    return yaml.safeLoad(fs.readFileSync(path, "utf8"));
}

/**
 * TODO
 * @param config
 * @param warn
 * @return {*}
 */
function isConfigValid(config, warn = true) {
    const validate = ajv.compile(configSchema);
    const isValid = validate(config);

    if (!isValid && warn) console.warn(validate.errors);

    return isValid;
}

/**
 * TODO
 * @return {*}
 */
function getDefaultConfig() {
    const defaultConfigPath = path.join(__dirname, "..", "config.default.yml");
    return getConfig(defaultConfigPath);
}

/**
 * TODO
 * Deep merges objects, not arrays.
 *
 * @param baseConfig
 * @param overrideConfig
 * @return {{}}
 */
function deepMergeConfigs(baseConfig, overrideConfig) {
    const out = {};

    Object.entries(baseConfig).forEach(([key, val]) => {
        out[key] = val;
        if (overrideConfig.hasOwnProperty(key)) {
            const overrideVal = overrideConfig[key];
            if (typeof val === "object" && !Array.isArray(val) && val !== null) {
                out[key] = deepMergeConfigs(val, overrideVal);
            } else {
                out[key] = overrideVal;
            }
        }
    });

    return out;
}

module.exports.getArgs = getArgs;
module.exports.getConfig = getConfig;
module.exports.getDefaultConfig = getDefaultConfig;
module.exports.deepMergeConfigs = deepMergeConfigs;
module.exports.isConfigValid = isConfigValid;
