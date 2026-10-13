import { redirect } from "next/navigation";
import { hasSupabaseEnv, createClient } from "@/lib/supabase/server";
import Studio from "@/components/studio";

export default async function Home() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }
  return <Studio demo={!hasSupabaseEnv()} />;
}
