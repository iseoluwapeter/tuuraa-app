import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import AppShell from "./layouts/AppShell";
import AuthLayout from "./layouts/AuthLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Businessdetails from "./pages/Businessdetails";
// import AccountStatusGuard from "./components/Accountstatusguard";
import { supabase } from "./components/supabaseClient";
import { useAccountStore } from "./store/UseAccountStore";
import ProtectedRoute from "./components/ProtectedRoute";
import Deliveries from "./pages/Deliveries";
import NewManifest from "./pages/NewManifest";
import DeliveryDetail from "./pages/DeliveryDetail";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "./components/queryClient";
import Account from "./pages/Account";

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "tuuraa-query-cache",
});

export default function App() {
  const fetchAccount = useAccountStore((s) => s.fetchAccount);

  // Populate the store once on boot, and keep it in sync with auth events —
  // login (including the auto-login right after OTP verification), logout,
  // and token refresh all need to re-resolve who's signed in and what their
  // account looks like, not just the very first page load.
  useEffect(() => {
    fetchAccount();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      fetchAccount();
    });

    return () => subscription.subscription.unsubscribe();
  }, [fetchAccount]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <Routes>
        {/* No top bar / bottom tabs — full-screen auth flow */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Persistent app shell — everything past login */}
        <Route element={<AppShell />}>
          {/* Outside the guard on purpose: the one route a pending client
            with no submitted profile must still be able to reach. */}
          <Route path="/business-details" element={<Businessdetails />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/deliveries/:id" element={<DeliveryDetail />} />
            <Route path="/new-manifest" element={<NewManifest />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Route>
      </Routes>
    </PersistQueryClientProvider>
  );
}
