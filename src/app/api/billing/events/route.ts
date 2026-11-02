import { handleStripeEvent } from "@/server/billing/webhook";
import { json, route } from "@/server/http";

/**
 * POST /api/billing/events: Stripe webhook endpoint (no recruiter token).
 * 400 for a bad signature; 200 otherwise, including repeats, stale and unrecognised events.
 */
export const POST = route(async (req) => {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const outcome = await handleStripeEvent(rawBody, req.headers.get("stripe-signature"));
  return json({ received: true, outcome });
});
