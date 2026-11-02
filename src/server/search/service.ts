import "server-only";
import { filtersSchema, type Filters, type Unsupported } from "@/lib/filters";
import type { Plan, PlanName, SearchPage, SearchResponse } from "@/lib/types";
import type { Recruiter } from "../auth";
import { ApiError, badRequest, check, notFound } from "../http";
import { adminDb } from "../supabase";
import { interpretBrief } from "./interpret-brief";
import { getVocabulary } from "./vocabulary";

export const PAGE_SIZE = 20;
export const MAX_BRIEF_LENGTH = 500;

const limitReached = () =>
  new ApiError(
    402,
    "search_limit_reached",
    "Your company has used its free search. Upgrade to keep searching.",
  );

export async function getPlan(recruiter: Recruiter): Promise<Plan> {
  const plan = check(await recruiter.db.rpc("my_plan"), "my_plan") as Plan | null;
  if (!plan) throw new ApiError(403, "forbidden", "This account isn't set up as a recruiter.");
  return { plan: plan.plan, searches_remaining: plan.searches_remaining };
}

/**
 * Runs a new search. With only a brief, the LLM interprets it; with explicit filters (the
 * recruiter corrected them, or re-ran a saved search) the LLM is skipped. Either way it is a new
 * search and is metered the same.
 *
 * The search is paid for before the LLM is called (begin_search is atomic, so concurrent requests
 * from a free company are turned away there), and refunded if it can't be completed.
 */
export async function createSearch(
  recruiter: Recruiter,
  input: { brief: string; filters?: unknown },
): Promise<SearchResponse> {
  const brief = input.brief.trim();
  if (!brief) throw badRequest("Describe who you're looking for.");
  if (brief.length > MAX_BRIEF_LENGTH) {
    throw badRequest(`Keep the brief under ${MAX_BRIEF_LENGTH} characters.`);
  }
  const vocab = await getVocabulary();
  let corrected: Filters | undefined;
  if (input.filters !== undefined) {
    const parsed = filtersSchema(vocab).safeParse(input.filters);
    if (!parsed.success) throw badRequest("Those filters aren't valid.");
    corrected = parsed.data;
  }

  const db = adminDb();
  const spend = check(await db.rpc("begin_search", { p_company_id: recruiter.companyId }), "begin_search") as
    | { status: "quota_exhausted" }
    | { status: "ok"; plan: PlanName; searches_remaining: number | null };
  if (spend.status === "quota_exhausted") throw limitReached();

  try {
    const { filters, unsupported }: { filters: Filters; unsupported: Unsupported[] } = corrected
      ? { filters: corrected, unsupported: [] }
      : await interpretBrief(brief, vocab);

    const result = check(
      await db.rpc("finish_search", {
        p_company_id: recruiter.companyId,
        p_recruiter_id: recruiter.userId,
        p_brief: brief,
        p_filters: filters,
        p_unsupported: unsupported,
        p_page_size: PAGE_SIZE,
      }),
      "finish_search",
    ) as Pick<SearchResponse, "search_id" | "total" | "results">;

    return {
      ...result,
      brief,
      filters,
      unsupported,
      page: 1,
      page_size: PAGE_SIZE,
      plan: spend.plan,
      searches_remaining: spend.searches_remaining,
    };
  } catch (error) {
    // Nothing was found for the recruiter, so they shouldn't pay for it.
    await db.rpc("refund_search", { p_company_id: recruiter.companyId });
    throw error;
  }
}

/** A page of a stored search. Reads the snapshot under RLS; never re-runs or meters anything. */
export async function getSearchPage(
  recruiter: Recruiter,
  searchId: string,
  page: number,
): Promise<SearchPage> {
  const data = check(
    await recruiter.db.rpc("search_page", {
      p_search_id: searchId,
      p_page: page,
      p_page_size: PAGE_SIZE,
    }),
    "search_page",
  ) as SearchPage | null;
  if (!data) throw notFound("Search not found");
  return data;
}
