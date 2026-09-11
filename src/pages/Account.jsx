import React, { useEffect, useState } from "react";
import {
  FiUser,
  FiLock,
  FiHelpCircle,
  FiFileText,
  FiShield,
  FiInfo,
  FiChevronRight,
  FiLogOut,
  FiEdit2,
  FiArrowLeft,
  FiCheckCircle,
  FiLoader,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { supabase } from "../components/supabaseClient";
import { useAccountStore } from "../store/UseAccountStore";
import { PrimaryButton } from "../components/ManifestComponents";
import { FieldLabel } from "../components/ManifestComponents";
import { Banner } from "../components/ManifestComponents";
import { ChangePasswordPage } from "../components/ChangePasswordPage";
import { AboutPage } from "../components/AboutPage";
import { StaticPage } from "../components/ManifestComponents";
import { TermsPage } from "../components/TermsPage";
import { PrivacyPage } from "../components/PrivacyPage";
import { SubPageHeader } from "../components/ManifestComponents";

/* ---------------------------------------------------------
   Shared bits
--------------------------------------------------------- */

const ListRow = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const isDanger = tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 min-h-13 touch-manipulation
                 active:bg-[#F1EFEA] transition-colors"
    >
      <Icon
        className={`shrink-0 ${isDanger ? "text-[#B3452E]" : "text-[#6B6B6B]"}`}
        size={18}
      />
      <span
        className={`flex-1 text-left text-[15px] ${
          isDanger ? "text-[#B3452E] font-medium" : "text-[#1C1B1A]"
        }`}
      >
        {label}
      </span>
      {!isDanger && (
        <FiChevronRight className="shrink-0 text-[#B8B6AF]" size={16} />
      )}
    </button>
  );
};

const SectionLabel = ({ children }) => (
  <p className="px-4 pt-6 pb-2 text-[13px] text-[#8A8983]">{children}</p>
);

const inputClass =
  "w-full rounded-xl border border-[#E8E6E2] bg-white px-3.5 py-3 text-[15px] text-[#1C1B1A] placeholder:text-[#B8B6AF] focus:outline-none focus:ring-2 focus:ring-[#0F5C56]/30 focus:border-[#0F5C56]";

/* ---------------------------------------------------------
   Profile
--------------------------------------------------------- */

const ProfilePage = ({ onBack }) => {
  const { user, client, status, fetchAccount } = useAccountStore();
  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    billing_preference: "prepaid",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // console.log(user, client, status, fetchAccount);

  // useEffect(() => {
  //   fetchAccount();
  // }, []);

  useEffect(() => {
    if (!client) {
      fetchAccount();
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      setForm({
        business_name: client.business_name || "",
        phone: client.phone || "",
        billing_preference: client.billing_preference || "prepaid",
      });
    }
  }, [client]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!client) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("clients")
      .update({
        business_name: form.business_name,
        phone: form.phone,
        billing_preference: form.billing_preference,
      })
      .eq("id", client.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      await fetchAccount();
    }
    setSaving(false);
  };

  if (status === "loading" && !client) {
    return (
      <div
        className="min-h-screen bg-[#FAF9F7]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)" }}
      >
        <SubPageHeader title="Profile" onBack={onBack} />
        <div className="flex items-center justify-center py-16 text-[#8A8983] gap-2">
          <FiLoader className="animate-spin" size={18} />
          <span className="text-[14px]">Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#FAF9F7]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)" }}
    >
      <SubPageHeader title="Profile" onBack={onBack} />
      <form
        onSubmit={handleSave}
        className="max-w-md mx-auto w-full px-4 space-y-4"
      >
        {error && <Banner tone="error">{error}</Banner>}
        {success && <Banner tone="success">Profile updated.</Banner>}

        <div>
          <FieldLabel>Email</FieldLabel>
          <div className="flex items-center gap-2 rounded-xl bg-[#F1EFEA] px-3.5 py-3 text-[15px] text-[#8A8983]">
            <FiMail size={15} />
            {user?.email}
          </div>
        </div>

        <div>
          <FieldLabel>Business name</FieldLabel>
          <input
            className={inputClass}
            value={form.business_name}
            onChange={handleChange("business_name")}
            placeholder="Business name"
          />
        </div>

        <div>
          <FieldLabel>Phone</FieldLabel>
          <input
            className={inputClass}
            value={form.phone}
            onChange={handleChange("phone")}
            placeholder="Phone number"
            type="tel"
            inputMode="tel"
          />
        </div>

        {/* <div>
          <FieldLabel>Billing preference</FieldLabel>
          <select
            className={inputClass}
            value={form.billing_preference}
            onChange={handleChange("billing_preference")}
          >
            <option value="prepaid">Prepaid</option>
            <option value="postpaid">Postpaid</option>
          </select>
        </div> */}

        <div>
          <FieldLabel>Account status</FieldLabel>
          <div className="inline-flex items-center rounded-full bg-[#E7F2EF] px-3 py-1.5 text-[13px] font-medium text-[#0F5C56] capitalize">
            {client?.account_status?.replace(/_/g, " ") || "—"}
          </div>
        </div>

        <div className="pt-2">
          <PrimaryButton loading={saving}>Save changes</PrimaryButton>
        </div>
      </form>
    </div>
  );
};

