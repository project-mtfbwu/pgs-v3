// Zod schemas for validated AI responses.
// Do not trust arbitrary model JSON — always parse through these.

import { z } from "zod";

/** A single source link the AI can reference in its answer. */
export const AiSourceLinkSchema = z.object({
  label: z.string().max(120),
  href: z.string().regex(/^\//).max(300), // internal PGS paths only
});
export type AiSourceLink = z.infer<typeof AiSourceLinkSchema>;

/** Structured AI answer returned to the client. */
export const AiAnswerSchema = z.object({
  /** Factual statements derived from PGS data — short bullets or sentences. */
  facts: z.array(z.string().max(400)).max(12),
  /** AI interpretation / summarization. May be empty. */
  summary: z.string().max(1200),
  /** Optional suggested next step. Not a system fact. */
  suggested_next_step: z.string().max(400).optional(),
  /** Internal PGS links to support the answer. */
  sources: z.array(AiSourceLinkSchema).max(6),
});
export type AiAnswer = z.infer<typeof AiAnswerSchema>;

/** A validated question from the client. */
export const AiQuestionSchema = z.object({
  question: z.string()
    .min(2, "Enter a question.")
    .max(500, "Question is too long (max 500 characters).")
    .transform((q: string) => q.trim()),
  // Optional explicit student target for ops queries (must be validated server-side).
  student_id: z.string().uuid().optional(),
});
export type AiQuestion = z.infer<typeof AiQuestionSchema>;

// Safe fallback when model output cannot be parsed.
export const AI_PARSE_FALLBACK: AiAnswer = {
  facts: [],
  summary: "The AI Assistant was unable to produce a structured answer. Please try rephrasing your question.",
  sources: [],
};
