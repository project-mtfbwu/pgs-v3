import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit,logServerError } from "@/lib/server-security";

const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
function validImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return jsonError("Please log in to upload an avatar.", 401);
  const limit=await consumeRateLimit(request,"upload.avatar",authData.user.id);
  if(!limit.allowed)return jsonError(limit.configured?"Too many avatar uploads. Please wait and try again.":"Avatar uploads are temporarily unavailable.",limit.configured?429:503);
  const declaredLength=Number(request.headers.get("content-length")??0);
  if(declaredLength>5_600_000)return jsonError("Use a JPG, PNG, or WebP image up to 5 MB.",413);
  const form = await request.formData();
  const file = form.get("avatar");
  if (!(file instanceof File)) return jsonError("Choose an image to upload.", 400);
  const extension = types[file.type];
  if (!extension || file.size < 1 || file.size > 5_242_880) return jsonError("Use a JPG, PNG, or WebP image up to 5 MB.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return jsonError("The uploaded file is not a valid image.", 400);
  const {data:profile}=await supabase.from("profiles").select("avatar_path").eq("id",authData.user.id).maybeSingle();
  const path = `${authData.user.id}/${randomUUID()}.${extension}`;
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try { admin=createSupabaseAdminClient(); } catch(error) { logServerError("avatar_storage_unavailable",error,{user_id:authData.user.id});return jsonError("Avatar uploads are temporarily unavailable.",503); }
  const { error: uploadError } = await admin.storage.from("student-avatars").upload(path, bytes, { upsert:false, contentType: file.type, cacheControl: "3600" });
  if (uploadError) return jsonError("Unable to upload the avatar.", 400);
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", authData.user.id);
  if (error){await admin.storage.from("student-avatars").remove([path]);return jsonError("Unable to update the avatar.",400);}
  if(profile?.avatar_path&&profile.avatar_path!==path){const removed=await admin.storage.from("student-avatars").remove([profile.avatar_path]);if(removed.error)logServerError("avatar_old_object_cleanup_failed",removed.error,{user_id:authData.user.id});}
  return NextResponse.json({ ok: true });
}
