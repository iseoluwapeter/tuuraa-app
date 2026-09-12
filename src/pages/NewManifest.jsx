import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiUsers,
  FiPhone,
  FiMapPin,
  FiPackage,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiCreditCard,
  FiMinus,
  FiPlus,
  FiTruck,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";
import { TbWeight, TbCurrencyNaira } from "react-icons/tb";
import { SectionTitle } from "../components/ManifestComponents";
import { Select } from "../components/ManifestComponents";
import { LocationPicker } from "../components/ManifestComponents";
import { TextInput } from "../components/ManifestComponents";
import { inputCls } from "../components/ManifestComponents";

// Adjust these import paths to match where this file lives in your project.
import { supabase } from "../components/supabaseClient";
import { useAccountStore } from "../store/UseAccountStore";
import { reverseGeocode } from "../components/MapboxController";

// Server-confirmed pricing wrapper — no pricing formulas live in the
// client anymore. Every number shown to the customer, and every amount
// handed to the Paystack popup, comes from the confirm-pricing edge
// function. PICKUP_ZONES is the mainland-north whitelist (rider coverage
// only); DROPOFF_ZONES is open (anywhere in Lagos), used just for the
// dropdown's convenience list. isWithinServiceablePickupZone and
// SERVICEABLE_PICKUP_CENTROIDS are UI-feedback-only mirrors of the check
// the server enforces authoritatively — see feeModel.js. Adjust this
// import path to match where you place feeModel.js.
import {
  fetchFareQuote,
  isFareError,
  isWithinServiceablePickupZone,
  SERVICEABLE_PICKUP_CENTROIDS,
  PICKUP_ZONES,
  DROPOFF_ZONES,
} from "../components/FeeModel";

// Public test key only — safe to ship client-side. Real verification happens
// server-side in the process-order edge function using the *secret* key,
// which is never exposed to the browser.
const PAYSTACK_PUBLIC_KEY = "pk_test_3b6d13da8d897c1466f39b83fb43e3d921143931";

const STEPS = ["Pickup", "Recipient", "Package", "Review", "Pay"];

function currency(n) {
  return `₦${Number(n || 0).toLocaleString("en-NG")}`;
}

function generateReference() {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `TUURAA-${uuid}`;
}

function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const existing = document.getElementById("paystack-inline-js");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Could not load the Paystack checkout script.")),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "paystack-inline-js";
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not load the Paystack checkout script."));
    document.body.appendChild(script);
  });
}

