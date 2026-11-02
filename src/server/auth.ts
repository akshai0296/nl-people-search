import "server-only";
import { ApiError } from "./http";
import { recruiterDb, type Db } from "./supabase";

export type Recruiter = {
  userId: string;
  companyId: string;
  /** A client scoped to this recruiter: row level security applies to everything it does. */
  db: Db;
};

const unauthorized = () => new ApiError(401, "unauthorized", "Sign in to continue.");

/**
 * Authenticates `Authorization: Bearer <Supabase access token>` and resolves the recruiter's
 * company, which always comes from the database, never from the request.
 *
 * One query does both jobs: PostgREST verifies the token's signature and expiry before running
 * anything (forged or expired tokens are rejected), and row level security returns only the
 * caller's own recruiter row (a valid token for anyone who isn't a recruiter gets nothing).
 */
export async function requireRecruiter(req: Request): Promise<Recruiter> {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization")?.trim() ?? "");
  if (!match) throw unauthorized();
  const db = recruiterDb(match[1]);

  const { data, error, status } = await db.from("recruiters").select("user_id, company_id").maybeSingle();
  if (error) {
    if (status >= 500 || status === 0) throw new Error(`recruiter lookup: ${error.message}`);
    throw unauthorized();
  }
  if (!data) throw new ApiError(403, "forbidden", "This account isn't set up as a recruiter.");
  return { userId: data.user_id, companyId: data.company_id, db };
}
