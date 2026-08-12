import { readFile } from "node:fs/promises";

const proofMigration = await readFile(new URL("../supabase/migrations/202608120001_parity_proof_cms.sql", import.meta.url), "utf8");
const publicMigration = await readFile(new URL("../supabase/migrations/202608130001_public_site.sql", import.meta.url), "utf8");
const migration = `${proofMigration}\n${publicMigration}`;
const required = [
  "alter table public.cms_editors enable row level security",
  "alter table public.page_content enable row level security",
  "public can read published proof content",
  "editors can insert proof content",
  "editors can update proof content",
  "revoke all on public.page_content from anon, authenticated",
  "alter table public.cms_pages enable row level security",
  "alter table public.cms_page_revisions enable row level security",
  "alter table public.programs enable row level security",
  "alter table public.courses enable row level security",
  "alter table public.events enable row level security",
  "alter table public.enquiries enable row level security",
  "public submits enquiries",
  "public reads published cms revisions",
  "private.integration_outbox"
];

const missing = required.filter((statement) => !migration.includes(statement));
if (missing.length) throw new Error(`RLS migration is missing: ${missing.join(", ")}`);
if (/service_role|password\s*=|smtp|oauth.*secret/i.test(migration)) throw new Error("Potential secret or privileged credential found in migration");
console.log("RLS migration static checks passed");
