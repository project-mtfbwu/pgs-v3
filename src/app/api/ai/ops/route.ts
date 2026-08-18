import { NextResponse } from "next/server";
import { jsonError, readJsonObject, validUuid } from "@/lib/http";
import { StaffAuthorizationError } from "@/lib/staff-auth";
import { consumeRateLimit, logServerError } from "@/lib/server-security";
import {
  getOpenAIClient,
  AIUnavailableError,
  AIRateLimitError,
  isAIConfigured,
  AI_MODEL,
  AI_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/provider";
import {
  getAuthorizedStaffContext,
  getAiOpsContext,
  getAiSearchContext,
  getAiStudentWorkspaceContext,
} from "@/lib/ai/tools";
import {
  buildOpsAdminSystemPrompt,
  buildOpsMentorSystemPrompt,
  buildOpsUserPrompt,
} from "@/lib/ai/prompts";
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
    // Authorization: staff must have overview.read.
    const staffContext = await getAuthorizedStaffContext();
    if (!staffContext) {
      return jsonError("Access denied.", 401);
    }

    // Rate limit: 10 requests per minute per user.
    const limit = await consumeRateLimit(request, "ai.ops", staffContext.user.id);
    if (!limit.allowed) {
      throw new AIRateLimitError();
    }

    // Parse and validate input.
    const rawInput = await readJsonObject(request);
    const parseResult = AiQuestionSchema.safeParse(rawInput);
    if (!parseResult.success) {
      return jsonError(parseResult.error.issues[0]?.message ?? "Invalid question.", 400);
    }
    const { question, student_id: requestedStudentId } = parseResult.data;

    // Determine if Admin/Super or Mentor scope.
    const isMentorOnly = !staffContext.permissions.has("student_workspace.read_all") &&
      !staffContext.permissions.has("student_workspace.manage_all") &&
      !staffContext.permissions.has("students.read");

    const systemPrompt = isMentorOnly
      ? buildOpsMentorSystemPrompt()
      : buildOpsAdminSystemPrompt();

    // Build data context — authorized tools only.
    const contextParts: string[] = [];

    // Always include analytics summary (scope-aware).
    const analyticsCtx = await getAiOpsContext(staffContext);
    contextParts.push(analyticsCtx);

    // If a specific student is requested, authorize and include workspace.
    if (requestedStudentId && validUuid(requestedStudentId)) {
      const studentCtx = await getAiStudentWorkspaceContext(requestedStudentId, staffContext);
      if (studentCtx) {
        contextParts.push(studentCtx);
      } else {
        contextParts.push(`[Student ${requestedStudentId}: not found or not authorized for your role]`);
      }
    }

    // Include search results if the question looks like a search query.
    const searchTriggers = ["who", "which", "find", "show", "list", "search", "students", "priya", "who has"];
    if (searchTriggers.some((t) => question.toLowerCase().includes(t))) {
      const searchCtx = await getAiSearchContext(question);
      if (searchCtx && !searchCtx.startsWith("No results")) {
        contextParts.push(searchCtx);
      }
    }

    const userPrompt = buildOpsUserPrompt(question, contextParts.join("\n\n---\n\n"));

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

    logServerError("ai_ops_request", null, {
      actor: staffContext.user.id,
      role: staffContext.roles[0] ?? "unknown",
      surface: "ops_ai",
      student_target: requestedStudentId ?? null,
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
    if (error instanceof StaffAuthorizationError) {
      return jsonError(error.message, error.status);
    }
    logServerError("ai_ops_route_failed", error);
    return NextResponse.json({ ok: false, unavailable: true, message: "AI Assistant is temporarily unavailable." }, { status: 503 });
  }
}
