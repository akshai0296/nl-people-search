"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * The browser's Supabase client, used for sign-in and session refresh only; all data goes
 * through this app's /api routes. It talks to Supabase Auth through the app's own origin
 * (proxied in next.config.ts) with the publishable key, which is public by design.
 */
export function supabaseBrowser(): SupabaseClient {
  client ??= createClient(
    `${window.location.origin}/supabase`,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true, storageKey: "people-search-session" } },
  );
  return client;
}
