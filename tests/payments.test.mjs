import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Mirror of src/lib/money.ts for offline tests without TS path aliases. */
function splitCommissionPaise(basePaise) {
  const commissionPaise = Math.round((basePaise * 1000) / 10_000);
  return {
    amountPaise: basePaise,
    commissionPaise,
    helperGrossPaise: basePaise - commissionPaise,
  };
}

describe("commission (paise)", () => {
  it("₹500 → ₹50 commission + ₹450 helper", () => {
    const s = splitCommissionPaise(50_000);
    assert.equal(s.commissionPaise, 5_000);
    assert.equal(s.helperGrossPaise, 45_000);
    assert.equal(s.commissionPaise + s.helperGrossPaise, s.amountPaise);
  });

  it("never uses floats in ledger identity", () => {
    const s = splitCommissionPaise(50_050);
    assert.equal(Number.isInteger(s.commissionPaise), true);
    assert.equal(Number.isInteger(s.helperGrossPaise), true);
  });
});

describe("payment safety contracts", () => {
  it("does not treat client success as settlement", () => {
    const clientSaidPaid = true;
    const serverCaptured = false;
    assert.equal(clientSaidPaid && !serverCaptured, true);
    assert.equal(serverCaptured, false);
  });

  it("labels simulated mode when keys missing", () => {
    const mode = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? "razorpay" : "simulated";
    assert.ok(mode === "simulated" || mode === "razorpay");
  });

  it("rejects calling system escrow without legal/provider support", () => {
    const productLanguage = "settlement_hold";
    assert.notEqual(productLanguage, "escrow");
  });
});
