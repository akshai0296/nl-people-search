import "server-only";
import { z } from "zod";
import type { ShortlistDetail, ShortlistSummary } from "@/lib/types";
import type { Recruiter } from "./auth";
import { CARD_COLUMNS, isCandidateId, toCard } from "./candidates";
import { check, checkRows, notFound } from "./http";

// Every query here runs as the recruiter, so row level security limits it to their company:
// another company's shortlist simply doesn't exist from this side, and shows up as a 404.

export const shortlistNameSchema = z.object({
  name: z.string().trim().min(1, "Give the list a name.").max(80, "Keep the name under 80 characters."),
});

const PREVIEW_SIZE = 4;

export async function listShortlists(recruiter: Recruiter): Promise<ShortlistSummary[]> {
  const rows = checkRows(
    await recruiter.db
      .from("shortlists")
      .select(
        "id, name, created_at, updated_at, shortlist_members (candidate_id, added_at, candidates (full_name, avatar_url))",
      )
      .order("updated_at", { ascending: false }),
    "list shortlists",
  );
  return rows.map(({ shortlist_members: members, ...list }) => {
    const newestFirst = [...members].sort((a, b) => b.added_at.localeCompare(a.added_at));
    return {
      ...list,
      count: members.length,
      person_ids: newestFirst.map((m) => m.candidate_id),
      preview: newestFirst.slice(0, PREVIEW_SIZE).map((m) => ({
        id: m.candidate_id,
        full_name: m.candidates?.full_name ?? "",
        avatar_url: m.candidates?.avatar_url ?? null,
      })),
    };
  });
}

export async function createShortlist(recruiter: Recruiter, name: string) {
  return check(
    await recruiter.db
      .from("shortlists")
      .insert({ name })
      .select("id, name, created_at, updated_at")
      .single(),
    "create shortlist",
  );
}

export async function getShortlist(recruiter: Recruiter, id: string): Promise<ShortlistDetail> {
  const row = check(
    await recruiter.db
      .from("shortlists")
      .select(`id, name, created_at, updated_at, shortlist_members (added_at, candidates (${CARD_COLUMNS}))`)
      .eq("id", id)
      .maybeSingle(),
    "get shortlist",
  );
  if (!row) throw notFound("Shortlist not found");
  const { shortlist_members: members, ...list } = row;
  return {
    ...list,
    people: members
      .filter((m) => m.candidates)
      .sort((a, b) => b.added_at.localeCompare(a.added_at))
      .map((m) => ({ ...toCard(m.candidates!), added_at: m.added_at })),
  };
}

export async function renameShortlist(recruiter: Recruiter, id: string, name: string) {
  const row = check(
    await recruiter.db
      .from("shortlists")
      .update({ name })
      .eq("id", id)
      .select("id, name, created_at, updated_at")
      .maybeSingle(),
    "rename shortlist",
  );
  if (!row) throw notFound("Shortlist not found");
  return row;
}

export async function deleteShortlist(recruiter: Recruiter, id: string) {
  const rows = checkRows(
    await recruiter.db.from("shortlists").delete().eq("id", id).select("id"),
    "delete shortlist",
  );
  if (rows.length === 0) throw notFound("Shortlist not found");
}

async function requireVisibleShortlist(recruiter: Recruiter, id: string) {
  const row = check(
    await recruiter.db.from("shortlists").select("id").eq("id", id).maybeSingle(),
    "find shortlist",
  );
  if (!row) throw notFound("Shortlist not found");
}

/** Adds a person; adding someone already on the list changes nothing. */
export async function addToShortlist(recruiter: Recruiter, shortlistId: string, personId: string) {
  await requireVisibleShortlist(recruiter, shortlistId);
  if (!isCandidateId(personId)) throw notFound("Person not found");
  const person = check(
    await recruiter.db.from("candidates").select("id").eq("id", personId).maybeSingle(),
    "find person",
  );
  if (!person) throw notFound("Person not found");

  const inserted = checkRows(
    await recruiter.db
      .from("shortlist_members")
      .upsert(
        { shortlist_id: shortlistId, candidate_id: personId },
        { onConflict: "shortlist_id,candidate_id", ignoreDuplicates: true },
      )
      .select("candidate_id"),
    "add to shortlist",
  );
  return { added: inserted.length > 0 };
}

export async function removeFromShortlist(recruiter: Recruiter, shortlistId: string, personId: string) {
  await requireVisibleShortlist(recruiter, shortlistId);
  const removed = checkRows(
    await recruiter.db
      .from("shortlist_members")
      .delete()
      .eq("shortlist_id", shortlistId)
      .eq("candidate_id", personId)
      .select("candidate_id"),
    "remove from shortlist",
  );
  return { removed: removed.length > 0 };
}
