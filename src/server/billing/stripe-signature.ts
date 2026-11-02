// Stripe webhook signatures (https://docs.stripe.com/webhooks#verify-manually).
// The Stripe-Signature header is "t=<unix seconds>,v1=<hex HMAC-SHA256>[,v1=...]", where the
// HMAC is over "<t>.<raw request body>" keyed with the endpoint's whsec_ secret.
// No dependencies, so it can be unit tested directly with `node --test`.
import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifyOptions = {
  /** Reject signatures older (or newer) than this many seconds. Null disables the check. */
  toleranceSeconds?: number | null;
  nowSeconds?: number;
};

function expectedSignature(timestamp: string, payload: Buffer | string, secret: string): Buffer {
  return createHmac("sha256", secret).update(`${timestamp}.`).update(payload).digest();
}

export function verifyStripeSignature(
  payload: Buffer | string,
  header: string | null,
  secret: string,
  { toleranceSeconds = null, nowSeconds = Math.floor(Date.now() / 1000) }: VerifyOptions = {},
): boolean {
  if (!header || !secret) return false;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    else if (key === "v1") signatures.push(value);
  }
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || signatures.length === 0) return false;
  if (toleranceSeconds !== null && Math.abs(nowSeconds - Number(timestamp)) > toleranceSeconds) {
    return false;
  }

  const expected = expectedSignature(timestamp, payload, secret);
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    return timingSafeEqual(Buffer.from(signature, "hex"), expected);
  });
}

/** Builds a Stripe-Signature header. Used by tests and the event replay script. */
export function signStripePayload(payload: string, secret: string, timestamp: number): string {
  return `t=${timestamp},v1=${expectedSignature(String(timestamp), payload, secret).toString("hex")}`;
}
