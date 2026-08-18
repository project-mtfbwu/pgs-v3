import "server-only";
import OpenAI from "openai";

// ── Cost / safety limits ────────────────────────────────────────────────────

/**
 * Model name — configurable via PGS_AI_MODEL env var.
 * Safe default is gpt-4o-mini (fast, low cost, supports json_object response format).
 * Allowlist: only known OpenAI model IDs that support json_object mode.
 */
const ALLOWED_MODELS = new Set([
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
]);
const CONFIGURED_MODEL = process.env.PGS_AI_MODEL ?? "gpt-4o-mini";
export const AI_MODEL: string = ALLOWED_MODELS.has(CONFIGURED_MODEL)
  ? CONFIGURED_MODEL
  : "gpt-4o-mini";

/** Approximate token budget for the data injected into every request. */
export const AI_MAX_INPUT_TOKENS = 4_000;
/** Max tokens in model response. */
export const AI_MAX_OUTPUT_TOKENS = 800;
/** HTTP timeout for the AI provider request (ms). */
export const AI_REQUEST_TIMEOUT_MS = 15_000;

// ── Provider client ─────────────────────────────────────────────────────────
let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIUnavailableError("AI provider is not configured.");
    _client = new OpenAI({ apiKey, timeout: AI_REQUEST_TIMEOUT_MS });
  }
  return _client;
}

// ── Errors ──────────────────────────────────────────────────────────────────
export class AIUnavailableError extends Error {
  constructor(message = "AI Assistant is temporarily unavailable.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

export class AIRateLimitError extends Error {
  constructor() {
    super("You have made too many AI requests. Please wait a moment and try again.");
    this.name = "AIRateLimitError";
  }
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
