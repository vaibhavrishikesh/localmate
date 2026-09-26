/**
 * Payment provider mode. Real charges only when razorpay_* + credentials exist.
 * Live mode additionally requires PAYMENTS_LIVE=true.
 */
export type PaymentsMode = "simulated" | "razorpay_test" | "razorpay_live";

export function getPaymentsMode(): PaymentsMode {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !keySecret) return "simulated";
  const live = process.env.PAYMENTS_LIVE === "true";
  if (live && keyId.startsWith("rzp_live")) return "razorpay_live";
  return "razorpay_test";
}

export function isPaymentsLiveBlocked(): boolean {
  return getPaymentsMode() === "razorpay_live" && process.env.PAYMENTS_LIVE !== "true";
}

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
