import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

const AVAILABLE_STATUSES = ["available", "Available"];

export async function getAvailableProducts(limit = 120) {
  const service = createServiceRoleClient();
  const client = service ?? (await createServerSupabaseClient());

  const { data, error } = await client
    .from("products")
    .select("*, product_images(*), profiles!seller_id(full_name, avatar_url, country)")
    .in("status", AVAILABLE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAvailableProducts:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getProductById(id: string) {
  const service = createServiceRoleClient();
  const client = service ?? (await createServerSupabaseClient());

  const { data, error } = await client
    .from("products")
    .select("*, product_images(*), profiles!seller_id(full_name, country, avatar_url, created_at)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getProductById:", error.message);
    return null;
  }

  return data;
}
