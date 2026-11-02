// Loads data/candidates.json and creates the two seeded recruiters.
// Run by `make setup` after `supabase db reset`, with the local Supabase connection details
// exported by scripts/with-supabase-env.sh. Safe to run more than once.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const RECRUITERS = [
  { company: "acme", email: "recruiter@acme.test", fullName: "Alex Morgan" },
  { company: "globex", email: "recruiter@globex.test", fullName: "Sam Rivera" },
];
const PASSWORD = "people-search-demo";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run this through scripts/with-supabase-env.sh.`);
  return value;
}

const sql = postgres(requireEnv("SUPABASE_DB_URL"), { max: 1, onnotice: () => {} });
const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function loadCandidates() {
  const raw = await readFile(new URL("../data/candidates.json", import.meta.url), "utf8");
  const candidates = JSON.parse(raw);
  if (!Array.isArray(candidates)) throw new Error("data/candidates.json must be an array");
  const [{ loaded }] = await sql`select private.load_candidates(${sql.json(candidates)}) as loaded`;
  console.log(`Loaded ${loaded} candidates`);
}

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
}

async function seedRecruiters() {
  for (const r of RECRUITERS) {
    let userId = await findUserId(r.email);
    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: r.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: r.fullName },
      });
      if (error) throw error;
      userId = data.user.id;
    }

    const [company] = await sql`select id from public.companies where slug = ${r.company}`;
    if (!company) throw new Error(`Company ${r.company} is missing; did supabase/seed.sql run?`);
    await sql`
      insert into public.recruiters (user_id, company_id, full_name)
      values (${userId}, ${company.id}, ${r.fullName})
      on conflict (user_id) do update set company_id = excluded.company_id, full_name = excluded.full_name`;
    console.log(`Recruiter ${r.email} → ${r.company}`);
  }
}

try {
  await loadCandidates();
  await seedRecruiters();
} finally {
  await sql.end();
}
