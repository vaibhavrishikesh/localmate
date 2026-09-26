import { NextResponse } from "next/server";
import {
  acceptOffer,
  blockUser,
  cancelTask,
  completeTask,
  confirmAndReview,
  confirmArrival,
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
import { backendMode, getActiveUserId } from "@/server/backend";
import {
  sbAcceptOffer,
  sbConfirmArrival,
  sbCreateTask,
  sbHoldPayment,
  sbRequestIdentityReview,
  sbSaveWorkerSetup,
  sbSendMessage,
  sbSendOffer,
  sbShareLocation,
  sbTransition,
} from "@/server/supabase/mutations";
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
  coords?: { lat: number; lng: number; accuracy?: number | null } | null;
};

export async function POST(request: Request) {
  const sessionUserId = await getActiveUserId();
  const body = (await request.json()) as Body;
  const mode = backendMode();

  if (body.action === "resetDemo") {
    if (mode === "supabase") {
      return NextResponse.json({ ok: false, error: "resetDemo is demo-json only" }, { status: 400 });
    }
    const result = await resetDemo(sessionUserId);
    return NextResponse.json(result);
  }

  if (!sessionUserId) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  if (mode === "supabase") {
    switch (body.action) {
      case "saveWorkerSetup":
        return NextResponse.json(await sbSaveWorkerSetup(sessionUserId, body.categories ?? []));
      case "requestIdentityReview":
        return NextResponse.json(await sbRequestIdentityReview(sessionUserId));
      case "createTask":
        if (!body.task) return NextResponse.json({ ok: false, error: "Missing task" }, { status: 400 });
        return NextResponse.json(await sbCreateTask(sessionUserId, body.task));
      case "sendOffer":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(await sbSendOffer(sessionUserId, body.taskId, body.amount ?? NaN, body.note ?? ""));
      case "acceptOffer":
        if (!body.offerId) return NextResponse.json({ ok: false, error: "Missing offerId" }, { status: 400 });
        return NextResponse.json(await sbAcceptOffer(sessionUserId, body.offerId));
      case "startTask":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(await sbTransition(sessionUserId, body.taskId, "start"));
      case "shareLocation":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(await sbShareLocation(sessionUserId, body.taskId));
      case "confirmArrival":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(await sbConfirmArrival(sessionUserId, body.taskId, body.coords));
      case "completeTask":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(
          await sbTransition(sessionUserId, body.taskId, "helper_mark_done", {
            helper_marked_done_at: new Date().toISOString(),
          }),
        );
      case "confirmCompletion":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(
          await sbTransition(sessionUserId, body.taskId, "customer_confirm_done", {
            customer_confirmed_at: new Date().toISOString(),
          }),
        );
      case "reportTaskProblem":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(
          await sbTransition(sessionUserId, body.taskId, "customer_report_problem", {
            flagged_at: new Date().toISOString(),
            flag_reason: body.reason ?? "",
          }),
        );
      case "cancelTask":
        if (!body.taskId || !body.reasonId) {
          return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
        }
        return NextResponse.json(
          await sbTransition(sessionUserId, body.taskId, "cancel", {
            cancelled_at: new Date().toISOString(),
            cancel_reason: body.reasonId,
            cancelled_by: sessionUserId,
          }),
        );
      case "holdPayment":
        if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
        return NextResponse.json(await sbHoldPayment(sessionUserId, body.taskId));
      case "sendMessage":
        if (!body.taskId || !body.text) {
          return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
        }
        return NextResponse.json(await sbSendMessage(sessionUserId, body.taskId, body.text));
      case "confirmAndReview":
      case "reportUser":
      case "blockUser":
      case "unblockUser":
      case "markRead":
        return NextResponse.json(
          {
            ok: false,
            error: `${body.action} not fully ported to Supabase yet — use demo-json mode or extend src/server/supabase/mutations.ts`,
          },
          { status: 501 },
        );
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
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
    case "confirmArrival":
      if (!body.taskId) return NextResponse.json({ ok: false, error: "Missing taskId" }, { status: 400 });
      return NextResponse.json(await confirmArrival(sessionUserId, body.taskId, body.coords));
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
      return NextResponse.json(await confirmAndReview(sessionUserId, body.taskId, body.stars ?? 0, body.text ?? ""));
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
