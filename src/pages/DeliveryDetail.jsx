// src/pages/DeliveryDetail.jsx
import React, { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiUser,
  FiCalendar,
  FiAlertCircle,
  FiCreditCard,
} from "react-icons/fi";
// Adjust this import to wherever your Supabase client is initialised.
import { supabase } from "../components/supabaseClient";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
  },
  "rider assigned": {
    label: "Rider Assigned",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "out for delivery": {
    label: "Out for Delivery",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Delivered",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatAmount(value) {
  if (value === null || value === undefined) return "—";
  return currencyFormatter.format(value);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-[14px] text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100/60">
      <h2 className="text-[13px] font-semibold text-slate-500">{title}</h2>
      <div className="mt-1 divide-y divide-slate-50">{children}</div>
    </div>
  );
}

async function fetchOrder(id) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, payments(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

const DeliveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => fetchOrder(id),
    // If the user tapped in from the list, setQueryData already seeded
    // this key with the list-row shape (which lacks full payments detail).
    // placeholderData shows that immediately, then this query's own fetch
    // (with the full `payments(*)` select) silently replaces it — no
    // blank screen on navigation, no stale data left showing for long.
    placeholderData: (previousData) => previousData,
  });

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const statusConfig =
    order && (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending);

  const payment =
    order?.payments?.find((p) => p.status === "paid") ||
    order?.payments?.[order?.payments?.length - 1];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back to deliveries"
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
        >
          <FiArrowLeft size={19} />
        </button>
        <h1 className="text-[17px] font-semibold text-slate-900">
          {order?.ref_number || "Delivery"}
        </h1>
      </header>

      <main className="flex-1 px-4 py-4">
        {error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FiAlertCircle size={26} className="text-red-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Couldn&apos;t load this delivery
            </p>
            <p className="mt-1 max-w-[230px] text-[13px] text-slate-400">
              {error.message}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-medium text-white"
            >
              Try again
            </button>
          </div>
        ) : isLoading && !order ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </div>
        ) : order ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100/60">
              <div>
                <p className="text-[12px] text-slate-400">Status</p>
                <span
                  className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${statusConfig.tone}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-slate-400">Amount</p>
                <p className="mt-1 text-[15px] font-semibold text-slate-800">
                  {formatAmount(payment?.amount ?? order.amount)}
                </p>
              </div>
            </div>

            <Section title="Pickup">
              <DetailRow
                icon={FiMapPin}
                label="Address"
                value={order.pickup_address}
              />
              <DetailRow
                icon={FiPhone}
                label="Contact phone"
                value={order.pickup_contact_phone}
              />
              <DetailRow
                icon={FiCalendar}
                label="Pickup date"
                value={order.pickup_date}
              />
            </Section>

            <Section title="Dropoff">
              <DetailRow
                icon={FiMapPin}
                label="Address"
                value={order.dropoff_address}
              />
              <DetailRow
                icon={FiUser}
                label="Recipient"
                value={order.dropoff_contact_name}
              />
              <DetailRow
                icon={FiPhone}
                label="Contact phone"
                value={order.dropoff_contact_phone}
              />
            </Section>

            <Section title="Goods">
              <DetailRow
                icon={FiPackage}
                label="Type"
                value={order.goods_type}
              />
              <DetailRow
                icon={FiPackage}
                label="Quantity"
                value={order.quantity}
              />
              <DetailRow
                icon={FiPackage}
                label="Weight"
                value={order.weight_kg ? `${order.weight_kg} kg` : null}
              />
              <DetailRow
                icon={FiAlertCircle}
                label="Notes"
                value={order.special_instructions}
              />
            </Section>

            <Section title="Payment">
              <DetailRow
                icon={FiCreditCard}
                label="Status"
                value={payment?.status}
              />
              <DetailRow
                icon={FiCreditCard}
                label="Channel"
                value={payment?.channel}
              />
              <DetailRow
                icon={FiCalendar}
                label="Paid at"
                value={formatDateTime(payment?.paid_at)}
              />
            </Section>

            <Section title="Booked">
              <DetailRow
                icon={FiCalendar}
                label="Created"
                value={formatDateTime(order.created_at)}
              />
            </Section>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default DeliveryDetail;
