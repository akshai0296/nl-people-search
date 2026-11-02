// The structured search filters: one shape shared by the LLM output, the API, the database
// matcher (private.match_candidate_ids) and the filter chips in the UI.
import { z } from "zod";

export const LIST_FILTER_KEYS = [
  "roles",
  "seniorities",
  "cities",
  "skills_all",
  "skills_any",
  "skills_exclude",
  "company_types_ever",
  "company_types_current",
  "companies_ever",
  "companies_current",
  "schools",
  "degrees",
  "fields",
] as const;

export const NUMBER_FILTER_KEYS = [
  "min_years",
  "max_years",
  "min_graduation_year",
  "max_graduation_year",
] as const;

export type ListFilterKey = (typeof LIST_FILTER_KEYS)[number];
export type NumberFilterKey = (typeof NUMBER_FILTER_KEYS)[number];

export type Filters = Record<ListFilterKey, string[]> &
  Record<NumberFilterKey, number | null> & { open_to_work: boolean | null };

/** A requirement in the brief that the candidate data cannot answer. */
export type Unsupported = { phrase: string; reason: string };

/** Every value the data can be filtered by, from public.search_vocabulary(). */
export type Vocabulary = {
  roles: string[];
  seniorities: string[];
  cities: { city: string; state: string | null; country: string }[];
  skills: string[];
  company_types: string[];
  companies: { name: string; company_type: string }[];
  schools: string[];
  degrees: string[];
  fields: string[];
  years_experience: { min: number; max: number };
  graduation_years: { min: number; max: number };
};

export const EMPTY_FILTERS: Filters = {
  roles: [],
  seniorities: [],
  cities: [],
  skills_all: [],
  skills_any: [],
  skills_exclude: [],
  company_types_ever: [],
  company_types_current: [],
  companies_ever: [],
  companies_current: [],
  schools: [],
  degrees: [],
  fields: [],
  min_years: null,
  max_years: null,
  min_graduation_year: null,
  max_graduation_year: null,
  open_to_work: null,
};

/** The allowed values for each list filter. */
export function allowedValues(vocab: Vocabulary): Record<ListFilterKey, string[]> {
  const companies = vocab.companies.map((c) => c.name);
  return {
    roles: vocab.roles,
    seniorities: vocab.seniorities,
    cities: vocab.cities.map((c) => c.city),
    skills_all: vocab.skills,
    skills_any: vocab.skills,
    skills_exclude: vocab.skills,
    company_types_ever: vocab.company_types,
    company_types_current: vocab.company_types,
    companies_ever: companies,
    companies_current: companies,
    schools: vocab.schools,
    degrees: vocab.degrees,
    fields: vocab.fields,
  };
}

const year = z.number().int().min(0).max(100).nullable();
const calendarYear = z.number().int().min(1900).max(2100).nullable();

/**
 * Validates filters against the live vocabulary: unknown keys are dropped and any value the
 * data doesn't contain is rejected, so nothing invented can reach the database.
 */
export function filtersSchema(vocab: Vocabulary) {
  const allowed = allowedValues(vocab);
  const list = (key: ListFilterKey) => {
    const values = new Set(allowed[key]);
    return z
      .array(z.string().refine((v) => values.has(v), { message: "Unknown value" }))
      .max(100)
      .default([]);
  };
  const shape = Object.fromEntries(LIST_FILTER_KEYS.map((key) => [key, list(key)])) as Record<
    ListFilterKey,
    ReturnType<typeof list>
  >;
  return z
    .object({
      ...shape,
      min_years: year.default(null),
      max_years: year.default(null),
      min_graduation_year: calendarYear.default(null),
      max_graduation_year: calendarYear.default(null),
      open_to_work: z.boolean().nullable().default(null),
    })
    .transform((f): Filters => normalizeFilters(f));
}

/** Dedupes lists and puts inverted ranges the right way round. */
export function normalizeFilters(f: Filters): Filters {
  const out = { ...f };
  for (const key of LIST_FILTER_KEYS) out[key] = [...new Set(f[key])];
  if (out.min_years !== null && out.max_years !== null && out.min_years > out.max_years) {
    [out.min_years, out.max_years] = [out.max_years, out.min_years];
  }
  if (
    out.min_graduation_year !== null &&
    out.max_graduation_year !== null &&
    out.min_graduation_year > out.max_graduation_year
  ) {
    [out.min_graduation_year, out.max_graduation_year] = [
      out.max_graduation_year,
      out.min_graduation_year,
    ];
  }
  return out;
}

export function hasAnyFilter(f: Filters): boolean {
  return (
    LIST_FILTER_KEYS.some((key) => f[key].length > 0) ||
    NUMBER_FILTER_KEYS.some((key) => f[key] !== null) ||
    f.open_to_work !== null
  );
}

/** True when two filter sets select exactly the same people (list order doesn't matter). */
export function sameFilters(a: Filters, b: Filters): boolean {
  const sameList = (x: string[] = [], y: string[] = []) =>
    x.length === y.length && x.every((v) => y.includes(v));
  return (
    LIST_FILTER_KEYS.every((key) => sameList(a[key], b[key])) &&
    NUMBER_FILTER_KEYS.every((key) => (a[key] ?? null) === (b[key] ?? null)) &&
    (a.open_to_work ?? null) === (b.open_to_work ?? null)
  );
}

const NUMBER_BOUNDS: Record<NumberFilterKey, [number, number]> = {
  min_years: [0, 100],
  max_years: [0, 100],
  min_graduation_year: [1900, 2100],
  max_graduation_year: [1900, 2100],
};

/**
 * Keeps only the parts of an arbitrary object that are valid filters. Used where any object is
 * accepted (saving a search), so the request never fails and what's stored can always run.
 */
export function sanitizeFilters(vocab: Vocabulary, input: unknown): Filters {
  const source =
    input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const allowed = allowedValues(vocab);
  const out: Filters = { ...EMPTY_FILTERS };
  for (const key of LIST_FILTER_KEYS) {
    const values = Array.isArray(source[key]) ? (source[key] as unknown[]) : [];
    const ok = new Set(allowed[key]);
    out[key] = values.filter((v): v is string => typeof v === "string" && ok.has(v));
  }
  for (const key of NUMBER_FILTER_KEYS) {
    const value = source[key];
    const [min, max] = NUMBER_BOUNDS[key];
    out[key] = typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : null;
  }
  out.open_to_work = typeof source.open_to_work === "boolean" ? source.open_to_work : null;
  return normalizeFilters(out);
}
