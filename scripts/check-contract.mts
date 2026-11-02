// Exercises every API route, as an external client would, and checks
// status codes and response shapes. Run on a fresh database (make setup): it spends acme's free
// search and then expects a 402.
import "./lib/env-files.mts";
import { signStripePayload } from "../src/server/billing/stripe-signature.ts";
import { APP_URL, RECRUITERS, api, requireEnv, signIn } from "./lib/client.mts";

let failures = 0;
function expect(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 300)}`}`);
}
const isNumOrNull = (v: unknown) => v === null || typeof v === "number";

const token = await signIn(RECRUITERS.acme);

console.log("# GET /api/plan");
const plan = await api(token, "GET", "/api/plan");
expect("200 with { plan, searches_remaining }", plan.status === 200 && ["free", "paid"].includes(plan.body.plan) && isNumOrNull(plan.body.searches_remaining), plan);
if (plan.body.plan !== "free" || plan.body.searches_remaining !== 1) {
  console.log("acme must be on a fresh free plan (run `make setup` first).");
  process.exit(1);
}

console.log("\n# POST /api/search");
const search = await api(token, "POST", "/api/search", { brief: "mobile engineers who know Swift" });
const s = search.body;
expect("200 with { search_id, filters, total, results, searches_remaining }",
  search.status === 200 && typeof s.search_id === "string" && typeof s.filters === "object" && typeof s.total === "number" && Array.isArray(s.results) && isNumOrNull(s.searches_remaining), search);
expect("results are the first 20, each with an id", s.results.length === Math.min(20, s.total) && s.results.every((r: { id?: string }) => typeof r.id === "string"));
expect("searches_remaining is now 0", s.searches_remaining === 0, s.searches_remaining);
expect("returns within 3s", search.ms < 3000, `${search.ms}ms`);

console.log("\n# GET /api/search/{search_id}?page=N");
const ids: string[] = [];
let slowest = 0;
for (let page = 1; ; page++) {
  const res = await api(token, "GET", `/api/search/${s.search_id}?page=${page}`);
  slowest = Math.max(slowest, res.ms);
  if (res.status !== 200) { expect(`page ${page} is 200`, false, res); break; }
  if (res.body.results.length === 0) break;
  ids.push(...res.body.results.map((r: { id: string }) => r.id));
}
expect(`every result exactly once (${ids.length} of ${s.total})`, ids.length === s.total && new Set(ids).size === ids.length);
expect("page 1 matches the search's first page", JSON.stringify(ids.slice(0, 20)) === JSON.stringify(s.results.map((r: { id: string }) => r.id)));
expect("paging is under 300ms", slowest < 300, `${slowest}ms`);
const afterPaging = await api(token, "GET", "/api/plan");
expect("paging didn't count as a search", afterPaging.body.searches_remaining === 0, afterPaging.body);
expect("no ?page means page 1", (await api(token, "GET", `/api/search/${s.search_id}`)).body.page === 1);
expect("unknown search is 404", (await api(token, "GET", "/api/search/00000000-0000-0000-0000-000000000000?page=1")).status === 404);

console.log("\n# 402 when the free search is used");
const limited = await api(token, "POST", "/api/search", { brief: "data scientists with a PhD" });
expect("POST /api/search returns 402", limited.status === 402, limited);

console.log("\n# GET /api/people/{id}");
const person = await api(token, "GET", `/api/people/${ids[0]}`);
expect("200 with experience, education and skills", person.status === 200 && person.body.id === ids[0] && Array.isArray(person.body.experiences) && Array.isArray(person.body.education) && Array.isArray(person.body.skills), person);
expect("unknown person is 404", (await api(token, "GET", "/api/people/cand_9999")).status === 404);

console.log("\n# /api/shortlists");
const created = await api(token, "POST", "/api/shortlists", { name: "Contract test" });
expect("POST returns 200 with { id }", created.status === 200 && typeof created.body.id === "string", created);
const listId = created.body.id;
const lists = await api(token, "GET", "/api/shortlists");
expect("GET lists it", lists.status === 200 && lists.body.some((l: { id: string }) => l.id === listId));
const add1 = await api(token, "POST", `/api/shortlists/${listId}/people/${ids[0]}`);
const add2 = await api(token, "POST", `/api/shortlists/${listId}/people/${ids[0]}`);
const afterAdds = (await api(token, "GET", "/api/shortlists")).body.find((l: { id: string }) => l.id === listId);
expect("POST person adds them", add1.status === 200, add1);
expect("adding again changes nothing", add2.status === 200 && afterAdds.count === 1, { add2, afterAdds });
const removed = await api(token, "DELETE", `/api/shortlists/${listId}/people/${ids[0]}`);
const afterRemove = (await api(token, "GET", "/api/shortlists")).body.find((l: { id: string }) => l.id === listId);
expect("DELETE person removes them", removed.status === 200 && afterRemove.count === 0, { removed, afterRemove });
expect("adding an unknown person is 404", (await api(token, "POST", `/api/shortlists/${listId}/people/cand_9999`)).status === 404);

console.log("\n# /api/saved-briefs");
const saved = await api(token, "POST", "/api/saved-briefs", { brief: s.brief ?? "mobile engineers who know Swift", filters: s.filters });
expect("POST { brief, filters } returns 200 with an id", saved.status === 200 && typeof saved.body.id === "string", saved);
const odd = await api(token, "POST", "/api/saved-briefs", { brief: "anything", filters: { role: "engineer" } });
expect("POST accepts any filters object", odd.status === 200, odd);
const briefs = await api(token, "GET", "/api/saved-briefs");
expect("GET lists them", briefs.status === 200 && briefs.body.some((b: { id: string }) => b.id === saved.body.id));

console.log("\n# POST /api/billing/events");
const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
const now = Math.floor(Date.now() / 1000);
const payload = JSON.stringify({ id: `evt_contract_${now}`, object: "event", created: now, type: "customer.subscription.updated", data: { object: { id: "sub_contract_globex", object: "subscription", status: "incomplete", metadata: { company: "globex" } } } });
const send = (body: string, signature: string) =>
  fetch(`${APP_URL}/api/billing/events`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body }).then((r) => r.status);
expect("bad signature is 400", (await send(payload, signStripePayload(payload, "whsec_wrong", now))) === 400);
expect("missing signature is 400", (await send(payload, "")) === 400);
expect("valid event is 200", (await send(payload, signStripePayload(payload, secret, now))) === 200);
expect("repeat is 200", (await send(payload, signStripePayload(payload, secret, now))) === 200);
expect("signed but unrecognised event is 200", (await send("{}", signStripePayload("{}", secret, now))) === 200);

console.log("\n# Auth");
for (const path of ["/api/plan", "/api/shortlists", "/api/saved-briefs", `/api/people/${ids[0]}`, `/api/search/${s.search_id}?page=1`]) {
  expect(`no token on ${path} is 401`, (await api(null, "GET", path)).status === 401);
}
expect("no token on POST /api/search is 401", (await api(null, "POST", "/api/search", { brief: "x" })).status === 401);

console.log(failures === 0 ? "\nAll contract checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
