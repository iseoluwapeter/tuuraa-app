import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiPackage,
} from "react-icons/fi";
import {
  HiOutlineCake,
  HiOutlineTag,
  HiOutlineSparkles,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineEllipsisHorizontal,
  HiOutlineTruck,
  HiCheck,
} from "react-icons/hi2";
import { TuuraaLogo } from "../assets";
import { supabase } from "../components/supabaseClient";
import { useAccountStore } from "../store/UseAccountStore";

// Shown right after OTP verification for a recurring signup, AND reused when
// an existing PAYG client upgrades to recurring from settings — in both
// cases the row is upserted, not inserted-once. See ONBOARDING notes in
// Onboarding.jsx / Signup.jsx for the signup half of this flow.

const GOODS_TYPES = [
  { value: "food", label: "Food & perishables", Icon: HiOutlineCake },
  { value: "fashion", label: "Fashion & apparel", Icon: HiOutlineTag },
  { value: "beauty", label: "Beauty & wellness", Icon: HiOutlineSparkles },
  { value: "general", label: "General merchandise", Icon: HiOutlineCube },
  {
    value: "documents",
    label: "Documents & parcels",
    Icon: HiOutlineDocumentText,
  },
  {
    value: "other",
    label: "Something else",
    Icon: HiOutlineEllipsisHorizontal,
  },
];

