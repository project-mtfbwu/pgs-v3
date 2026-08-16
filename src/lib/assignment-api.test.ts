import { describe, expect, it } from "vitest";
import { assignmentRpcErrorResponse } from "@/lib/assignment-api";

describe("assignment API error mapping", () => {
  it("maps authorization, premium, handler, and conflict failures without flattening them to 403", () => {
    expect(assignmentRpcErrorResponse({ message: "forbidden" }).status).toBe(403);
    expect(assignmentRpcErrorResponse({ message: "active Premium required" }).status).toBe(422);
    expect(assignmentRpcErrorResponse({ message: "mentor unavailable" }).status).toBe(422);
    expect(assignmentRpcErrorResponse({ message: "active assignment not found" }).status).toBe(409);
    expect(assignmentRpcErrorResponse({ code: "23505" }).status).toBe(409);
    expect(assignmentRpcErrorResponse({ message: "deadlock detected" }).status).toBe(500);
  });

  it("does not leak SQL or internal exception text", async () => {
    const response = assignmentRpcErrorResponse({ message: "duplicate key value violates unique constraint mentor_assignments_one_active_student_idx" });
    const body = await response.json() as { message: string };
    expect(body.message).not.toMatch(/duplicate key|mentor_assignments_one_active|sql/i);
    expect(response.status).toBe(409);
  });
});
