import { describe, expect, it } from "vitest";
import { operationsInitials, operationsRoleLabel } from "@/lib/operations-presentation";

describe("Operations presentation helpers", () => {
  it("builds two-letter initials from a display name", () => {
    expect(operationsInitials("Jane Mentor")).toBe("JM");
    expect(operationsInitials("Admin")).toBe("AD");
    expect(operationsInitials("")).toBe("PG");
  });

  it("labels the current staff actor without inventing a Premium role", () => {
    expect(operationsRoleLabel(["super_admin"])).toBe("Super Admin");
    expect(operationsRoleLabel(["admin"])).toBe("Admin");
    expect(operationsRoleLabel(["mentor"])).toBe("Mentor");
    expect(operationsRoleLabel(["read_only_staff"])).toBe("Read-only Staff");
  });
});
