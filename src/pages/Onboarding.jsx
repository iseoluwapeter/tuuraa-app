import React, { useState } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineBolt,
  HiOutlineArrowPath,
  HiOutlineCake,
  HiOutlineTag,
  HiOutlineSparkles,
  HiOutlineEllipsisHorizontal,
  HiCheck,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    key: "billing",
    eyebrow: "Step 1 of 2",
    title: "How will you book deliveries?",
    subtitle: "You can change this later — it just sets up your default flow.",
    options: [
      {
        value: "payg",
        label: "Pay as you go",
        detail: "One-off drops, billed per delivery. No commitment.",
        Icon: HiOutlineBolt,
      },
      {
        value: "recurring",
        label: "Recurring",
        detail: "Monthly plan with a dedicated rider and coordinator.",
        Icon: HiOutlineArrowPath,
      },
    ],
  },
  {
    key: "business",
    eyebrow: "Step 2 of 2",
    title: "What's your business?",
    subtitle: "Helps us match you with the right coordinator and rider pool.",
    options: [
      { value: "food", label: "Food & meal prep", Icon: HiOutlineCake },
      { value: "fashion", label: "Fashion & retail", Icon: HiOutlineTag },
      { value: "beauty", label: "Beauty & wellness", Icon: HiOutlineSparkles },
      {
        value: "other",
        label: "Something else",
        Icon: HiOutlineEllipsisHorizontal,
      },
    ],
  },
];

// Key used to back up the answers in sessionStorage, in case the user
// refreshes /signup and loses router state.
export const ONBOARDING_STORAGE_KEY = "tuuraa_onboarding_answers";

/**
 * onComplete is an OPTIONAL side-effect hook (e.g. analytics tracking).
 * It does not replace navigation — Onboarding always owns getting the
 * user to /signup with their answers attached.
 */
const Onboarding = ({ onComplete = () => {} }) => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({ billing: null, business: null });

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isGrid = step.options.length > 2;
  const selected = answers[step.key];

  const choose = (value) => setAnswers((a) => ({ ...a, [step.key]: value }));

  const goNext = () => {
    if (!selected) return;

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    // Last step: let any caller-provided side effect run (analytics, etc.)
    onComplete(answers);

    // Back up to sessionStorage so a refresh on /signup doesn't lose the
    // selection, then hand off via router state (the primary channel).
    try {
      sessionStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // sessionStorage unavailable (e.g. private mode) — router state still works
    }
    navigate("/signup", { state: { onboarding: answers } });
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-stone-50 text-emerald-950 font-sans">
      {/* Progress */}
      <div
        className="flex gap-1.5 px-5 pt-5"
        style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200"
          >
            <div
              className="h-full rounded-full bg-emerald-700 transition-all duration-500 ease-out"
              style={{
                width: i < stepIndex ? "100%" : i === stepIndex ? "55%" : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pb-1 pt-3.5">
        <button
          type="button"
          onClick={goBack}
          aria-hidden={stepIndex === 0}
          className={`flex items-center gap-1 text-sm text-stone-500 transition-opacity ${
            stepIndex > 0 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="font-serif text-base font-semibold text-emerald-900">
          Tuuraa
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 pb-36 pt-4">
        <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-amber-600">
          {step.eyebrow}
        </p>
        <h1 className="font-serif text-2xl font-semibold leading-tight text-emerald-900">
          {step.title}
        </h1>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-stone-500">
          {step.subtitle}
        </p>

        <div
          role="radiogroup"
          aria-label={step.title}
          className={
            isGrid ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5"
          }
        >
          {step.options.map(({ value, label, detail, Icon }) => {
            const isSelected = selected === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => choose(value)}
                className={`relative flex min-h-11 w-full rounded-2xl border p-4 text-left transition-colors active:scale-95 ${
                  isGrid ? "flex-col items-start gap-2.5" : "items-start gap-3"
                } ${
                  isSelected
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                {/* Stamp — signature selection mark */}
                <span
                  aria-hidden="true"
                  className={`absolute right-2.5 top-2.5 flex h-5 w-5 -rotate-6 items-center justify-center rounded-full bg-emerald-700 text-white transition-all duration-200 ${
                    isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                >
                  <HiCheck className="h-3 w-3" />
                </span>

                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-emerald-700 text-white"
                      : "bg-amber-50 text-emerald-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <span>
                  <p className="text-sm font-bold text-emerald-950">{label}</p>
                  {detail && (
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                      {detail}
                    </p>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div
        className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-stone-50 from-65% to-transparent px-5 pt-3.5"
        style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={goNext}
          disabled={!selected}
          className={`min-h-11 w-full rounded-2xl px-5 py-4 text-sm font-bold text-white transition-colors active:scale-95 ${
            selected
              ? "cursor-pointer bg-emerald-900 hover:bg-emerald-800"
              : "cursor-not-allowed bg-stone-400"
          }`}
        >
          {isLast ? "Get started" : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
