import { requireRecruiter } from "@/server/auth";
import { badRequest, json, requireUuid, route } from "@/server/http";
import { getSearchPage } from "@/server/search/service";

/** GET /api/search/{search_id}?page=N: a page of a stored search. Never counts as a search. */
export const GET = route(async (req, ctx: RouteContext<"/api/search/[searchId]">) => {
  const recruiter = await requireRecruiter(req);
  const searchId = requireUuid((await ctx.params).searchId, "Search");
  const raw = req.nextUrl.searchParams.get("page") ?? "1";
  if (!/^\d{1,6}$/.test(raw) || Number(raw) < 1) throw badRequest("page must be a whole number from 1.");
  return json(await getSearchPage(recruiter, searchId, Number(raw)));
});
