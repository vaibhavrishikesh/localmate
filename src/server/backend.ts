import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSessionUserId as getDemoSession } from "@/server/session";
import { createClient } from "@/lib/supabase/server";

/** Active session user — Supabase Auth when configured, else demo cookie. */
export async function getActiveUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return getDemoSession();
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export function backendMode(): "supabase" | "demo-json" {
  return isSupabaseConfigured() ? "supabase" : "demo-json";
}
