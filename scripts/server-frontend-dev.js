const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const config = require("../config/webpack.dev");

const devServerConfig = {
  hot: true,
  inline: true,
  stats: {
    children: false,
    maxModules: 0
  },
  proxy: {
    '/api': 'http://localhost:3000',
    '/ws-api': {
      target: 'ws://localhost:3000',
      ws: true,
    }
  }
}

function startFrontendDevServer(port) {
  new WebpackDevServer(webpack(config), devServerConfig)
    .listen(port, (err) => {
      if (err) {
        console.log(err);
      }

      console.log("Listening on port " + port);
    });
}

module.exports = startFrontendDevServer;
