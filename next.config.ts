import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const config: NextConfig = {
  /* config options here */
};

const nextConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  // BUG-01 FIX: Only disable SW in development — production gets full offline support
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    // Cache Supabase requests with network-first so data stays fresh but works offline
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10 },
      },
    ],
  },
})(config);

// Add webpack config for react-pdf
const originalWebpack = nextConfig.webpack;
nextConfig.webpack = (config, options) => {
  config.resolve.alias.canvas = false;
  // Force pdfjs-dist to resolve to the top-level node_modules
  config.resolve.alias['pdfjs-dist'] = require('path').resolve(__dirname, 'node_modules/pdfjs-dist');

  if (originalWebpack) {
    return originalWebpack(config, options);
  }
  return config;
};

export default nextConfig;
