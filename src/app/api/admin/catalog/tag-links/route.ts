import { adminApiError } from "@/lib/admin-api";
import { readJsonObject } from "@/lib/http";
import { requireStaffPermission } from "@/lib/staff-auth";

const links = {
  program: ["program_tags", "program_id"],
  course: ["course_tags", "course_id"],
  event: ["event_tags", "event_id"],
  university: ["university_tags", "university_id"]
} as const;

async function values(request: Request) {
  const input = await readJsonObject(request);
  const type = String(input.entity_type) as keyof typeof links;
  const entityId = Number(input.entity_id);
  const tagId = Number(input.tag_id);
  if (!links[type] || !Number.isSafeInteger(entityId) || entityId <= 0 || !Number.isSafeInteger(tagId) || tagId <= 0) {
    throw new Error("Invalid tag relationship.");
  }
  return { type, entityId, tagId };
}

export async function POST(request: Request) {
  try {
    await requireStaffPermission("catalog.manage");
    await values(request);
    throw new Error("Attach tags in the catalog record draft so they can be previewed before publication.");
  } catch (error) {
    return adminApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireStaffPermission("catalog.manage");
    await values(request);
    throw new Error("Remove tags in the catalog record draft so they can be previewed before publication.");
  } catch (error) {
    return adminApiError(error);
  }
}
