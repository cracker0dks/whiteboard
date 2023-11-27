import baseConfig from "./webpack.base.js";
import { merge } from "webpack-merge";
import webpack from "webpack";

const devConfig = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",
    optimization: {
        minimize: false,
    },
    plugins: [new webpack.NoEmitOnErrorsPlugin()].concat(baseConfig.plugins),
});

export { devConfig as default };
