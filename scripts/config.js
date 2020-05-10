const { getArgs } = require("./utils");

const config = {
    accessToken: "",
    disableSmallestScreen: false,
    webdav: false,

    whiteboardInfoBroadcastFreq: 1, // once per second
};

/**
 * Update the config based on the CLI args
 * @param {object} startArgs
 */
function updateConfigFromStartArgs(startArgs) {
    if (startArgs["accesstoken"]) {
        config.accessToken = startArgs["accesstoken"];
    }
    if (startArgs["disablesmallestscreen"]) {
        config.disableSmallestScreen = true;
    }
    if (startArgs["webdav"]) {
        config.webdav = true;
    }
}

/**
 * Update the config based on the env variables
 */
function updateConfigFromEnv() {
    if (process.env.accesstoken) {
        config.accessToken = process.env.accesstoken;
    }
    if (process.env.disablesmallestscreen) {
        config.disablesmallestscreen = true;
    }
    if (process.env.webdav) {
        config.webdav = true;
    }
}

updateConfigFromEnv();
updateConfigFromStartArgs(getArgs());

module.exports = config;
