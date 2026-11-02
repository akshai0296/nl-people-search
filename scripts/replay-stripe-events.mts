// Replays data/stripe-events.json against the running app, in file order, and prints each
// company's plan after every event. Payloads are sent byte for byte; signatures are re-made with
// STRIPE_WEBHOOK_SECRET and the current time. Finishes with a bad-signature check.
//
// The plans are only meaningful on a fresh database (make setup), since events are idempotent.
import "./lib/env-files.mts";
import { readFile } from "node:fs/promises";
import { signStripePayload } from "../src/server/billing/stripe-signature.ts";
import { APP_URL, RECRUITERS, api, requireEnv, signIn } from "./lib/client.mts";

const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
const file = JSON.parse(await readFile(new URL("../data/stripe-events.json", import.meta.url), "utf8"));
const tokens = { acme: await signIn(RECRUITERS.acme), globex: await signIn(RECRUITERS.globex) };

async function send(payload: string, signature: string) {
  const res = await fetch(`${APP_URL}/api/billing/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function plans() {
  const [acme, globex] = await Promise.all([
    api(tokens.acme, "GET", "/api/plan"),
    api(tokens.globex, "GET", "/api/plan"),
  ]);
  return `acme=${acme.body.plan} globex=${globex.body.plan}`;
}

for (const event of file.events) {
  const signature = signStripePayload(event.payload, secret, Math.floor(Date.now() / 1000));
  const res = await send(event.payload, signature);
  console.log(`${event.description.padEnd(36)} → ${res.status} ${res.body?.outcome ?? JSON.stringify(res.body)}  (${await plans()})`);
}
console.log(`expected after all events:            acme=${file.expected_plans_after.acme} globex=${file.expected_plans_after.globex}`);

const tampered = await send(file.events[0].payload.replace('"active"', '"trialing"'), signStripePayload(file.events[0].payload, secret, Math.floor(Date.now() / 1000)));
const wrongSecret = await send(file.events[0].payload, signStripePayload(file.events[0].payload, "whsec_wrong", Math.floor(Date.now() / 1000)));
const missing = await send(file.events[0].payload, "");
console.log(`bad signatures → tampered ${tampered.status}, wrong secret ${wrongSecret.status}, missing ${missing.status} (expect 400s)`);
