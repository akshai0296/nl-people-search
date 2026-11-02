import { requireRecruiter } from "@/server/auth";
import { json, requireUuid, route } from "@/server/http";
import { addToShortlist, removeFromShortlist } from "@/server/shortlists";

type Ctx = RouteContext<"/api/shortlists/[shortlistId]/people/[personId]">;

async function ids(ctx: Ctx) {
  const { shortlistId, personId } = await ctx.params;
  return { shortlistId: requireUuid(shortlistId, "Shortlist"), personId };
}

/** POST: add a person. Adding someone already on the list changes nothing. */
export const POST = route(async (req, ctx: Ctx) => {
  const recruiter = await requireRecruiter(req);
  const { shortlistId, personId } = await ids(ctx);
  return json(await addToShortlist(recruiter, shortlistId, personId));
});

/** DELETE: remove a person. */
export const DELETE = route(async (req, ctx: Ctx) => {
  const recruiter = await requireRecruiter(req);
  const { shortlistId, personId } = await ids(ctx);
  return json(await removeFromShortlist(recruiter, shortlistId, personId));
});
