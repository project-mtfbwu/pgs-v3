import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function readJsonObject(request: Request, maxBytes = 24_000): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new Error("Request is too large.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new Error("Request is too large.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Invalid request."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request.");
  return value as Record<string, unknown>;
}

export function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
