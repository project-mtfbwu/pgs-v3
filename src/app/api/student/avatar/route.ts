import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const form = await request.formData();
  const file = form.get("avatar");
  if (!(file instanceof File)) return jsonError("Choose an image to upload.", 400);
  const extension = types[file.type];
  if (!extension || file.size < 1 || file.size > 5_242_880) return jsonError("Use a JPG, PNG, or WebP image up to 5 MB.", 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return jsonError("The uploaded file is not a valid image.", 400);
  const path = `${authData.user.id}/avatar.${extension}`;
  const { error: uploadError } = await supabase.storage.from("student-avatars").upload(path, bytes, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (uploadError) return jsonError("Unable to upload the avatar.", 400);
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", authData.user.id);
  if (error) return jsonError("Avatar uploaded, but the profile could not be updated.", 400);
  return NextResponse.json({ ok: true });
}
