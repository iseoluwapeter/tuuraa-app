// supabase/functions/_shared/pricingEngine.ts
//
// Single source of truth for fare computation. confirm-pricing/index.ts
// can keep its own standalone copy (it's read-only, low risk if it drifts
// slightly), but process-order and the Paystack webhook MUST use this
// same module — anything that writes an order has to agree on price.

export const SERVICEABLE_PICKUP_ZONES: Record<
  string,
  { lat: number; lng: number }
> = {
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
  Akute: { lat: 6.66, lng: 3.3292 },
  Ajuwon: { lat: 6.674, lng: 3.3466 },
  "Iju-Ishaga": { lat: 6.6366, lng: 3.3238 },
};

export const LAGOS_DROPOFF_CENTROIDS: Record<
  string,
  { lat: number; lng: number }
> = {
  ...SERVICEABLE_PICKUP_ZONES,
  "Lekki Phase 1": { lat: 6.4432, lng: 3.4726 },
  "Chevron / Lekki": { lat: 6.4408, lng: 3.5391 },
  "Osapa London": { lat: 6.4467, lng: 3.5137 },
  Agungi: { lat: 6.4436, lng: 3.5254 },
  "Ikate / Elegushi": { lat: 6.4438, lng: 3.4926 },
  Jakande: { lat: 6.4675, lng: 3.5487 },
  "Igbo-Efon": { lat: 6.4477, lng: 3.501 },
  Ajah: { lat: 6.4698, lng: 3.5852 },
  Sangotedo: { lat: 6.467, lng: 3.626 },
  "Victoria Island": { lat: 6.4281, lng: 3.4219 },
  Ikoyi: { lat: 6.4541, lng: 3.4316 },
  Surulere: { lat: 6.5059, lng: 3.3554 },
  Apapa: { lat: 6.4488, lng: 3.3593 },
  Ikorodu: { lat: 6.6194, lng: 3.5105 },
  Festac: { lat: 6.467, lng: 3.2836 },
  Alimosho: { lat: 6.6083, lng: 3.268 },
  Badagry: { lat: 6.4155, lng: 2.8876 },
  Epe: { lat: 6.5837, lng: 3.985 },
};

export const PICKUP_ZONE_RADIUS_KM = 4;

export const PRICING_CONFIG = {
  baseFee: 2000,
  distanceBandsKm: [
    { upTo: 5, perKm: 150 },
    { upTo: 15, perKm: 120 },
    { upTo: Infinity, perKm: 90 },
  ],
  freeDistanceKm: 2,
  freeWeightKg: 2,
  weightBandsKg: [
    { upTo: 5, perKg: 200 },
    { upTo: 15, perKg: 150 },
    { upTo: Infinity, perKg: 120 },
  ],
  quadrantSupplement: 1000,
  insuranceRate: 0.01,
  insuranceCapNaira: 5000,
  rushSurcharge: 1000,
  additionalItemFee: 300,
  serviceFeeRate: 0.05,
  roundToNaira: 50,
  minimumFare: 2800,
};

function normalizeZoneName(zone: unknown): string {
  return typeof zone === "string" ? zone.trim() : "";
}

function isServiceablePickupZone(zone: unknown): boolean {
  const name = normalizeZoneName(zone);
  return Object.keys(SERVICEABLE_PICKUP_ZONES).some(
    (z) => z.toLowerCase() === name.toLowerCase(),
  );
}

function lookupCentroid(
  table: Record<string, { lat: number; lng: number }>,
  zone: unknown,
): { lat: number; lng: number } | null {
  const name = normalizeZoneName(zone);
  const key = Object.keys(table).find(
    (z) => z.toLowerCase() === name.toLowerCase(),
  );
  return key ? table[key] : null;
}

