import React, { createContext, useContext } from "react";

// Populated by AccountStatusGuard. Anything mounted under the guard (Home,
// Order, etc.) can read this to decide what to show/disable — rather than
// the guard deciding for them by redirecting. Only a genuinely blocking
// state (no business profile yet, or suspended) should ever cause a
// redirect; "pending review" is a normal, present-in-the-app state.
const AccountContext = createContext(null);

export const useAccountStatus = () => {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error(
      "useAccountStatus must be used within a screen rendered inside AccountStatusGuard",
    );
  }
  return ctx;
};

// Shape provided: { accountStatus, billingPreference, isPendingReview, clientId }
export const AccountStatusProvider = AccountContext.Provider;
