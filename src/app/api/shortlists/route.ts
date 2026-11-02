import { requireRecruiter } from "@/server/auth";
import { json, readJson, route } from "@/server/http";
import { createShortlist, listShortlists, shortlistNameSchema } from "@/server/shortlists";

/** GET /api/shortlists: the company's shortlists, most recently used first. */
export const GET = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  return json(await listShortlists(recruiter));
});

/** POST /api/shortlists { name }: create a shortlist, returning its id. */
export const POST = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  const { name } = await readJson(req, shortlistNameSchema);
  return json(await createShortlist(recruiter, name));
});
