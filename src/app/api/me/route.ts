import { requireRecruiter } from "@/server/auth";
import { check, json, notFound, route } from "@/server/http";

/** GET /api/me: the signed-in recruiter and their company. */
export const GET = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  const row = check(
    await recruiter.db
      .from("recruiters")
      .select("full_name, companies (slug, name)")
      .eq("user_id", recruiter.userId)
      .maybeSingle(),
    "get recruiter",
  );
  if (!row) throw notFound("Recruiter not found");
  return json({ full_name: row.full_name, company: row.companies });
});
