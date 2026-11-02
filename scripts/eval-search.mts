// Scores search end to end: each brief goes through POST /api/search, every
// page is fetched, and the result set is compared with the expected ids (precision, recall, and
// precision of the first page). Hostile briefs must return 200 with nobody.
//
//   make eval                      # data/queries.json + data/eval-extra.json
//   node scripts/eval-search.mts path/to/queries.json
//
// Needs the app running with ANTHROPIC_API_KEY. If the eval company is out of free searches, it
// is upgraded with a signed test subscription event (needs STRIPE_WEBHOOK_SECRET).
import "./lib/env-files.mts";
import { readFile } from "node:fs/promises";
import { signStripePayload } from "../src/server/billing/stripe-signature.ts";
import { APP_URL, RECRUITERS, api, signIn } from "./lib/client.mts";

type Case = { brief: string; expected_ids: string[] };

const files = process.argv.slice(2).length ? process.argv.slice(2) : ["data/queries.json", "data/eval-extra.json"];
const cases: Case[] = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(f, "utf8"))))).flat();

const token = await signIn(RECRUITERS.globex);
await ensurePaid(token);

const rows: { brief: string; p: number; r: number; first: number; total: number; ms: number; pageMs: number }[] = [];
for (const c of cases) {
  const search = await api(token, "POST", "/api/search", { brief: c.brief });
  if (search.status !== 200) {
    console.log(`ERROR ${search.status} for "${c.brief}": ${JSON.stringify(search.body)}`);
    rows.push({ brief: c.brief, p: 0, r: 0, first: 0, total: -1, ms: search.ms, pageMs: 0 });
    continue;
  }
  const { search_id, total, results, filters, unsupported } = search.body;
  const ids: string[] = [];
  const pageTimes: number[] = [];
  for (let page = 1; ; page++) {
    const res = await api(token, "GET", `/api/search/${search_id}?page=${page}`);
    pageTimes.push(res.ms);
    if (res.status !== 200 || res.body.results.length === 0) break;
    ids.push(...res.body.results.map((r: { id: string }) => r.id));
  }
  const unique = new Set(ids);
  if (unique.size !== ids.length || ids.length !== total) {
    console.log(`PAGING BUG for "${c.brief}": ${ids.length} ids, ${unique.size} unique, total ${total}`);
  }

  const expected = new Set(c.expected_ids);
  const hits = [...unique].filter((id) => expected.has(id)).length;
  const firstPage = results.map((r: { id: string }) => r.id);
  const firstHits = firstPage.filter((id: string) => expected.has(id)).length;
  const p = unique.size === 0 ? (expected.size === 0 ? 1 : 0) : hits / unique.size;
  const r = expected.size === 0 ? (unique.size === 0 ? 1 : 0) : hits / expected.size;
  const first =
    firstPage.length === 0 ? (expected.size === 0 ? 1 : 0) : firstHits / Math.min(20, Math.max(expected.size, 1));
  rows.push({ brief: c.brief, p, r, first: Math.min(first, 1), total, ms: search.ms, pageMs: Math.max(...pageTimes) });

  const flag = p === 1 && r === 1 ? "  " : "✗ ";
  console.log(`${flag}${c.brief}`);
  console.log(`    P=${p.toFixed(2)} R=${r.toFixed(2)} first=${first.toFixed(2)} got=${total} expected=${expected.size} search=${search.ms}ms page≤${Math.max(...pageTimes)}ms`);
  if (flag.trim()) {
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length : v !== null)));
    console.log(`    filters ${JSON.stringify(active)}${unsupported.length ? ` unsupported ${JSON.stringify(unsupported)}` : ""}`);
  }
}

const mean = (k: "p" | "r" | "first" | "ms" | "pageMs") => rows.reduce((s, row) => s + row[k], 0) / rows.length;
console.log(
  `\n${rows.length} briefs · precision ${mean("p").toFixed(3)} · recall ${mean("r").toFixed(3)} · first page ${mean("first").toFixed(3)}` +
    ` · search avg ${Math.round(mean("ms"))}ms (max ${Math.max(...rows.map((r) => r.ms))}ms) · page max ${Math.max(...rows.map((r) => r.pageMs))}ms`,
);

async function ensurePaid(token: string) {
  const plan = await api(token, "GET", "/api/plan");
  if (plan.body.plan === "paid") return;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("globex is on the free plan and STRIPE_WEBHOOK_SECRET is not set to upgrade it");
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    id: `evt_eval_${now}`,
    object: "event",
    created: now,
    type: "customer.subscription.updated",
    data: { object: { id: "sub_eval_globex", object: "subscription", customer: "cus_eval", status: "active", metadata: { company: "globex" } } },
  });
  const res = await fetch(`${APP_URL}/api/billing/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signStripePayload(payload, secret, now) },
    body: payload,
  });
  console.log(`Upgraded globex for the eval (webhook ${res.status})\n`);
}
