import { NextResponse } from "next/server";
import { adminVerifyUser } from "@/server/actions";

/**
 * Staff-only ID clearance. Requires header: X-LocalMate-Admin: <LOCALMATE_ADMIN_SECRET>
 * Users cannot grant themselves identityVerified.
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

  const result = await adminVerifyUser(body.userId, body.cleared);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
