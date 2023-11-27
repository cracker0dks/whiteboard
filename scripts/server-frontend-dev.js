import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import config from "../config/webpack.dev.js";

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

export default function then(port, resolve) {
    new WebpackDevServer(webpack(config), devServerConfig).start(port, (err) => {
        if (err) {
            console.log(err);
        }

        console.log("Listening on port " + port);
    });
    resolve(1);
}
