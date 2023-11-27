import util from "util";

import { getDefaultConfig, getConfig, deepMergeConfigs, isConfigValid } from "./utils.js";

import { getArgs } from "./../utils.js";

const defaultConfig = getDefaultConfig();

const cliArgs = getArgs();
let userConfig = {};

if (cliArgs["config"]) {
    userConfig = getConfig(cliArgs["config"]);
}

const config = deepMergeConfigs(defaultConfig, userConfig);

/**
 * Update the config based on the CLI args
 * @param {object} startArgs
 */
function updateConfigFromStartArgs(startArgs) {
    function deprecateCliArg(key, callback) {
        const val = startArgs[key];
        if (val) {
            console.warn(
                "\x1b[33m\x1b[1m",
                `Setting config values (${key}) from the CLI is deprecated. ` +
                    "This ability will be removed in the next major version. " +
                    "You should use the config file. "
            );
            callback(val);
        }
    }

    deprecateCliArg("accesstoken", (val) => (config.backend.accessToken = val));
    deprecateCliArg(
        "disablesmallestscreen",
        () => (config.backend.showSmallestScreenIndicator = false)
    );
    deprecateCliArg("webdav", () => (config.backend.enableWebdav = true));
}

/**
 * Update the config based on the env variables
 */
function updateConfigFromEnv() {
    function deprecateEnv(key, callback) {
        const val = process.env[key];
        if (val) {
            console.warn(
                "\x1b[33m\x1b[1m",
                `Setting config values (${key}) from the environment is deprecated. ` +
                    "This ability will be removed in the next major version. " +
                    "You should use the config file. "
            );
            callback(val);
        }
    }

    deprecateEnv("accesstoken", (val) => (config.backend.accessToken = val));
    deprecateEnv(
        "disablesmallestscreen",
        () => (config.backend.showSmallestScreenIndicator = false)
    );
    deprecateEnv("webdav", () => (config.backend.enableWebdav = true));
}

// compatibility layer
// FIXME: remove this in next major
updateConfigFromEnv();
// FIXME: remove this in next major
updateConfigFromStartArgs(cliArgs);

if (!isConfigValid(config, true)) {
    throw new Error("Config is not valid. Check logs for details");
}

if (!process.env.JEST_WORKER_ID) {
    console.info(util.inspect(config, { showHidden: false, depth: null, colors: true }));
}

export { config as default };
