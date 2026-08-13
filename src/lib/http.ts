import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function readJsonObject(request: Request, maxBytes = 24_000): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new Error("Request is too large.");
  const value: unknown = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request.");
  return value as Record<string, unknown>;
}
