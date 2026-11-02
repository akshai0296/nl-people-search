import { requireRecruiter } from "@/server/auth";
import { json, requireUuid, route } from "@/server/http";
import { deleteSavedBrief } from "@/server/saved-briefs";

/** DELETE /api/saved-briefs/{id} */
export const DELETE = route(async (req, ctx: RouteContext<"/api/saved-briefs/[id]">) => {
  const recruiter = await requireRecruiter(req);
  await deleteSavedBrief(recruiter, requireUuid((await ctx.params).id, "Saved search"));
  return json({ deleted: true });
});
