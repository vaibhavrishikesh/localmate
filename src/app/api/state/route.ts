import { NextResponse } from "next/server";
import { buildPublicState } from "@/server/actions";
import { backendMode, getActiveUserId } from "@/server/backend";
import { loadSupabasePublicState } from "@/server/supabase/state";

export async function GET() {
  const sessionUserId = await getActiveUserId();
  if (backendMode() === "supabase") {
    try {
      const state = await loadSupabasePublicState(sessionUserId);
      return NextResponse.json({ ...state, backend: "supabase" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Supabase state failed";
      return NextResponse.json({ ok: false, error: message, backend: "supabase" }, { status: 503 });
    }
  }
  const state = await buildPublicState(sessionUserId);
  return NextResponse.json({ ...state, backend: "demo-json" });
}
