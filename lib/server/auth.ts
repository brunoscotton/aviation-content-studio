import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function authorizeRequest() {
  if (!hasSupabaseEnv()) return { ok: true as const, userId: "local-demo" };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, userId: null };
  return { ok: true as const, userId: user.id };
}
