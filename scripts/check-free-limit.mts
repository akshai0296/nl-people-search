// Fires many searches at once from a free company and checks exactly one gets through, then
// that paging never spends a search. Run on a fresh database (make setup): it spends acme's
// free search. Pass --brief to go through the LLM instead of explicit filters.
import "./lib/env-files.mts";
import { RECRUITERS, api, signIn } from "./lib/client.mts";

const CONCURRENT = 25;
const useBrief = process.argv.includes("--brief");
const token = await signIn(RECRUITERS.acme);

const before = await api(token, "GET", "/api/plan");
console.log("plan before:", JSON.stringify(before.body));
if (before.body.plan !== "free" || before.body.searches_remaining !== 1) {
  console.log("acme needs exactly one free search left for this check; run `make setup` first.");
  process.exit(1);
}

const body = useBrief
  ? { brief: "backend engineers in Austin who know Go and Kubernetes" }
  : { brief: "backend engineers in Austin", filters: { roles: ["Backend Engineer"], cities: ["Austin"] } };
const responses = await Promise.all(Array.from({ length: CONCURRENT }, () => api(token, "POST", "/api/search", body)));
const ok = responses.filter((r) => r.status === 200);
const limited = responses.filter((r) => r.status === 402);
console.log(`${CONCURRENT} concurrent searches → ${ok.length} × 200, ${limited.length} × 402, others: ${responses.filter((r) => r.status !== 200 && r.status !== 402).map((r) => r.status).join(",") || "none"}`);

const searchId = ok[0]?.body.search_id;
if (searchId) {
  for (let page = 1; page <= 5; page++) await api(token, "GET", `/api/search/${searchId}?page=${page}`);
}
const after = await api(token, "GET", "/api/plan");
console.log("plan after paging:", JSON.stringify(after.body));

const pass = ok.length === 1 && limited.length === CONCURRENT - 1 && after.body.searches_remaining === 0;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
