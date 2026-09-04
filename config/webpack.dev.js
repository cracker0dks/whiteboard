import baseConfig from "./webpack.base.js";
import { merge } from "webpack-merge";

// NoEmitOnErrorsPlugin is deprecated in webpack 5 (it is the default behaviour).
const devConfig = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",
    optimization: {
        minimize: false,
    },
});

export { devConfig as default };
