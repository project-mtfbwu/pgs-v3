import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  assertCertificationTarget,
  certificationUserMetadata,
  emailForFixture,
} from "./lib/certification-env-guard.mjs";

const { url, local, projectRef } = assertCertificationTarget();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.PGS_PREVIEW_FIXTURE_PASSWORD;

if (!serviceKey || !publicKey || !password || password.length < 16) {
  throw new Error("Preview Supabase URL, publishable key, server key, and a 16+ character fixture password are required.");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = () => createClient(url, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const emailFor = emailForFixture;
const definitions = [
  { name: "super-admin", context: "staff", role: "super_admin" },
  { name: "admin", context: "staff", role: "admin" },
  { name: "mentor-a", context: "staff", role: "mentor" },
  { name: "viewer", context: "staff", role: "read_only_staff" },
  { name: "student-a", context: "student" },
  { name: "student-b", context: "student" },
  { name: "state-student", context: "student" },
  { name: "logout-student", context: "student" },
  { name: "dual-admin", context: "student", role: "admin" },
];

const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listed.error) throw listed.error;
const users = new Map(listed.data.users.map((user) => [user.email, user]));

for (const definition of definitions) {
  const email = emailFor(definition.name);
  const metadata = certificationUserMetadata(definition.name, definition.context);
  let user = users.get(email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: metadata,
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }
  users.set(email, user);
}

const requireUser = (name) => {
  const user = users.get(emailFor(name));
  if (!user) throw new Error(`Missing ${name}.`);
  return user;
};
const superAdmin = requireUser("super-admin");
const mentor = requireUser("mentor-a");
const premiumStudent = requireUser("student-a");
const standardStudent = requireUser("student-b");
const transitionStudent = requireUser("state-student");
const logoutStudent = requireUser("logout-student");
const dualAdmin = requireUser("dual-admin");

// Bootstrap only the first Super Admin through the service role. It is not
// attributed as self-assigned. Every other staff fixture goes through the
// application governance RPC while authenticated as this Super Admin.
const superRole = await admin.from("staff_roles").select("id").eq("key", "super_admin").single();
if (superRole.error) throw superRole.error;
const superProfile = await admin.from("staff_profiles").upsert({
  user_id: superAdmin.id,
  role: "super_admin",
  display_name: "Fixture super-admin",
  status: "active",
}, { onConflict: "user_id" });
if (superProfile.error) throw superProfile.error;
const superAssignment = await admin.from("staff_role_assignments")
  .select("id")
  .eq("staff_user_id", superAdmin.id)
  .eq("role_id", superRole.data.id)
  .is("revoked_at", null)
  .maybeSingle();
if (superAssignment.error) throw superAssignment.error;
if (!superAssignment.data) {
  const inserted = await admin.from("staff_role_assignments").insert({
    staff_user_id: superAdmin.id,
    role_id: superRole.data.id,
    assigned_by: null,
    reason: "Preview-only Super Admin bootstrap",
  });
  if (inserted.error) throw inserted.error;
}

const staffClient = publicClient();
const signIn = await staffClient.auth.signInWithPassword({
  email: emailFor("super-admin"),
  password,
});
if (signIn.error) throw signIn.error;

for (const definition of definitions.filter(({ role, name }) => role && name !== "super-admin")) {
  const target = requireUser(definition.name);
  const managed = await staffClient.rpc("manage_staff_access", {
    target_user: target.id,
    target_role: definition.role,
    target_active: true,
    target_status: "active",
    target_display_name: `Fixture ${definition.name}`,
    event_reason: "Preview-only Phase 4A fixture",
  });
  if (managed.error) throw managed.error;
}

// Student profiles are provisioned by the Auth trigger from explicit student
// intent. Staff-only fixtures must never gain a profile.
for (const definition of definitions) {
  const user = requireUser(definition.name);
  const profile = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile.error) throw profile.error;
  const expectsStudent = definition.context === "student";
  if (Boolean(profile.data) !== expectsStudent) {
    throw new Error(`Unexpected student context for ${definition.name}.`);
  }
}

