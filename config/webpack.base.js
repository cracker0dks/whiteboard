const webpack = require("webpack");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

const config = {
    entry: {
        main: ["./src/js/index.js"],
        "pdf.worker": "pdfjs-dist/build/pdf.worker.entry",
    },
    output: {
        path: path.join(__dirname, "..", "dist"),
        filename: "[name]-[hash].js",
    },
    resolve: {
        extensions: ["*", ".json", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                options: {
                    compact: true,
                },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(png|jpe?g|gif|otf|pdf)$/i,
                use: [
                    {
                        loader: "file-loader",
                    },
                ],
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery",
            "window.$": "jquery",
        }),
        new CopyPlugin({ patterns: [{ from: "assets", to: "" }] }),
        new HtmlWebpackPlugin({
            template: "src/index.html",
            minify: false,
            inject: true,
        }),
    ],
};

module.exports = config;