function quadrantOf(zone: unknown): string {
  const name = normalizeZoneName(zone);
  if (SERVICEABLE_PICKUP_ZONES[name]) return "mainland-north";
  if (
    [
      "Lekki Phase 1",
      "Chevron / Lekki",
      "Osapa London",
      "Agungi",
      "Ikate / Elegushi",
    ].includes(name)
  )
    return "lekki-core";
  if (["Jakande", "Igbo-Efon", "Ajah", "Sangotedo"].includes(name))
    return "lekki-outer";
  if (["Victoria Island", "Ikoyi"].includes(name)) return "island";
  if (["Surulere", "Apapa"].includes(name)) return "mainland-central";
  if (["Ikorodu", "Alimosho", "Festac", "Badagry", "Epe"].includes(name))
    return "mainland-outer";
  return "unknown";
}

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(
  a: { lat: number; lng: number } | null | undefined,
  b: { lat: number; lng: number } | null | undefined,
): number | null {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null)
    return null;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isPickupCoordWithinClaimedZone(
  pickupZone: unknown,
  coords: { lat: number; lng: number } | null,
): boolean {
  if (!coords) return true;
  const centroid = lookupCentroid(SERVICEABLE_PICKUP_ZONES, pickupZone);
  if (!centroid) return false;
  const driftKm = haversineDistanceKm(centroid, coords);
  return driftKm != null && driftKm <= PICKUP_ZONE_RADIUS_KM;
}

type DistanceResult = { km: number; source: "gps" | "zone-table" };

function resolveDistanceKm(
  order: Record<string, unknown>,
): DistanceResult | null {
  const pickupCoords =
    order.pickup_lat != null && order.pickup_lng != null
      ? { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }
      : null;
  const dropoffCoords =
    order.dropoff_lat != null && order.dropoff_lng != null
      ? { lat: Number(order.dropoff_lat), lng: Number(order.dropoff_lng) }
      : null;

  const gpsKm = haversineDistanceKm(pickupCoords, dropoffCoords);
  if (gpsKm != null) return { km: gpsKm, source: "gps" };

  const pickupCentroid =
    lookupCentroid(SERVICEABLE_PICKUP_ZONES, order.pickup_zone) ?? pickupCoords;
  const dropoffCentroid =
    lookupCentroid(LAGOS_DROPOFF_CENTROIDS, order.dropoff_zone) ??
    dropoffCoords;
  const zoneKm = haversineDistanceKm(pickupCentroid, dropoffCentroid);
  if (zoneKm != null) return { km: zoneKm, source: "zone-table" };

  return null;
}

function bandedFee(
  billableUnits: number,
  bands: { upTo: number; perKm?: number; perKg?: number }[],
): number {
  let remaining = Math.max(0, billableUnits);
  let lower = 0;
  let fee = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.upTo - lower;
    const unitsInBand = Math.min(remaining, bandWidth);
    fee += unitsInBand * (band.perKm ?? band.perKg ?? 0);
    remaining -= unitsInBand;
    lower = band.upTo;
  }
  return fee;
}

function calcDistanceFee(km: number, cfg = PRICING_CONFIG): number {
  return Math.round(
    bandedFee(Math.max(0, km - cfg.freeDistanceKm), cfg.distanceBandsKm),
  );
}

function calcWeightFee(weightKg: number, cfg = PRICING_CONFIG): number {
  return Math.round(
    bandedFee(Math.max(0, weightKg - cfg.freeWeightKg), cfg.weightBandsKg),
  );
}

function calcQuadrantSupplement(
  pickupZone: unknown,
  dropoffZone: unknown,
  cfg = PRICING_CONFIG,
): number {
  const p = quadrantOf(pickupZone);
  const d = quadrantOf(dropoffZone);
  if (p === "unknown" || d === "unknown" || p === d) return 0;
  return cfg.quadrantSupplement;
}

function calcInsuranceFee(declaredValue: number, cfg = PRICING_CONFIG): number {
  return Math.min(
    Math.round(Math.max(0, declaredValue || 0) * cfg.insuranceRate),
    cfg.insuranceCapNaira,
  );
}

function calcQuantityFee(quantity: number, cfg = PRICING_CONFIG): number {
  return (Math.max(1, quantity || 1) - 1) * cfg.additionalItemFee;
}

