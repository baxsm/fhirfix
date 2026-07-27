import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/:path*`,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/docs/playground",
        destination: "/docs/api-explorer",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
