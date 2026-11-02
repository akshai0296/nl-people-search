import "server-only";

// Server-only configuration. Everything here comes from the environment; the Supabase values
// are exported by scripts/with-supabase-env.sh from the running local stack. Read lazily so a
// missing variable fails the request that needs it, not the build.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get stripeWebhookSecret() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  /** Optional replay window for webhook signatures, in seconds. Unset means no age check. */
  get stripeWebhookToleranceSeconds(): number | null {
    const raw = process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS;
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  },
};
