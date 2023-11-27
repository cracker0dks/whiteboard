import path from "path";
import fs from "fs";
import yaml from "js-yaml";

import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true });

import configSchema from "./config-schema.json" assert { type: "json" };

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load a yaml config file from a given path.
 *
 * @param path
 * @return {Object}
 */
export function getConfig(path) {
    return yaml.safeLoad(fs.readFileSync(path, "utf8"));
}

/**
 * Check that a config object is valid.
 *
 * @param {Object} config Config object
 * @param {boolean} warn Should we warn in console for errors
 * @return {boolean}
 */
export function isConfigValid(config, warn = true) {
    const validate = ajv.compile(configSchema);
    const isValidAgainstSchema = validate(config);

    if (!isValidAgainstSchema && warn) console.warn(validate.errors);

    let structureIsValid = false;
    try {
        structureIsValid = config.frontend.performance.pointerEventsThrottling.some(
            (item) => item.fromUserCount === 0
        );
    } catch (e) {
        if (!e instanceof TypeError) {
            throw e;
        }
    }

    if (!structureIsValid && warn)
        console.warn(
            "At least one item under frontend.performance.pointerEventsThrottling" +
                "must have fromUserCount set to 0"
        );

    return isValidAgainstSchema && structureIsValid;
}

/**
 * Load the default project config
 * @return {Object}
 */
export function getDefaultConfig() {
    const defaultConfigPath = path.join(__dirname, "..", "..", "config.default.yml");
    return getConfig(defaultConfigPath);
}

/**
 * Deep merge of project config
 *
 * Objects are merged, not arrays
 *
 * @param baseConfig
 * @param overrideConfig
 * @return {Object}
 */
export function deepMergeConfigs(baseConfig, overrideConfig) {
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
