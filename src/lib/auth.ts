import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function safeNext(value: string | null | undefined, fallback = "/student/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

export function applicationOrigin(requestUrl: string): string {
  const requestOrigin = new URL(requestUrl).origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return requestOrigin;
  try {
    const origin = new URL(configured).origin;
    return /^https?:$/.test(new URL(origin).protocol) ? origin : requestOrigin;
  } catch { return requestOrigin; }
}

export async function getAuthenticatedUser(): Promise<User | null> {
  if (!getSupabasePublicConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function requireAuthenticatedUser(nextPath: string): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(safeNext(nextPath, "/student/dashboard"))}`);
  return user;
}

export function authErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed")) return "Please verify your email before logging in.";
  if (lower.includes("already registered") || lower.includes("already been registered")) return "This email is already registered. Please log in instead.";
  if (lower.includes("password")) return "Please check the password requirements and try again.";
  return "Unable to complete this account action. Please try again.";
}
