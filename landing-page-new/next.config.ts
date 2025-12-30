import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  
  // Run on port 5174
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },

  // Proxy admin routes to Vite (running on 5173)
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: 'http://localhost:5173/admin/:path*',
      },
      {
        source: '/assets/:path*',
        destination: 'http://localhost:5173/assets/:path*',
      },
    ];
  },
};

export default nextConfig;
