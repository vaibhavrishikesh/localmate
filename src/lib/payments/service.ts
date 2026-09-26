import { randomUUID } from "crypto";
import { splitCommissionPaise, rupeesToPaise } from "@/lib/money";
import { getPaymentsMode } from "./env";
import { createRazorpayOrder, fetchRazorpayPayment, verifyRazorpaySignature } from "./razorpay";

export type CreatePaymentOrderInput = {
  taskId: string;
  customerId: string;
  helperId: string | null;
  /** Agreed task amount in whole rupees (integer) — converted to paise server-side. */
  agreedRupees: number;
  taskStatus: string;
};

export type CreatePaymentOrderResult =
  | {
      ok: true;
      mode: ReturnType<typeof getPaymentsMode>;
      paymentId: string;
      amountPaise: number;
      commissionPaise: number;
      helperGrossPaise: number;
      providerOrderId: string;
      razorpayKeyId: string | null;
      isSimulated: boolean;
    }
  | { ok: false; error: string };

/**
 * Validates eligibility and creates a payment order.
 * Persistence to Supabase `payments` happens when a DB client is injected;
 * demo-json path uses returned values with existing holdPayment.
 */
export async function createMarketplacePaymentOrder(
  input: CreatePaymentOrderInput,
): Promise<CreatePaymentOrderResult> {
  if (input.taskStatus !== "pay") {
    return { ok: false, error: "Task is not eligible for payment (status must be pay)." };
  }
  if (!Number.isInteger(input.agreedRupees) || input.agreedRupees < 50) {
    return { ok: false, error: "Invalid agreed amount." };
  }

  const amountPaise = rupeesToPaise(input.agreedRupees);
  const split = splitCommissionPaise(amountPaise);
  const mode = getPaymentsMode();
  const idempotencyKey = `pay_${input.taskId}_${input.customerId}_${amountPaise}`;

  if (mode === "simulated") {
    return {
      ok: true,
      mode,
      paymentId: `sim_${randomUUID()}`,
      amountPaise: split.amountPaise,
      commissionPaise: split.commissionPaise,
      helperGrossPaise: split.helperGrossPaise,
      providerOrderId: `order_sim_${idempotencyKey}`,
      razorpayKeyId: null,
      isSimulated: true,
    };
  }

  try {
    const order = await createRazorpayOrder({
      amountPaise: split.amountPaise,
      receipt: input.taskId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) || "localmate",
      notes: {
        task_id: input.taskId,
        customer_id: input.customerId,
        helper_id: input.helperId ?? "",
        commission_paise: String(split.commissionPaise),
        helper_gross_paise: String(split.helperGrossPaise),
        idempotency_key: idempotencyKey,
      },
    });
    return {
      ok: true,
      mode,
      paymentId: `pending_${order.id}`,
      amountPaise: split.amountPaise,
      commissionPaise: split.commissionPaise,
      helperGrossPaise: split.helperGrossPaise,
      providerOrderId: order.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? null,
      isSimulated: false,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Order creation failed" };
  }
}

export type ConfirmPaymentInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

export async function confirmRazorpayCheckout(input: ConfirmPaymentInput): Promise<
  { ok: true; payment: Record<string, unknown> } | { ok: false; error: string }
> {
  if (getPaymentsMode() === "simulated") {
    return { ok: false, error: "Razorpay confirm not used in simulated mode" };
  }
  if (!verifyRazorpaySignature(input)) {
    return { ok: false, error: "Invalid payment signature" };
  }
  try {
    const payment = await fetchRazorpayPayment(input.paymentId);
    if (payment.status !== "captured" && payment.status !== "authorized") {
      return { ok: false, error: `Unexpected payment status: ${String(payment.status)}` };
    }
    if (payment.order_id !== input.orderId) {
      return { ok: false, error: "Order/payment mismatch" };
    }
    return { ok: true, payment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment fetch failed" };
  }
}

export type LedgerDraft = {
  entry_type: string;
  amount_paise: number;
  direction: "debit" | "credit";
  description: string;
};

/** Immutable ledger drafts for a captured charge (no gateway fee unless provided). */
export function buildCaptureLedgerDrafts(split: {
  amountPaise: number;
  commissionPaise: number;
  helperGrossPaise: number;
}, providerFeePaise = 0): LedgerDraft[] {
  const rows: LedgerDraft[] = [
    {
      entry_type: "customer_charge",
      amount_paise: split.amountPaise,
      direction: "debit",
      description: "Customer charged for task",
    },
    {
      entry_type: "platform_commission",
      amount_paise: split.commissionPaise,
      direction: "credit",
      description: "LocalMate 10% commission",
    },
    {
      entry_type: "helper_payable",
      amount_paise: split.helperGrossPaise,
      direction: "credit",
      description: "Helper gross earnings (pre gateway/tax)",
    },
  ];
  if (providerFeePaise > 0) {
    rows.push({
      entry_type: "provider_fee",
      amount_paise: providerFeePaise,
      direction: "debit",
      description: "Payment provider fee (not deducted from helper silently)",
    });
  }
  return rows;
}