for (const standard of [standardStudent, transitionStudent, logoutStudent, dualAdmin]) {
  const active = await admin.from("premium_entitlements")
    .select("id")
    .eq("student_id", standard.id)
    .eq("status", "active")
    .lte("starts_at", new Date().toISOString())
    .gt("ends_at", new Date().toISOString())
    .maybeSingle();
  if (active.error) throw active.error;
  if (active.data) {
    const reset = await staffClient.rpc("set_premium_entitlement", {
      target_student: standard.id,
      target_action: "revoke",
      target_plan_code: null,
      event_reason: "Preview-only standard fixture reset",
    });
    if (reset.error) throw reset.error;
  }
}

const premium = await staffClient.rpc("set_premium_entitlement", {
  target_student: premiumStudent.id,
  target_action: "grant",
  target_plan_code: "12_month",
  event_reason: "Preview-only Phase 4A fixture",
});
if (premium.error && !/already has an active Premium period/i.test(premium.error.message)) {
  throw premium.error;
}

const existingMentor = await admin.from("mentor_assignments")
  .select("id")
  .eq("mentor_id", mentor.id)
  .eq("student_id", premiumStudent.id)
  .eq("status", "active")
  .maybeSingle();
if (existingMentor.error) throw existingMentor.error;
if (!existingMentor.data) {
  const assignment = await admin.from("mentor_assignments").insert({
    mentor_id: mentor.id,
    student_id: premiumStudent.id,
    assigned_by: superAdmin.id,
    reason: "Preview-only Phase 4A fixture",
  });
  if (assignment.error) throw assignment.error;
}

const program = await staffClient.from("programs").upsert({
  title: "PGS Preview CV-Ready Program",
  slug: "pgs-preview-cv-ready-program",
  short_description: "A preview-only saved program used to certify the retained PGS card structure.",
  description: "Preview-only parity fixture.",
  published: true,
  featured: false,
}, { onConflict: "slug" }).select("id").single();
if (program.error) throw program.error;
const course = await staffClient.from("courses").upsert({
  title: "PGS Preview Admissions Course",
  slug: "pgs-preview-admissions-course",
  short_description: "A preview-only saved course used to certify populated student saved states.",
  description: "Preview-only parity fixture.",
  published: true,
  featured: false,
}, { onConflict: "slug" }).select("id").single();
if (course.error) throw course.error;

for (const name of ["student-a", "student-b"]) {
  const fixtureUser = requireUser(name);
  const studentClient = publicClient();
  const login = await studentClient.auth.signInWithPassword({
    email: emailFor(name),
    password,
  });
  if (login.error) throw login.error;
  const existingProgram = await studentClient.from("saved_programs")
    .select("program_id").eq("program_id", program.data.id).maybeSingle();
  if (existingProgram.error) throw existingProgram.error;
  if (!existingProgram.data) {
    const saved = await studentClient.from("saved_programs").insert({
      student_id: fixtureUser.id,
      program_id: program.data.id,
    });
    if (saved.error) throw saved.error;
  }
  const existingCourse = await studentClient.from("saved_courses")
    .select("course_id").eq("course_id", course.data.id).maybeSingle();
  if (existingCourse.error) throw existingCourse.error;
  if (!existingCourse.data) {
    const saved = await studentClient.from("saved_courses").insert({
      student_id: fixtureUser.id,
      course_id: course.data.id,
    });
    if (saved.error) throw saved.error;
  }
  await studentClient.auth.signOut();
}

await staffClient.auth.signOut();

const idsDirectory = resolve(process.env.PLAYWRIGHT_AUTH_STATE_DIR ?? ".auth/phase36");
await mkdir(idsDirectory, { recursive: true });
await writeFile(
  resolve(idsDirectory, "fixture-ids.json"),
  `${JSON.stringify({
    namespace: "pgs-v3-cert",
    environment: local ? "local" : "preview",
    projectRef,
    superAdminUserId: superAdmin.id,
    adminUserId: requireUser("admin").id,
    mentorUserId: mentor.id,
    readOnlyStaffUserId: requireUser("viewer").id,
    dualAdminUserId: dualAdmin.id,
    assignedStudentId: premiumStudent.id,
    unassignedStudentId: standardStudent.id,
    premiumStudentId: premiumStudent.id,
    standardStudentId: standardStudent.id,
    stateStudentId: transitionStudent.id,
    logoutStudentId: logoutStudent.id,
  }, null, 2)}\n`,
  { mode: 0o600 },
);

console.log(`Certification fixtures ready on ${local ? "local" : "preview"} host ${projectRef}. Marker-limited IDs written under ${idsDirectory}. No credentials were written to disk.`);