/* ---------------------------------------------------------
   Static content pages (Support / About / Privacy / Terms)
--------------------------------------------------------- */

const SupportPage = ({ onBack }) => (
  <StaticPage title="Support" onBack={onBack}>
    <p>
      Need help with an order, invoice, or your account? Reach out and we'll get
      back to you.
    </p>
    <div className="rounded-xl border border-[#E8E6E2] bg-white p-2 space-y-1">
      <a
        href="mailto:hello@tuuraalogistics.com"
        className="flex items-center gap-3 px-2 py-3 rounded-lg touch-manipulation active:bg-[#F1EFEA]"
      >
        <FiMail className="text-[#0F5C56] shrink-0" size={18} />
        <span className="text-[#1C1B1A]">support@tuuraalogistics.com</span>
      </a>
      <a
        href="tel:+2347040234374"
        className="flex items-center gap-3 px-2 py-3 rounded-lg touch-manipulation active:bg-[#F1EFEA]"
      >
        <FiPhone className="text-[#0F5C56] shrink-0" size={18} />
        <span className="text-[#1C1B1A]">+234 704 023 4374</span>
      </a>
    </div>
    <p className="text-[#8A8983] text-[13px]">
      Support hours: Mon–Sat, 8am–6pm WAT.
    </p>
  </StaticPage>
);

/* ---------------------------------------------------------
   Root Account component
--------------------------------------------------------- */

const Account = ({ onSignedOut }) => {
  const [view, setView] = useState("list");
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { user, clear, client } = useAccountStore();

  const displayName =
    user?.user_metadata?.business_name || client?.business_name || "Account";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    clear();
    setSigningOut(false);
    setConfirmingSignOut(false);
    onSignedOut?.();
  };

  if (view === "profile") return <ProfilePage onBack={() => setView("list")} />;
  if (view === "password")
    return <ChangePasswordPage onBack={() => setView("list")} />;
  if (view === "support") return <SupportPage onBack={() => setView("list")} />;
  if (view === "about") return <AboutPage onBack={() => setView("list")} />;
  if (view === "privacy") return <PrivacyPage onBack={() => setView("list")} />;
  if (view === "terms") return <TermsPage onBack={() => setView("list")} />;

  return (
    <div
      className="min-h-screen bg-[#FAF9F7]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)" }}
    >
      <div className="max-w-md mx-auto w-full">
        {/* Header */}
        <div
          className="px-4 pb-2"
          style={{ paddingTop: "max(env(safe-area-inset-top), 1.5rem)" }}
        >
          <h1 className="text-[20px] font-semibold text-[#1C1B1A]">Account</h1>
        </div>
        {/* Profile */}
        <button
          type="button"
          onClick={() => setView("profile")}
          className="w-full flex items-center gap-3.5 px-4 py-4 min-h-14 touch-manipulation
                     active:bg-[#F1EFEA] transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-[#0F5C56] flex items-center justify-center text-white text-[17px] font-semibold ring-2 ring-[#0F5C56]/20 shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[16px] font-semibold text-[#1C1B1A] truncate">
              {displayName}
            </p>
            <p className="text-[13px] text-[#6B6B6B] truncate">{user?.email}</p>
          </div>
          <FiEdit2 className="shrink-0 text-[#8A8983]" size={16} />
        </button>
        <div className="h-px bg-[#E8E6E2] mx-4 mt-2" />
        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <div className="divide-y divide-[#E8E6E2]">
          <ListRow
            icon={FiUser}
            label="Profile"
            onClick={() => setView("profile")}
          />
          <ListRow
            icon={FiLock}
            label="Change password"
            onClick={() => setView("password")}
          />
        </div>
        {/* Support & legal */}
        <SectionLabel>Support and legal</SectionLabel>
        <div className="divide-y divide-[#E8E6E2]">
          <ListRow
            icon={FiHelpCircle}
            label="Support"
            onClick={() => setView("support")}
          />
          <ListRow
            icon={FiInfo}
            label="About us"
            onClick={() => setView("about")}
          />
          <ListRow
            icon={FiShield}
            label="Privacy policy"
            onClick={() => setView("privacy")}
          />
          <ListRow
            icon={FiFileText}
            label="Terms of service"
            onClick={() => setView("terms")}
          />
        </div>
        {/* Sign out */}
        <div className="mt-6 px-4">
          {!confirmingSignOut ? (
            <ListRow
              icon={FiLogOut}
              label="Sign out"
              tone="danger"
              onClick={() => setConfirmingSignOut(true)}
            />
          ) : (
            <div className="rounded-xl border border-[#E8E6E2] bg-white p-4">
              <p className="text-[14px] text-[#1C1B1A] mb-3">
                Sign out of your account?
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmingSignOut(false)}
                  className="flex-1 rounded-xl border border-[#E8E6E2] py-3 min-h-11 touch-manipulation
                             text-[14px] font-medium text-[#1C1B1A] active:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#B3452E] py-3 min-h-11
                             touch-manipulation text-[14px] font-medium text-white disabled:opacity-50 active:bg-[#9A3B27]"
                >
                  {signingOut && (
                    <FiLoader className="animate-spin" size={14} />
                  )}
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
