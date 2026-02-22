import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed 'output: export' to support dynamic routes like /payment/[proposalId]
  distDir: '.next',

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  async redirects() {
    // Only proxy to Vite dev server in local development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/portal/:path*',
          destination: 'http://localhost:5173/portal/:path*',
          permanent: false,
        },
      ];
    }
    return [];
  },

  async rewrites() {
    // Only proxy API calls to Netlify Dev in local development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8888/.netlify/functions/:path*',
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
