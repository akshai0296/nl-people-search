import { requireRecruiter } from "@/server/auth";
import { json, route } from "@/server/http";
import { getVocabulary } from "@/server/search/vocabulary";

/** GET /api/facets: every value the search can filter by, for the filter editor. */
export const GET = route(async (req) => {
  await requireRecruiter(req);
  return json(await getVocabulary());
});
