const merge = require("webpack-merge");
const baseConfig = require("./webpack.base");

module.exports = merge(baseConfig, {
    mode: "production",
    optimization: {
        minimize: true,
        nodeEnv: "production",
    },
    devtool: false,
});
