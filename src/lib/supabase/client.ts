import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Fallback project credentials for Aether Audiophile (used if env vars are missing or not inlined)
const FALLBACK_SUPABASE_URL = "https://apisojsyvjqbrpxbxjgb.supabase.co";
const FALLBACK_SUPABASE_KEY = "sb_publishable_URblVHp4NiSvTg0ESUyLcw_kOBKJ_kp";

let browserClient: SupabaseClient | null = null;

/**
 * Trims whitespace and strips surrounding quotes (both single and double)
 * from environment variable strings.
 */
function cleanEnvValue(value: string | undefined): string {
  if (!value) return "";
  return value.trim().replace(/^["']+|["']+$/g, "").trim();
}

/**
 * Returns sanitized, trimmed Supabase project URL and public key,
 * falling back to verified project credentials if not inlined.
 */
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const url = cleanEnvValue(rawUrl) || FALLBACK_SUPABASE_URL;
  let anonKey = cleanEnvValue(rawKey) || FALLBACK_SUPABASE_KEY;

  // Auto-correct casing typo if present in env or fallback (ESuYLcw -> ESUyLcw)
  if (anonKey.includes("ESuYLcw")) {
    anonKey = anonKey.replace("ESuYLcw", "ESUyLcw");
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith("http"));
}

export function createClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  if (typeof window === "undefined") {
    return createBrowserClient(url, anonKey);
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
