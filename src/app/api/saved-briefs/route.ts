import { requireRecruiter } from "@/server/auth";
import { json, readJson, route } from "@/server/http";
import { listSavedBriefs, saveBrief, saveBriefSchema } from "@/server/saved-briefs";

/** GET /api/saved-briefs: the company's saved searches, newest first. */
export const GET = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  return json(await listSavedBriefs(recruiter));
});

/** POST /api/saved-briefs { brief, filters }: save a search to re-run later. */
export const POST = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  const body = await readJson(req, saveBriefSchema);
  return json(await saveBrief(recruiter, body));
});
