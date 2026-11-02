// Tries to cross the tenant boundary the way a hostile recruiter would: signed in as acme, it
// reads and writes globex's shortlists, saved searches and searches through this app's API and
// directly through Supabase (PostgREST) with acme's own token. Then it scans the served pages and
// JavaScript for secret keys. Exits non-zero on any failure. Creates a few rows; run on a dev DB.
import "./lib/env-files.mts";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { APP_URL, PUBLISHABLE_KEY, RECRUITERS, SUPABASE_URL, api, rest, signIn } from "./lib/client.mts";

let failures = 0;
function expect(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 200)}`}`);
}
const denied = (status: number) => status === 401 || status === 403 || status === 404;

const acme = await signIn(RECRUITERS.acme);
const globex = await signIn(RECRUITERS.globex);

// globex's data, created through the API.
const list = await api(globex, "POST", "/api/shortlists", { name: "Globex private list" });
const listId: string = list.body.id;
await api(globex, "POST", `/api/shortlists/${listId}/people/cand_0001`);
const saved = await api(globex, "POST", "/api/saved-briefs", {
  brief: "globex secret search",
  filters: { roles: ["Recruiter"] },
});
const savedId: string = saved.body.id;
const globexSearch = await api(globex, "POST", "/api/search", {
  brief: "globex search",
  filters: { roles: ["Recruiter"] },
});
const searchId: string | undefined = globexSearch.body?.search_id;
const [globexCompany] = (await rest(globex, "GET", "companies?select=id")).body;

console.log("\n# Through the app's API, signed in as acme");
const lists = await api(acme, "GET", "/api/shortlists");
expect("list shortlists hides globex's", !lists.body.some((l: { id: string }) => l.id === listId), lists.body);
expect("read globex shortlist", denied((await api(acme, "GET", `/api/shortlists/${listId}`)).status));
expect("rename globex shortlist", denied((await api(acme, "PATCH", `/api/shortlists/${listId}`, { name: "pwned" })).status));
expect("add to globex shortlist", denied((await api(acme, "POST", `/api/shortlists/${listId}/people/cand_0002`)).status));
expect("remove from globex shortlist", denied((await api(acme, "DELETE", `/api/shortlists/${listId}/people/cand_0001`)).status));
expect("delete globex shortlist", denied((await api(acme, "DELETE", `/api/shortlists/${listId}`)).status));
const briefs = await api(acme, "GET", "/api/saved-briefs");
expect("list saved searches hides globex's", !briefs.body.some((b: { id: string }) => b.id === savedId), briefs.body);
expect("delete globex saved search", denied((await api(acme, "DELETE", `/api/saved-briefs/${savedId}`)).status));
if (searchId) expect("page through globex search", denied((await api(acme, "GET", `/api/search/${searchId}?page=1`)).status));
expect("no token", (await api(null, "GET", "/api/shortlists")).status === 401);
expect("forged token", (await api(acme.slice(0, -4) + "AAAA", "GET", "/api/shortlists")).status === 401);
expect("publishable key as token", (await api(PUBLISHABLE_KEY, "GET", "/api/shortlists")).status === 401);

