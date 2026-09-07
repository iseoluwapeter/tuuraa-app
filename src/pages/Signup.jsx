import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
  FiShield,
} from "react-icons/fi";
import { MdOutlineBusinessCenter } from "react-icons/md";
import { TuuraaLogo } from "../assets";
import { ONBOARDING_STORAGE_KEY } from "./Onboarding";
import { supabase } from "../components/supabaseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(\+234|0)[789][01]\d{8}$/;

const SEND_OTP_FUNCTION = "send-signup-otp";
const VERIFY_OTP_FUNCTION = "verify-signup-otp";

// Where to send the user once their account is created and they're
// logged in automatically.
// const POST_SIGNUP_ROUTE = "/home";

const routeAfterVerification = (billing) =>
  billing === "recurring" ? "/business-details" : "/home";
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 45;

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(name.length - visible.length, 1))}@${domain}`;
};

const OTP_ERROR_MESSAGES = {
  invalid_otp: "That code isn't right. Check it and try again.",
  otp_expired: "That code has expired. Send a new one.",
  otp_max_attempts: "Too many attempts. Send a new code.",
  default: "Something went wrong verifying that code. Try again.",
};

const Signup = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [onboarding, setOnboarding] = useState(null);

  useEffect(() => {
    // Prefer fresh router state (just came from onboarding); fall back to
    // sessionStorage (e.g. user refreshed this page).
    const fromRouter = location.state?.onboarding;
    if (fromRouter) {
      setOnboarding(fromRouter);
      return;
    }
    try {
      const stored = sessionStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored) setOnboarding(JSON.parse(stored));
    } catch {}
  }, [location.state]);

  // step: "form" (collect details) → "otp" (verify email)
  const [step, setStep] = useState("form");

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- OTP step state ---
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpInputRefs = useRef([]);
  const otpSubmitInFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError("");
  };

  const validate = () => {
    const errs = {};
    if (!form.businessName.trim()) {
      errs.businessName = "Enter your business name";
    }
    if (!form.email.trim()) {
      errs.email = "Enter your email address";
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    if (!form.phone.trim()) {
      errs.phone = "Enter your phone number";
    } else if (!PHONE_PATTERN.test(form.phone.trim().replace(/\s+/g, ""))) {
      errs.phone = "Enter a valid Nigerian phone number";
    }
    if (!form.password) {
      errs.password = "Create a password";
    } else if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const sendOtp = async () => {
    const { error: fnError } = await supabase.functions.invoke(
      SEND_OTP_FUNCTION,
      { body: { email: form.email.trim() } },
    );
    if (fnError) throw fnError;
  };

  // Step 1: validate details, request an OTP, move to verification.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await sendOtp();
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 50);
    } catch {
      setError(
        "Couldn't send a verification code. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setOtpError("");
    try {
      await sendOtp();
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      otpInputRefs.current[0]?.focus();
    } catch {
      setOtpError("Couldn't resend the code. Try again in a moment.");
    } finally {
      setResending(false);
    }
  };

  const handleEditEmail = () => {
    setStep("form");
    setOtpError("");
  };

  const submitOtp = async (code) => {
    if (otpSubmitInFlight.current) return;
    otpSubmitInFlight.current = true;
    setVerifying(true);
    setOtpError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        VERIFY_OTP_FUNCTION,
        {
          body: {
            email: form.email.trim(),
            otp: code,
            businessName: form.businessName.trim(),
            phone: form.phone.trim(),
            password: form.password,
            billing_preference: onboarding?.billing ?? null,
            business_category: onboarding?.business ?? null,
          },
        },
      );

      if (fnError) throw fnError;
      if (data?.error === "email_taken") {
        // The email became registered between sending the code and
        // verifying it (e.g. a duplicate signup elsewhere). No amount of
        // re-entering the OTP fixes this — send them back to change email.
        setStep("form");
        setFieldErrors((prev) => ({
          ...prev,
          email: "An account already exists with this email",
        }));
        return;
      }
      if (data?.error) {
        setOtpError(
          OTP_ERROR_MESSAGES[data.error] ?? OTP_ERROR_MESSAGES.default,
        );
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        otpInputRefs.current[0]?.focus();
        return;
      }

      const session = data?.session;
      if (!session?.access_token || !session?.refresh_token) {
        setOtpError(OTP_ERROR_MESSAGES.default);
        return;
      }

      // Log the newly created account in automatically.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (sessionError) throw sessionError;

      sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      // navigate(POST_SIGNUP_ROUTE);
      navigate(routeAfterVerification(onboarding?.billing));
    } catch {
      setOtpError(OTP_ERROR_MESSAGES.default);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      otpInputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
      otpSubmitInFlight.current = false;
    }
  };

  const handleOtpChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, "");
    if (!value) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    // Handle paste of the full code into one box.
    if (value.length > 1) {
      const chars = value.slice(0, OTP_LENGTH).split("");
      setOtpDigits((prev) => {
        const next = [...prev];
        chars.forEach((c, i) => {
          if (index + i < OTP_LENGTH) next[index + i] = c;
        });
        return next;
      });
      const lastIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpInputRefs.current[lastIndex]?.focus();
      const joined =
        chars.length + index >= OTP_LENGTH
          ? [...otpDigits.slice(0, index), ...chars]
              .slice(0, OTP_LENGTH)
              .join("")
          : null;
      if (joined && joined.length === OTP_LENGTH && !joined.includes("")) {
        submitOtp(joined);
      }
      return;
    }

    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      if (next.every((d) => d !== "") && index === OTP_LENGTH - 1) {
        submitOtp(next.join(""));
      }
      return next;
    });

    if (index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col bg-white px-6"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 2rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
      }}
    >
      {/* Brand mark */}
      <div className="flex flex-col items-center pt-4 pb-8">
        <img src={TuuraaLogo} alt="Tuuraa" width={88} />
      </div>

      {step === "form" ? (
        <>
          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-poppins font-semibold text-2xl text-neutral-900">
              Create your account
            </h1>
            <p className="font-poppins text-sm text-neutral-500 mt-1">
              Set up your business in a few minutes
            </p>
          </div>

          {/* Server error */}
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3"
            >
              <FiAlertCircle
                className="text-red-500 mt-0.5 shrink-0"
                size={16}
              />
              <p className="font-poppins text-xs text-red-700 leading-relaxed">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <div>
              <label
                htmlFor="businessName"
                className="font-poppins text-xs font-medium text-neutral-600 mb-1.5 block"
              >
                Business name
              </label>
              <div className="relative">
                <MdOutlineBusinessCenter
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={18}
                />
                <input
                  id="businessName"
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="Fresh Meal Prep"
                  autoComplete="organization"
                  aria-invalid={!!fieldErrors.businessName}
                  aria-describedby={
                    fieldErrors.businessName ? "businessName-error" : undefined
                  }
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-neutral-50
                             font-poppins text-base text-neutral-900 placeholder:text-neutral-400
                             focus:outline-none focus:ring-2 focus:border-transparent
                             transition ${
                               fieldErrors.businessName
                                 ? "border-red-300 focus:ring-red-400"
                                 : "border-neutral-200 focus:ring-emerald-700"
                             }`}
                />
              </div>
              {fieldErrors.businessName && (
                <p
                  id="businessName-error"
                  className="font-poppins text-xs text-red-600 mt-1.5"
                >
                  {fieldErrors.businessName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="font-poppins text-xs font-medium text-neutral-600 mb-1.5 block"
              >
                Email
              </label>
              <div className="relative">
                <FiMail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={18}
                />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@business.com"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-neutral-50
                             font-poppins text-base text-neutral-900 placeholder:text-neutral-400
                             focus:outline-none focus:ring-2 focus:border-transparent
                             transition ${
                               fieldErrors.email
                                 ? "border-red-300 focus:ring-red-400"
                                 : "border-neutral-200 focus:ring-emerald-700"
                             }`}
                />
              </div>
              {fieldErrors.email && (
                <p
                  id="email-error"
                  className="font-poppins text-xs text-red-600 mt-1.5"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone"
                className="font-poppins text-xs font-medium text-neutral-600 mb-1.5 block"
              >
                Phone number
              </label>
              <div className="relative">
                <FiPhone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={18}
                />
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="080X XXX XXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={
                    fieldErrors.phone ? "phone-error" : undefined
                  }
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-neutral-50
                             font-poppins text-base text-neutral-900 placeholder:text-neutral-400
                             focus:outline-none focus:ring-2 focus:border-transparent
                             transition ${
                               fieldErrors.phone
                                 ? "border-red-300 focus:ring-red-400"
                                 : "border-neutral-200 focus:ring-emerald-700"
                             }`}
                />
              </div>
              {fieldErrors.phone && (
                <p
                  id="phone-error"
                  className="font-poppins text-xs text-red-600 mt-1.5"
                >
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="font-poppins text-xs font-medium text-neutral-600 mb-1.5 block"
              >
                Password
              </label>
              <div className="relative">
                <FiLock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={18}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={
                    fieldErrors.password ? "password-error" : undefined
                  }
                  className={`w-full h-12 pl-11 pr-11 rounded-xl border bg-neutral-50
                             font-poppins text-base text-neutral-900 placeholder:text-neutral-400
                             focus:outline-none focus:ring-2 focus:border-transparent
                             transition ${
                               fieldErrors.password
                                 ? "border-red-300 focus:ring-red-400"
                                 : "border-neutral-200 focus:ring-emerald-700"
                             }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  id="password-error"
                  className="font-poppins text-xs text-red-600 mt-1.5"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 rounded-xl bg-emerald-900 text-white font-poppins font-medium text-sm
                         flex items-center justify-center gap-2 active:scale-[0.98] transition
                         disabled:opacity-60 disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Sending code...
                </>
              ) : (
                <>
                  Create account
                  <FiArrowRight size={16} />
                </>
              )}
            </button>

            <p className="font-poppins text-[11px] text-neutral-400 text-center leading-relaxed px-2">
              By creating an account, you agree to Tuuraa's Terms of Service and
              Privacy Policy.
            </p>
          </form>

          {/* Footer */}
          <div className="mt-auto pt-6 flex items-center justify-center gap-1">
            <span className="font-poppins text-sm text-neutral-500">
              Already have an account?
            </span>
            <Link
              to="/login"
              className="font-poppins text-sm font-semibold text-emerald-800"
            >
              Log in
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* OTP verification step */}
          <div className="mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 mb-4">
              <FiShield size={20} />
            </div>
            <h1 className="font-poppins font-semibold text-2xl text-neutral-900">
              Check your email
            </h1>
            <p className="font-poppins text-sm text-neutral-500 mt-1">
              Enter the {OTP_LENGTH}-digit code we sent to{" "}
              <span className="font-medium text-neutral-700">
                {maskEmail(form.email.trim())}
              </span>
              .{" "}
              <button
                type="button"
                onClick={handleEditEmail}
                className="font-semibold text-emerald-800"
              >
                Edit
              </button>
            </p>
          </div>

          {otpError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3"
            >
              <FiAlertCircle
                className="text-red-500 mt-0.5 shrink-0"
                size={16}
              />
              <p className="font-poppins text-xs text-red-700 leading-relaxed">
                {otpError}
              </p>
            </div>
          )}

          <div className="flex justify-between gap-2">
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (otpInputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={OTP_LENGTH}
                value={digit}
                disabled={verifying}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                aria-label={`Digit ${i + 1} of verification code`}
                className={`h-14 w-full max-w-12 rounded-xl border bg-neutral-50 text-center
                           font-poppins text-lg font-semibold text-neutral-900
                           focus:outline-none focus:ring-2 focus:border-transparent
                           transition disabled:opacity-60 ${
                             otpError
                               ? "border-red-300 focus:ring-red-400"
                               : "border-neutral-200 focus:ring-emerald-700"
                           }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => submitOtp(otpDigits.join(""))}
            disabled={verifying || otpDigits.some((d) => !d)}
            className="mt-6 h-12 rounded-xl bg-emerald-900 text-white font-poppins font-medium text-sm
                       flex items-center justify-center gap-2 active:scale-[0.98] transition
                       disabled:opacity-60 disabled:active:scale-100"
          >
            {verifying ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify and continue"
            )}
          </button>

          <div className="mt-5 flex items-center justify-center gap-1">
            <span className="font-poppins text-sm text-neutral-500">
              Didn't get a code?
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="font-poppins text-sm font-semibold text-emerald-800 disabled:text-neutral-400 disabled:font-medium"
            >
              {resending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Signup;
