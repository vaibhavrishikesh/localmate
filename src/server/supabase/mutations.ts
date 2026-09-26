import { splitFee } from "@/lib/catalog";
import { canTransition, nextStatus, validateOfferAmount } from "@/lib/workflow";
import type { CategoryId, NewTaskInput } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { loadSupabasePublicState } from "./state";

type Result = { ok: true; state: Awaited<ReturnType<typeof loadSupabasePublicState>>; extra?: { id?: string } } | { ok: false; error: string };

async function asUser() {
  return createClient();
}

function admin() {
  if (!hasServiceRole()) throw new Error("Service role required for this mutation");
  return createAdminClient();
}

export async function sbCreateTask(userId: string, input: NewTaskInput): Promise<Result> {
  const sb = await asUser();
  if (!input.title.trim() || !input.details.trim() || input.budget < 50) {
    return { ok: false, error: "invalid" };
  }
  const { data, error } = await sb
    .from("tasks")
    .insert({
      customer_id: userId,
      category: input.category,
      title: input.title.trim(),
      description: input.details.trim(),
      location_area: input.area,
      to_area: input.toArea ?? null,
      when_id: input.whenId,
      when_label: input.whenLabel,
      when_label_hi: input.whenLabelHi ?? null,
      price_mode: input.priceMode,
      budget: input.budget,
      status: "looking",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "create failed" };
  const state = await loadSupabasePublicState(userId);
  return { ok: true, state, extra: { id: data.id } };
}

export async function sbSendOffer(userId: string, taskId: string, amount: number, note: string): Promise<Result> {
  const sb = await asUser();
  const { data: task } = await sb.from("tasks").select("*").eq("id", taskId).single();
  if (!task) return { ok: false, error: "Task not found" };
  const check = validateOfferAmount(amount, { budget: task.budget, priceMode: task.price_mode });
  if (!check.ok) return { ok: false, error: check.error };
  const { error } = await sb.from("task_applications").insert({
    task_id: taskId,
    helper_id: userId,
    offer_amount: check.amount,
    message: note,
    status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbAcceptOffer(userId: string, offerId: string): Promise<Result> {
  const sb = hasServiceRole() ? admin() : await asUser();
  const { data: offer } = await sb.from("task_applications").select("*").eq("id", offerId).single();
  if (!offer) return { ok: false, error: "Offer not found" };
  const { data: task } = await sb.from("tasks").select("*").eq("id", offer.task_id).single();
  if (!task) return { ok: false, error: "Task not found" };
  const gate = canTransition(
    { status: task.status, customerId: task.customer_id, helperId: task.helper_id ?? undefined },
    "accept_offer",
    userId,
  );
  if (!gate.ok) return { ok: false, error: gate.error };
  if (task.customer_id !== userId) return { ok: false, error: "Only the customer can accept" };

  const { error: tErr } = await sb
    .from("tasks")
    .update({
      status: nextStatus("accept_offer"),
      helper_id: offer.helper_id,
      agreed_amount: offer.offer_amount,
    })
    .eq("id", task.id)
    .eq("status", "looking");
  if (tErr) return { ok: false, error: tErr.message };

  await sb.from("task_applications").update({ status: "accepted" }).eq("id", offerId);
  await sb
    .from("task_applications")
    .update({ status: "rejected" })
    .eq("task_id", task.id)
    .eq("status", "pending")
    .neq("id", offerId);

  await sb.from("conversations").upsert(
    {
      task_id: task.id,
      customer_id: task.customer_id,
      helper_id: offer.helper_id,
    },
    { onConflict: "task_id" },
  );

  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbSendMessage(userId: string, taskId: string, text: string): Promise<Result> {
  const sb = await asUser();
  const { data: conv } = await sb.from("conversations").select("*").eq("task_id", taskId).maybeSingle();
  if (!conv) return { ok: false, error: "No conversation" };
  const { error } = await sb.from("messages").insert({
    conversation_id: conv.id,
    sender_id: userId,
    original_text: text.trim(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbRequestIdentityReview(userId: string): Promise<Result> {
  const sb = await asUser();
  const { error } = await sb.rpc("request_identity_review");
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbSaveWorkerSetup(userId: string, categories: CategoryId[]): Promise<Result> {
  const sb = await asUser();
  const { error } = await sb
    .from("profiles")
    .update({ categories, conduct_accepted: true })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbShareLocation(userId: string, taskId: string): Promise<Result> {
  const sb = await asUser();
  const { data: task } = await sb.from("tasks").select("*").eq("id", taskId).single();
  if (!task) return { ok: false, error: "Task not found" };
  if (task.helper_id !== userId && task.customer_id !== userId) {
    return { ok: false, error: "Only task parties can share location" };
  }
  const { error } = await sb.from("tasks").update({ location_shared: true }).eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbConfirmArrival(
  userId: string,
  taskId: string,
  _coords?: { lat: number; lng: number; accuracy?: number | null } | null,
): Promise<Result> {
  const sb = await asUser();
  const { data: task } = await sb.from("tasks").select("*").eq("id", taskId).single();
  if (!task) return { ok: false, error: "Task not found" };
  if (task.helper_id !== userId) {
    return { ok: false, error: "Only the helper can confirm arrival." };
  }
  if (task.status !== "matched" && task.status !== "active") {
    return { ok: false, error: "Task is not in progress." };
  }
  if (task.helper_arrived_at) {
    return { ok: true, state: await loadSupabasePublicState(userId) };
  }
  const now = new Date().toISOString();
  const { error } = await sb.from("tasks").update({ helper_arrived_at: now }).eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbHoldPayment(userId: string, taskId: string): Promise<Result> {
  const sb = hasServiceRole() ? admin() : await asUser();
  const { data: task } = await sb.from("tasks").select("*").eq("id", taskId).single();
  if (!task || !task.helper_id || !task.agreed_amount) return { ok: false, error: "Task not payable" };
  const gate = canTransition(
    { status: task.status, customerId: task.customer_id, helperId: task.helper_id },
    "hold_payment",
    userId,
  );
  if (!gate.ok) return { ok: false, error: gate.error };
  const parts = splitFee(task.agreed_amount);
  const { error: pErr } = await sb.from("payment_holds").upsert({
    task_id: taskId,
    customer_id: task.customer_id,
    helper_id: task.helper_id,
    amount: parts.total,
    fee: parts.fee,
    helper_amount: parts.helper,
    status: "held",
    is_simulated: true,
  });
  if (pErr) return { ok: false, error: pErr.message };
  await sb.from("tasks").update({ status: nextStatus("hold_payment") }).eq("id", taskId);
  return { ok: true, state: await loadSupabasePublicState(userId) };
}

export async function sbTransition(
  userId: string,
  taskId: string,
  action: Parameters<typeof canTransition>[1],
  patch: Record<string, unknown> = {},
): Promise<Result> {
  const sb = await asUser();
  const { data: task } = await sb.from("tasks").select("*").eq("id", taskId).single();
  if (!task) return { ok: false, error: "Task not found" };
  const gate = canTransition(
    { status: task.status, customerId: task.customer_id, helperId: task.helper_id ?? undefined },
    action,
    userId,
  );
  if (!gate.ok) return { ok: false, error: gate.error };
  if (action === "helper_mark_done" && !task.helper_arrived_at) {
    return { ok: false, error: "Confirm arrival at the official pin before marking done." };
  }
  const { error } = await sb
    .from("tasks")
    .update({ status: nextStatus(action), ...patch })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, state: await loadSupabasePublicState(userId) };
}
