import webpack from "webpack";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    entry: {
        main: ["./src/js/index.js"],
        "pdf.worker": "pdfjs-dist/build/pdf.worker.entry",
    },
    output: {
        path: path.join(__dirname, "..", "dist"),
        filename: "[name]-[fullhash].js",
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

export { config as default };
