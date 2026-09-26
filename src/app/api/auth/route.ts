import { NextResponse } from "next/server";
import { buildPublicState, signUp } from "@/server/actions";
import { getSessionUserId, setSessionUserId } from "@/server/session";
import { readState } from "@/server/db";
import type { Lang, Role } from "@/lib/types";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const state = await buildPublicState(sessionUserId);
  const user = state.users.find((item) => item.id === sessionUserId) ?? null;
  return NextResponse.json({ user, sessionUserId });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "signin" | "signup" | "signout";
    userId?: string;
    name?: string;
    phone?: string;
    email?: string;
    role?: Role;
    language?: Lang;
  };

  if (body.action === "signout") {
    await setSessionUserId(null);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "signin") {
    if (!body.userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    const db = await readState();
    if (!db.users.some((u) => u.id === body.userId)) {
      return NextResponse.json({ ok: false, error: "Unknown user" }, { status: 404 });
    }
    await setSessionUserId(body.userId);
    const state = await buildPublicState(body.userId);
    return NextResponse.json({ ok: true, state });
  }

  if (body.action === "signup") {
    if (!body.name || !body.phone || !body.email || !body.role || !body.language) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    const result = await signUp({
      name: body.name,
      phone: body.phone,
      email: body.email,
      role: body.role,
      language: body.language,
    });
    if (!result.ok || !result.userId) {
      return NextResponse.json({ ok: false, error: "Signup failed" }, { status: 400 });
    }
    await setSessionUserId(result.userId);
    return NextResponse.json({ ok: true, state: result.state, userId: result.userId });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
