import { describe, expect, it } from "vitest";
import { isProfileComplete, parseStudentProfile } from "@/lib/student-validation";

describe("student profile validation", () => {
  it("normalizes active legacy fields and detects completion", () => {
    const profile = parseStudentProfile({ name: "  Priya  Shah ", number: "+91 9999999999", whatsapp: "Yes", country_code: "India", preferred_country_code: "USA", study_level: "PG" });
    expect(profile.fullName).toBe("Priya Shah");
    expect(profile.whatsapp).toBe(true);
    expect(isProfileComplete(profile)).toBe(true);
  });
  it("supports partial profile edits but rejects invalid names and phones", () => {
    expect(() => parseStudentProfile({ name: "A" })).toThrow("full name");
    expect(() => parseStudentProfile({ name: "Valid Name", number: "not-a-phone" })).toThrow("valid phone");
  });
});