function Field({ label, children, required }) {
  return (
    <label className="block mb-4">
      <span className="text-[13px] font-medium text-stone-600 mb-1.5 block">
        {label}
        {required && <span className="text-amber-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

export default function NewManifest() {
  const { user, client, status, fetchAccount } = useAccountStore();

  useEffect(() => {
    if (status === "loading") fetchAccount();
  }, [status, fetchAccount]);

  const [step, setStep] = useState(1);
  const [senderType, setSenderType] = useState("me");
  const [pickup, setPickup] = useState({
    date: "",
    name: "",
    phone: "",
    zone: "",
    address: "",
    lat: null,
    lng: null,
  });
  const [recipient, setRecipient] = useState({
    name: "",
    email: "",
    phone: "",
    zone: "",
    address: "",
    lat: null,
    lng: null,
  });
  const [pkg, setPkg] = useState({
    quantity: 1,
    weight: "",
    value: "",
    description: "",
  });
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  // Live, debounced price shown on Step 5. This is a CONVENIENCE preview
  // only — handlePay re-confirms a fresh quote right before opening the
  // Paystack popup, so a stale value sitting here can never become the
  // amount actually charged.
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Generated once per manifest draft and reused across retries — this is
  // the idempotency key the edge function uses to make sure a flaky network,
  // a double tap on Pay, or a duplicated Paystack callback never creates two
  // orders (or charges twice) for the same checkout attempt.
  const [paymentRef] = useState(generateReference);

  // Client-side, non-authoritative check: does the resolved pickup
  // coordinate (from typed address, autocomplete pick, or live location)
  // actually sit within the selected pickup zone? This exists purely to
  // warn the customer immediately and block "Next" on Step 1 — the real
  // enforcement is the identical check inside confirm-pricing/index.ts and
  // process-order/index.ts, which run regardless of what this shows and
  // are what actually protect the quote and the charge.
  const [pickupZoneMismatch, setPickupZoneMismatch] = useState(false);

  useEffect(() => {
    if (!pickup.zone || pickup.lat == null || pickup.lng == null) {
      setPickupZoneMismatch(false);
      return;
    }
    setPickupZoneMismatch(
      !isWithinServiceablePickupZone(pickup.zone, pickup.lat, pickup.lng),
    );
  }, [pickup.zone, pickup.lat, pickup.lng]);

  const accountPhone = client?.phone || "";
  const senderName =
    senderType === "me" ? client?.business_name || "You" : pickup.name;
  const senderPhone = senderType === "me" ? accountPhone : pickup.phone;

  const buildOrderPayload = () => ({
    business_name: client?.business_name || "",
    contact_phone: senderPhone || accountPhone || "",
    contact_email: user?.email || null,
    pickup_address: pickup.address,
    pickup_contact_phone: senderType === "other" ? pickup.phone : null,
    dropoff_address: recipient.address,
    dropoff_contact_name: recipient.name,
    dropoff_contact_phone: recipient.phone,
    dropoff_contact_email: recipient.email || null,
    goods_type: pkg.description,
    goods_value: pkg.value ? parseFloat(pkg.value) : null,
    quantity: pkg.quantity,
    weight_kg: pkg.weight ? parseFloat(pkg.weight) : null,
    pickup_zone: pickup.zone,
    dropoff_zone: recipient.zone,
    pickup_date: pickup.date,
    source: "client_app",
    pickup_lat: pickup.lat,
    pickup_lng: pickup.lng,
    dropoff_lat: recipient.lat,
    dropoff_lng: recipient.lng,
  });

  // Debounced live quote from confirm-pricing — refreshes ~500ms after the
  // customer stops changing zones, weight, value, quantity, or date.
  // Purely for the Step 5 preview; never trusted as the charge amount.
  useEffect(() => {
    const hasEnoughToQuote = pickup.zone && recipient.zone && pkg.weight;
    if (!hasEnoughToQuote) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      const result = await fetchFareQuote(supabase, buildOrderPayload());
      if (isFareError(result)) {
        setQuote(null);
        setQuoteError(result.error);
      } else {
        setQuote(result.quote);
        setQuoteError(null);
      }
      setQuoteLoading(false);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup.zone,
    recipient.zone,
    pickup.lat,
    pickup.lng,
    recipient.lat,
    recipient.lng,
    pkg.weight,
    pkg.value,
    pkg.quantity,
    pickup.date,
  ]);

  const canNext = () => {
    if (step === 1) {
      const senderOk = senderType === "me" || (pickup.name && pickup.phone);
      return (
        pickup.date &&
        senderOk &&
        pickup.zone &&
        pickup.address &&
        !pickupZoneMismatch
      );
    }
    if (step === 2)
      return (
        recipient.name && recipient.phone && recipient.zone && recipient.address
      );
    if (step === 3) return pkg.weight && pkg.description;
    return true;
  };

  const useLiveLocation = (target) => {
    if (!navigator.geolocation) {
      const fallback = "Current location unavailable — enter address manually";
      if (target === "pickup") setPickup((p) => ({ ...p, address: fallback }));
      else setRecipient((r) => ({ ...r, address: fallback }));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let addressLabel = `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;

        try {
          const placeName = await reverseGeocode(latitude, longitude);
          if (placeName) addressLabel = placeName;
        } catch {
          // Mapbox lookup failed — fall back to the raw-coordinates label
          // above. Coordinates are still correct even if the label isn't.
        }

        const update = { address: addressLabel, lat: latitude, lng: longitude };
        if (target === "pickup") setPickup((p) => ({ ...p, ...update }));
        else setRecipient((r) => ({ ...r, ...update }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // Hands everything to the process-order edge function: the order details,
  // the idempotency reference, and the Paystack transaction reference to
  // verify. The edge function re-checks the transaction with Paystack and
  // independently recomputes the price itself before it ever writes a row —
  // nothing here is trusted blindly, even though handlePay already got a
  // fresh confirmation before opening the popup.
  const submitOrder = async (paystackReference) => {
    const { data, error } = await supabase.functions.invoke("process-order", {
      body: {
        reference: paymentRef,
        paystack_reference: paystackReference,
        order: buildOrderPayload(),
      },
    });

    if (error)
      throw new Error(error.message || "Could not complete the order.");
    if (data?.error) throw new Error(data.error);
    return data.order;
  };

  const handlePay = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (!user?.email) {
        throw new Error("An email address is required to pay.");
      }

      // Re-confirm the price right now, even though a debounced quote may
      // already be sitting in state. This closes the gap between "last
      // typed a field" and "hit Pay" — the Paystack popup amount always
      // comes from a confirmation fetched at this exact moment, never from
      // a value that could have gone stale.
      const result = await fetchFareQuote(supabase, buildOrderPayload());
      if (isFareError(result)) {
        throw new Error(result.error);
      }
      const confirmedQuote = result.quote;

      // Collect payment in the Paystack popup — card, bank transfer, USSD or
      // mobile money are all offered as channels inside the same checkout,
      // so "bank transfer" is Paystack's own dynamic-account flow rather
      // than a separate manual path. The popup succeeding is only a signal
      // to check — the edge function is what actually confirms the money
      // moved before anything is saved.
      await loadPaystackScript();

      await new Promise((resolve, reject) => {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: user.email,
          amount: Math.round(confirmedQuote.total * 100),
          currency: "NGN",
          ref: paymentRef,
          channels: ["card", "bank_transfer", "bank", "ussd", "mobile_money"],
          onClose: () => {
            reject(
              new Error("Payment window closed before completing payment."),
            );
          },
          callback: (res) => {
            submitOrder(res.reference)
              .then((order) => {
                setSubmittedOrder(order);
                resolve();
              })
              .catch(reject);
          },
        });
        handler.openIframe();
      });
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-stone-100 flex justify-center">
        <div className="w-full max-w-md bg-stone-50 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <FiCheck className="w-6 h-6 text-emerald-700" />
          </div>
          <h2 className="font-serif text-[22px] text-stone-900 mb-1.5">
            Manifest booked
          </h2>
          <p className="text-[14px] text-stone-500 mb-1">
            Reference{" "}
            <span className="font-mono text-stone-700">
              {submittedOrder.ref_number}
            </span>
          </p>
          <p className="text-[13px] text-stone-500 mt-4">
            Payment confirmed — your manifest has been booked.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&display=swap');
        .font-serif { font-family: 'Fraunces', serif; }
        .font-sans-app { font-family: 'DM Sans', ui-sans-serif, system-ui; }
      `}</style>

      <div
        className="w-full max-w-md bg-stone-50 font-sans-app"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Manifest ticket header */}
        <div className="px-4 pt-5 pb-4 bg-white">
          <div className="rounded-2xl bg-emerald-800 text-emerald-50 px-4 py-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiTruck className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] tracking-widest uppercase text-emerald-200">
                  New manifest
                </span>
              </div>
              <span className="text-[11px] text-emerald-200 truncate max-w-[45%]">
                {client?.business_name ||
                  (status === "loading" ? "Loading…" : "")}
              </span>
            </div>
            <p className="font-serif text-[20px] mt-1.5 leading-tight">
              Book a pickup
            </p>
            <div
              className="absolute -bottom-2 left-0 right-0 h-4"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 8px 0, transparent 7px, #ffffff 7.5px)",
                backgroundSize: "16px 16px",
                backgroundRepeat: "repeat-x",
              }}
            />
          </div>

          {/* Stepper */}
          <div className="flex items-center mt-5 mb-1">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium border-2 transition-colors ${
                        done
                          ? "bg-emerald-700 border-emerald-700 text-white"
                          : active
                            ? "border-emerald-700 text-emerald-700 bg-white"
                            : "border-stone-200 text-stone-400 bg-white"
                      }`}
                    >
                      {done ? <FiCheck className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span
                      className={`text-[10px] ${active ? "text-emerald-800 font-medium" : "text-stone-400"}`}
                    >
                      {label}
                    </span>
                  </div>
                  {n < STEPS.length && (
                    <div
                      className={`flex-1 h-0.5 mb-4 mx-1 ${done ? "bg-emerald-700" : "bg-stone-200"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-5 pb-8">
          {step === 1 && (
            <div>
              <SectionTitle
                icon={FiMapPin}
                title="Pickup details"
                subtitle="Where and when we collect the package"
              />

              <Field label="Pickup date" required>
                <TextInput
                  type="date"
                  value={pickup.date}
                  onChange={(e) =>
                    setPickup({ ...pickup, date: e.target.value })
                  }
                />
              </Field>

              <Field label="Who's sending this?" required>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSenderType("me")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-[14px] font-medium transition ${
                      senderType === "me"
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 text-stone-500"
                    }`}
                  >
                    <FiUser className="w-4 h-4" /> Me
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderType("other")}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-[14px] font-medium transition ${
                      senderType === "other"
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 text-stone-500"
                    }`}
                  >
                    <FiUsers className="w-4 h-4" /> Someone else
                  </button>
                </div>
              </Field>

              {senderType === "me" ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-stone-100 px-3.5 py-3 mb-4 text-[14px] text-stone-600">
                  <FiPhone className="w-4 h-4 text-stone-400" />
                  <span>{accountPhone || "No phone on file"}</span>
                  <span className="ml-auto text-[11px] text-stone-400">
                    Your number
                  </span>
                </div>
              ) : (
                <>
                  <Field label="Sender's name" required>
                    <TextInput
                      placeholder="Full name"
                      value={pickup.name}
                      onChange={(e) =>
                        setPickup({ ...pickup, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Sender's phone number" required>
                    <TextInput
                      placeholder="080X XXX XXXX"
                      value={pickup.phone}
                      onChange={(e) =>
                        setPickup({ ...pickup, phone: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}

              <Field label="Pickup zone" required>
                <Select
                  value={pickup.zone}
                  onChange={(e) =>
                    setPickup({ ...pickup, zone: e.target.value })
                  }
                  options={PICKUP_ZONES}
                  placeholder="Select a Tuuraa operating zone"
                />
              </Field>

              <Field label="Pickup address" required>
                <LocationPicker
                  location={pickup}
                  onChange={(loc) => setPickup((p) => ({ ...p, ...loc }))}
                  onUseLiveLocation={() => useLiveLocation("pickup")}
                  locating={locating}
                  biasCenter={
                    pickup.zone
                      ? SERVICEABLE_PICKUP_CENTROIDS[pickup.zone]
                      : undefined
                  }
                />
                {pickupZoneMismatch && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 mt-2 text-[12px] text-amber-800">
                    <FiAlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      That address doesn't look like it's in {pickup.zone}. Try
                      a more specific address within the zone, or update the
                      zone above to match where you're actually shipping from.
                    </span>
                  </div>
                )}
              </Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionTitle
                icon={FiUsers}
                title="Recipient details"
                subtitle="Who's receiving this delivery"
              />

              <Field label="Recipient's name" required>
                <TextInput
                  placeholder="Full name"
                  value={recipient.name}
                  onChange={(e) =>
                    setRecipient({ ...recipient, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Email address">
                <TextInput
                  type="email"
                  placeholder="name@email.com"
                  value={recipient.email}
                  onChange={(e) =>
                    setRecipient({ ...recipient, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone number" required>
                <TextInput
                  placeholder="080X XXX XXXX"
                  value={recipient.phone}
                  onChange={(e) =>
                    setRecipient({ ...recipient, phone: e.target.value })
                  }
                />
              </Field>
              <Field label="Recipient zone" required>
                <Select
                  value={recipient.zone}
                  onChange={(e) =>
                    setRecipient({ ...recipient, zone: e.target.value })
                  }
                  options={DROPOFF_ZONES}
                  placeholder="Select delivery zone"
                />
              </Field>
              <Field label="Delivery address" required>
                <LocationPicker
                  location={recipient}
                  onChange={(loc) => setRecipient((r) => ({ ...r, ...loc }))}
                  onUseLiveLocation={() => useLiveLocation("recipient")}
                  locating={locating}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div>
              <SectionTitle
                icon={FiPackage}
                title="Package details"
                subtitle="Tell us what's being shipped"
              />

              <Field label="Quantity" required>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPkg({
                        ...pkg,
                        quantity: Math.max(1, pkg.quantity - 1),
                      })
                    }
                    className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center active:bg-stone-100"
                  >
                    <FiMinus className="w-4 h-4 text-stone-600" />
                  </button>
                  <span className="w-10 text-center text-[16px] font-medium text-stone-900">
                    {pkg.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPkg({ ...pkg, quantity: pkg.quantity + 1 })
                    }
                    className="w-10 h-10 rounded-xl border border-stone-200 flex items-center justify-center active:bg-stone-100"
                  >
                    <FiPlus className="w-4 h-4 text-stone-600" />
                  </button>
                  <span className="text-[13px] text-stone-500">
                    item{pkg.quantity > 1 ? "s" : ""}
                  </span>
                </div>
              </Field>

              <Field label="Weight (kg)" required>
                <div className="relative">
                  <TbWeight className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 2.5"
                    value={pkg.weight}
                    onChange={(e) => setPkg({ ...pkg, weight: e.target.value })}
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </Field>

              <Field label="Value of item (₦)">
                <div className="relative">
                  <TbCurrencyNaira className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="For insurance purposes"
                    value={pkg.value}
                    onChange={(e) => setPkg({ ...pkg, value: e.target.value })}
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </Field>

              <Field label="Description" required>
                <div className="relative">
                  <FiFileText className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <textarea
                    rows={3}
                    placeholder="e.g. 2 cartons of skincare products, fragile"
                    value={pkg.description}
                    onChange={(e) =>
                      setPkg({ ...pkg, description: e.target.value })
                    }
                    className={`${inputCls} pl-10 resize-none`}
                  />
                </div>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div>
              <SectionTitle
                icon={FiFileText}
                title="Review your manifest"
                subtitle="Confirm the details before payment"
              />

              <div className="rounded-2xl border border-stone-200 bg-white divide-y divide-dashed divide-stone-200 overflow-hidden">
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400 mb-2">
                    Pickup
                  </p>
                  <p className="text-[14px] text-stone-800">
                    {pickup.date || "—"} · {senderName || "Sender"} ·{" "}
                    {senderPhone || "—"}
                  </p>
                  <p className="text-[13px] text-stone-500 mt-0.5">
                    {pickup.zone}
                    {pickup.address ? ` — ${pickup.address}` : ""}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400 mb-2">
                    Recipient
                  </p>
                  <p className="text-[14px] text-stone-800">
                    {recipient.name || "—"} · {recipient.phone}
                  </p>
                  {recipient.email && (
                    <p className="text-[13px] text-stone-500">
                      {recipient.email}
                    </p>
                  )}
                  <p className="text-[13px] text-stone-500 mt-0.5">
                    {recipient.zone}
                    {recipient.address ? ` — ${recipient.address}` : ""}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] uppercase tracking-wide text-stone-400 mb-2">
                    Package
                  </p>
                  <p className="text-[14px] text-stone-800">
                    {pkg.quantity} item{pkg.quantity > 1 ? "s" : ""} ·{" "}
                    {pkg.weight || "—"} kg
                    {pkg.value ? ` · ${currency(parseFloat(pkg.value))}` : ""}
                  </p>
                  <p className="text-[13px] text-stone-500 mt-0.5">
                    {pkg.description || "—"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[13px] text-emerald-700 font-medium mt-3"
              >
                Edit details
              </button>
            </div>
          )}

          {step === 5 && (
            <div>
              <SectionTitle
                icon={FiCreditCard}
                title="Payment"
                subtitle="Review the cost before you pay"
              />

              {/* Total charge only — no line-item breakdown shown here. */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 mb-5 flex flex-col items-center text-center">
                <p className="text-[11px] uppercase tracking-wide text-stone-400 mb-2">
                  Total charge
                </p>
                {quoteLoading && !quote ? (
                  <div className="flex items-center gap-2 text-stone-400 py-1.5">
                    <FiLoader className="w-4 h-4 animate-spin" />
                    <span className="text-[13px]">Calculating…</span>
                  </div>
                ) : (
                  <span className="font-serif text-[30px] text-emerald-800">
                    {currency(quote?.total)}
                  </span>
                )}
                {quoteLoading && quote && (
                  <span className="text-[11px] text-stone-400 mt-1">
                    Updating…
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 mb-2">
                <div className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0">
                  <FiCreditCard className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-stone-800">
                    Pay with Paystack
                  </p>
                  <p className="text-[12px] text-stone-500">
                    Choose card, bank transfer, or USSD on the next screen —
                    bank transfer gets you a one-time account number and
                    confirms automatically once it lands.
                  </p>
                </div>
              </div>

              {(quoteError || submitError) && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 mt-3 text-[13px] text-red-700">
                  <FiAlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{submitError || quoteError}</span>
                </div>
              )}
            </div>
          )}

          {/* Step actions — sit right after the form, in normal page flow,
              so they never overlap the app shell's own bottom nav bar. */}
          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={submitting}
                className="w-12 h-12 rounded-xl border border-stone-200 flex items-center justify-center shrink-0 active:bg-stone-100 disabled:opacity-50"
              >
                <FiChevronLeft className="w-5 h-5 text-stone-600" />
              </button>
            )}
            {step < 5 ? (
              <button
                type="button"
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
                className={`flex-1 rounded-xl py-3.5 font-medium text-[15px] flex items-center justify-center gap-1.5 transition ${
                  canNext()
                    ? "bg-emerald-700 text-white active:bg-emerald-800"
                    : "bg-stone-200 text-stone-400"
                }`}
              >
                {step === 4 ? "Continue to payment" : "Next"}
                <FiChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePay}
                disabled={
                  submitting || quoteLoading || !quote || Boolean(quoteError)
                }
                className="flex-1 rounded-xl py-3.5 font-medium text-[15px] bg-amber-500 text-emerald-950 active:bg-amber-600 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" /> Processing…
                  </>
                ) : (
                  `Pay ${currency(quote?.total)}`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
