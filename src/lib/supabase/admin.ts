import { createClient } from "@supabase/supabase-js";
import { hasServiceRole } from "./env";

/**
 * Service-role client for admin / atomic server operations.
 * NEVER import this into client components or expose to the browser.
 */
export function createAdminClient() {
  if (!hasServiceRole()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured (server-only).");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
