/** Integer money helpers — never use floats for INR ledger math. */

export const PAISE_PER_RUPEE = 100;
/** Platform commission rate on agreed task price (commission base). */
export const PLATFORM_COMMISSION_BPS = 1000; // 10% = 1000 basis points

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error("Invalid rupees");
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/**
 * Split agreed task amount into LocalMate commission + helper gross.
 * Rounding: Math.round on (base_paise * 10%) — half away from zero in JS for positives.
 * Gateway fees are NOT included here.
 */
export function splitCommissionPaise(basePaise: number): {
  amountPaise: number;
  commissionPaise: number;
  helperGrossPaise: number;
} {
  if (!Number.isInteger(basePaise) || basePaise < 0) {
    throw new Error("basePaise must be a non-negative integer");
  }
  const commissionPaise = Math.round((basePaise * PLATFORM_COMMISSION_BPS) / 10_000);
  return {
    amountPaise: basePaise,
    commissionPaise,
    helperGrossPaise: basePaise - commissionPaise,
  };
}

/** Display helper — formats paise as ₹ string. */
export function formatPaise(paise: number): string {
  return `₹${(paise / PAISE_PER_RUPEE).toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(paise / 100) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
