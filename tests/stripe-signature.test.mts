import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { signStripePayload, verifyStripeSignature } from "../src/server/billing/stripe-signature.ts";

const secret = "whsec_test_secret";
const payload = JSON.stringify({ id: "evt_1", type: "customer.subscription.created" });
const now = 1_800_000_000;

test("accepts a correctly signed payload", () => {
  assert.equal(verifyStripeSignature(payload, signStripePayload(payload, secret, now), secret), true);
});

test("verifies the sample events with their stored signatures", () => {
  const sample = JSON.parse(readFileSync("data/stripe-events.json", "utf8"));
  for (const event of sample.events) {
    assert.equal(
      verifyStripeSignature(event.payload, event.headers["Stripe-Signature"], "whsec_people_search_demo"),
      true,
      event.description,
    );
  }
});

test("rejects a tampered payload, a wrong secret and missing or malformed headers", () => {
  const header = signStripePayload(payload, secret, now);
  assert.equal(verifyStripeSignature(payload.replace("evt_1", "evt_2"), header, secret), false);
  assert.equal(verifyStripeSignature(payload, header, "whsec_other"), false);
  assert.equal(verifyStripeSignature(payload, null, secret), false);
  assert.equal(verifyStripeSignature(payload, "", secret), false);
  assert.equal(verifyStripeSignature(payload, "t=abc,v1=00", secret), false);
  assert.equal(verifyStripeSignature(payload, `t=${now}`, secret), false);
  assert.equal(verifyStripeSignature(payload, header.replace(/v1=./, "v1=z"), secret), false);
});

test("accepts any matching v1 signature among several (secret rotation)", () => {
  const good = signStripePayload(payload, secret, now).split(",")[1];
  const header = `t=${now},v1=${"0".repeat(64)},${good}`;
  assert.equal(verifyStripeSignature(payload, header, secret), true);
});

test("applies the replay window only when one is configured", () => {
  const old = signStripePayload(payload, secret, now - 3600);
  assert.equal(verifyStripeSignature(payload, old, secret, { nowSeconds: now }), true);
  assert.equal(verifyStripeSignature(payload, old, secret, { nowSeconds: now, toleranceSeconds: 300 }), false);
});
