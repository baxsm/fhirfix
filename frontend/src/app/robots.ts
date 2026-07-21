import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// allow the public marketing + docs surfaces; keep the app, auth, and share routes
// out of the index (they are gated or user-specific).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/sign-in", "/sign-up", "/reset-password", "/verify-email", "/share/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
