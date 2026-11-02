import { requireRecruiter } from "@/server/auth";
import { getCandidate } from "@/server/candidates";
import { json, route } from "@/server/http";

/** GET /api/people/{id}: one candidate with experience and education. */
export const GET = route(async (req, ctx: RouteContext<"/api/people/[id]">) => {
  const recruiter = await requireRecruiter(req);
  return json(await getCandidate(recruiter, (await ctx.params).id));
});
