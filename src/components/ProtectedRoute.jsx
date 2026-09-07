import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAccountStore } from "../store/UseAccountStore";

// Wrap routes that require an active-or-pending account: /home, /order, etc.
// Does NOT wrap /business-details — that stays reachable while it's the
// thing standing between the user and being let in at all.
//
// No longer fetches its own copy of the client row, and no longer needs a
// Context provider — useAccountStore() is readable from anywhere, including
// directly inside Home, without this component being an ancestor. This
// component's only remaining job is the redirect decision itself.
//
// Usage — layout route, renders nested routes via <Outlet />:
//   <Route element={<AccountStatusGuard />}>
//     <Route path="/home" element={<Home />} />
//     <Route path="/order" element={<Order />} />
//   </Route>

const ProtectedRoute = () => {
  const { status, client, businessProfileSubmitted } = useAccountStore();

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-emerald-800" />
      </div>
    );
  }

  if (status === "signed-out") {
    return <Navigate to="/" replace />;
  }

  if (status === "error" || !client) {
    // Fail open on an unexpected read error — an outage in this check
    // shouldn't lock an otherwise-active client out of /home.
    return <Outlet />;
  }

  if (client.account_status === "suspended") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-white px-6 text-center">
        <p className="font-poppins text-sm font-semibold text-neutral-900">
          Your account is suspended
        </p>
        <p className="font-poppins text-sm text-neutral-500">
          Contact Tuuraa support to resolve this.
        </p>
      </div>
    );
  }

  if (
    client.account_status === "pending_activation" &&
    !businessProfileSubmitted
  ) {
    return <Navigate to="/business-details" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
