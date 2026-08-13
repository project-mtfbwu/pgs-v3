import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ kind: string; id: string }> };

async function context(request: Request, route: Context) {
  const { kind, id } = await route.params;
  const itemId = Number(id);
  if ((kind !== "programs" && kind !== "courses") || !Number.isSafeInteger(itemId) || itemId <= 0) return { response: jsonError("Invalid saved item.", 400) };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: jsonError("Please log in to manage saved items.", 401) };
  return { supabase, userId: data.user.id, kind, itemId, table: kind === "programs" ? "saved_programs" : "saved_courses", itemColumn: kind === "programs" ? "program_id" : "course_id" } as const;
}

export async function POST(request: Request, route: Context) {
  const value = await context(request, route);
  if ("response" in value) return value.response;
  const { error } = await value.supabase.from(value.table).upsert({ student_id: value.userId, [value.itemColumn]: value.itemId }, { onConflict: `student_id,${value.itemColumn}`, ignoreDuplicates: true });
  if (error) return jsonError("That published item could not be saved.", 400);
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(request: Request, route: Context) {
  const value = await context(request, route);
  if ("response" in value) return value.response;
  const { error } = await value.supabase.from(value.table).delete().eq("student_id", value.userId).eq(value.itemColumn, value.itemId);
  if (error) return jsonError("Unable to remove the saved item.", 400);
  return NextResponse.json({ ok: true, saved: false });
}
