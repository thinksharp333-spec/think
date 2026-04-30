import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const config: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
    ],
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
    // NOTE: generateSW mode silently drops function-based urlPattern entries from defaultCache.
    // Only RegExp and string patterns survive. We replicate the critical ones here.
    runtimeCaching: [
      // Page HTML — caches dashboard/leaderboard/login/signup/read/* on first online visit
      // so they load from cache when offline (NetworkFirst: try network, fall back to cache).
      {
        urlPattern: /^https:\/\/digilibrary\.org\/(dashboard|leaderboard|login|signup|read\/\d+|reset-password|_offline)?(\?.*)?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Next.js RSC / data payloads (client-side navigation JSON)
      {
        urlPattern: /^\/_next\/data\/.+\.json(\?.*)?$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'next-data',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Static JS/CSS bundles (already in precache, but belt-and-suspenders)
      {
        urlPattern: /^\/_next\/static\/.+$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-js-assets',
          expiration: { maxEntries: 64, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      // Next.js image optimisation
      {
        urlPattern: /^\/_next\/image\?url=.+$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-image',
          expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      // Static public images (avatars, icons, logos)
      {
        urlPattern: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-image-assets',
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      // Supabase API — NetworkFirst so reads are fresh, but offline gets last cached data
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10 },
      },
    ],
  },
})(config);

// Add webpack config for react-pdf
nextConfig.webpack = (config, options) => {
  config.resolve.alias.canvas = false;
  if (options.isServer) {
    config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist';
  }
  return config;
};

export default nextConfig;
