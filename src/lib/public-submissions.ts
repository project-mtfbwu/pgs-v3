import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { leadProvider, type LeadSubmission } from "@/lib/integrations/lead-provider";

type SubmissionKind = LeadSubmission["kind"];
type Fields = Record<string, string | string[]>;

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: NextRequest, kind: SubmissionKind): boolean {
  const now = Date.now();
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${kind}:${address}`;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 8;
}

function cleanString(value: unknown, maximum = 4_000): string {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function cleanFields(value: unknown): Fields | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries: Array<[string, string | string[]]> = [];
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, 32)) {
    const key = rawKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (!key) continue;
    if (typeof rawValue === "string") entries.push([key, cleanString(rawValue)]);
    else if (Array.isArray(rawValue)) {
      entries.push([key, rawValue.filter((item): item is string => typeof item === "string").slice(0, 12).map((item) => cleanString(item, 500))]);
    }
  }
  return Object.fromEntries(entries);
}

function first(fields: Fields, names: string[]): string {
  for (const name of names) {
    const value = fields[name];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function persist(kind: SubmissionKind, page: string, form: string, fields: Fields): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const name = first(fields, ["name", "full_name", "student_name"]);
  const email = first(fields, ["email", "user_email"]);
  const phone = first(fields, ["phone", "number", "mobile", "contact_number"]);
  if (kind === "enquiry") {
    const { error } = await client.from("enquiries").insert({ name, email, phone, message: first(fields, ["comment", "message"]), source_page: page });
    if (error) throw error;
  } else if (kind === "deadline-subscription") {
    const { error } = await client.from("deadline_subscriptions").insert({ email, source_page: page });
    if (error) throw error;
  } else if (kind === "study-journey") {
    const { error } = await client.from("study_journey_enquiries").insert({ name, email, phone, source_page: page, payload: fields });
    if (error) throw error;
  } else {
    const { error } = await client.from("lead_submissions").insert({ submission_type: form || "public-modal", name, email, phone, source_page: page, payload: fields });
    if (error) throw error;
  }
  return true;
}

export async function handlePublicSubmission(request: NextRequest, kind: SubmissionKind) {
  if (rateLimited(request, kind)) return NextResponse.json({ message: "Please wait before trying again." }, { status: 429 });
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 40_000) return NextResponse.json({ message: "Submission is too large." }, { status: 413 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid submission." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ message: "Invalid submission." }, { status: 400 });
  const record = body as Record<string, unknown>;
  const fields = cleanFields(record.fields);
  if (!fields) return NextResponse.json({ message: "Form fields are required." }, { status: 400 });
  const page = cleanString(record.page, 120) || "unknown";
  const form = cleanString(record.form, 120) || "legacy-form";
  const email = first(fields, ["email", "user_email"]);
  const phone = first(fields, ["phone", "number", "mobile", "contact_number"]);
  if (email && !validEmail(email)) return NextResponse.json({ message: "Enter a valid email address." }, { status: 422 });
  if (kind === "deadline-subscription" && !validEmail(email)) return NextResponse.json({ message: "Enter a valid email address." }, { status: 422 });
  if (kind !== "deadline-subscription" && !email && !phone) return NextResponse.json({ message: "Add an email address or phone number." }, { status: 422 });

  try {
    const persisted = await persist(kind, page, form, fields);
    await leadProvider.submit({ kind, sourcePage: page, fields });
    return NextResponse.json({ message: "Thank you. Your submission has been received.", persisted, provider: "disabled" }, { status: persisted ? 201 : 202 });
  } catch {
    return NextResponse.json({ message: "We could not save your submission. Please try again." }, { status: 503 });
  }
}
