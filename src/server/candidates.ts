import "server-only";
import type { Candidate, CandidateCard } from "@/lib/types";
import type { Recruiter } from "./auth";
import type { Tables } from "./database.types";
import { check, notFound } from "./http";

export const CARD_COLUMNS =
  "id, full_name, avatar_url, headline, current_title, current_company, current_company_logo_url, " +
  "role, seniority, years_experience, city, state, country, open_to_work, skills";

type CardRow = Pick<
  Tables<"candidates">,
  | "id"
  | "full_name"
  | "avatar_url"
  | "headline"
  | "current_title"
  | "current_company"
  | "current_company_logo_url"
  | "role"
  | "seniority"
  | "years_experience"
  | "city"
  | "state"
  | "country"
  | "open_to_work"
  | "skills"
>;

export function toCard(row: CardRow): CandidateCard {
  const { city, state, country, ...rest } = row;
  return { ...rest, location: { city, state, country } };
}

const CANDIDATE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isCandidateId(id: string): boolean {
  return CANDIDATE_ID.test(id);
}

export async function getCandidate(recruiter: Recruiter, id: string): Promise<Candidate> {
  if (!isCandidateId(id)) throw notFound("Person not found");
  const row = check(
    await recruiter.db
      .from("candidates")
      .select(
        `${CARD_COLUMNS},
         experiences (position, title, company, company_logo_url, company_type, start_year, end_year, description),
         education (position, school, degree, field, graduation_year)`,
      )
      .eq("id", id)
      .maybeSingle(),
    "get candidate",
  );
  if (!row) throw notFound("Person not found");

  const { experiences, education, ...card } = row as unknown as CardRow & {
    experiences: (Candidate["experiences"][number] & { position: number })[];
    education: (Candidate["education"][number] & { position: number })[];
  };
  return {
    ...toCard(card),
    experiences: inOrder(experiences),
    education: inOrder(education),
  };
}

/** Sorts rows by their position in the source data and drops the position column. */
function inOrder<T extends { position: number }>(rows: T[]): Omit<T, "position">[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((row) => {
      const copy: Partial<T> = { ...row };
      delete copy.position;
      return copy as Omit<T, "position">;
    });
}
