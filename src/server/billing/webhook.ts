import "server-only";
import { z } from "zod";
import { env } from "../env";
import { ApiError, check } from "../http";
import { adminDb } from "../supabase";
import { verifyStripeSignature } from "./stripe-signature";

// Stripe webhook handling. Correctness comes from the database function it calls:
//  - signature: verified here before anything is parsed or stored
//  - repeats: billing_events.id is the Stripe event id, so a redelivery is a no-op
//  - ordering: each subscription keeps the newest event's `created`; older events are stale

const eventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  created: z.number().int().nonnegative(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

const subscriptionSchema = z.object({
  id: z.string().min(1).max(255),
  status: z.string().min(1).max(64),
  customer: z.union([z.string(), z.object({ id: z.string() })]).nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  current_period_end: z.number().int().nullish(),
});

export type WebhookOutcome = "applied" | "stale" | "duplicate" | "ignored";

export async function handleStripeEvent(
  rawBody: Buffer,
  signature: string | null,
): Promise<WebhookOutcome> {
  const valid = verifyStripeSignature(rawBody, signature, env.stripeWebhookSecret, {
    toleranceSeconds: env.stripeWebhookToleranceSeconds,
  });
  if (!valid) throw new ApiError(400, "invalid_signature", "Invalid Stripe signature.");

  // Signed by Stripe but not an event we understand: acknowledge it (200) so Stripe doesn't keep
  // retrying something that will never succeed. Only a bad signature is a 400.
  let event: z.output<typeof eventSchema>;
  try {
    event = eventSchema.parse(JSON.parse(rawBody.toString("utf8")));
  } catch {
    return "ignored";
  }

  const db = adminDb();
  const subscription = event.type.startsWith("customer.subscription.")
    ? subscriptionSchema.safeParse(event.data.object)
    : null;

  if (!subscription?.success) {
    const outcome = check(
      await db.rpc("record_ignored_billing_event", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_event_created: event.created,
      }),
      "record_ignored_billing_event",
    );
    return outcome as WebhookOutcome;
  }

  const sub = subscription.data;
  const company = sub.metadata?.company;
  const outcome = check(
    await db.rpc("apply_subscription_event", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created: event.created,
      p_subscription_id: sub.id,
      p_customer_id: (typeof sub.customer === "string" ? sub.customer : sub.customer?.id) ?? "",
      p_company_slug: typeof company === "string" ? company.trim().toLowerCase() : "",
      p_status: sub.status,
      p_current_period_end: sub.current_period_end ?? (null as unknown as number),
    }),
    "apply_subscription_event",
  );
  return outcome as WebhookOutcome;
}
