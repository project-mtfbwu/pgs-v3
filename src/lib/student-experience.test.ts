import { describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("next/navigation",()=>({redirect:vi.fn(),notFound:vi.fn()}));
import { classifyStudentExperience } from "@/lib/student-experience";

describe("authoritative student experience states",()=>{
  it("keeps exactly the three approved student presentation states",()=>{
    expect(classifyStudentExperience(false,false,"none")).toBe("anonymous");
    expect(classifyStudentExperience(true,true,"none")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true,true,"revoked")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true,true,"expired")).toBe("authenticated_standard");
    expect(classifyStudentExperience(true,true,"active")).toBe("authenticated_premium");
  });

  it("does not select a student experience for authenticated staff-only actors",()=>{
    expect(classifyStudentExperience(true,false,"none")).toBeNull();
    expect(classifyStudentExperience(true,false,"active")).toBeNull();
  });
});
