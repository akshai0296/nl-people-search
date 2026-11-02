import { requireRecruiter } from "@/server/auth";
import { json, route } from "@/server/http";
import { getPlan } from "@/server/search/service";

/** GET /api/plan: { plan: "free" | "paid", searches_remaining: number | null } */
export const GET = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  return json(await getPlan(recruiter));
});
