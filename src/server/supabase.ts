import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { env } from "./env";

export type Db = SupabaseClient<Database>;

const serverAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** Every call to Supabase gets a deadline, so a stalled connection fails fast instead of hanging. */
const TIMEOUT_MS = 10_000;
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
};

let admin: Db | undefined;

/**
 * Service-role client: bypasses row level security. Used only for the operations no recruiter
 * may perform directly (running a metered search, applying billing events), always with a
 * company id taken from the verified session, never from the request.
 */
export function adminDb(): Db {
  admin ??= createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: serverAuth,
    global: { fetch: fetchWithTimeout },
  });
  return admin;
}

/**
 * A client that acts as the signed-in recruiter. Every query it makes is subject to row level
 * security, so the database itself keeps each company's data to that company.
 */
export function recruiterDb(accessToken: string): Db {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: serverAuth,
    global: { headers: { Authorization: `Bearer ${accessToken}` }, fetch: fetchWithTimeout },
  });
}
