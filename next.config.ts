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
  // BUG-01 FIX: Only disable SW in development — production gets full offline support
  disable: process.env.NODE_ENV === 'development',
  // Keep default caches (pages, pages-rsc, static assets, etc.) and extend with ours.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache Supabase requests with network-first so data stays fresh but works offline
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
  // Force pdfjs-dist to resolve correctly
  // Note: __dirname is available in next.config.js/ts as Next.js transpile it, 
  // but we'll make it safer.
  
  if (options.isServer) {
    config.resolve.alias['pdfjs-dist'] = 'pdfjs-dist';
  }

  return config;
};

export default nextConfig;
