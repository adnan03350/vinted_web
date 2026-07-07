import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/sell`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/auth/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/auth/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const supabase = createServiceRoleClient();
  if (!supabase) return staticRoutes;

  const { data: products } = await supabase
    .from("products")
    .select("id, created_at")
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(500);

  const productRoutes: MetadataRoute.Sitemap =
    products?.map((product) => ({
      url: `${base}/products/${product.id}`,
      lastModified: product.created_at ? new Date(product.created_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })) ?? [];

  return [...staticRoutes, ...productRoutes];
}
