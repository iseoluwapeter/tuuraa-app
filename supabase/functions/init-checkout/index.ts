// supabase/functions/init-checkout/index.ts
//
// Called right before the Paystack popup opens. Confirms price AND writes
// the pending draft in one call, so there's a row to reconcile against
// no matter what happens to the browser afterward.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { computeFare, isFareError } from "../_shared/pricingEngine.ts";

const SUPABASE_URL = Deno.env.get("BASE_URL_SUPABASE")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY_SUPABASE")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization." }, 401);

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();
  if (callerError || !caller)
    return json({ error: "Invalid or expired session." }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: clientRow, error: clientLookupError } = await supabase
    .from("clients")
    .select("id, account_status")
    .eq("auth_user_id", caller.id)
    .single();

  if (clientLookupError || !clientRow)
    return json({ error: "No client account found." }, 403);
  if (clientRow.account_status !== "active")
    return json({ error: "Account is not active for ordering." }, 403);

  let body: { reference?: string; order?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { reference, order } = body;
  if (!reference || typeof reference !== "string")
    return json({ error: "A reference is required." }, 400);
  if (!order || typeof order !== "object")
    return json({ error: "Order details are required." }, 400);

  const fare = computeFare(order);
  if (isFareError(fare)) {
    const status =
      fare.code === "UNSERVICEABLE_PICKUP_ZONE" ||
      fare.code === "PICKUP_LOCATION_OUTSIDE_ZONE"
        ? 422
        : 400;
    return json({ error: fare.message, code: fare.code }, status);
  }

  // Upsert: the customer may hit "Pay" more than once on a retry with the
  // same paymentRef (e.g. after fixing a validation error) — refresh the
  // draft rather than reject.
  const { error: draftError } = await supabase.from("checkout_drafts").upsert(
    {
      payment_reference: reference,
      client_id: clientRow.id,
      order_payload: order,
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "payment_reference" },
  );

  if (draftError) return json({ error: "Could not initialize checkout." }, 500);

  return json({ quote: fare });
});
