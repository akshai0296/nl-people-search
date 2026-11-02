import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_FILTERS, filtersSchema, hasAnyFilter, sameFilters, type Vocabulary } from "../src/lib/filters.ts";

const vocab: Vocabulary = {
  roles: ["Backend Engineer", "Product Designer"],
  seniorities: ["junior", "mid", "senior", "staff"],
  cities: [{ city: "Austin", state: "TX", country: "US" }],
  skills: ["Go", "Kubernetes", "React"],
  company_types: ["startup", "enterprise"],
  companies: [{ name: "Globalcorp", company_type: "enterprise" }],
  schools: ["MIT"],
  degrees: ["BS", "PhD"],
  fields: ["Computer Science"],
  years_experience: { min: 0, max: 15 },
  graduation_years: { min: 2010, max: 2026 },
};
const schema = filtersSchema(vocab);

test("fills defaults and keeps valid values", () => {
  const parsed = schema.parse({ roles: ["Backend Engineer"], skills_all: ["Go", "Kubernetes"], cities: ["Austin"] });
  assert.deepEqual(parsed.roles, ["Backend Engineer"]);
  assert.deepEqual(parsed.skills_all, ["Go", "Kubernetes"]);
  assert.equal(parsed.min_years, null);
  assert.equal(parsed.open_to_work, null);
});

test("rejects values that don't exist in the data", () => {
  assert.equal(schema.safeParse({ cities: ["London"] }).success, false);
  assert.equal(schema.safeParse({ skills_all: ["Elixir"] }).success, false);
  assert.equal(schema.safeParse({ roles: ["'; DROP TABLE candidates; --"] }).success, false);
  assert.equal(schema.safeParse({ min_years: -1 }).success, false);
  assert.equal(schema.safeParse({ min_years: 2.5 }).success, false);
});

test("drops unknown keys, dedupes and fixes inverted ranges", () => {
  const parsed = schema.parse({ skills_all: ["Go", "Go"], min_years: 9, max_years: 3, sql: "drop" });
  assert.deepEqual(parsed.skills_all, ["Go"]);
  assert.equal(parsed.min_years, 3);
  assert.equal(parsed.max_years, 9);
  assert.equal("sql" in parsed, false);
});

test("knows when filters constrain nothing", () => {
  assert.equal(hasAnyFilter(EMPTY_FILTERS), false);
  assert.equal(hasAnyFilter({ ...EMPTY_FILTERS, open_to_work: false }), true);
  assert.equal(hasAnyFilter({ ...EMPTY_FILTERS, max_years: 0 }), true);
});

test("compares filter sets regardless of list order", () => {
  const a = { ...EMPTY_FILTERS, skills_all: ["Go", "React"] };
  assert.equal(sameFilters(a, { ...EMPTY_FILTERS, skills_all: ["React", "Go"] }), true);
  assert.equal(sameFilters(a, { ...EMPTY_FILTERS, skills_any: ["React", "Go"] }), false);
});

test("sanitizes arbitrary objects instead of rejecting them", async () => {
  const { sanitizeFilters } = await import("../src/lib/filters.ts");
  const clean = sanitizeFilters(vocab, { roles: ["Backend Engineer", "Wizard"], role: "engineer", min_years: "5", open_to_work: true });
  assert.deepEqual(clean.roles, ["Backend Engineer"]);
  assert.equal(clean.min_years, null);
  assert.equal(clean.open_to_work, true);
  assert.equal("role" in clean, false);
  assert.deepEqual(sanitizeFilters(vocab, null), EMPTY_FILTERS);
});
