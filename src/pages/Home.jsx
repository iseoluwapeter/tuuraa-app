import React, { useState } from "react";
import {
  FiMenu,
  FiBell,
  FiPlus,
  FiUserPlus,
  FiSearch,
  FiFileText,
  FiTag,
  FiLoader,
  FiX,
} from "react-icons/fi";

import { useAccountStore } from "../store/UseAccountStore";
import { supabase } from "../components/supabaseClient";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const STATUS_STYLES = {
  Delivered: "bg-emerald-50 text-emerald-600",
  completed: "bg-emerald-50 text-emerald-600",
  delivered: "bg-emerald-50 text-emerald-600",
  "In transit": "bg-amber-50 text-amber-600",
  out_for_delivery: "bg-amber-50 text-amber-600",
  rider_assigned: "bg-amber-50 text-amber-600",
  Pending: "bg-gray-100 text-gray-500",
  pending: "bg-gray-100 text-gray-500",
};

const statusLabel = (status) => {
  if (!status) return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Keep these two lists in sync with SERVICEABLE_PICKUP_ZONES /
// LAGOS_DROPOFF_CENTROIDS in supabase/functions/confirm-pricing/index.ts —
// duplicated here for the same "no shared module" reason as that file.
const PICKUP_ZONES = [
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

const DROPOFF_ZONES = [
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

const buildActions = ({
  isPendingReview,
  billingPreference,
  accountStatus,
  onGetQuote,
}) => {
  const actions = [
    {
      key: "new-manifest",
      label: "New manifest",
      link: "/new-manifest",
      sub: isPendingReview ? "Opens once active" : "Create a dispatch",
      icon: FiPlus,
      disabled: isPendingReview,
    },
    {
      key: "track-order",
      link: "/new-manifest",
      label: "Track order",
      sub: "Find a drop",
      icon: FiSearch,
      disabled: false,
    },
    {
      key: "get-quote",
      label: "Get quote",
      sub: "Estimate a price",
      icon: FiTag,
      disabled: false,
      onClick: onGetQuote,
    },
  ];

  if (billingPreference === "recurring" && accountStatus === "active") {
    actions.push({
      key: "invoices",
      label: "Invoices",
      link: "/invoices",
      sub: "View & send",
      icon: FiFileText,
      disabled: false,
    });
  }

  return actions;
};

const todayLabel = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/* ---------------------------------------------------------
   Orders query — one place both the count and the recent
   list are fetched from, so React Query caches a single
   result per client and can dedupe/share it across mounts.
--------------------------------------------------------- */

const ORDERS_STALE_TIME = 5 * 60 * 1000; // 5 min — tune to taste

const fetchOrdersSummary = async (businessName) => {
  // NOTE: `orders` has no `client_id` FK — filtering by `business_name`
  // as the closest available match to `client.business_name`. This is
  // fragile (two clients could share a name, or a client could rename
  // their business) — ideally add a `client_id uuid references clients(id)`
  // column to `orders` and filter on that instead.
  const countPromise = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_name", businessName);

  const recentPromise = supabase
    .from("orders")
    .select(
      "id, ref_number, status, pickup_zone, dropoff_zone, pickup_address, dropoff_address, quantity, created_at",
    )
    .eq("business_name", businessName)
    .order("created_at", { ascending: false })
    .limit(3);

  const [{ count, error: countError }, { data: recent, error: recentError }] =
    await Promise.all([countPromise, recentPromise]);

  if (countError) throw countError;
  if (recentError) throw recentError;

  return {
    totalOrders: count ?? 0,
    recentOrders: (recent ?? []).map((o) => ({
      id: o.id,
      code: o.ref_number,
      detail: `${o.quantity ?? 1} item${o.quantity === 1 ? "" : "s"} · ${
        o.dropoff_zone || o.dropoff_address || o.pickup_zone || ""
      }`,
      status: statusLabel(o.status),
    })),
  };
};

/* ---------------------------------------------------------
   Get quote modal
--------------------------------------------------------- */

const GetQuoteModal = ({ onClose }) => {
  const [pickupZone, setPickupZone] = useState("");
  const [dropoffZone, setDropoffZone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [weightKg, setWeightKg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setQuote(null);

    if (!pickupZone || !dropoffZone) {
      setError("Please select a pickup and dropoff zone.");
      return;
    }

    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "confirm-pricing",
      {
        body: {
          order: {
            pickup_zone: pickupZone,
            dropoff_zone: dropoffZone,
            quantity: Number(quantity) || 1,
            weight_kg: Number(weightKg) || 0,
          },
        },
      },
    );

    if (fnError) {
      let message = "Could not get a quote. Please try again.";
      try {
        const body = await fnError.context.json();
        if (body?.error) message = body.error;
      } catch {
        // fall back to the generic message above
      }
      setError(message);
    } else {
      setQuote(data.quote);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Get a quote</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <FiX size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 text-red-600 text-sm px-3.5 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Pickup zone
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              value={pickupZone}
              onChange={(e) => setPickupZone(e.target.value)}
            >
              <option value="">Select pickup zone</option>
              {PICKUP_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Dropoff zone
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              value={dropoffZone}
              onChange={(e) => setDropoffZone(e.target.value)}
            >
              <option value="">Select dropoff zone</option>
              {DROPOFF_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Weight (kg)
              </label>
              <input
                type="number"
                min={0}
                step="0.1"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="0.0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white disabled:opacity-50 active:bg-emerald-700"
          >
            {loading && <FiLoader className="animate-spin" size={16} />}
            Get quote
          </button>
        </form>

        {quote && (
          <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-xs text-emerald-700">Estimated total</p>
            <p className="text-2xl font-bold text-emerald-700">
              ₦{quote.total.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700/70 mt-1">
              {quote.distanceKm} km ·{" "}
              {quote.distanceSource === "gps"
                ? "GPS estimate"
                : "zone estimate"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------
   Home
--------------------------------------------------------- */

const Home = () => {
  const { client, status } = useAccountStore();
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const isPendingReview = client?.account_status === "pending_activation";
  const billingPreference = client?.billing_preference ?? null;
  const accountStatus = client?.account_status ?? null;

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders-summary", client?.business_name],
    queryFn: () => fetchOrdersSummary(client.business_name),
    enabled: !!client?.business_name,
    staleTime: ORDERS_STALE_TIME, // cached result is reused on remount —
    gcTime: 30 * 60 * 1000, // no refetch/loading flash on every visit
    refetchOnWindowFocus: false,
  });

  const totalOrders = ordersData?.totalOrders ?? 0;
  const recentOrders = ordersData?.recentOrders ?? [];

  const actions = buildActions({
    isPendingReview,
    billingPreference,
    accountStatus,
    onGetQuote: () => setShowQuoteModal(true),
  });

  // NOTE: `clients` currently only stores business_name, not a separate
  // personal/contact name — so the greeting uses the business name. If you
  // want a true "Hello, Blessing" first-name greeting distinct from the
  // business name, that needs a `contact_name` column added to `clients`.
  const displayName =
    status === "loading" ? null : (client?.business_name ?? "there");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 space-y-6">
        {/* greeting */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {displayName === null ? (
              <span className="inline-block h-6 w-32 animate-pulse rounded bg-gray-200 align-middle" />
            ) : (
              `Hello, ${displayName}`
            )}
          </h1>
          <p className="text-sm text-gray-500">{todayLabel()}</p>
        </div>

        {/* total orders */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total orders</p>
          {ordersLoading ? (
            <span className="inline-block h-8 w-16 mt-1 animate-pulse rounded bg-gray-200" />
          ) : (
            <span className="text-3xl font-bold text-gray-900">
              {totalOrders}
            </span>
          )}
        </div>

        {isPendingReview && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <p className="font-poppins text-xs text-amber-800">
              We're reviewing your account — booking opens once we've matched
              your volume to a rider pool.
            </p>
          </div>
        )}

        {/* quick actions */}
        <div>
          <h2 className="text-sm font-medium text-gray-900 mb-2">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(
              ({ key, label, link, sub, icon: Icon, disabled, onClick }) => {
                const content = (
                  <div className="flex flex-col space-y-1">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        disabled
                          ? "bg-gray-200 text-gray-400"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        disabled ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-xs text-gray-500">{sub}</span>
                  </div>
                );

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    aria-disabled={disabled}
                    onClick={!link ? onClick : undefined}
                    title={
                      disabled
                        ? "Available once your account is active"
                        : undefined
                    }
                    className={`rounded-2xl p-4 flex flex-col items-start gap-2 text-left transition
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                             disabled
                               ? "bg-gray-100 cursor-not-allowed"
                               : "bg-emerald-50 active:scale-95"
                           }`}
                  >
                    {link ? <Link to={link}>{content}</Link> : content}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* history */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-900">Recent orders</h2>
            <Link
              to="/deliveries"
              className="text-emerald-600 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            >
              See all
            </Link>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                <FiLoader className="animate-spin" size={16} />
                <span className="text-xs">Loading orders…</span>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No orders yet.
              </div>
            ) : (
              recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {o.code}
                    </p>
                    <p className="text-xs text-gray-500">{o.detail}</p>
                  </div>
                  <span
                    className={
                      "text-xs font-medium px-2 py-1 rounded-full " +
                      (STATUS_STYLES[o.status] || "bg-gray-100 text-gray-500")
                    }
                  >
                    {o.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showQuoteModal && (
        <GetQuoteModal onClose={() => setShowQuoteModal(false)} />
      )}
    </div>
  );
};

export default Home;
