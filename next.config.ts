import type { NextConfig } from "next";
import withPWA, { runtimeCaching as defaultCache } from "@ducanh2912/next-pwa";

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
    // Spread all default caches (pages, pages-rsc, static assets, etc.)
    // then add the Supabase rule. This ensures navigation HTML is cached
    // by the built-in 'pages' NetworkFirst handler so the app loads offline.
    runtimeCaching: [
      ...defaultCache,
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
