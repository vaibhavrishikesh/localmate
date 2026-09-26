/**
 * Whether Supabase env is present. Until configured, LocalMate keeps
 * the JSON/demo backend — do not treat this as "auth works".
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && isSupabaseConfigured());
}
