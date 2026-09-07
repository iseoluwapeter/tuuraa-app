// Thin wrapper around the Mapbox Geocoding API v5.
// Requires VITE_MAPBOX_TOKEN to be set in .env (already added).
//
// Three functions, three jobs:
//  - searchAddress   -> autocomplete suggestions as the user types
//  - forwardGeocode  -> resolve a single freeform address string to lat/lng
//  - reverseGeocode  -> resolve lat/lng (from GPS) to a real address

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const GEOCODE_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

// Default bias toward Lagos so "Admiralty Way" doesn't resolve to a
// same-named street in another country. Callers can override this per
// call (e.g. NewManifest.jsx biases pickup search toward the selected
// pickup zone's centroid instead of the citywide default) by passing
// { proximity: { lat, lng } } as the second argument.
const LAGOS_PROXIMITY = "3.4216,6.4474";

function assertToken() {
  if (!MAPBOX_TOKEN) {
    throw new Error(
      "Mapbox is not configured — VITE_MAPBOX_TOKEN is missing from the environment.",
    );
  }
}

function proximityParam(options) {
  const p = options?.proximity;
  if (p?.lat == null || p?.lng == null) return LAGOS_PROXIMITY;
  return `${p.lng},${p.lat}`;
}

/**
 * Autocomplete suggestions for an in-progress address query.
 * Returns [] on empty/short queries or on any request failure —
 * callers treat "no suggestions" as a normal, non-fatal state.
 *
 * @param {string} query
 * @param {{ proximity?: { lat: number, lng: number } }} [options]
 *   Optional bias point — e.g. the selected pickup zone's centroid —
 *   used instead of the citywide LAGOS_PROXIMITY default.
 */
export async function searchAddress(query, options) {
  if (!query || query.trim().length < 3) return [];
  assertToken();

  const url =
    `${GEOCODE_BASE}/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=NG&limit=5&proximity=${proximityParam(options)}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.features || []).map((f) => ({
    id: f.id,
    placeName: f.place_name,
    lat: f.center[1],
    lng: f.center[0],
  }));
}

/**
 * Resolve a single freeform address string to coordinates — used as a
 * fallback when the user types a full address and tabs away without
 * picking a suggestion from the dropdown.
 *
 * @param {string} query
 * @param {{ proximity?: { lat: number, lng: number } }} [options]
 */
export async function forwardGeocode(query, options) {
  if (!query || query.trim().length < 3) return null;
  assertToken();

  const url =
    `${GEOCODE_BASE}/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=NG&limit=1&proximity=${proximityParam(options)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Mapbox forward geocoding request failed.");

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const [lng, lat] = feature.center;
  return { lat, lng, placeName: feature.place_name };
}

/**
 * Resolve coordinates (from browser geolocation) to a real,
 * human-readable address.
 */
export async function reverseGeocode(lat, lng) {
  assertToken();

  const url =
    `${GEOCODE_BASE}/${lng},${lat}.json` +
    `?access_token=${MAPBOX_TOKEN}&country=NG&limit=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Mapbox reverse geocoding request failed.");

  const data = await res.json();
  const feature = data.features?.[0];
  return feature ? feature.place_name : null;
}
