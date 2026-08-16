import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/staff-preview-server", () => ({
  getStaffPreviewContext: vi.fn(),
  getActiveStudentPreviewTargetId: vi.fn(),
  loadPreviewStudentAvatarUrl: vi.fn(),
  loadPreviewStudentEntitlements: vi.fn(),
  loadPreviewStudentNotifications: vi.fn(),
  loadPreviewStudentProfile: vi.fn()
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn()
}));
vi.mock("@/lib/actor-context", () => ({
  resolveActorContext: vi.fn()
}));

import type { StudentProfile } from "@/lib/student-data";
import {
  classifyStudentExperience,
  composeAuthenticatedStudentExperience,
  studentActorId,
  studentExperienceEmail,
  studentSubjectId,
  usesPrivilegedPreviewStudentLoader
} from "@/lib/student-experience";

const adminUser = {
  id: "c4500000-0000-4000-8000-000000000007",
  email: "admin@pgs.test"
} as User;
const studentAUser = {
  id: "c4100000-0000-4000-8000-000000000001",
  email: "student-a@pgs.test"
} as User;
const studentBUser = {
  id: "c4200000-0000-4000-8000-000000000002",
  email: "student-b@pgs.test"
} as User;

function profile(id: string, fullName: string): StudentProfile {
  return {
    id,
    full_name: fullName,
    dial_code: null,
    phone: null,
    whatsapp: null,
    citizenship_country: null,
    preferred_study_country: null,
    study_level: "Medicine",
    field_interest: null,
    work_experience: null,
    referral_code: null,
    avatar_path: "avatars/subject.png",
    profile_completed_at: "2026-01-01T00:00:00.000Z"
  };
}

const activePremium = {
  status: "active" as const,
  entitlement: {
    id: "ent-a",
    status: "active" as const,
    source: "admin_grant" as const,
    plan_code: "12_month",
    duration_months: 12,
    approved_at: "2026-01-01T00:00:00.000Z",
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2099-01-01T00:00:00.000Z",
    revoked_at: null
  }
};

const noPremium = { status: "none" as const, entitlement: null };

describe("authoritative student experience states", () => {
  it("keeps exactly the three approved student presentation states", () => {
    expect(classifyStudentExperience(false, false, "none")).toBe("anonymous");
    expect(classifyStudentExperience(true, true, "none")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true, true, "revoked")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true, true, "expired")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true, true, "active")).toBe("authenticated_premium");
  });

  it("does not select a student experience for authenticated staff-only actors", () => {
    expect(classifyStudentExperience(true, false, "none")).toBeNull();
    expect(classifyStudentExperience(true, false, "active")).toBeNull();
  });
});

describe("View as Student actor/subject composition", () => {
  it("keeps Admin as actor and Premium student-a as subject, including entitlement", () => {
    const state = composeAuthenticatedStudentExperience({
      actorUser: adminUser,
      actorName: "Ops Admin",
      subjectProfile: profile(studentAUser.id, "Student A"),
      subjectEmail: studentAUser.email ?? "",
      unreadCount: 2,
      validity: activePremium,
      preview: { actorName: "Ops Admin" }
    });
    expect(state).not.toBeNull();
    expect(state?.kind).toBe("authenticated_premium");
    expect(studentActorId(state!)).toBe(adminUser.id);
    expect(studentSubjectId(state!)).toBe(studentAUser.id);
    expect(state?.user.id).toBe(studentAUser.id);
    expect(state?.actor.user.id).toBe(adminUser.id);
    expect(studentExperienceEmail(state!)).toBe("student-a@pgs.test");
    expect(state?.name).toBe("Student A");
    expect(state?.premiumStatus).toBe("active");
    expect(state?.premiumEntitlement?.id).toBe("ent-a");
    expect(state?.preview).toMatchObject({
      mode: "student",
      actorName: "Ops Admin",
      targetName: "Student A",
      targetEmail: "student-a@pgs.test"
    });
    expect(usesPrivilegedPreviewStudentLoader(state!)).toBe(true);
    expect(studentActorId(state!)).not.toBe(studentSubjectId(state!));
  });

  it("keeps Standard preview Standard even when the Admin actor is not the student", () => {
    const state = composeAuthenticatedStudentExperience({
      actorUser: adminUser,
      actorName: "Ops Admin",
      subjectProfile: profile(studentBUser.id, "Student B"),
      subjectEmail: studentBUser.email ?? "",
      unreadCount: 0,
      validity: noPremium,
      preview: { actorName: "Ops Admin" }
    });
    expect(state?.kind).toBe("authenticated_standard");
    expect(studentSubjectId(state!)).toBe(studentBUser.id);
    expect(studentExperienceEmail(state!)).toBe("student-b@pgs.test");
    expect(state?.premiumEntitlement).toBeNull();
    expect(usesPrivilegedPreviewStudentLoader(state!)).toBe(true);
  });

  it("does not change a normal Premium login: actor and subject are the same student", () => {
    const state = composeAuthenticatedStudentExperience({
      actorUser: studentAUser,
      actorName: "Student A",
      subjectProfile: profile(studentAUser.id, "Student A"),
      subjectEmail: studentAUser.email ?? "",
      unreadCount: 1,
      validity: activePremium
    });
    expect(state?.kind).toBe("authenticated_premium");
    expect(state?.preview).toBeUndefined();
    expect(studentActorId(state!)).toBe(studentAUser.id);
    expect(studentSubjectId(state!)).toBe(studentAUser.id);
    expect(studentExperienceEmail(state!)).toBe("student-a@pgs.test");
    expect(usesPrivilegedPreviewStudentLoader(state!)).toBe(false);
  });

  it("does not change a normal Standard login", () => {
    const state = composeAuthenticatedStudentExperience({
      actorUser: studentBUser,
      actorName: "Student B",
      subjectProfile: profile(studentBUser.id, "Student B"),
      subjectEmail: studentBUser.email ?? "",
      unreadCount: 0,
      validity: noPremium
    });
    expect(state?.kind).toBe("authenticated_standard");
    expect(state?.preview).toBeUndefined();
    expect(studentActorId(state!)).toBe(studentSubjectId(state!));
    expect(usesPrivilegedPreviewStudentLoader(state!)).toBe(false);
  });
});
