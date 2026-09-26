import { NextResponse } from "next/server";
import { buildPublicState } from "@/server/actions";
import { getSessionUserId } from "@/server/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const state = await buildPublicState(sessionUserId);
  return NextResponse.json(state);
}
