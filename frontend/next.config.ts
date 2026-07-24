import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // auth runs on the backend, which is a different host in every environment.
  // proxying /api/auth through this origin means the browser only ever makes a
  // same-origin request, so better-auth's Set-Cookie lands as a FIRST-PARTY
  // cookie on the frontend domain. that is what lets proxy.ts and server
  // components read the session and redirect before any html paints.
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
      // /docs/playground was renamed to /docs/api-explorer. it needs a key and
      // fires real authenticated requests, which the marketing /playground (no
      // key, no account) does not - two routes called "playground" read as one.
      // permanent so an existing bookmark or external link keeps working.
      {
        source: "/docs/playground",
        destination: "/docs/api-explorer",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
