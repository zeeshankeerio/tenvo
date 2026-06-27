/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/tenvo.svg', permanent: false },
    ];
  },
  images: {
    // Allow Next.js Image optimization with a domain allowlist
    remotePatterns: [
      // Unsplash (used for storefront hero/category fallback images)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      // Common CDN / upload hosts
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Allow any https source as a catch-all for user-uploaded images
      { protocol: 'https', hostname: '**' },
    ],
    // Keep unoptimized as fallback for local dev / self-hosted images
    // Set to false to enable full optimization in production
    unoptimized: process.env.NODE_ENV !== 'production',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

module.exports = nextConfig;
