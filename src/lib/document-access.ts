import "server-only";

export const CLEAN_DOCUMENT_SCAN_STATUS = "clean" as const;
export const MAX_STUDENT_DOCUMENT_BYTES = 52_428_800;
export const STUDENT_DOCUMENT_SIGNED_URL_SECONDS = 300;
export const STUDENT_DOCUMENT_BUCKET = "student-documents";

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
] as const;

export type AcceptedDocumentMime = (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number];

export const DOCUMENT_EXTENSIONS: Record<AcceptedDocumentMime, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
};

const MIME_FILENAME_EXTENSIONS: Record<AcceptedDocumentMime, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"]
};

export function isCleanDocumentScanStatus(value: unknown): value is typeof CLEAN_DOCUMENT_SCAN_STATUS {
  return value === CLEAN_DOCUMENT_SCAN_STATUS;
}

export function isAcceptedDocumentMime(value: unknown): value is AcceptedDocumentMime {
  return typeof value === "string" && (ACCEPTED_DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

export function documentFilenameMatchesMime(filename: string, mime: AcceptedDocumentMime): boolean {
  const extension = filename.toLowerCase().split(".").pop();
  return typeof extension === "string" && MIME_FILENAME_EXTENSIONS[mime].includes(extension);
}

export function isDeliverableDocumentRow(row: {
  scan_status?: string | null;
  superseded_at?: string | null;
  archived_at?: string | null;
  purged_at?: string | null;
  storage_purged_at?: string | null;
}): boolean {
  return isCleanDocumentScanStatus(row.scan_status)
    && !row.superseded_at
    && !row.archived_at
    && !row.purged_at
    && !row.storage_purged_at;
}

/** Trusted magic-byte checks used by workers after direct upload. */
export function validDocumentSignature(bytes: Uint8Array, mime: string): boolean {
  if (!isAcceptedDocumentMime(mime) || bytes.length < 4) return false;
  if (mime === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  }
  const names = new TextDecoder("latin1").decode(bytes);
  if (mime === "application/msword") {
    return [0xd0, 0xcf, 0x11, 0xe0].every((value, index) => bytes[index] === value) && names.includes("WordDocument");
  }
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
    && names.includes("[Content_Types].xml")
    && names.includes("word/");
}

export function safeDisplayFilename(value: string): string {
  const cleaned = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f/\\]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned || "document").slice(0, 255);
}
