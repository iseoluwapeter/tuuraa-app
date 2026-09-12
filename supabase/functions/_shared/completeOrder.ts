// supabase/functions/_shared/completeOrder.ts
//
// The ONE place a paid order gets written. Called from both process-order
// (client-callback path) and paystack-webhook (server path). Whichever
// caller wins the race, the other's call becomes a no-op replay — the
// unique index on payments.payment_reference is what guarantees that.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { computeFare, isFareError } from "./pricingEngine.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const UNIQUE_VIOLATION = "23505";

export type CompleteOrderInput = {
  supabase: SupabaseClient;
  clientId: string;
  reference: string; // your idempotency key (paymentRef)
  paystackReference: string; // the reference Paystack verified against
  order: Record<string, unknown>;
};

export type CompleteOrderResult =
  | { ok: true; order: unknown; replay: boolean }
  | { ok: false; status: number; error: string; code?: string };

export async function completeOrder(
  input: CompleteOrderInput,
): Promise<CompleteOrderResult> {
  const { supabase, clientId, reference, paystackReference, order } = input;

  // Idempotency fast-path.
  const { data: existingPayment, error: existingError } = await supabase
    .from("payments")
    .select("*, order:orders(*)")
    .eq("payment_reference", reference)
    .maybeSingle();

  if (existingError) {
    return { ok: false, status: 500, error: "Could not check order status." };
  }
  if (existingPayment) {
    return { ok: true, order: existingPayment.order, replay: true };
  }

  const fare = computeFare(order);
  if (isFareError(fare)) {
    const status =
      fare.code === "UNSERVICEABLE_PICKUP_ZONE" ||
      fare.code === "PICKUP_LOCATION_OUTSIDE_ZONE"
        ? 422
        : 400;
    return { ok: false, status, error: fare.message, code: fare.code };
  }

  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackReference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  const verifyJson = await verifyRes.json();

  if (
    !verifyRes.ok ||
    !verifyJson?.status ||
    verifyJson.data?.status !== "success"
  ) {
    return {
      ok: false,
      status: 402,
      error: "Payment could not be verified with Paystack.",
    };
  }

  const tx = verifyJson.data;
  const expectedKobo = Math.round(fare.total * 100);

  if (tx.currency !== "NGN" || Math.abs(tx.amount - expectedKobo) > 1) {
    return {
      ok: false,
      status: 402,
      error: "Paid amount does not match the order total.",
    };
  }

  const { data: newOrder, error: rpcError } = await supabase.rpc(
    "create_order_with_payment",
    {
      order_data: {
        ...order,
        client_id: clientId,
        delivery_distance_km: fare.distanceKm,
        fare_breakdown: fare.breakdown,
      },
      payment_data: {
        payment_reference: reference,
        paystack_reference: paystackReference,
        channel: tx.channel,
        amount: tx.amount / 100,
        currency: tx.currency,
        status: "paid",
        paystack_response: tx,
      },
    },
  );

  if (rpcError) {
    if (rpcError.code === UNIQUE_VIOLATION) {
      const { data: winner } = await supabase
        .from("payments")
        .select("*, order:orders(*)")
        .eq("payment_reference", reference)
        .maybeSingle();
      if (winner) return { ok: true, order: winner.order, replay: true };
    }
    return { ok: false, status: 500, error: rpcError.message };
  }

  // Mark the draft consumed so a reconciliation sweep never touches it again.
  await supabase
    .from("checkout_drafts")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("payment_reference", reference);

  return { ok: true, order: newOrder, replay: false };
}
