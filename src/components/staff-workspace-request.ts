"use client";

export async function requestStaffWorkspace(
  studentId: string,
  resource: string,
  method: "POST" | "PATCH" | "DELETE",
  values: Record<string, unknown>
): Promise<string | null> {
  const response = await fetch(`/api/staff/students/${studentId}/workspace/${resource}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values)
  });
  const result = await response.json() as { message?: string };
  if (!response.ok) return result.message ?? "Unable to save.";
  window.location.reload();
  return null;
}
