import { NextResponse } from "next/server";
import { getActiveUserId } from "@/server/backend";
import { getPaymentsMode } from "@/lib/payments/env";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/payments/payouts/request
 * Queues a helper payout/transfer AFTER capture + task eligibility.
 * Does NOT mark paid based on client alone. Route transfers require Linked Account.
 */
export async function POST(request: Request) {
  const userId = await getActiveUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const body = (await request.json()) as { paymentId?: string };
  if (!body.paymentId) return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });

  const mode = getPaymentsMode();
  if (mode === "simulated") {
    return NextResponse.json({
      ok: true,
      status: "pending",
      isSimulated: true,
      message: "Simulated payout queued. No bank transfer executed.",
    });
  }

  if (!hasServiceRole()) {
    return NextResponse.json({ ok: false, error: "Service role required" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("*").eq("id", body.paymentId).maybeSingle();
  if (!payment) return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
  if (payment.status !== "captured") {
    return NextResponse.json({ ok: false, error: "Payment not captured" }, { status: 400 });
  }
  if (!payment.helper_id) {
    return NextResponse.json({ ok: false, error: "No helper on payment" }, { status: 400 });
  }

  // Only helper or admin should request; customer viewing status is read-only elsewhere
  if (payment.helper_id !== userId) {
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (!profile?.is_admin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: linked } = await admin
    .from("helper_payment_accounts")
    .select("*")
    .eq("helper_id", payment.helper_id)
    .maybeSingle();

  if (!linked?.provider_account_id || !linked.bank_verified) {
    return NextResponse.json({
      ok: false,
      error: "Helper Linked Account KYC incomplete — cannot transfer via Razorpay Route yet",
      kycStatus: linked?.kyc_status ?? "not_started",
    }, { status: 409 });
  }

  const idempotencyKey = `payout_${payment.id}_${payment.helper_id}`;
  const { data: payout, error } = await admin
    .from("payouts")
    .upsert(
      {
        payment_id: payment.id,
        helper_id: payment.helper_id,
        amount_paise: payment.helper_gross_paise,
        provider: "razorpay",
        status: "on_hold",
        idempotency_key: idempotencyKey,
        is_simulated: false,
        metadata: {
          note: "Transfer API not invoked until Route product enabled; row reserved for reconciliation",
          linked_account: linked.provider_account_id,
        },
      },
      { onConflict: "idempotency_key" },
    )
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    payout,
    message: "Payout recorded as on_hold. Execute Razorpay transfer only after Route approval + sandbox tests.",
  });
}
