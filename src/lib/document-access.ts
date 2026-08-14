import "server-only";

export const CLEAN_DOCUMENT_SCAN_STATUS = "clean" as const;

export function isCleanDocumentScanStatus(value: unknown): value is typeof CLEAN_DOCUMENT_SCAN_STATUS {
  return value === CLEAN_DOCUMENT_SCAN_STATUS;
}
