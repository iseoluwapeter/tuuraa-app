/**
 * feeModel.js
 * -----------
 * Thin client wrapper around the `quote-order` edge function. This file
 * intentionally contains NO pricing formulas of its own anymore — the
 * previous version duplicated the rate card client-side, which is exactly
 * the drift risk that let a customer's payment get authorized against a
 * number the server hadn't actually signed off on. Every quote shown to
 * the user, and every amount handed to the Paystack popup, now comes from
 * the server's pricingEngine.ts.
 *
 * Trade-off: this means a network round trip before you can show a price,
 * so callers should debounce (see NewManifest.jsx) and show a loading
 * state rather than a stale locally-computed number.
 */

// Pickup must be restricted to this list at the UI level too — it's
// enforced authoritatively on the server, but blocking it in the zone
// dropdown gives the customer instant feedback instead of a rejection
// three steps later.
export const PICKUP_ZONES = [
  "Ikeja",
  "Maryland",
  "Ojodu",
  "Berger",
  "Agege",
  "Ogba",
  "Ifako-Ijaye",
  "Yaba",
  "Bariga",
  "Gbagada",
  "Shomolu",
];

// Dropoff is open — anywhere in Lagos — this list is just dropdown
// convenience, not a restriction the server enforces.
export const DROPOFF_ZONES = [
  ...PICKUP_ZONES,
  "Lekki Phase 1",
  "Chevron / Lekki",
  "Osapa London",
  "Agungi",
  "Ikate / Elegushi",
  "Jakande",
  "Igbo-Efon",
  "Ajah",
  "Sangotedo",
  "Victoria Island",
  "Ikoyi",
  "Surulere",
  "Apapa",
  "Ikorodu",
  "Festac",
  "Alimosho",
  "Badagry",
  "Epe",
];

// Non-authoritative mirror of the pickup-zone radius check in
// confirm-pricing/index.ts and process-order/index.ts. This copy exists
// ONLY to give the customer instant feedback in the UI — flagging that a
// typed address or a live-location fix doesn't match the selected pickup
// zone — before they ever reach a priced quote or the Pay button. It must
// never be treated as enforcement: the server independently re-derives
// and rejects this regardless of what this returns, so a bypass (disabled
// JS, a modified bundle, a direct API call) still can't get a mismatched
// pickup through to a charge. Keep PICKUP_ZONE_RADIUS_KM in sync with the
// server's constant of the same name.
export const SERVICEABLE_PICKUP_CENTROIDS = {
  Ikeja: { lat: 6.6018, lng: 3.3515 },
  Maryland: { lat: 6.5723, lng: 3.366 },
  Ojodu: { lat: 6.6398, lng: 3.3767 },
  Berger: { lat: 6.628, lng: 3.3729 },
  Agege: { lat: 6.6153, lng: 3.3238 },
  Ogba: { lat: 6.628, lng: 3.341 },
  "Ifako-Ijaye": { lat: 6.6667, lng: 3.323 },
  Yaba: { lat: 6.5095, lng: 3.3711 },
  Bariga: { lat: 6.5309, lng: 3.3898 },
  Gbagada: { lat: 6.548, lng: 3.389 },
  Shomolu: { lat: 6.5388, lng: 3.376 },
};

const PICKUP_ZONE_RADIUS_KM = 4;

function haversineDistanceKm(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null)
    return null;
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * True when (lat, lng) is close enough to the given pickup zone's centroid
 * to be considered "actually in that zone" — or when lat/lng aren't set
 * yet (nothing to contradict). False for an unknown zone name or a
 * coordinate too far from the claimed zone. UI feedback only.
 */
export function isWithinServiceablePickupZone(zone, lat, lng) {
  if (lat == null || lng == null) return true;
  const centroid = SERVICEABLE_PICKUP_CENTROIDS[zone];
  if (!centroid) return false;
  const km = haversineDistanceKm(centroid, { lat, lng });
  return km != null && km <= PICKUP_ZONE_RADIUS_KM;
}

/**
 * Calls the quote-order edge function and returns either
 * { quote: {...} } or { error, code }.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {Record<string, unknown>} order  same shape as buildOrderPayload()
 */
export async function fetchFareQuote(supabase, order) {
  const { data, error } = await supabase.functions.invoke("confirm-pricing", {
    body: { order },
  });

  if (error) {
    return {
      error: error.message || "Could not get a price quote.",
      code: "QUOTE_FAILED",
    };
  }
  if (data?.error) {
    return { error: data.error, code: data.code || "QUOTE_FAILED" };
  }
  return { quote: data.quote };
}

export function isFareError(result) {
  return Boolean(result && "error" in result);
}
