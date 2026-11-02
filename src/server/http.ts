import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { ApiErrorBody } from "@/lib/types";

/** An error with a status code and a message that is safe to show to the caller. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new ApiError(404, "not_found", what);
export const badRequest = (message: string) => new ApiError(400, "bad_request", message);

export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Wraps a route handler: ApiErrors become JSON error responses, anything else is logged and
 * becomes a generic 500 so internals never leak to the client.
 */
export function route<C>(handler: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return json<ApiErrorBody>({ error: { code: error.code, message: error.message } }, error.status);
      }
      console.error(`${req.method} ${req.nextUrl.pathname} failed`, error);
      return json<ApiErrorBody>(
        { error: { code: "internal_error", message: "Something went wrong. Please try again." } },
        500,
      );
    }
  };
}

/** Parses a JSON body against a schema, turning any problem into a 400. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    throw badRequest(path ? `${path}: ${issue.message}` : (issue?.message ?? "Invalid request body."));
  }
  return parsed.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Path ids that aren't UUIDs can't exist, so they are a 404 rather than a database error. */
export function requireUuid(value: string, what: string): string {
  if (!UUID.test(value)) throw notFound(`${what} not found`);
  return value.toLowerCase();
}

/** Throws a plain 500 for unexpected database errors (logged by route()). */
export function check<T>(result: { data: T; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

/** check() for queries that return rows. */
export function checkRows<T>(
  result: { data: T[] | null; error: { message: string } | null },
  context: string,
): T[] {
  return check(result, context) ?? [];
}
