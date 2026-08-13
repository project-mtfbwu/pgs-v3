import { readFile } from "node:fs/promises";

const proofMigration = await readFile(new URL("../supabase/migrations/202608120001_parity_proof_cms.sql", import.meta.url), "utf8");
const publicMigration = await readFile(new URL("../supabase/migrations/202608130001_public_site.sql", import.meta.url), "utf8");
const studentMigration = await readFile(new URL("../supabase/migrations/202608130002_auth_student.sql", import.meta.url), "utf8");
const premiumMigration = await readFile(new URL("../supabase/migrations/202608130003_premium_workspace.sql", import.meta.url), "utf8");
const migration = `${proofMigration}\n${publicMigration}\n${studentMigration}\n${premiumMigration}`;
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
  "private.integration_outbox",
  "alter table public.profiles enable row level security",
  "alter table public.saved_programs enable row level security",
  "alter table public.saved_courses enable row level security",
  "alter table public.notifications enable row level security",
  "students read own profile",
  "students read own saved programs",
  "students read own saved courses",
  "students read own notifications",
  "student-avatars",
  "alter table public.premium_entitlements enable row level security",
  "alter table public.mentor_assignments enable row level security",
  "alter table public.student_documents enable row level security",
  "alter table public.student_tasks enable row level security",
  "authorized users read shared student tasks",
  "staff manage shared student tasks",
  "student-documents",
  "activate_premium_purchase",
  "set_premium_entitlement",
  "set_mentor_assignment",
  "premium_audit_logs"
];

const missing = required.filter((statement) => !migration.includes(statement));
if (missing.length) throw new Error(`RLS migration is missing: ${missing.join(", ")}`);
if (/service[_-]?role[_-]?key|password\s*=|smtp|oauth.*secret|eyJ[a-zA-Z0-9_-]{20,}/i.test(migration)) throw new Error("Potential secret or privileged credential found in migration");
console.log("RLS migration static checks passed");
