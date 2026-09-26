import { NextResponse } from "next/server";
import { adminVerifyUser } from "@/server/actions";
import { backendMode } from "@/server/backend";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";

/**
 * Staff-only ID clearance.
 * - demo-json: X-LocalMate-Admin + LOCALMATE_ADMIN_SECRET
 * - supabase: same header OR service-role call via admin client setting is_admin profiles
 * Never callable without secret; never grants from the browser anonymously.
 */
export async function POST(request: Request) {
  const secret = process.env.LOCALMATE_ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Admin secret not configured on server." },
      { status: 503 },
    );
  }
  const header = request.headers.get("x-localmate-admin");
  if (header !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { userId?: string; cleared?: boolean };
  if (!body.userId || typeof body.cleared !== "boolean") {
    return NextResponse.json({ ok: false, error: "userId and cleared required" }, { status: 400 });
  }

  if (backendMode() === "supabase") {
    if (!hasServiceRole()) {
      return NextResponse.json(
        { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY required for admin verify in Supabase mode" },
        { status: 503 },
      );
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .update({
        identity_verified: body.cleared,
        identity_review_status: body.cleared ? "cleared" : "rejected",
        phone_verified: body.cleared ? true : undefined,
      })
      .eq("id", body.userId)
      .select("*")
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    await admin.from("verification_records").insert({
      user_id: body.userId,
      verification_type: "identity",
      provider: "localmate_staff",
      status: body.cleared ? "verified" : "rejected",
    });
    return NextResponse.json({ ok: true, profile: data, backend: "supabase" });
  }

  const result = await adminVerifyUser(body.userId, body.cleared);
  return NextResponse.json({ ...result, backend: "demo-json" }, { status: result.ok ? 200 : 400 });
}
