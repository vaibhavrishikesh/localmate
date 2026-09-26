import { cookies } from "next/headers";

const COOKIE = "localmate_session";

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function setSessionUserId(userId: string | null) {
  const jar = await cookies();
  if (!userId) {
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export { COOKIE as SESSION_COOKIE };
