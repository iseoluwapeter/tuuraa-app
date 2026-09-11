import React, { useState } from "react";
import { data, Link, useNavigate } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiAlertCircle,
} from "react-icons/fi";
import { TuuraaLogo } from "../assets";
import { supabase } from "../components/supabaseClient";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error) setError("");
  };

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = "Enter your email address";
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    if (!formData.password) {
      errs.password = "Enter your password";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "That email or password isn't right. Try again."
            : authError.message,
        );
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("We couldn't sign you in. Please try again.");
        return;
      }
      // console.log(session);

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("billing_preference, is_active, account_status")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (clientError) {
        console.error("Client lookup failed:", clientError);
        await supabase.auth.signOut();
        setError("Something went wrong verifying your account.");
        return;
      }

      if (
        !client ||
        client.billing_preference !== "payg" ||
        !client.is_active ||
        client.account_status !== "active"
      ) {
        await supabase.auth.signOut();
        setError("This account isn't set up for PWA access.");
        return;
      }

      navigate("/home");
    } catch (err) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 sm:bg-gray-100 flex sm:justify-center">
      <div
        className="min-h-dvh w-full sm:max-w-md bg-gray-50 px-4 pt-10 pb-8 flex flex-col flex-1"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 2.5rem)",
          paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
        }}
      >
        {/* brand mark */}
        {/* <div className="flex flex-col items-center mb-8">
          <img src={TuuraaLogo} alt="Tuuraa" width={88} />
        </div> */}

        {/* greeting */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500">
            Log in to manage your deliveries
          </p>
        </div>

        {/* server / auth error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-red-50 text-red-600 text-sm px-3.5 py-3 mb-4"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* credentials + submit, same flex/gap rhythm as the signup form */}
        <form
          id="login-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-gray-500 mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <FiMail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@business.com"
                autoComplete="email"
                inputMode="email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-sm text-gray-900
                           placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
                             fieldErrors.email
                               ? "border-red-300 focus:ring-red-400/30"
                               : "border-gray-200 focus:ring-emerald-500/30"
                           }`}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-red-600 mt-1.5">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-gray-500"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-emerald-600 text-xs font-medium py-1 -my-1 touch-manipulation active:opacity-60"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <FiLock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  fieldErrors.password ? "password-error" : undefined
                }
                className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-gray-900
                           placeholder:text-gray-400 focus:outline-none focus:ring-2 transition ${
                             fieldErrors.password
                               ? "border-red-300 focus:ring-red-400/30"
                               : "border-gray-200 focus:ring-emerald-500/30"
                           }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 h-full w-10 flex items-center justify-center
                           text-gray-400 touch-manipulation active:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-xs text-red-600 mt-1.5">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* primary action now lives inside the form, mt-2 below the last
              field — same position it holds on the signup screen, instead
              of floating directly under a cramped field stack */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-600
                       text-sm font-semibold text-white touch-manipulation active:bg-emerald-700
                       disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                Log in
                <FiArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* footer */}
        <div className="mt-auto pt-8 flex items-center justify-center gap-1">
          <span className="text-sm text-gray-500">New to Tuuraa?</span>
          <Link
            to="/onboarding"
            className="text-emerald-600 text-sm font-semibold py-1 -my-1 touch-manipulation active:opacity-60"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
