// How each filter is presented and edited in the UI. A "group" is one condition the recruiter
// sees as a single chip ("Location: New York or Boston") and edits in one place.
import type { Filters, ListFilterKey, NumberFilterKey, Vocabulary } from "./filters";

export type Option = { value: string; label: string };

type ListGroup = {
  kind: "list";
  id: ListFilterKey;
  /** Name in the "Add filter" menu and editor title. */
  title: string;
  /** Short prefix on the chip. */
  chip: string;
  join: "or" | "and";
  options: (vocab: Vocabulary) => Option[];
  /** How a value reads on the chip, when it differs from the option label. */
  chipValue?: (value: string) => string;
};

type RangeGroup = {
  kind: "range";
  id: "experience" | "graduation";
  title: string;
  chip: string;
  min: NumberFilterKey;
  max: NumberFilterKey;
  bounds: (vocab: Vocabulary) => { min: number; max: number };
  summary: (min: number | null, max: number | null) => string;
};

type BooleanGroup = { kind: "boolean"; id: "open_to_work"; title: string; chip: string };

export type FilterGroup = ListGroup | RangeGroup | BooleanGroup;

const plain = (values: string[]): Option[] => values.map((value) => ({ value, label: value }));
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const companyType = (t: string) => (t === "enterprise" ? "an enterprise" : `a ${t}`);

function yearsSummary(min: number | null, max: number | null): string {
  const unit = (n: number) => (n === 1 ? "year" : "years");
  if (min !== null && max !== null) return min === max ? `${min} ${unit(min)}` : `${min}–${max} years`;
  if (min !== null) return `${min}+ ${unit(min)}`;
  if (max !== null) return `Up to ${max} ${unit(max)}`;
  return "";
}

function graduationSummary(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return min === max ? `In ${min}` : `${min}–${max}`;
  if (min !== null) return `${min} or later`;
  if (max !== null) return `${max} or earlier`;
  return "";
}

export const FILTER_GROUPS: FilterGroup[] = [
  { kind: "list", id: "roles", title: "Role", chip: "Role", join: "or", options: (v) => plain(v.roles) },
  {
    kind: "list",
    id: "seniorities",
    title: "Seniority",
    chip: "Seniority",
    join: "or",
    options: (v) => v.seniorities.map((s) => ({ value: s, label: capitalise(s) })),
    chipValue: capitalise,
  },
  {
    kind: "list",
    id: "cities",
    title: "Location",
    chip: "Location",
    join: "or",
    options: (v) => v.cities.map((c) => ({ value: c.city, label: c.state ? `${c.city}, ${c.state}` : c.city })),
  },
  { kind: "list", id: "skills_all", title: "Skills (all of)", chip: "Skills", join: "and", options: (v) => plain(v.skills) },
  { kind: "list", id: "skills_any", title: "Skills (any of)", chip: "Any of", join: "or", options: (v) => plain(v.skills) },
  { kind: "list", id: "skills_exclude", title: "Without skills", chip: "Without", join: "or", options: (v) => plain(v.skills) },
  {
    kind: "range",
    id: "experience",
    title: "Years of experience",
    chip: "Experience",
    min: "min_years",
    max: "max_years",
    bounds: (v) => v.years_experience,
    summary: yearsSummary,
  },
  { kind: "boolean", id: "open_to_work", title: "Open to work", chip: "Open to work" },
  {
    kind: "list",
    id: "company_types_ever",
    title: "Has worked at",
    chip: "Worked at",
    join: "or",
    options: (v) => v.company_types.map((t) => ({ value: t, label: capitalise(t) })),
    chipValue: companyType,
  },
  {
    kind: "list",
    id: "company_types_current",
    title: "Currently works at",
    chip: "Currently at",
    join: "or",
    options: (v) => v.company_types.map((t) => ({ value: t, label: capitalise(t) })),
    chipValue: companyType,
  },
  {
    kind: "list",
    id: "companies_ever",
    title: "Company (past or current)",
    chip: "Worked at",
    join: "or",
    options: (v) => plain(v.companies.map((c) => c.name)),
  },
  {
    kind: "list",
    id: "companies_current",
    title: "Current company",
    chip: "Works at",
    join: "or",
    options: (v) => plain(v.companies.map((c) => c.name)),
  },
  { kind: "list", id: "schools", title: "School", chip: "School", join: "or", options: (v) => plain(v.schools) },
  { kind: "list", id: "degrees", title: "Degree", chip: "Degree", join: "or", options: (v) => plain(v.degrees) },
  { kind: "list", id: "fields", title: "Field of study", chip: "Studied", join: "or", options: (v) => plain(v.fields) },
  {
    kind: "range",
    id: "graduation",
    title: "Graduation year",
    chip: "Graduated",
    min: "min_graduation_year",
    max: "max_graduation_year",
    bounds: (v) => v.graduation_years,
    summary: graduationSummary,
  },
];

export function isActive(group: FilterGroup, f: Filters): boolean {
  if (group.kind === "list") return f[group.id].length > 0;
  if (group.kind === "range") return f[group.min] !== null || f[group.max] !== null;
  return f.open_to_work !== null;
}

/** The chip text for an active group: a short prefix and the values. */
export function chipText(group: FilterGroup, f: Filters): { prefix: string; value: string } {
  if (group.kind === "list") {
    const values = f[group.id].map(group.chipValue ?? ((v) => v));
    const last = values.at(-1);
    const value = values.length > 1 ? `${values.slice(0, -1).join(", ")} ${group.join} ${last}` : (last ?? "");
    return { prefix: group.chip, value };
  }
  if (group.kind === "range") return { prefix: group.chip, value: group.summary(f[group.min], f[group.max]) };
  return { prefix: "", value: f.open_to_work ? "Open to work" : "Not open to work" };
}

export function clearGroup(group: FilterGroup, f: Filters): Filters {
  if (group.kind === "list") return { ...f, [group.id]: [] };
  if (group.kind === "range") return { ...f, [group.min]: null, [group.max]: null };
  return { ...f, open_to_work: null };
}
