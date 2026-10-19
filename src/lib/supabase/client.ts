import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://apisojsyvjqbrpxbxjgb.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_URblVHp4NiSvTg0ESUyLcw_kOBKJ_kp"
  );
}
