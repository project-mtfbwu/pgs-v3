import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));

// ── response-schema tests ─────────────────────────────────────────────────
import { AiAnswerSchema, AiQuestionSchema, AI_PARSE_FALLBACK } from "@/lib/ai/response-schema";

describe("AI response schema — AiAnswerSchema", () => {
  it("accepts valid structured answer", () => {
    const result = AiAnswerSchema.safeParse({
      facts: ["3 Premium students have no mentor.", "2 documents are overdue."],
      summary: "Immediate attention is needed on mentor assignments.",
      suggested_next_step: "Open the Student Registry and filter for unassigned Premium students.",
      sources: [{ label: "Student Registry", href: "/ops/students" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid internal href in sources", () => {
    const result = AiAnswerSchema.safeParse({
      facts: [],
      summary: "Summary",
      sources: [{ label: "External", href: "https://evil.com" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many facts", () => {
    const result = AiAnswerSchema.safeParse({
      facts: Array(13).fill("a fact"),
      summary: "Summary",
      sources: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many sources", () => {
    const result = AiAnswerSchema.safeParse({
      facts: [],
      summary: "ok",
      sources: Array(7).fill({ label: "link", href: "/ops" }),
    });
    expect(result.success).toBe(false);
  });

  it("has a safe parse fallback with empty facts and no sources", () => {
    expect(AI_PARSE_FALLBACK.facts).toHaveLength(0);
    expect(AI_PARSE_FALLBACK.sources).toHaveLength(0);
    expect(AI_PARSE_FALLBACK.summary).toBeTruthy();
  });
});

describe("AI response schema — AiQuestionSchema", () => {
  it("accepts valid question", () => {
    const r = AiQuestionSchema.safeParse({ question: "What needs my attention today?" });
    expect(r.success).toBe(true);
  });

  it("rejects empty question", () => {
    const r = AiQuestionSchema.safeParse({ question: "" });
    expect(r.success).toBe(false);
  });

  it("rejects question over 500 chars", () => {
    const r = AiQuestionSchema.safeParse({ question: "x".repeat(501) });
    expect(r.success).toBe(false);
  });

  it("rejects invalid student_id (not uuid)", () => {
    const r = AiQuestionSchema.safeParse({ question: "Summarize Priya.", student_id: "not-a-uuid" });
    expect(r.success).toBe(false);
  });

  it("accepts valid student_id uuid", () => {
    const r = AiQuestionSchema.safeParse({
      question: "Summarize Priya.",
      student_id: "12345678-1234-4000-8000-123456789012",
    });
    expect(r.success).toBe(true);
  });

  it("trims whitespace from question", () => {
    const r = AiQuestionSchema.safeParse({ question: "  hello  " });
    expect(r.success && r.data.question).toBe("hello");
  });
});

// ── provider tests ────────────────────────────────────────────────────────
import { isAIConfigured, AIUnavailableError, AIRateLimitError } from "@/lib/ai/provider";

describe("AI provider — isAIConfigured", () => {
  beforeEach(() => { delete process.env.OPENAI_API_KEY; });

  it("returns false when OPENAI_API_KEY is absent", () => {
    expect(isAIConfigured()).toBe(false);
  });

  it("returns true when OPENAI_API_KEY is present", () => {
    process.env.OPENAI_API_KEY = "sk-test-value";
    expect(isAIConfigured()).toBe(true);
    delete process.env.OPENAI_API_KEY;
  });
});

describe("AI provider — error types", () => {
  it("AIUnavailableError has correct name", () => {
    const e = new AIUnavailableError();
    expect(e.name).toBe("AIUnavailableError");
    expect(e.message).toContain("unavailable");
  });

  it("AIRateLimitError has correct name", () => {
    const e = new AIRateLimitError();
    expect(e.name).toBe("AIRateLimitError");
    expect(e.message).toContain("many");
  });
});

// ── tools — approxTokens ──────────────────────────────────────────────────
import { approxTokens } from "@/lib/ai/tools";

describe("AI tools — approxTokens", () => {
  it("estimates tokens as length/4", () => {
    expect(approxTokens("")).toBe(0);
    expect(approxTokens("abcd")).toBe(1);
    expect(approxTokens("abcdefgh")).toBe(2);
    expect(approxTokens("a")).toBe(1); // ceil(0.25) = 1
  });
});

// ── prompts — system prompts do not contain credential patterns ───────────
import { buildOpsAdminSystemPrompt, buildOpsMentorSystemPrompt, buildStudentSystemPrompt } from "@/lib/ai/prompts";

describe("AI prompts — no credentials or SQL in system prompts", () => {
  const prompts = [buildOpsAdminSystemPrompt(), buildOpsMentorSystemPrompt(), buildStudentSystemPrompt()];

  it("do not contain SQL SELECT statements", () => {
    for (const p of prompts) {
      expect(p.toLowerCase()).not.toContain("select *");
    }
  });

  it("instruct the model to respond in JSON", () => {
    for (const p of prompts) {
      expect(p).toContain("JSON");
    }
  });

  it("contain safety rules", () => {
    for (const p of prompts) {
      expect(p).toContain("IMPORTANT RULES");
    }
  });

  it("mention fact/summary/sources shape", () => {
    for (const p of prompts) {
      expect(p).toContain("facts");
      expect(p).toContain("summary");
      expect(p).toContain("sources");
    }
  });

  it("admin prompt does not restrict to assigned students", () => {
    expect(buildOpsAdminSystemPrompt()).not.toContain("ONLY to students explicitly assigned");
  });

  it("mentor prompt restricts to assigned students", () => {
    expect(buildOpsMentorSystemPrompt()).toContain("ONLY to data about students explicitly assigned");
  });
});
