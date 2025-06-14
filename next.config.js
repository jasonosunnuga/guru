// next.config.js
const path = require('path');

module.exports = {
  reactStrictMode: true,
  eslint: {
    // <–– This will allow the build to succeed even if ESLint finds errors
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};
