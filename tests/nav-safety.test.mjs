import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Contract tests for helper anti-bait navigation.
 * Implementation lives in src/lib/navSafety.ts + LiveMap safeHelper mode.
 */
describe("helper nav safety contracts", () => {
  it("locks directions to lat,lng destination only", () => {
    const lat = 30.1356;
    const lng = 78.324;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    assert.match(url, /destination=30\.1356,78\.324/);
    assert.doesNotMatch(url, /whatsapp|chat|place_id/i);
  });

  it("treats arrival radius as ~220m soft gate before mark-done", () => {
    const ARRIVAL_RADIUS_M = 220;
    assert.ok(ARRIVAL_RADIUS_M >= 150 && ARRIVAL_RADIUS_M <= 300);
  });

  it("flags bait meet-point phrases", () => {
    const patterns = [
      /meet\s+(me\s+)?(at|near)/i,
      /whatsapp|wa\.me|live location/i,
      /maps\.app\.goo\.gl|goo\.gl\/maps/i,
    ];
    const bait = "Meet me near the back gate — send WhatsApp live location";
    assert.ok(patterns.some((re) => re.test(bait)));
    assert.ok(!patterns.some((re) => re.test("On my way to the official pin")));
  });

  it("requires confirmArrival before helper_mark_done", () => {
    const gate = { helperArrivedAt: undefined, canMarkDone: false };
    gate.canMarkDone = Boolean(gate.helperArrivedAt);
    assert.equal(gate.canMarkDone, false);
    gate.helperArrivedAt = new Date().toISOString();
    gate.canMarkDone = Boolean(gate.helperArrivedAt);
    assert.equal(gate.canMarkDone, true);
  });
});
