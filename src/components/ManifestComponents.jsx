import { useEffect, useRef, useState } from "react";
import {
  FiMapPin,
  FiNavigation,
  FiChevronDown,
  FiCheck,
  FiArrowLeft,
  FiLoader,
} from "react-icons/fi";

// Was importing from "./MaPbox" — a different module name than the
// geocoding wrapper NewManifest.jsx actually uses ("../components/
// MapboxController"). Two names for what should be the same file is how
// one copy quietly falls behind the other (e.g. missing the `proximity`
// bias option). Point this at the same MapboxController module.
import { searchAddress, forwardGeocode } from "./MapboxController";

export const inputCls =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 transition";

export function TextInput(props) {
  return <input {...props} className={inputCls} />;
}

export function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-emerald-700" strokeWidth={2} />
      </div>
      <div>
        <h2 className="font-serif text-[19px] leading-tight text-stone-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] text-stone-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`${inputCls} appearance-none pr-10 ${value ? "" : "text-stone-400"}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="text-stone-900">
            {o}
          </option>
        ))}
      </select>
      <FiChevronDown className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

export function LocationPicker({
  location,
  onChange,
  onUseLiveLocation,
  locating,
  biasCenter, // { lat, lng } | null — nudges typed-address search/geocode results toward this point (e.g. the selected pickup zone's centroid)
}) {
  const [query, setQuery] = useState(location?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // Keep the visible text in sync when the parent sets an address for us
  // (live location or a suggestion pick).
  useEffect(() => {
    setQuery(location?.address || "");
  }, [location?.address]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInput = (value) => {
    setQuery(value);
    setShowSuggestions(true);
    // Coordinates are stale the moment the text changes — clear them so a
    // half-edited address can never be saved with the old lat/lng.
    onChange({ address: value, lat: null, lng: null });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAddress(
          value,
          biasCenter ? { proximity: biasCenter } : undefined,
        );
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const pickSuggestion = (suggestion) => {
    setQuery(suggestion.placeName);
    onChange({
      address: suggestion.placeName,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleBlur = async () => {
    // Small delay so a click on a suggestion registers before the list unmounts.
    setTimeout(() => setShowSuggestions(false), 150);

    if (location?.lat && location?.lng) return; // already resolved
    if (!query || query.trim().length < 3) return;

    try {
      const result = await forwardGeocode(
        query,
        biasCenter ? { proximity: biasCenter } : undefined,
      );
      if (result) {
        // Keep the customer's own typed text as the address of record.
        // Mapbox's placeName is frequently coarser than what they typed —
        // it can drop house numbers and informal area names (e.g. "Ilaje")
        // that aren't in Mapbox's place index for Lagos. This call is only
        // used to attach coordinates for zone validation and distance
        // pricing; the text a rider actually reads stays exactly what the
        // customer wrote, house number included.
        onChange({
          address: query,
          lat: result.lat,
          lng: result.lng,
        });
      }
    } catch {
      // Keep the manually typed address even if geocoding failed — the
      // coordinates just stay null and the zone-based fee still applies.
    }
  };

  return (
    <div className="relative">
      <TextInput
        placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={handleBlur}
      />

      {showSuggestions && (searching || suggestions.length > 0) && (
        <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
          {searching && (
            <div className="px-3.5 py-2.5 text-[13px] text-stone-400">
              Searching…
            </div>
          )}
          {suggestions.map((s) => (
            <button
              type="button"
              key={s.id}
              onMouseDown={() => pickSuggestion(s)}
              className="w-full text-left px-3.5 py-2.5 text-[13px] text-stone-700 hover:bg-stone-50 border-b border-stone-100 last:border-0 flex items-start gap-2"
            >
              <FiMapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
              <span>{s.placeName}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onUseLiveLocation}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 py-2.5 mt-2.5 text-[13px] font-medium text-stone-700 active:bg-stone-100"
      >
        <FiNavigation
          className={`w-3.5 h-3.5 ${locating ? "animate-pulse text-emerald-600" : ""}`}
        />
        {locating ? "Locating…" : "Use my location"}
      </button>

      {location?.lat && location?.lng ? (
        <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1">
          <FiCheck className="w-3 h-3" /> Location confirmed
        </p>
      ) : query ? (
        <p className="text-[11px] text-amber-700 mt-1.5">
          Pick a suggestion from the list, or use your location to confirm
          coordinates.
        </p>
      ) : null}
    </div>
  );
}

// export const SubPageHeader = ({ title, onBack }) => (
//   <div className="flex items-center gap-3 px-4 pt-6 pb-4">
//     <button
//       type="button"
//       onClick={onBack}
//       className="shrink-0 w-8 h-8 -ml-1.5 flex items-center justify-center rounded-full active:bg-[#F1EFEA] transition-colors"
//     >
//       <FiArrowLeft className="text-[#1C1B1A]" size={18} />
//     </button>
//     <h1 className="text-[18px] font-semibold text-[#1C1B1A]">{title}</h1>
//   </div>
// );

export const SubPageHeader = ({ title, onBack }) => (
  <div
    className="sticky top-0 z-20 flex items-center gap-3 px-4 pb-4 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-transparent [&.scrolled]:border-[#EFEBE6]"
    style={{
      paddingTop: "max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))",
    }}
  >
    <button
      type="button"
      onClick={onBack}
      aria-label="Go back"
      className="shrink-0 w-11 h-11 -ml-2.5 flex items-center justify-center rounded-full active:bg-[#F1EFEA] transition-colors"
    >
      <FiArrowLeft className="text-[#1C1B1A]" size={20} />
    </button>
    <h1 className="text-[18px] font-semibold text-[#1C1B1A] truncate">
      {title}
    </h1>
  </div>
);

export const FieldLabel = ({ children }) => (
  <label className="block text-[13px] font-medium text-[#6B6B6B] mb-1.5">
    {children}
  </label>
);

export const Banner = ({ tone = "error", children }) => {
  const styles =
    tone === "error"
      ? "bg-[#FBEAE5] text-[#B3452E]"
      : "bg-[#E7F2EF] text-[#0F5C56]";
  return (
    <div className={`rounded-xl px-3.5 py-3 text-[13.5px] mb-4 ${styles}`}>
      {children}
    </div>
  );
};

export const PrimaryButton = ({ children, disabled, loading, ...props }) => (
  <button
    type="submit"
    disabled={disabled || loading}
    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F5C56] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50 active:bg-[#0C4A45] transition-colors"
    {...props}
  >
    {loading && <FiLoader className="animate-spin" size={16} />}
    {children}
  </button>
);

export const inputClass =
  "w-full rounded-xl border border-[#E8E6E2] bg-white px-3.5 py-3 text-[15px] text-[#1C1B1A] placeholder:text-[#B8B6AF] focus:outline-none focus:ring-2 focus:ring-[#0F5C56]/30 focus:border-[#0F5C56]";

export const StaticPage = ({ title, onBack, children }) => (
  <div className="min-h-screen bg-[#FAF9F7] pb-10 mx-auto w-full max-w-[480px]">
    <SubPageHeader title={title} onBack={onBack} />
    <div className="px-4 text-[14.5px] leading-relaxed text-[#3E3D3A] space-y-4">
      {children}
    </div>
  </div>
);
