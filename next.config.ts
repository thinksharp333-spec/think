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
  async redirects() {
    return [
      {
        source: '/read/:id',
        destination: '/read?id=:id',
        permanent: true,
      },
    ]
  },
};

const nextConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  fallbacks: {
    document: '/offline',
  },
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/^id$/, /^.*$/],
    additionalManifestEntries: [
      { url: '/offline', revision: Date.now().toString() },
      { url: '/read', revision: Date.now().toString() },
      { url: '/', revision: Date.now().toString() },
      { url: '/dashboard', revision: Date.now().toString() },
      { url: '/leaderboard', revision: Date.now().toString() },
      { url: '/manifest.json', revision: '803d6e51e4aca7e085ac0a3bcfd5700a' },
      { url: '/thinksharp-t.png', revision: '040bc8240a4d0686e430c719d1a25d1c' },
      { url: '/thinksharp-t.svg', revision: 'cf4795000d140cd73c3069b0053676b9' },
      { url: '/icon-192x192.png', revision: '7163a6411b51b07a70718abcc219e418' },
      { url: '/icon-512x512.png', revision: '7163a6411b51b07a70718abcc219e418' },
      { url: '/digi-library-logo.png', revision: 'f3be0ec53beab5af5f0923d6cb98b508' },
      { url: '/logo.png', revision: 'd8739d0e6f9db73c9e33942397c484cf' },
      { url: '/icon.png', revision: Date.now().toString() },
      { url: '/favicon.ico', revision: Date.now().toString() },
      { url: '/pdf.worker.min.mjs', revision: '1001f17653f487f58701874bef5a1964' },
      { url: '/reader-bg.png', revision: '1e6fa3ca4450ea1b41020589d3360fa1' },
    ],
    runtimeCaching: [
      {
        urlPattern: /\/pdf\.worker\.min\.mjs/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'pdf-worker',
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /\/cmaps\/.+\.bcmap/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'pdf-cmaps',
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 300, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      // Core pages — StaleWhileRevalidate for instant loading
      {
        urlPattern: /\/(dashboard|leaderboard|read)?$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'core-pages',
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Root — StaleWhileRevalidate
      {
        urlPattern: /^\/$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'root-cache',
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Other pages
      {
        urlPattern: /^https?:\/\/[^/]+\/(?!(?:api|_next)\/).*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'other-pages',
          networkTimeoutSeconds: 5,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
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
