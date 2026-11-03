import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// APP_URL is runtime configuration; don't bake the build machine's value into robots.txt.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api", "/go/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
