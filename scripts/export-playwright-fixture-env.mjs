import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(process.env.PLAYWRIGHT_AUTH_STATE_DIR ?? ".auth/phase36");

const files = {
  PLAYWRIGHT_STANDARD_STUDENT_STORAGE_STATE: "standard-student.json",
  PLAYWRIGHT_STANDARD_LOGOUT_STORAGE_STATE: "standard-logout.json",
  PLAYWRIGHT_STATE_STUDENT_STORAGE_STATE: "state-student.json",
  PLAYWRIGHT_PREMIUM_STUDENT_STORAGE_STATE: "premium-student.json",
  PLAYWRIGHT_MENTOR_STORAGE_STATE: "mentor.json",
  PLAYWRIGHT_READ_ONLY_STAFF_STORAGE_STATE: "read-only-staff.json",
  PLAYWRIGHT_VIEWER_STORAGE_STATE: "read-only-staff.json",
  PLAYWRIGHT_ADMIN_STORAGE_STATE: "admin.json",
  PLAYWRIGHT_SUPER_ADMIN_STORAGE_STATE: "super-admin.json",
  PLAYWRIGHT_DUAL_ADMIN_STORAGE_STATE: "dual-admin.json",
};

for (const [name, fileName] of Object.entries(files)) {
  const filePath = resolve(directory, fileName);
  if (existsSync(filePath)) {
    console.log(`${name}=${filePath}`);
  }
}

const idsPath = resolve(directory, "fixture-ids.json");
if (existsSync(idsPath)) {
  const ids = JSON.parse(readFileSync(idsPath, "utf8"));
  const mapping = {
    PGS_ASSIGNED_STUDENT_ID: ids.assignedStudentId,
    PGS_UNASSIGNED_STUDENT_ID: ids.unassignedStudentId,
    PGS_PREMIUM_STUDENT_ID: ids.premiumStudentId,
    PGS_STANDARD_STUDENT_ID: ids.standardStudentId,
    PGS_STATE_TEST_STUDENT_ID: ids.stateStudentId,
    PGS_SUPER_ADMIN_USER_ID: ids.superAdminUserId,
  };
  for (const [name, value] of Object.entries(mapping)) {
    if (typeof value === "string" && value) console.log(`${name}=${value}`);
  }
}
