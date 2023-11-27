import { merge } from "webpack-merge";
import baseConfig from "./webpack.base.js";

export default merge(baseConfig, {
    mode: "production",
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
    optimization: {
        minimize: true,
        nodeEnv: "production",
    },
    devtool: false,
});