console.log("\n# Directly through Supabase with acme's token");
const restLists = await rest(acme, "GET", "shortlists?select=id,company_id");
expect("read shortlists sees only acme's", Array.isArray(restLists.body) && !restLists.body.some((l: { id: string }) => l.id === listId), restLists.body);
expect("read globex shortlist members", ((await rest(acme, "GET", `shortlist_members?shortlist_id=eq.${listId}`)).body as unknown[]).length === 0);
expect("rename globex shortlist", ((await rest(acme, "PATCH", `shortlists?id=eq.${listId}`, { name: "pwned" })).body as unknown[])?.length === 0);
expect("delete globex shortlist", ((await rest(acme, "DELETE", `shortlists?id=eq.${listId}`)).body as unknown[])?.length === 0);
expect("add to globex shortlist", (await rest(acme, "POST", "shortlist_members", { shortlist_id: listId, candidate_id: "cand_0003" })).status >= 400);
expect("delete globex members", ((await rest(acme, "DELETE", `shortlist_members?shortlist_id=eq.${listId}`)).body as unknown[])?.length === 0);
expect("create shortlist owned by globex", (await rest(acme, "POST", "shortlists", { name: "x", company_id: globexCompany?.id })).status >= 400);
const own = await rest(acme, "POST", "shortlists", { name: "acme list" });
expect("create own shortlist", own.status === 201, own.body);
expect("move own shortlist to globex", (await rest(acme, "PATCH", `shortlists?id=eq.${own.body?.[0]?.id}`, { company_id: globexCompany?.id })).status >= 400);
expect("read globex saved searches", ((await rest(acme, "GET", `saved_briefs?id=eq.${savedId}`)).body as unknown[]).length === 0);
expect("delete globex saved search", ((await rest(acme, "DELETE", `saved_briefs?id=eq.${savedId}`)).body as unknown[])?.length === 0);
expect("save search owned by globex", (await rest(acme, "POST", "saved_briefs", { brief: "x", filters: {}, company_id: globexCompany?.id })).status >= 400);
if (searchId) expect("read globex search", ((await rest(acme, "GET", `searches?id=eq.${searchId}`)).body as unknown[]).length === 0);
if (searchId) expect("rpc search_page on globex search", (await rest(acme, "POST", "rpc/search_page", { p_search_id: searchId, p_page: 1 })).body === null);
expect("read globex company", ((await rest(acme, "GET", `companies?id=eq.${globexCompany?.id}`)).body as unknown[]).length === 0);
expect("reset own search count", (await rest(acme, "PATCH", "companies?slug=eq.acme", { searches_used: 0 })).status >= 400);
expect("join globex", (await rest(acme, "PATCH", "recruiters?company_id=neq.00000000-0000-0000-0000-000000000000", { company_id: globexCompany?.id })).status >= 400);
expect("read subscriptions", (await rest(acme, "GET", "subscriptions")).status >= 400);
expect("read billing events", (await rest(acme, "GET", "billing_events")).status >= 400);
expect("call begin_search", (await rest(acme, "POST", "rpc/begin_search", { p_company_id: globexCompany?.id })).status >= 400);
expect("call refund_search", (await rest(acme, "POST", "rpc/refund_search", { p_company_id: globexCompany?.id })).status >= 400);
expect("call finish_search", (await rest(acme, "POST", "rpc/finish_search", { p_company_id: globexCompany?.id, p_recruiter_id: null, p_brief: "x", p_filters: { roles: ["Recruiter"] }, p_unsupported: [] })).status >= 400);
expect("call apply_subscription_event", (await rest(acme, "POST", "rpc/apply_subscription_event", { p_event_id: "evt_x", p_event_type: "customer.subscription.created", p_event_created: 9999999999, p_subscription_id: "sub_x", p_customer_id: "c", p_company_slug: "acme", p_status: "active", p_current_period_end: null })).status >= 400);

console.log("\n# Anonymous (publishable key only)");
const anon = async (path: string) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: PUBLISHABLE_KEY } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
for (const table of ["candidates", "shortlists", "saved_briefs", "searches", "companies"]) {
  const r = await anon(`${table}?select=*&limit=1`);
  expect(`anon reads ${table}`, r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), r);
}

console.log("\n# globex's data is intact");
const after = await api(globex, "GET", `/api/shortlists/${listId}`);
expect("globex list unchanged", after.body?.name === "Globex private list" && after.body?.people?.length === 1, after.body);
expect("globex saved search still there", (await api(globex, "GET", "/api/saved-briefs")).body.some((b: { id: string }) => b.id === savedId));

console.log("\n# Secrets in what the browser receives");
const secrets = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.ANTHROPIC_API_KEY,
  process.env.STRIPE_WEBHOOK_SECRET,
].filter((s): s is string => !!s && s.length > 8);
const patterns = [/sb_secret_[A-Za-z0-9_-]+/, /sk-ant-[A-Za-z0-9_-]+/, /whsec_[A-Za-z0-9_]+/, /service_role/];
const leaks = (text: string) => secrets.some((s) => text.includes(s)) || patterns.some((p) => p.test(text));

const pages = ["/", "/login", "/shortlists", "/saved"];
let scanned = 0;
for (const page of pages) {
  const html = await fetch(`${APP_URL}${page}`).then((r) => r.text());
  expect(`page ${page} has no secrets`, !leaks(html));
  for (const src of html.matchAll(/src="(\/_next\/[^"]+\.js)"/g)) {
    const js = await fetch(`${APP_URL}${src[1]}`).then((r) => r.text());
    scanned++;
    if (leaks(js)) expect(`script ${src[1]} has no secrets`, false);
  }
}
async function* files(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (path.endsWith(".js")) yield path;
  }
}
let bundled = 0;
for await (const file of files(".next/static")) {
  bundled++;
  if (leaks(await readFile(file, "utf8"))) expect(`bundle ${file} has no secrets`, false);
}
expect(`no secrets in ${scanned} served scripts and ${bundled} client bundle files`, true);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
