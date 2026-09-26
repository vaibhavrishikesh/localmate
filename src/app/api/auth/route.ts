import { NextResponse } from "next/server";
import { buildPublicState, signUp as demoSignUp } from "@/server/actions";
import { getSessionUserId, setSessionUserId } from "@/server/session";
import { backendMode, getActiveUserId } from "@/server/backend";
import { createClient } from "@/lib/supabase/server";
import { loadSupabasePublicState } from "@/server/supabase/state";
import type { Lang, Role } from "@/lib/types";

export async function GET() {
  const sessionUserId = await getActiveUserId();
  if (backendMode() === "supabase") {
    const state = await loadSupabasePublicState(sessionUserId);
    const user = state.users.find((item) => item.id === sessionUserId) ?? null;
    return NextResponse.json({ user, sessionUserId, backend: "supabase" });
  }
  const state = await buildPublicState(sessionUserId);
  const user = state.users.find((item) => item.id === sessionUserId) ?? null;
  return NextResponse.json({ user, sessionUserId, backend: "demo-json" });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: "signin" | "signup" | "signout" | "signinEmail" | "signupEmail";
    userId?: string;
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    role?: Role;
    language?: Lang;
  };

  // ——— Supabase Auth path (real) ———
  if (backendMode() === "supabase") {
    const sb = await createClient();

    if (body.action === "signout") {
      await sb.auth.signOut();
      return NextResponse.json({ ok: true, backend: "supabase" });
    }

    if (body.action === "signinEmail") {
      if (!body.email || !body.password) {
        return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
      }
      const { data, error } = await sb.auth.signInWithPassword({ email: body.email, password: body.password });
      if (error || !data.user) {
        return NextResponse.json({ ok: false, error: error?.message ?? "Sign-in failed" }, { status: 401 });
      }
      const state = await loadSupabasePublicState(data.user.id);
      return NextResponse.json({ ok: true, state, userId: data.user.id, backend: "supabase" });
    }

    if (body.action === "signupEmail") {
      if (!body.email || !body.password || !body.name || !body.role) {
        return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      }
      const { data, error } = await sb.auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          data: {
            full_name: body.name,
            role: body.role,
            preferred_language: body.language ?? "en",
            phone: body.phone,
          },
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/`
            : undefined,
        },
      });
      if (error || !data.user) {
        return NextResponse.json({ ok: false, error: error?.message ?? "Sign-up failed" }, { status: 400 });
      }
      // Email confirmation may be required — session may be null until verified.
      const state = await loadSupabasePublicState(data.session ? data.user.id : null);
      return NextResponse.json({
        ok: true,
        state,
        userId: data.user.id,
        needsEmailConfirmation: !data.session,
        backend: "supabase",
      });
    }

    // Demo-style userId sign-in is disabled when Supabase is on
    if (body.action === "signin" || body.action === "signup") {
      return NextResponse.json(
        {
          ok: false,
          error: "Demo sign-in disabled. Use signinEmail / signupEmail with Supabase Auth.",
          backend: "supabase",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }

  // ——— Demo JSON path (existing) ———
  if (body.action === "signout") {
    await setSessionUserId(null);
    return NextResponse.json({ ok: true, backend: "demo-json" });
  }

  if (body.action === "signin") {
    if (!body.userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    const { readState } = await import("@/server/db");
    const db = await readState();
    if (!db.users.some((u) => u.id === body.userId)) {
      return NextResponse.json({ ok: false, error: "Unknown user" }, { status: 404 });
    }
    await setSessionUserId(body.userId);
    const state = await buildPublicState(body.userId);
    return NextResponse.json({ ok: true, state, backend: "demo-json" });
  }

  if (body.action === "signup") {
    if (!body.name || !body.phone || !body.email || !body.role || !body.language) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    const result = await demoSignUp({
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
    return NextResponse.json({ ok: true, state: result.state, userId: result.userId, backend: "demo-json" });
  }

  void getSessionUserId;
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
