import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/:path*`,
      },
      // must stay proxied: the session cookie is first-party, so a direct browser call 401s
      {
        source: "/trpc/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/trpc/:path*`,
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
