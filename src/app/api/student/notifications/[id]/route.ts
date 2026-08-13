import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };
function validUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

async function ownContext(route: Context) {
  const { id } = await route.params;
  if (!validUuid(id)) return { response: jsonError("Invalid notification.", 400) };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: jsonError("Please log in to manage notifications.", 401) };
  return { id, userId: data.user.id, supabase };
}

export async function PATCH(_request: Request, route: Context) {
  const value = await ownContext(route); if ("response" in value) return value.response;
  const { data, error } = await value.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", value.id).eq("student_id", value.userId).select("destination_path").maybeSingle();
  if (error || !data) return jsonError("Notification not found.", 404);
  return NextResponse.json({ ok: true, destination: data.destination_path });
}

export async function DELETE(_request: Request, route: Context) {
  const value = await ownContext(route); if ("response" in value) return value.response;
  const { data, error } = await value.supabase.from("notifications").delete().eq("id", value.id).eq("student_id", value.userId).select("id").maybeSingle();
  if (error || !data) return jsonError("Notification not found.", 404);
  return NextResponse.json({ ok: true });
}
