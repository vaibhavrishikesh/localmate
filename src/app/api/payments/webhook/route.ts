import { NextResponse } from "next/server";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";
import { getPaymentsMode } from "@/lib/payments/env";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCaptureLedgerDrafts } from "@/lib/payments/service";
import { splitCommissionPaise } from "@/lib/money";

export const runtime = "nodejs";

/**
 * Razorpay webhooks — verify signature on raw body; never trust the browser.
 * Idempotent on provider event id.
 */
export async function POST(request: Request) {
  const mode = getPaymentsMode();
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const headerEventId = request.headers.get("x-razorpay-event-id");

  if (mode === "simulated") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Payments in simulated mode — webhook accepted but not applied to live money.",
    });
  }

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event ?? "unknown";
  const eventId = headerEventId || `${eventType}:${Date.now()}`;

  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      warning: "SUPABASE_SERVICE_ROLE_KEY missing — signature verified but event not persisted",
      eventType,
    });
  }

  const admin = createAdminClient();
  const { error: insertErr } = await admin.from("webhook_events").insert({
    provider: "razorpay",
    provider_event_id: String(eventId),
    event_type: eventType,
    payload: JSON.parse(rawBody) as object,
    processing_status: "received",
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  try {
    if (eventType === "payment.captured") {
      const entity = event.payload?.payment?.entity;
      if (entity) await applyCapturedPayment(admin, entity);
    }
    await admin
      .from("webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", "razorpay")
      .eq("provider_event_id", String(eventId));
  } catch (err) {
    await admin
      .from("webhook_events")
      .update({
        processing_status: "failed",
        error_message: err instanceof Error ? err.message : "processing failed",
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "razorpay")
      .eq("provider_event_id", String(eventId));
    return NextResponse.json({ ok: false, error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, eventType });
}

async function applyCapturedPayment(
  admin: ReturnType<typeof createAdminClient>,
  entity: Record<string, unknown>,
) {
  const orderId = String(entity.order_id ?? "");
  const providerPaymentId = String(entity.id ?? "");
  const amountPaise = Number(entity.amount);
  if (!orderId || !providerPaymentId || !Number.isInteger(amountPaise)) return;

  const { data: existing } = await admin
    .from("payments")
    .select("*")
    .eq("provider", "razorpay")
    .eq("provider_order_id", orderId)
    .maybeSingle();

  if (!existing) {
    // Orphan: order not created by LocalMate — leave for manual reconciliation; do not invent task FK.
    return;
  }
  if (existing.status === "captured") return;
  if (existing.amount_paise !== amountPaise) {
    throw new Error("Captured amount does not match LocalMate payment row");
  }

  const fee = Number(entity.fee ?? 0);
  const split = splitCommissionPaise(amountPaise);
  const drafts = buildCaptureLedgerDrafts(split, Number.isFinite(fee) ? fee : 0);

  await admin
    .from("payments")
    .update({
      status: "captured",
      provider_payment_id: providerPaymentId,
      captured_at: new Date().toISOString(),
      is_simulated: false,
    })
    .eq("id", existing.id);

  for (const row of drafts) {
    await admin.from("payment_ledger").insert({
      payment_id: existing.id,
      entry_type: row.entry_type,
      amount_paise: row.amount_paise,
      direction: row.direction,
      description: row.description,
      party_profile_id:
        row.entry_type === "helper_payable" ? existing.helper_id : existing.customer_id,
    });
  }
}
