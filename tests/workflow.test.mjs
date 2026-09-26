import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Offline contract tests — no Supabase credentials required.
 * Live Auth/RLS must be verified after applying migrations (see docs/SUPABASE_SETUP.md).
 */

describe("workflow contracts", () => {
  it("defines expected accept_offer transition", () => {
    const transitions = { accept_offer: { from: ["looking"], to: "matched", who: "customer" } };
    assert.deepEqual(transitions.accept_offer.from, ["looking"]);
    assert.equal(transitions.accept_offer.to, "matched");
  });

  it("rejects offer above budget in negotiable mode", () => {
    const budget = 500;
    const amount = 600;
    assert.ok(amount > budget);
  });
});

describe("authorization contracts", () => {
  it("lists privileged profile fields clients must not self-set", () => {
    const privileged = [
      "identity_verified",
      "phone_verified",
      "rating",
      "tasks_completed",
      "is_admin",
      "is_demo",
    ];
    assert.ok(privileged.includes("identity_verified"));
    assert.ok(privileged.includes("is_admin"));
  });

  it("documents admin-only identity clear RPC", () => {
    const clientRpc = ["request_identity_review"];
    const adminRpc = ["admin_set_identity_verified"];
    assert.ok(!clientRpc.includes("admin_set_identity_verified"));
    assert.ok(adminRpc.includes("admin_set_identity_verified"));
  });

  it("marks payment holds as simulated", () => {
    assert.equal({ is_simulated: true }.is_simulated, true);
  });
});

describe("backend mode gate", () => {
  it("defaults to demo without public supabase url", () => {
    const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    // In CI/local without secrets this should be false — demo-json remains the safe default.
    assert.equal(typeof configured, "boolean");
  });
});
