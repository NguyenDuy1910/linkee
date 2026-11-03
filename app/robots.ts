import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api", "/go/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