function calcRushFee(pickupDateStr: unknown, cfg = PRICING_CONFIG): number {
  if (typeof pickupDateStr !== "string" || !pickupDateStr) return 0;
  const today = new Date();
  const pickup = new Date(pickupDateStr);
  const sameDay =
    today.getFullYear() === pickup.getFullYear() &&
    today.getMonth() === pickup.getMonth() &&
    today.getDate() === pickup.getDate();
  return sameDay ? cfg.rushSurcharge : 0;
}

function roundUpToNearest(amount: number, increment: number): number {
  return Math.ceil(amount / increment) * increment;
}

export type FareResult = {
  breakdown: {
    baseFee: number;
    weightFee: number;
    distanceFee: number;
    quadrantSupplement: number;
    insuranceFee: number;
    quantityFee: number;
    rushFee: number;
    serviceFee: number;
    roundingAdjustment: number;
  };
  distanceKm: number;
  distanceSource: "gps" | "zone-table";
  subtotal: number;
  total: number;
};

export type FareError = {
  code:
    | "UNSERVICEABLE_PICKUP_ZONE"
    | "PICKUP_LOCATION_OUTSIDE_ZONE"
    | "COULD_NOT_DETERMINE_DISTANCE";
  message: string;
};

export function computeFare(
  order: Record<string, unknown>,
  cfg = PRICING_CONFIG,
): FareResult | FareError {
  if (!isServiceablePickupZone(order.pickup_zone)) {
    return {
      code: "UNSERVICEABLE_PICKUP_ZONE",
      message:
        `Pickup from "${normalizeZoneName(order.pickup_zone) || "that area"}" isn't available yet. ` +
        `Tuuraa currently picks up from ${Object.keys(SERVICEABLE_PICKUP_ZONES).join(", ")}.`,
    };
  }

  const pickupCoords =
    order.pickup_lat != null && order.pickup_lng != null
      ? { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }
      : null;

  if (!isPickupCoordWithinClaimedZone(order.pickup_zone, pickupCoords)) {
    return {
      code: "PICKUP_LOCATION_OUTSIDE_ZONE",
      message:
        `The pickup address doesn't match "${normalizeZoneName(order.pickup_zone)}". ` +
        `Please provide a pickup address within that zone, or choose the zone your pickup point is actually in.`,
    };
  }

  const distance = resolveDistanceKm(order);
  if (!distance) {
    return {
      code: "COULD_NOT_DETERMINE_DISTANCE",
      message:
        "Couldn't determine the delivery distance. Please pin the dropoff location on the map or confirm the pickup address.",
    };
  }

  const weightKg = Number(order.weight_kg) || 0;
  const declaredValue = Number(order.goods_value) || 0;
  const quantity = Number(order.quantity) || 1;

  const baseFee = cfg.baseFee;
  const weightFee = calcWeightFee(weightKg, cfg);
  const distanceFee = calcDistanceFee(distance.km, cfg);
  const quadrantSupplement = calcQuadrantSupplement(
    order.pickup_zone,
    order.dropoff_zone,
    cfg,
  );
  const insuranceFee = calcInsuranceFee(declaredValue, cfg);
  const quantityFee = calcQuantityFee(quantity, cfg);
  const rushFee = calcRushFee(order.pickup_date, cfg);

  const preServiceSubtotal =
    baseFee +
    weightFee +
    distanceFee +
    quadrantSupplement +
    insuranceFee +
    quantityFee +
    rushFee;
  const serviceFee = Math.round(preServiceSubtotal * cfg.serviceFeeRate);
  const subtotal = preServiceSubtotal + serviceFee;

  const flooredTotal = Math.max(subtotal, cfg.minimumFare);
  const total = roundUpToNearest(flooredTotal, cfg.roundToNaira);
  const roundingAdjustment = total - subtotal;

  return {
    breakdown: {
      baseFee,
      weightFee,
      distanceFee,
      quadrantSupplement,
      insuranceFee,
      quantityFee,
      rushFee,
      serviceFee,
      roundingAdjustment,
    },
    distanceKm: Math.round(distance.km * 10) / 10,
    distanceSource: distance.source,
    subtotal,
    total,
  };
}

export function isFareError(
  result: FareResult | FareError,
): result is FareError {
  return "code" in result;
}
