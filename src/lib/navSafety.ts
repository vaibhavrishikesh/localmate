import { areaById, haversineKm } from "@/lib/catalog";

/** Max GPS distance (m) to treat helper as "at the official pin". */
export const ARRIVAL_RADIUS_M = 220;

/** Warn if claimed accuracy is worse than this (m). */
export const WEAK_ACCURACY_M = 80;

/** Soft alert when helper is farther than this (m) from pin. */
export const FAR_FROM_PIN_M = 800;

export function metersFromPin(lat: number, lng: number, areaId: string): number {
  const area = areaById(areaId);
  return haversineKm(lat, lng, area.lat, area.lng) * 1000;
}

export function isAtOfficialPin(
  lat: number,
  lng: number,
  areaId: string,
  radiusM: number = ARRIVAL_RADIUS_M,
): boolean {
  return metersFromPin(lat, lng, areaId) <= radiusM;
}

export type PinProximity = "at_pin" | "nearby" | "far" | "unknown";

export function pinProximity(
  lat: number | null,
  lng: number | null,
  areaId: string,
): PinProximity {
  if (lat == null || lng == null) return "unknown";
  const m = metersFromPin(lat, lng, areaId);
  if (m <= ARRIVAL_RADIUS_M) return "at_pin";
  if (m <= FAR_FROM_PIN_M) return "nearby";
  return "far";
}

/**
 * Directions URL locked to catalog coordinates.
 * Never accepts free-text destinations from chat — bait-proof.
 */
export function lockedDirectionsUrl(
  areaId: string,
  opts?: { originLat?: number; originLng?: number; mode?: "walking" | "driving" },
): string {
  const area = areaById(areaId);
  const dir = new URLSearchParams({
    api: "1",
    destination: `${area.lat},${area.lng}`,
    travelmode: opts?.mode ?? "walking",
  });
  if (opts?.originLat != null && opts?.originLng != null) {
    dir.set("origin", `${opts.originLat},${opts.originLng}`);
  }
  return `https://www.google.com/maps/dir/?${dir.toString()}`;
}

/** Place pin URL with area name — still lat/lng only, not chat text. */
export function lockedPlaceUrl(areaId: string): string {
  const area = areaById(areaId);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${area.lat},${area.lng}`)}`;
}

/** Detect chat lines that try to move the meet point off-app. */
export function looksLikeBaitLocation(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /meet\s+(me\s+)?(at|near|opposite|behind)/i.test(text) ||
    /आ\s*(जाओ|जा|गे)\s*(मेरे|वहाँ|यहाँ)/.test(text) ||
    /दूसरी जगह|कहीं और|यहाँ मत|वहाँ मिल|दूसरी लोकेशन/.test(text) ||
    /whatsapp|wa\.me|gps live|live location|लोकेशन भेज|pin drop/i.test(t) ||
    /maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google/i.test(t) ||
    /\d{1,2}\.\d{3,},\s*\d{1,3}\.\d{3,}/.test(t)
  );
}
