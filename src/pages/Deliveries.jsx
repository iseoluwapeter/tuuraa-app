import React, { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiSearch,
  FiX,
  FiMapPin,
  FiPackage,
  FiCalendar,
  FiChevronRight,
  FiInbox,
  FiAlertCircle,
  FiRefreshCw,
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

const TABS = [
  { key: "all", label: "All", match: () => true },
  {
    key: "active",
    label: "Active",
    match: (o) =>
      o.status === "pending" ||
      o.status === "rider assigned" ||
      o.status === "out for delivery",
  },
  {
    key: "completed",
    label: "Completed",
    match: (o) => o.status === "completed",
  },
];

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatAmount(value) {
  if (value === null || value === undefined) return null;
  return currencyFormatter.format(value);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(date);
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="h-3.5 w-24 rounded bg-slate-100" />
        <div className="h-5 w-16 rounded-full bg-slate-100" />
      </div>
      <div className="mt-3 h-3.5 w-40 rounded bg-slate-100" />
      <div className="mt-4 flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-slate-100" />
        <div className="h-3 w-14 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function EmptyState({ tabKey, searchTerm }) {
  if (searchTerm) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <FiSearch size={26} className="text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          No matches for &ldquo;{searchTerm}&rdquo;
        </p>
        <p className="mt-1 max-w-57.5 text-[13px] text-slate-400">
          Try searching by reference number, address, or item.
        </p>
      </div>
    );
  }

  const copy = {
    all: {
      title: "No deliveries yet",
      body: "Every booking you make will show up here.",
    },
    active: {
      title: "Nothing in progress",
      body: "Orders that are pending, assigned, or out for delivery will appear here.",
    },
    completed: {
      title: "No completed deliveries",
      body: "Once an order is delivered, it lands here.",
    },
  }[tabKey];

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <FiInbox size={26} className="text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-600">{copy.title}</p>
      <p className="mt-1 max-w-[230px] text-[13px] text-slate-400">
        {copy.body}
      </p>
    </div>
  );
}

function OrderCard({ order, onClick }) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const amount = formatAmount(order.amount);

  return (
    <button
      type="button"
      onClick={() => onClick(order)}
      className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm shadow-slate-100/60 transition active:scale-[0.99] active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {order.status === "pending" && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          )}
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {order.ref_number}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusConfig.tone}`}
        >
          {statusConfig.label}
        </span>
      </div>

      <div className="mt-2 flex items-start gap-1.5 text-slate-500">
        <FiMapPin size={13} className="mt-0.5 shrink-0" />
        <p className="truncate text-[13px]">{order.dropoff_address}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 text-[12px] text-slate-500">
          <span className="flex items-center gap-1 truncate">
            <FiPackage size={13} className="shrink-0" />
            <span className="truncate">{order.goods_type}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <FiCalendar size={13} />
            {formatDate(order.pickup_date || order.created_at)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {amount && (
            <span className="text-[13px] font-semibold text-slate-700">
              {amount}
            </span>
          )}
          <FiChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </button>
  );
}

// Extracted so DeliveryDetail can reuse the exact same fetch shape and
// query key convention when seeding its own cache from this list.
async function fetchOrders() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("orders")
    .select("*, payments(amount, status, created_at)")
    .order("created_at", { ascending: false });

  if (user?.email) {
    query = query.eq("contact_email", user.email);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((order) => {
    const payments = order.payments || [];
    const paid = payments.find((p) => p.status === "paid");
    const latest = payments[payments.length - 1];
    return { ...order, amount: (paid || latest)?.amount ?? null };
  });
}

const Deliveries = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: orders = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", "list"],
    queryFn: fetchOrders,
  });

  const tabCounts = useMemo(() => {
    return TABS.reduce((acc, tab) => {
      acc[tab.key] = orders.filter(tab.match).length;
      return acc;
    }, {});
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const activeTabConfig = TABS.find((t) => t.key === activeTab) || TABS[0];
    const byTab = orders.filter(activeTabConfig.match);

    const term = searchTerm.trim().toLowerCase();
    if (!term) return byTab;

    return byTab.filter((order) => {
      return (
        order.ref_number?.toLowerCase().includes(term) ||
        order.dropoff_address?.toLowerCase().includes(term) ||
        order.dropoff_contact_name?.toLowerCase().includes(term) ||
        order.goods_type?.toLowerCase().includes(term)
      );
    });
  }, [orders, activeTab, searchTerm]);

  const handleOrderClick = useCallback(
    (order) => {
      // Seed the detail query's cache with what we already have, so the
      // detail page can render instantly instead of waiting on its own
      // fetch — it'll still revalidate in the background per its own
      // staleTime.
      queryClient.setQueryData(["orders", "detail", order.id], order);
      navigate(`/deliveries/${order.id}`);
    },
    [navigate, queryClient],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-slate-900">
            Deliveries
          </h1>
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Refresh deliveries"
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiRefreshCw
              size={17}
              className={isFetching ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="relative mt-3">
          <FiSearch
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, address, item..."
            className="w-full rounded-xl bg-slate-100 py-2.5 pl-10 pr-9 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                  isActive
                    ? "bg-emerald-700 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 text-[11px] ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white text-slate-400"
                  }`}
                >
                  {tabCounts[tab.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {error ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FiAlertCircle size={26} className="text-red-400" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Couldn&apos;t load your deliveries
            </p>
            <p className="mt-1 max-w-[230px] text-[13px] text-slate-400">
              {error.message}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-medium text-white"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : visibleOrders.length === 0 ? (
          <EmptyState tabKey={activeTab} searchTerm={searchTerm.trim()} />
        ) : (
          <div className="flex flex-col gap-3">
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={handleOrderClick}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Deliveries;
