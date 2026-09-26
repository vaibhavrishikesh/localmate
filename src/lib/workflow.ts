import type { PriceMode, Task, TaskStatus } from "./types";

/** Minimum negotiable offer in INR (₹). */
export const MIN_OFFER_INR = 1;

/** Absolute ceiling for any offer (protects against absurd numbers). */
export const ABS_MAX_OFFER_INR = 100_000;

export const TASK_STATUSES: TaskStatus[] = [
  "looking",
  "matched",
  "active",
  "awaiting_customer_confirmation",
  "pay",
  "review",
  "completed",
  "cancelled",
  "flagged",
];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as string[]).includes(value);
}

/** Role-aware actions that mutate task status. */
export type WorkflowAction =
  | "accept_offer"
  | "start"
  | "helper_mark_done"
  | "customer_confirm_done"
  | "customer_report_problem"
  | "hold_payment"
  | "complete_review"
  | "cancel"
  | "flag_from_block";

const TRANSITIONS: Record<
  WorkflowAction,
  { from: TaskStatus[]; to: TaskStatus; who: "customer" | "helper" | "party" }
> = {
  accept_offer: { from: ["looking"], to: "matched", who: "customer" },
  start: { from: ["matched"], to: "active", who: "helper" },
  helper_mark_done: { from: ["active"], to: "awaiting_customer_confirmation", who: "helper" },
  customer_confirm_done: { from: ["awaiting_customer_confirmation"], to: "pay", who: "customer" },
  customer_report_problem: { from: ["awaiting_customer_confirmation"], to: "flagged", who: "customer" },
  hold_payment: { from: ["pay"], to: "review", who: "customer" },
  complete_review: { from: ["review"], to: "completed", who: "customer" },
  cancel: {
    from: ["looking", "matched", "active", "awaiting_customer_confirmation"],
    to: "cancelled",
    who: "party",
  },
  flag_from_block: {
    from: ["matched", "active", "awaiting_customer_confirmation"],
    to: "flagged",
    who: "party",
  },
};

export function canTransition(
  task: Pick<Task, "status" | "customerId" | "helperId">,
  action: WorkflowAction,
  actorId: string,
  _actorRole?: string,
): { ok: true } | { ok: false; error: string } {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(task.status)) {
    return { ok: false, error: `Invalid transition: ${task.status} cannot ${action}.` };
  }
  const isCustomer = actorId === task.customerId;
  const isHelper = Boolean(task.helperId && actorId === task.helperId);
  const isParty = isCustomer || isHelper;

  if (rule.who === "party" && !isParty) return { ok: false, error: "Only task parties can do this." };
  if (rule.who === "customer" && !isCustomer) return { ok: false, error: "Only the customer can do this." };
  if (rule.who === "helper" && !isHelper) return { ok: false, error: "Only the helper can do this." };
  return { ok: true };
}

export function nextStatus(action: WorkflowAction): TaskStatus {
  return TRANSITIONS[action].to;
}

export function isTerminal(status: TaskStatus) {
  return status === "completed" || status === "cancelled" || status === "flagged";
}

export function isOpenForOffers(status: TaskStatus) {
  return status === "looking";
}

export function isInFeed(status: TaskStatus) {
  return status === "looking";
}

export function isChatOpen(status: TaskStatus) {
  return status === "matched" || status === "active" || status === "awaiting_customer_confirmation" || status === "pay" || status === "review";
}

export function countsAsOpenJob(status: TaskStatus) {
  return (
    status === "matched" ||
    status === "active" ||
    status === "awaiting_customer_confirmation" ||
    status === "pay" ||
    status === "review" ||
    status === "flagged"
  );
}

export type OfferValidationError =
  | "empty"
  | "invalid"
  | "zero"
  | "negative"
  | "too_low"
  | "over_budget"
  | "too_high"
  | "fixed_mismatch";

export function parseOfferAmount(raw: unknown): number | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Validate offer amount. Budget is a hard cap for negotiable tasks.
 * Fixed-price tasks must use exactly the task budget (caller should pass budget).
 */
export function validateOfferAmount(
  amount: unknown,
  task: { budget: number; priceMode: PriceMode },
): { ok: true; amount: number } | { ok: false; error: OfferValidationError } {
  if (amount === "" || amount === null || amount === undefined) return { ok: false, error: "empty" };
  const n = parseOfferAmount(amount);
  if (n === null) return { ok: false, error: "invalid" };
  if (n === 0) return { ok: false, error: "zero" };
  if (n < 0) return { ok: false, error: "negative" };
  if (!Number.isInteger(n) && !Number.isFinite(n)) return { ok: false, error: "invalid" };
  // Allow paisa-less whole rupees only
  if (!Number.isInteger(n)) return { ok: false, error: "invalid" };

  if (task.priceMode === "fixed") {
    if (n !== task.budget) return { ok: false, error: "fixed_mismatch" };
    return { ok: true, amount: task.budget };
  }

  if (n < MIN_OFFER_INR) return { ok: false, error: "too_low" };
  if (n > task.budget) return { ok: false, error: "over_budget" };
  if (n > ABS_MAX_OFFER_INR) return { ok: false, error: "too_high" };
  return { ok: true, amount: n };
}

export function offerErrorMessage(error: OfferValidationError, lang: "en" | "hi", budget: number): string {
  const en: Record<OfferValidationError, string> = {
    empty: "Enter an offer amount in rupees.",
    invalid: "Enter a valid whole-rupee amount.",
    zero: "Offers cannot be ₹0.",
    negative: "Offers cannot be negative.",
    too_low: `Minimum offer is ₹${MIN_OFFER_INR}.`,
    over_budget: `Offer cannot exceed the customer's budget of ₹${budget}.`,
    too_high: `Offer is too high (max ₹${ABS_MAX_OFFER_INR}).`,
    fixed_mismatch: "This is a fixed-price task — accept the listed amount.",
  };
  const hi: Record<OfferValidationError, string> = {
    empty: "रुपये में ऑफ़र राशि डालें।",
    invalid: "पूरे रुपये में सही राशि डालें।",
    zero: "₹0 का ऑफ़र नहीं चल सकता।",
    negative: "ऋणात्मक ऑफ़र नहीं चल सकता।",
    too_low: `न्यूनतम ऑफ़र ₹${MIN_OFFER_INR} है।`,
    over_budget: `ऑफ़र कस्टमर के बजट ₹${budget} से ज़्यादा नहीं हो सकता।`,
    too_high: `ऑफ़र बहुत ज़्यादा है (अधिकतम ₹${ABS_MAX_OFFER_INR})।`,
    fixed_mismatch: "यह फिक्स्ड कीमत का काम है — लिखी हुई राशि ही स्वीकार करें।",
  };
  return lang === "hi" ? hi[error] : en[error];
}

export const CANCEL_REASONS = [
  { id: "plans_changed", en: "Plans changed", hi: "प्लान बदल गया" },
  { id: "found_other", en: "Found another helper / no longer needed", hi: "दूसरा हेल्पर मिल गया / ज़रूरत नहीं" },
  { id: "no_show", en: "Other person did not show up", hi: "दूसरा व्यक्ति नहीं आया" },
  { id: "unsafe", en: "Felt unsafe", hi: "असुरक्षित लगा" },
  { id: "other", en: "Other", hi: "अन्य" },
] as const;

export type CancelReasonId = (typeof CANCEL_REASONS)[number]["id"];

export function isCancelReason(value: string): value is CancelReasonId {
  return CANCEL_REASONS.some((item) => item.id === value);
}
