import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCredentials } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as any;
  const rawNext = requestUrl.searchParams.get("next");
  const defaultNext = type === "recovery" ? "/?reset=true" : "/";
  const next = rawNext ?? defaultNext;

  const targetUrl = new URL(next.startsWith("/") ? next : "/", requestUrl.origin);

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseCredentials();

  const response = NextResponse.redirect(targetUrl.toString());

  if (supabaseUrl && supabaseAnonKey && (code || (token_hash && type))) {
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
          response.cookies.delete({ name, ...options });
        },
      },
    });

    try {
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (token_hash && type) {
        await supabase.auth.verifyOtp({ token_hash, type });
      }
    } catch (err) {
      console.warn("Auth callback session exchange error:", err);
    }
  }

  return response;
}
