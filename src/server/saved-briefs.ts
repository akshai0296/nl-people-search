import "server-only";
import { z } from "zod";
import { sanitizeFilters } from "@/lib/filters";
import type { SavedBrief } from "@/lib/types";
import type { Recruiter } from "./auth";
import { check, checkRows, notFound } from "./http";
import { MAX_BRIEF_LENGTH } from "./search/service";
import { getVocabulary } from "./search/vocabulary";

export const saveBriefSchema = z.object({
  brief: z.string().trim().min(1, "The brief is empty.").max(MAX_BRIEF_LENGTH),
  filters: z.record(z.string(), z.unknown()),
});

export async function listSavedBriefs(recruiter: Recruiter): Promise<SavedBrief[]> {
  const rows = checkRows(
    await recruiter.db
      .from("saved_briefs")
      .select("id, brief, filters, created_at")
      .order("created_at", { ascending: false }),
    "list saved briefs",
  );
  return rows as unknown as SavedBrief[];
}

export async function saveBrief(
  recruiter: Recruiter,
  input: z.output<typeof saveBriefSchema>,
): Promise<SavedBrief> {
  // Any filters object is accepted; only the parts that can actually run are kept, so a saved
  // search always re-runs cleanly.
  const filters = sanitizeFilters(await getVocabulary(), input.filters);
  const row = check(
    await recruiter.db
      .from("saved_briefs")
      .insert({ brief: input.brief, filters })
      .select("id, brief, filters, created_at")
      .single(),
    "save brief",
  );
  return row as unknown as SavedBrief;
}

export async function deleteSavedBrief(recruiter: Recruiter, id: string) {
  const rows = checkRows(
    await recruiter.db.from("saved_briefs").delete().eq("id", id).select("id"),
    "delete saved brief",
  );
  if (rows.length === 0) throw notFound("Saved search not found");
}
