import { NextResponse } from "next/server";
import { getActiveUserId } from "@/server/backend";
import { confirmRazorpayCheckout } from "@/lib/payments/service";
import { getPaymentsMode } from "@/lib/payments/env";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCaptureLedgerDrafts } from "@/lib/payments/service";
import { splitCommissionPaise } from "@/lib/money";

/**
 * POST /api/payments/confirm
 * Client sends Razorpay checkout success payload; server verifies signature + fetches payment.
 * Never marks paid on client word alone.
 */
export async function POST(request: Request) {
  const userId = await getActiveUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  if (getPaymentsMode() === "simulated") {
    return NextResponse.json({
      ok: false,
      error: "Use simulated holdPayment mutate in demo mode — Razorpay confirm disabled.",
    }, { status: 400 });
  }

  const body = (await request.json()) as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
    return NextResponse.json({ ok: false, error: "Missing checkout fields" }, { status: 400 });
  }

  const confirmed = await confirmRazorpayCheckout({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  if (!confirmed.ok) return NextResponse.json(confirmed, { status: 400 });

  if (!hasServiceRole()) {
    return NextResponse.json({
      ok: true,
      verified: true,
      persisted: false,
      warning: "Payment verified with Razorpay but not persisted (no service role).",
      payment: { id: body.razorpay_payment_id, status: confirmed.payment.status },
    });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("payments")
    .select("*")
    .eq("provider_order_id", body.razorpay_order_id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "Unknown order — create-order first" }, { status: 404 });
  }
  if (row.customer_id !== userId) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (row.status === "captured") {
    return NextResponse.json({ ok: true, duplicate: true, paymentId: row.id });
  }

  const amountPaise = Number(confirmed.payment.amount);
  if (amountPaise !== row.amount_paise) {
    return NextResponse.json({ ok: false, error: "Amount mismatch" }, { status: 400 });
  }

  const fee = Number(confirmed.payment.fee ?? 0);
  const split = splitCommissionPaise(amountPaise);
  await admin
    .from("payments")
    .update({
      status: "captured",
      provider_payment_id: body.razorpay_payment_id,
      captured_at: new Date().toISOString(),
      is_simulated: false,
    })
    .eq("id", row.id);

  for (const draft of buildCaptureLedgerDrafts(split, Number.isFinite(fee) ? fee : 0)) {
    await admin.from("payment_ledger").insert({
      payment_id: row.id,
      entry_type: draft.entry_type,
      amount_paise: draft.amount_paise,
      direction: draft.direction,
      description: draft.description,
      party_profile_id: draft.entry_type === "helper_payable" ? row.helper_id : row.customer_id,
    });
  }

  return NextResponse.json({ ok: true, paymentId: row.id, status: "captured" });
}
