import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/settings", "/orders", "/notifications", "/chat"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
