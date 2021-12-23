const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin');
const SSRPlugin =
  require('next/dist/build/webpack/plugins/nextjs-ssr-import').default;
const { dirname, relative, resolve, join } = require('path');

module.exports = {
  async headers() {
    return [
      {
        source: '/api/flag.svg',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/svg+xml',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/js/script.js',
        destination: 'https://plausible.io/js/plausible.js',
      },
      {
        source: '/api/event', // Or '/api/event/' if you have `trailingSlash: true` in this config
        destination: 'https://plausible.io/api/event',
      },
    ];
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Important: return the modified config
    config.experiments = {
      asyncWebAssembly: true,
      ...config.experiments,
    };
    // In prod mode and in the server bundle (the place where this "chunks" bug
    // appears), use the client static directory for the same .wasm bundle
    config.output.webassemblyModuleFilename =
      isServer && !dev ? '../static/wasm/[id].wasm' : 'static/wasm/[id].wasm';

    // Ensure the filename for the .wasm bundle is the same on both the client
    // and the server (as in any other mode the ID's won't match)
    config.optimization.moduleIds = 'named';

    return config;
  },
};
