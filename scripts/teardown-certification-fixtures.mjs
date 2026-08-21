import { createClient } from "@supabase/supabase-js";
import {
  assertCertificationTarget,
  isCertificationFixtureUser,
} from "./lib/certification-env-guard.mjs";

const { url, local, projectRef } = assertCertificationTarget();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  throw new Error("Server-only service role is required for fixture teardown.");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;

const fixtureUsers = listed.data.users.filter(isCertificationFixtureUser);
const fixtureIds = new Set(fixtureUsers.map((user) => user.id));

if (!fixtureIds.size) {
  console.log(`No marker-limited certification fixtures found on ${local ? "local" : "preview"} ${projectRef}.`);
  process.exit(0);
}

const assignments = await admin.from("mentor_assignments")
  .select("id, mentor_id, student_id, status")
  .in("mentor_id", [...fixtureIds])
  .eq("status", "active");
if (assignments.error) throw assignments.error;

let ended = 0;
for (const row of assignments.data ?? []) {
  if (!fixtureIds.has(row.student_id)) continue;
  const endedRow = await admin.from("mentor_assignments").update({
    status: "ended",
    ended_at: new Date().toISOString(),
    ended_by: row.mentor_id,
    reason: "Certification fixture teardown",
  }).eq("id", row.id).eq("status", "active");
  if (endedRow.error) throw endedRow.error;
  ended += 1;
}

console.log(JSON.stringify({
  environment: local ? "local" : "preview",
  projectRef,
  markedUsers: fixtureUsers.length,
  endedFixtureAssignments: ended,
  authUsersDeleted: 0,
  auditEventsDeleted: 0,
  note: "Auth users and append-only audit_events were retained. Cleanup is limited to records owned by users carrying pgs_certification_fixture.",
}, null, 2));
