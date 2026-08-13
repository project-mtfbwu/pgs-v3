import { describe,expect,it } from "vitest";
import { classifyStudentExperience } from "@/lib/student-experience";

describe("authoritative student experience states",()=>{
  it("keeps anonymous, normal student, and Premium as exactly three presentation states",()=>{
    expect(classifyStudentExperience(false,"none")).toBe("anonymous");
    expect(classifyStudentExperience(true,"none")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true,"revoked")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true,"expired")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true,"active")).toBe("authenticated_premium");
  });
});
