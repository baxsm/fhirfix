import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
