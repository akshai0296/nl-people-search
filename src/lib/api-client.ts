"use client";

import { supabaseBrowser } from "./supabase-browser";
import type { ApiErrorBody } from "./types";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Calls this app's API as the signed-in recruiter (the same API external clients use). */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiClientError(401, "unauthorized", "Sign in to continue.");

  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, "network_error", "Can't reach People Search. Check your connection and try again.");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    if (res.status === 401) await supabaseBrowser().auth.signOut({ scope: "local" });
    throw new ApiClientError(
      res.status,
      error?.code ?? "error",
      error?.message ?? "Something went wrong. Please try again.",
    );
  }
  return body as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
