import { jsonError } from "@/lib/http";

/**
 * Multipart body upload through Vercel is retired for student documents.
 * Use upload-session (authorize) → direct Storage upload → finalize.
 */
export async function POST() {
  return jsonError(
    "Direct document body upload is disabled. Authorize a staged upload session first.",
    410
  );
}
