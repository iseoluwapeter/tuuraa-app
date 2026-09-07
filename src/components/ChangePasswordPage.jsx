import { useState } from "react";
import { SubPageHeader } from "./ManifestComponents";
import { PrimaryButton } from "../components/ManifestComponents";
import { FieldLabel } from "../components/ManifestComponents";
import { Banner } from "../components/ManifestComponents";
import { useAccountStore } from "../store/UseAccountStore";
import { inputClass } from "./ManifestComponents";
import { supabase } from "./supabaseClient";

const EyeIcon = ({ open }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const PasswordField = ({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <input
          className={`${inputClass} pr-11`}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode="text"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-[#8A8580] active:text-[#3D3A36]"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
};

export const ChangePasswordPage = ({ onBack }) => {
  const { user } = useAccountStore();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: oldPassword,
    });

    if (signInError) {
      setError("Old password is incorrect.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col mx-auto w-full max-w-[480px]">
      <SubPageHeader title="Change password" onBack={onBack} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-4 pt-2">
        <div className="flex-1 space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          {success && (
            <Banner tone="success">Password updated successfully.</Banner>
          )}

          <PasswordField
            label="Old password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />

          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />

          <p className="text-xs text-[#8A8580] pt-1">
            Use at least 6 characters. You'll be asked to sign in again on your
            other devices.
          </p>
        </div>

        {/* Bottom-anchored action, thumb-reachable, respects device safe area */}
        <div
          className="sticky bottom-0 left-0 right-0 bg-[#FAF9F7] pt-3 pb-4 -mx-4 px-4 border-t border-[#EFEBE6]"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="w-full [&>button]:w-full [&>button]:h-12 [&>button]:text-base">
            <PrimaryButton loading={saving}>Change password</PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};
