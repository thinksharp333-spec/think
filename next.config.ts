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
    document: '/offline.html',
  },
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/^id$/, /^.*$/],
    additionalManifestEntries: [
      { url: '/offline.html', revision: Date.now().toString() },
      { url: '/read', revision: Date.now().toString() },
      { url: '/', revision: Date.now().toString() },
      { url: '/dashboard', revision: Date.now().toString() },
      { url: '/leaderboard', revision: Date.now().toString() },
      { url: '/manifest.json', revision: '803d6e51e4aca7e085ac0a3bcfd5700a' },
      { url: '/icon-192x192.png', revision: '7163a6411b51b07a70718abcc219e418' },
      { url: '/icon-512x512.png', revision: '7163a6411b51b07a70718abcc219e418' },
      { url: '/logo.png', revision: 'd8739d0e6f9db73c9e33942397c484cf' },
      { url: '/icon.png', revision: Date.now().toString() },
      { url: '/favicon.ico', revision: Date.now().toString() },
      { url: '/pdf.worker.min.mjs', revision: '1001f17653f487f58701874bef5a1964' },
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
      // App Shell - StaleWhileRevalidate for speed
      {
        urlPattern: /\/(dashboard|leaderboard|read)?$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'app-shell',
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Root
      {
        urlPattern: /^\/$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'root-cache',
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Other requests
      {
        urlPattern: /^https?:\/\/.*\/api\/proxy-pdf.*/,
        handler: 'CacheFirst', // Cache PDFs once downloaded
        options: {
          cacheName: 'pdf-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https?:\/\/[^/]+\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'general-cache',
          networkTimeoutSeconds: 5,
          cacheableResponse: { statuses: [0, 200] },
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
