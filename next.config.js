/** @type {import('next').NextConfig} */
const path = require('path');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
    ],
  },
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/tenvo.svg', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/llms.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
        ],
      },
      {
        source: '/humans.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
        ],
      },
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
      // Allow any https source by specifying explicit allowed domains and wildcards
      { protocol: 'https', hostname: 'services.eatx.pk' },
      { protocol: 'https', hostname: 'media.naheed.pk' },
      { protocol: 'https', hostname: 'autostore.pk' },
      { protocol: 'https', hostname: 'www.autostore.pk' },
      { protocol: 'https', hostname: '**.autostore.pk' },
      { protocol: 'https', hostname: '**.unsplash.com' },
      { protocol: 'https', hostname: '**.eatx.pk' },
      { protocol: 'https', hostname: '**.naheed.pk' },
    ],
    // Keep unoptimized as fallback for local dev / self-hosted images
    // Set to false to enable full optimization in production
    unoptimized: true, // Force unoptimized true to prevent 504 Gateway Timeout or 500 error in development when fetching external images
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  compress: true,
  poweredByHeader: false,
};

module.exports = withBundleAnalyzer(nextConfig);
