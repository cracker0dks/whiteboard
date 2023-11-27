import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import config from "../config/webpack.dev.js";
import { getArgs } from "./utils.js";

const args = getArgs();

if (typeof args.mode === "undefined") {
    // default to production mode
    args.mode = "production";
}

const devServerConfig = {
    hot: true,
    proxy: {
        // proxies for the backend
        "/api": "http://localhost:3000",
        "/uploads": "http://localhost:3000",
        "/ws-api": {
            target: "ws://localhost:3000",
            ws: true,
        },
    },
};

let startFrontendDevServer = function() {}

if (args.mode === "production") {
    console.log("Not loading webpack-dev-server because of production mode!");
} else {
    startFrontendDevServer = function(port) {
        new WebpackDevServer(webpack(config), devServerConfig).start(port, (err) => {
            if (err) {
                console.log(err);
            }
    
            console.log("Listening on port " + port);
        });
    }
}


export default startFrontendDevServer;