const { getArgs } = require("./utils");
const startFrontendDevServer = require("./server-frontend-dev");
const startBackendServer = require("./server-backend");

const SERVER_MODES = {
    PRODUCTION: 1,
    DEVELOPMENT: 2
}

const args = getArgs();

if ( typeof args.mode === "undefined" || (args.mode !== "production" && args.mode !== "development")) {
    throw new Error("--mode=development or --mode=production is expected")
}

const server_mode = args.mode === "production" ? SERVER_MODES.PRODUCTION : SERVER_MODES.DEVELOPMENT;

if (server_mode === SERVER_MODES.DEVELOPMENT){
    console.info("Starting server in development mode.");
    startFrontendDevServer(8080);
    startBackendServer(3000);
} else {
    console.info("Starting server in production mode.");
    startBackendServer(8080);
}