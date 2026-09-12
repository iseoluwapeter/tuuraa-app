// supabase/functions/paystack-webhook/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { completeOrder } from "../_shared/completeOrder.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("BASE_URL_SUPABASE")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY_SUPABASE")!;

async function verifySignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // This is what stops anyone from POSTing a fake charge.success event
  // to this public URL and getting a free order created.
  if (!(await verifySignature(rawBody, signature))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Always 200 back to Paystack for events we don't act on, or it will
  // keep retrying them.
  if (event.event !== "charge.success" || !event.data?.reference) {
    return new Response("ok", { status: 200 });
  }

  const paystackReference = event.data.reference;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // The draft is keyed by YOUR reference (paymentRef), not Paystack's own
  // reference — but you set ref: paymentRef when opening the popup, so
  // Paystack's charge.success event's data.reference IS your paymentRef.
  const { data: draft } = await supabase
    .from("checkout_drafts")
    .select("*")
    .eq("payment_reference", paystackReference)
    .maybeSingle();

  if (!draft) {
    // No draft to reconcile against — log this, it means init-checkout
    // was skipped or the reference doesn't match. Still ack to Paystack.
    console.error(
      "paystack-webhook: no draft found for reference",
      paystackReference,
    );
    return new Response("ok", { status: 200 });
  }

  if (draft.status === "completed") {
    return new Response("ok", { status: 200 }); // already handled by the client path
  }

  const result = await completeOrder({
    supabase,
    clientId: draft.client_id,
    reference: draft.payment_reference,
    paystackReference,
    order: draft.order_payload,
  });

  if (!result.ok) {
    console.error("paystack-webhook: completeOrder failed", result.error);
    // Still 200 — a 4xx/5xx tells Paystack to retry, which is fine for
    // transient errors but pointless for a permanently-failed fare check.
    // Rely on your reconciliation sweep to catch anything real here.
  }

  return new Response("ok", { status: 200 });
});
