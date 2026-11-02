import { requireRecruiter } from "@/server/auth";
import { json, readJson, requireUuid, route } from "@/server/http";
import {
  deleteShortlist,
  getShortlist,
  renameShortlist,
  shortlistNameSchema,
} from "@/server/shortlists";

type Ctx = RouteContext<"/api/shortlists/[shortlistId]">;

const shortlistId = async (ctx: Ctx) => requireUuid((await ctx.params).shortlistId, "Shortlist");

/** GET /api/shortlists/{id}: a shortlist and the people on it. */
export const GET = route(async (req, ctx: Ctx) => {
  const recruiter = await requireRecruiter(req);
  return json(await getShortlist(recruiter, await shortlistId(ctx)));
});

/** PATCH /api/shortlists/{id} { name }: rename. */
export const PATCH = route(async (req, ctx: Ctx) => {
  const recruiter = await requireRecruiter(req);
  const id = await shortlistId(ctx);
  const { name } = await readJson(req, shortlistNameSchema);
  return json(await renameShortlist(recruiter, id, name));
});

/** DELETE /api/shortlists/{id}: delete the list (people stay in the candidate pool). */
export const DELETE = route(async (req, ctx: Ctx) => {
  const recruiter = await requireRecruiter(req);
  await deleteShortlist(recruiter, await shortlistId(ctx));
  return json({ deleted: true });
});
