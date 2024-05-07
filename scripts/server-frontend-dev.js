import webpack from "webpack";
import config from "../config/webpack.dev.js";

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

export default async function startFrontendDevServer(port, resolve) {
    let WebpackDevServer = (await import("webpack-dev-server")).WebpackDevServer;
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
