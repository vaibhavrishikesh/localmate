import { NextResponse } from "next/server";
import {
  acceptOffer,
  blockUser,
  cancelTask,
  completeTask,
  confirmAndReview,
  confirmCompletion,
  createTask,
  holdPayment,
  markRead,
  reportTaskProblem,
  reportUser,
  requestIdentityReview,
  resetDemo,
  saveWorkerSetup,
  sendMessage,
  sendOffer,
  shareLocation,
  startTask,
  unblockUser,
} from "@/server/actions";
import { getSessionUserId } from "@/server/session";
import type { CategoryId, Lang, NewTaskInput } from "@/lib/types";

type Body = {
  action: string;
  taskId?: string;
  offerId?: string;
  amount?: number;
  note?: string;
  stars?: number;
  text?: string;
  userId?: string;
  reason?: string;
  reasonId?: string;
  categories?: CategoryId[];
  task?: NewTaskInput;
  language?: Lang;
};

export async function POST(request: Request) {
  const sessionUserId = await getSessionUserId();
  const body = (await request.json()) as Body;

  if (body.action === "resetDemo") {
    const result = await resetDemo(sessionUserId);
    return NextResponse.json(result);
  }

  if (!sessionUserId) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  switch (body.action) {
    case "saveWorkerSetup":
      return NextResponse.json(await saveWorkerSetup(sessionUserId, body.categories ?? []));
    case "requestIdentityReview":
      return NextResponse.json(await requestIdentityReview(sessionUserId));
    case "createTask":
      if (!body.task) return NextResponse.json({ ok: false, error: "Missing task" }, { status: 400 });
      return NextResponse.json(await createTask(sessionUserId, body.task));
    case "sendOffer":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await sendOffer(sessionUserId, body.taskId, body.amount ?? NaN, body.note ?? ""));
    case "acceptOffer":
      if (!body.offerId) return NextResponse.json({ ok: false, error: "Missing offerId" }, { status: 400 });
      return NextResponse.json(await acceptOffer(sessionUserId, body.offerId));
    case "startTask":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await startTask(sessionUserId, body.taskId));
    case "shareLocation":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await shareLocation(sessionUserId, body.taskId));
    case "completeTask":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await completeTask(sessionUserId, body.taskId));
    case "confirmCompletion":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await confirmCompletion(sessionUserId, body.taskId));
    case "reportTaskProblem":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await reportTaskProblem(sessionUserId, body.taskId, body.reason ?? ""));
    case "cancelTask":
      if (!body.taskId || !body.reasonId) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      return NextResponse.json(await cancelTask(sessionUserId, body.taskId, body.reasonId));
    case "holdPayment":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await holdPayment(sessionUserId, body.taskId));
    case "confirmAndReview":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(
        await confirmAndReview(sessionUserId, body.taskId, body.stars ?? 0, body.text ?? ""),
      );
    case "sendMessage":
      if (!body.taskId || !body.text) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      return NextResponse.json(await sendMessage(sessionUserId, body.taskId, body.text));
    case "reportUser":
      if (!body.userId || !body.reason) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
      return NextResponse.json(await reportUser(sessionUserId, body.userId, body.reason, body.taskId));
    case "blockUser":
      if (!body.userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
      return NextResponse.json(await blockUser(sessionUserId, body.userId, body.taskId));
    case "unblockUser":
      if (!body.userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
      return NextResponse.json(await unblockUser(sessionUserId, body.userId));
    case "markRead":
      return NextResponse.json(await markRead(sessionUserId));
    default:
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }
}
