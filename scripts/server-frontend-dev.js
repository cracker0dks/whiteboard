import webpack from "webpack";
import config from "../config/webpack.dev.js";
import WebpackDevServer from "webpack-dev-server";

const devServerConfig = {
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

export async function startFrontendDevServer(port, resolve) {
    resolve(1);
    await new WebpackDevServer(webpack(config), devServerConfig).start(port, (err) => {
        if (err) {
            console.log(err);
        }
    });
    console.log(
        "\n\n-------Successfully started dev server on http://localhost:8080-----------\n\n"
    );
}
