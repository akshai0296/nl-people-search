// Response shapes of the HTTP API, shared by the route handlers and the UI.
import type { Filters, Unsupported } from "./filters";

export type Location = { city: string; state: string | null; country: string };

/** A candidate as shown in result lists. */
export type CandidateCard = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string;
  current_title: string;
  current_company: string;
  current_company_logo_url: string | null;
  role: string;
  seniority: string;
  years_experience: number;
  location: Location;
  open_to_work: boolean;
  skills: string[];
};

export type Experience = {
  title: string;
  company: string;
  company_logo_url: string | null;
  company_type: string;
  start_year: number;
  end_year: number | null;
  description: string | null;
};

export type Education = {
  school: string;
  degree: string;
  field: string;
  graduation_year: number | null;
};

export type Candidate = CandidateCard & { experiences: Experience[]; education: Education[] };

export type PlanName = "free" | "paid";

export type Plan = { plan: PlanName; searches_remaining: number | null };

/** POST /api/search */
export type SearchResponse = {
  search_id: string;
  brief: string;
  filters: Filters;
  unsupported: Unsupported[];
  total: number;
  page: number;
  page_size: number;
  results: CandidateCard[];
  plan: PlanName;
  searches_remaining: number | null;
};

/** GET /api/search/{id}?page=N */
export type SearchPage = {
  search_id: string;
  brief: string;
  filters: Filters;
  unsupported: Unsupported[];
  created_at: string;
  total: number;
  page: number;
  page_size: number;
  results: CandidateCard[];
};

export type ShortlistSummary = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  count: number;
  person_ids: string[];
  preview: { id: string; full_name: string; avatar_url: string | null }[];
};

export type ShortlistDetail = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  people: (CandidateCard & { added_at: string })[];
};

export type SavedBrief = { id: string; brief: string; filters: Filters; created_at: string };

export type ApiErrorBody = { error: { code: string; message: string } };

export type Me = { full_name: string; company: { slug: string; name: string } };
