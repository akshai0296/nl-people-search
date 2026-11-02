import { z } from "zod";
import { requireRecruiter } from "@/server/auth";
import { json, readJson, route } from "@/server/http";
import { createSearch } from "@/server/search/service";

const bodySchema = z.object({
  brief: z.string(),
  // Optional: corrected filters. When present the brief is not re-interpreted.
  filters: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/search: run a new search from a brief (or a brief plus corrected filters). */
export const POST = route(async (req) => {
  const recruiter = await requireRecruiter(req);
  const body = await readJson(req, bodySchema);
  return json(await createSearch(recruiter, body));
});
