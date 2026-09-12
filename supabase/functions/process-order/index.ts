// supabase/functions/process-order/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { completeOrder } from "../_shared/completeOrder.ts";

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

  const { data: callerClientRow, error: clientLookupError } = await supabase
    .from("clients")
    .select("id, account_status")
    .eq("auth_user_id", caller.id)
    .single();

  if (clientLookupError || !callerClientRow)
    return json({ error: "No client account found." }, 403);
  if (callerClientRow.account_status !== "active")
    return json({ error: "Account is not active for ordering." }, 403);

  let body: {
    reference?: string;
    order?: Record<string, unknown>;
    paystack_reference?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { reference, order, paystack_reference: paystackReference } = body;
  if (!reference || typeof reference !== "string")
    return json({ error: "A payment reference is required." }, 400);
  if (!order || typeof order !== "object")
    return json({ error: "Order details are required." }, 400);
  if (!paystackReference || typeof paystackReference !== "string")
    return json({ error: "Missing Paystack transaction reference." }, 400);

  const result = await completeOrder({
    supabase,
    clientId: callerClientRow.id,
    reference,
    paystackReference,
    order,
  });

  if (!result.ok)
    return json({ error: result.error, code: result.code }, result.status);
  return json({ order: result.order, replay: result.replay });
});
