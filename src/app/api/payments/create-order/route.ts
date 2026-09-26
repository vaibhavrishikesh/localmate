import { NextResponse } from "next/server";
import { getActiveUserId } from "@/server/backend";
import { buildPublicState } from "@/server/actions";
import { readState } from "@/server/db";
import { createMarketplacePaymentOrder } from "@/lib/payments/service";
import { getPaymentsMode } from "@/lib/payments/env";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { backendMode } from "@/server/backend";

/**
 * POST /api/payments/create-order
 * Server validates task + creates provider order (or simulated order).
 * Does not trust client-supplied amounts.
 */
export async function POST(request: Request) {
  const userId = await getActiveUserId();
  if (!userId) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const body = (await request.json()) as { taskId?: string };
  if (!body.taskId) return NextResponse.json({ ok: false, error: "taskId required" }, { status: 400 });

  let task: {
    id: string;
    customerId: string;
    helperId?: string;
    status: string;
    agreedAmount?: number;
    budget: number;
  } | null = null;

  if (backendMode() === "supabase" && hasServiceRole()) {
    const admin = createAdminClient();
    const { data } = await admin.from("tasks").select("*").eq("id", body.taskId).maybeSingle();
    if (data) {
      task = {
        id: data.id,
        customerId: data.customer_id,
        helperId: data.helper_id ?? undefined,
        status: data.status,
        agreedAmount: data.agreed_amount ?? undefined,
        budget: data.budget,
      };
    }
  } else {
    const state = await readState();
    const found = state.tasks.find((t) => t.id === body.taskId);
    if (found) {
      task = {
        id: found.id,
        customerId: found.customerId,
        helperId: found.helperId,
        status: found.status,
        agreedAmount: found.agreedAmount,
        budget: found.budget,
      };
    }
  }

  if (!task) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  if (task.customerId !== userId) {
    return NextResponse.json({ ok: false, error: "Only the customer can pay for this task" }, { status: 403 });
  }

  const agreed = task.agreedAmount ?? task.budget;
  const result = await createMarketplacePaymentOrder({
    taskId: task.id,
    customerId: userId,
    helperId: task.helperId ?? null,
    agreedRupees: agreed,
    taskStatus: task.status,
  });

  if (!result.ok) return NextResponse.json(result, { status: 400 });

  // Persist Razorpay order when Supabase service role available
  if (!result.isSimulated && hasServiceRole() && backendMode() === "supabase") {
    const admin = createAdminClient();
    const idempotencyKey = `pay_${task.id}_${userId}_${result.amountPaise}`;
    const { data: row, error } = await admin
      .from("payments")
      .upsert(
        {
          task_id: task.id,
          customer_id: userId,
          helper_id: task.helperId ?? null,
          amount_paise: result.amountPaise,
          commission_paise: result.commissionPaise,
          helper_gross_paise: result.helperGrossPaise,
          provider: "razorpay",
          provider_order_id: result.providerOrderId,
          idempotency_key: idempotencyKey,
          status: "pending",
          is_simulated: false,
        },
        { onConflict: "idempotency_key" },
      )
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({
      ...result,
      paymentId: row?.id ?? result.paymentId,
      mode: getPaymentsMode(),
    });
  }

  void buildPublicState;
  return NextResponse.json({ ...result, mode: getPaymentsMode() });
}
