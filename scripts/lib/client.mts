// Helpers shared by the scripts that exercise the running app like an external client would.
// Run them through scripts/with-supabase-env.sh (the Makefile targets do).

export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
export const SUPABASE_URL = requireEnv("SUPABASE_URL");
export const PUBLISHABLE_KEY = requireEnv("SUPABASE_PUBLISHABLE_KEY");
export const PASSWORD = "people-search-demo";
export const RECRUITERS = { acme: "recruiter@acme.test", globex: "recruiter@globex.test" } as const;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Signs in with Supabase email + password and returns the access token. */
export async function signIn(email: string, password = PASSWORD): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBLISHABLE_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(body)}`);
  return body.access_token as string;
}

export type ApiResult<T = any> = { status: number; body: T; ms: number };

/** Calls this app's API. */
export async function api<T = any>(
  token: string | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const started = performance.now();
  const res = await fetch(`${APP_URL}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed as T, ms: Math.round(performance.now() - started) };
}

/** Calls Supabase's REST API directly, as a recruiter would with their own token. */
export async function rest(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed as any };
}
