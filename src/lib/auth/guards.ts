import { redirect } from "next/navigation";
import { createServerSupabaseClient, getServerUser } from "@/lib/supabase/server";

export async function requireAuthenticatedUser() {
  const user = await getServerUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return user;
}

export async function getUserRole(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role ?? "buyer";
}
