import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

// Webpack customizations go in base config so withPWA can chain them correctly.
// If placed on the result of withPWA(...)(config), they would replace withPWA's
// webpack function and the service worker would never be generated.
const config: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
    ],
  },
  webpack: (webpackConfig, { isServer }) => {
    webpackConfig.resolve.alias.canvas = false;
    if (isServer) {
      webpackConfig.resolve.alias['pdfjs-dist'] = 'pdfjs-dist';
    }
    return webpackConfig;
  },
};

const nextConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  fallbacks: {
    document: '/_offline',
  },
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    // Precache /_offline so self.fallback(request) can serve it when both
    // network and runtime cache miss. Without this entry, caches.match("/_offline")
    // returns undefined and the browser shows its native offline screen.
    additionalManifestEntries: [
      { url: '/_offline', revision: Date.now().toString() },
    ],
    runtimeCaching: [
      // Cache same-origin page HTML for offline navigation
      {
        urlPattern: /^https?:\/\/[^/]+\/(?!(?:api|_next)\/).*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 5,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Supabase API — NetworkFirst so data stays fresh, falls back offline
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-cache',
          networkTimeoutSeconds: 10,
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})(config);

export default nextConfig;
