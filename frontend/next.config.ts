import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/auth/:path*`,
      },
      // trpc is proxied for the same reason auth is: the session cookie is
      // first-party to this origin, so a browser call straight to the backend
      // host never carries it. server-side callers still use the backend url.
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
