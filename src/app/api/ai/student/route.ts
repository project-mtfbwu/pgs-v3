import { NextResponse } from "next/server";
import { jsonError, readJsonObject } from "@/lib/http";
import { consumeRateLimit, logServerError } from "@/lib/server-security";
import {
  getOpenAIClient,
  AIUnavailableError,
  AIRateLimitError,
  isAIConfigured,
  AI_MODEL,
  AI_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/provider";
import { getAuthorizedStudentId, getAiOwnStudentContext } from "@/lib/ai/tools";
import { buildStudentSystemPrompt, buildStudentUserPrompt } from "@/lib/ai/prompts";
import {
  AiAnswerSchema,
  AiQuestionSchema,
  AI_PARSE_FALLBACK,
  type AiAnswer,
} from "@/lib/ai/response-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAIConfigured()) {
    return NextResponse.json({ ok: false, unavailable: true, message: "AI Assistant is not configured." }, { status: 503 });
  }

  try {
    // Authorization: must be an authenticated student (not staff, not guardian).
    const studentId = await getAuthorizedStudentId();
    if (!studentId) {
      return jsonError("Access denied. Student context required.", 401);
    }

    // Rate limit: 10 requests per minute per student.
    const limit = await consumeRateLimit(request, "ai.student", studentId);
    if (!limit.allowed) {
      throw new AIRateLimitError();
    }

    // Parse and validate input.
    const rawInput = await readJsonObject(request);
    const parseResult = AiQuestionSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return jsonError(parseResult.error.issues[0]?.message ?? "Invalid question.", 400);
    }
    const { question } = parseResult.data;

    // Load student's own authorized data.
    const studentCtx = await getAiOwnStudentContext(studentId);
    if (!studentCtx) {
      return NextResponse.json({
        ok: true,
        answer: {
          facts: [],
          summary: "Your Purple Guide workspace data is not available yet. Please check back once your account has been set up.",
          sources: [{ label: "Dashboard", href: "/dashboard" }],
        } satisfies AiAnswer,
      });
    }

    const systemPrompt = buildStudentSystemPrompt();
    const sourceLinksContext = `\n\nAVAILABLE SOURCE LINKS (use these in your "sources" array, do not invent other hrefs):\n- My Dashboard: /dashboard\n- My Loopboard: /purpleboard\n- Upload Documents: /upload_your_doc\n- Upcoming Events: /purpleevents\n- Courses: /programsfull`;
    const userPrompt = buildStudentUserPrompt(question, studentCtx + sourceLinksContext);

    // Call AI provider.
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const rawContent = completion.choices[0]?.message?.content ?? "{}";
    let answer: AiAnswer;
    try {
      const parsed = JSON.parse(rawContent) as unknown;
      const validated = AiAnswerSchema.safeParse(parsed);
      answer = validated.success ? validated.data : AI_PARSE_FALLBACK;
    } catch {
      answer = AI_PARSE_FALLBACK;
    }

    logServerError("ai_student_request", null, {
      actor: studentId,
      surface: "student_ai",
      tokens_used: completion.usage?.total_tokens ?? 0,
      success: true,
    });

    return NextResponse.json({ ok: true, answer });
  } catch (error) {
    if (error instanceof AIRateLimitError) {
      return jsonError(error.message, 429);
    }
    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ ok: false, unavailable: true, message: error.message }, { status: 503 });
    }
    logServerError("ai_student_route_failed", error);
    return NextResponse.json({ ok: false, unavailable: true, message: "AI Assistant is temporarily unavailable." }, { status: 503 });
  }
}
