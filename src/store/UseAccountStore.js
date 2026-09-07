import { create } from "zustand";
import { supabase } from "../components/supabaseClient";

export const useAccountStore = create((set) => ({
  user: null, // supabase auth user
  client: null, // row from `clients`: id, business_name, account_status, billing_preference
  businessProfileSubmitted: null, // only meaningful when client.account_status === "pending_activation"
  status: "loading", // "loading" | "signed-out" | "ready" | "error"

  fetchAccount: async () => {
    set({ status: "loading" });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      set({
        user: null,
        client: null,
        businessProfileSubmitted: null,
        status: "signed-out",
      });
      return;
    }

    const { data: client, error } = await supabase
      .from("clients")
      .select("id, business_name, account_status, phone, billing_preference")
      .eq("auth_user_id", user.id)
      .single();

    if (error || !client) {
      set({
        user,
        client: null,
        businessProfileSubmitted: null,
        status: "error",
      });
      return;
    }

    let businessProfileSubmitted = null;
    if (client.account_status === "pending_activation") {
      const { data: profile } = await supabase
        .from("client_business_profiles")
        .select("id")
        .eq("client_id", client.id)
        .maybeSingle();
      businessProfileSubmitted = !!profile;
    }

    set({ user, client, businessProfileSubmitted, status: "ready" });
  },

  clear: () =>
    set({
      user: null,
      client: null,
      businessProfileSubmitted: null,
      status: "signed-out",
    }),
}));