const VEHICLE_TYPES = [
  { value: "bike", label: "Bike" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car / sedan" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
];

const toggleInArray = (arr, value) =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

const Chip = ({ label, Icon, selected, onClick }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={selected}
    onClick={onClick}
    className={`relative flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors active:scale-95 ${
      selected
        ? "border-emerald-800 bg-emerald-50"
        : "border-neutral-200 bg-neutral-50"
    }`}
  >
    {Icon && (
      <Icon
        className={selected ? "text-emerald-800" : "text-neutral-400"}
        size={17}
      />
    )}
    <span
      className={`font-poppins text-sm ${
        selected ? "font-semibold text-emerald-900" : "text-neutral-700"
      }`}
    >
      {label}
    </span>
    {selected && (
      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-emerald-800 text-white">
        <HiCheck className="h-2.5 w-2.5" />
      </span>
    )}
  </button>
);

const NumberField = ({
  id,
  label,
  Icon,
  value,
  onChange,
  error,
  placeholder,
}) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1.5 block font-poppins text-xs font-medium text-neutral-600"
    >
      {label}
    </label>
    <div className="relative">
      <Icon
        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
        size={18}
      />
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-12 w-full rounded-xl border bg-neutral-50 pl-11 pr-4 font-poppins text-base text-neutral-900
                   placeholder:text-neutral-400 focus:border-transparent focus:outline-none focus:ring-2
                   transition ${
                     error
                       ? "border-red-300 focus:ring-red-400"
                       : "border-neutral-200 focus:ring-emerald-700"
                   }`}
      />
    </div>
    {error && (
      <p
        id={`${id}-error`}
        className="mt-1.5 font-poppins text-xs text-red-600"
      >
        {error}
      </p>
    )}
  </div>
);

const BusinessDetails = () => {
  const navigate = useNavigate();

  // No more local fetch — client identity comes from the same global store
  // AccountStatusGuard and Home already read from, so this screen can't
  // drift out of sync with what the rest of the app knows.
  const client = useAccountStore((s) => s.client);
  const accountStatus = useAccountStore((s) => s.status);
  const fetchAccount = useAccountStore((s) => s.fetchAccount);

  const [goodsType, setGoodsType] = useState([]);
  const [avgDropsDay, setAvgDropsDay] = useState("");
  const [avgDropsMonth, setAvgDropsMonth] = useState("");
  const [vehiclesNeeded, setVehiclesNeeded] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([]);

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The store's own init effect (in App.jsx) already redirects a signed-out
  // user via AccountStatusGuard for every gated route — but this page sits
  // OUTSIDE the guard on purpose, so it needs its own redirect for the
  // signed-out case.
  useEffect(() => {
    if (accountStatus === "signed-out") {
      navigate("/");
    }
  }, [accountStatus, navigate]);

  const validate = () => {
    const errs = {};
    if (goodsType.length === 0) errs.goodsType = "Pick at least one";
    if (!avgDropsDay) errs.avgDropsDay = "Enter an estimate";
    if (!avgDropsMonth) errs.avgDropsMonth = "Enter an estimate";
    if (!vehiclesNeeded) errs.vehiclesNeeded = "Enter an estimate";
    if (vehicleTypes.length === 0) errs.vehicleTypes = "Pick at least one";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!client?.id || !validate()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("client_business_profiles").upsert(
        {
          client_id: client.id,
          goods_type: goodsType,
          avg_drops_day: Number(avgDropsDay),
          avg_drops_month: Number(avgDropsMonth),
          vehicles_needed: Number(vehiclesNeeded),
          vehicle_types: vehicleTypes,
        },
        { onConflict: "client_id" },
      );

      if (error) throw error;

      // Refresh the store so businessProfileSubmitted flips to true before
      // AccountStatusGuard evaluates the next route — otherwise it would
      // still see the stale pre-submission state and bounce back here.
      await fetchAccount();

      // Land in the app, not on a standalone "pending" page — the account
      // is pending_activation, which AccountStatusGuard now treats as a
      // normal, present state (order creation restricted, banner shown)
      // rather than something that gates the person out of /home.
      window.location.href = "https://portal.tuuraalogistics.com";
    } catch {
      setSubmitError(
        "Couldn't save your business details. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (accountStatus === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-800" />
      </div>
    );
  }

  if (accountStatus === "error" || !client) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <FiAlertCircle className="text-red-500" size={22} />
        <p className="font-poppins text-sm text-neutral-600">
          Couldn't load your account. Try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh flex-col bg-white px-6"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 2rem)",
        paddingBottom: "8.5rem",
      }}
    >
      <div className="flex flex-col items-center pb-8 pt-4">
        <img src={TuuraaLogo} alt="Tuuraa" width={72} />
      </div>

      <div className="mb-6">
        <h1 className="font-poppins text-2xl font-semibold text-neutral-900">
          Tell us about your business
        </h1>
        <p className="mt-1 font-poppins text-sm leading-relaxed text-neutral-500">
          This helps us match you with the right coordinator and rider pool
          before your recurring account goes live.
        </p>
      </div>

      {submitError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3"
        >
          <FiAlertCircle className="mt-0.5 shrink-0 text-red-500" size={16} />
          <p className="font-poppins text-xs leading-relaxed text-red-700">
            {submitError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div>
          <p className="mb-2.5 font-poppins text-xs font-medium text-neutral-600">
            What do you move? Select all that apply
          </p>
          <div className="grid grid-cols-2 gap-2">
            {GOODS_TYPES.map(({ value, label, Icon }) => (
              <Chip
                key={value}
                label={label}
                Icon={Icon}
                selected={goodsType.includes(value)}
                onClick={() =>
                  setGoodsType((prev) => toggleInArray(prev, value))
                }
              />
            ))}
          </div>
          {fieldErrors.goodsType && (
            <p className="mt-1.5 font-poppins text-xs text-red-600">
              {fieldErrors.goodsType}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="avgDropsDay"
            label="Avg. drops / day"
            Icon={FiPackage}
            value={avgDropsDay}
            onChange={(e) => setAvgDropsDay(e.target.value)}
            error={fieldErrors.avgDropsDay}
            placeholder="e.g. 15"
          />
          <NumberField
            id="avgDropsMonth"
            label="Avg. drops / month"
            Icon={FiCalendar}
            value={avgDropsMonth}
            onChange={(e) => setAvgDropsMonth(e.target.value)}
            error={fieldErrors.avgDropsMonth}
            placeholder="e.g. 300"
          />
        </div>

        <NumberField
          id="vehiclesNeeded"
          label="Riders / vehicles needed"
          Icon={HiOutlineTruck}
          value={vehiclesNeeded}
          onChange={(e) => setVehiclesNeeded(e.target.value)}
          error={fieldErrors.vehiclesNeeded}
          placeholder="e.g. 2"
        />

        <div>
          <p className="mb-2.5 font-poppins text-xs font-medium text-neutral-600">
            Vehicle types you'll need
          </p>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_TYPES.map(({ value, label }) => (
              <Chip
                key={value}
                label={label}
                selected={vehicleTypes.includes(value)}
                onClick={() =>
                  setVehicleTypes((prev) => toggleInArray(prev, value))
                }
              />
            ))}
          </div>
          {fieldErrors.vehicleTypes && (
            <p className="mt-1.5 font-poppins text-xs text-red-600">
              {fieldErrors.vehicleTypes}
            </p>
          )}
        </div>
      </form>

      <div
        className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-linear-to-t from-white from-65% to-transparent px-6 pt-3.5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
      >
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 font-poppins
                     text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-60
                     disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Saving...
            </>
          ) : (
            <>
              Submit for review
              <FiArrowRight size={16} />
            </>
          )}
        </button>
        <p className="mt-3 text-center font-poppins text-[11px] leading-relaxed text-neutral-400">
          You'll be able to look around right away — booking opens once we've
          matched your volume to a rider pool, usually within one business day.
        </p>
      </div>
    </div>
  );
};

export default BusinessDetails;
