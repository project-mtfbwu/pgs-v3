"use client";

import { useState, useRef, useTransition } from "react";
import { Bot, ExternalLink, X, Sparkles } from "lucide-react";
import type { AiAnswer } from "@/lib/ai/response-schema";

const SUGGESTED_PROMPTS = [
  "What am I currently working on?",
  "Which documents still need action?",
  "Summarize my progress.",
  "What should I check in my dashboard?",
];

function AiAnswerView({ answer }: { answer: AiAnswer }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {answer.facts.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", marginBottom: "6px" }}>
            PGS Data
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {answer.facts.map((fact: string, i: number) => (
              <li key={i} style={{ fontSize: "13px", color: "#111827" }}>· {fact}</li>
            ))}
          </ul>
        </div>
      )}
      {answer.summary && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", marginBottom: "6px" }}>
            Summary
          </p>
          <p style={{ fontSize: "13px", color: "#111827", margin: 0 }}>{answer.summary}</p>
        </div>
      )}
      {answer.suggested_next_step && (
        <div style={{ background: "#f5f3ff", border: "1px solid #ede9fe", borderRadius: "8px", padding: "10px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#7c3aed", marginBottom: "4px" }}>Suggested next step</p>
          <p style={{ fontSize: "13px", color: "#111827", margin: 0 }}>{answer.suggested_next_step}</p>
        </div>
      )}
      {answer.sources.length > 0 && (
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", marginBottom: "6px" }}>
            Go to
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {answer.sources.map((source: { label: string; href: string }, i: number) => (
              <a
                key={i}
                href={source.href}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "#5b21b6", background: "#ede9fe", borderRadius: "9999px", padding: "3px 10px", textDecoration: "none" }}
              >
                {source.label}
                <ExternalLink aria-hidden="true" style={{ width: "10px", height: "10px" }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AskPurpleGuide() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setAnswer(null);
    setError("");
    setUnavailable(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/student", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });
        const data = await res.json() as {
          ok: boolean;
          answer?: AiAnswer;
          unavailable?: boolean;
          message?: string;
        };
        if (data.unavailable) { setUnavailable(true); return; }
        if (!res.ok || !data.ok) { setError(data.message ?? "An error occurred."); return; }
        setAnswer(data.answer ?? null);
      } catch {
        setError("AI Assistant is temporarily unavailable.");
      }
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void submit(question);
  }

  if (!open) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Ask Purple Guide AI assistant"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#5b21b6",
            color: "#fff",
            border: "none",
            borderRadius: "9999px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(91,33,182,0.30)",
          }}
        >
          <Sparkles aria-hidden="true" style={{ width: "16px", height: "16px" }} />
          Ask Purple Guide
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Purple Guide AI assistant"
      aria-modal="true"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 1000,
        width: "min(400px, calc(100vw - 32px))",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100dvh - 48px)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Bot aria-hidden="true" style={{ width: "18px", height: "18px", color: "#5b21b6" }} />
          <strong style={{ fontSize: "14px", color: "#1e1b4b" }}>Ask Purple Guide</strong>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close Ask Purple Guide panel"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px" }}
        >
          <X aria-hidden="true" style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {!answer && !pending && !error && !unavailable && (
          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280", marginBottom: "8px" }}>
              Try asking
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => { setQuestion(prompt); void submit(prompt); }}
                  style={{
                    background: "#f8f7ff",
                    border: "1px solid #ede9fe",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: "13px",
                    color: "#1e1b4b",
                    cursor: "pointer",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {pending && (
          <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "24px 0", color: "#6b7280" }}>
            <Bot aria-hidden="true" style={{ width: "24px", height: "24px", animation: "pulse 2s infinite" }} />
            <p style={{ fontSize: "13px", margin: 0 }}>Thinking…</p>
          </div>
        )}

        {unavailable && (
          <div role="alert" style={{ fontSize: "13px", color: "#4b5563", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px" }}>
            AI Assistant is temporarily unavailable. Your PGS data is still accessible on your dashboard.
          </div>
        )}

        {error && (
          <div role="alert" style={{ fontSize: "13px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px" }}>
            {error}
          </div>
        )}

        {answer && !pending && (
          <div>
            <AiAnswerView answer={answer} />
            <button
              type="button"
              onClick={() => { setAnswer(null); setQuestion(""); }}
              style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
            >
              Ask another question
            </button>
          </div>
        )}
      </div>

      {/* Footer / input */}
      <div style={{ borderTop: "1px solid #f3f4f6", padding: "12px 16px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label htmlFor="ask-pg-question" style={{ fontSize: "12px", fontWeight: 500, color: "#4b5563" }}>
            Your question
          </label>
          <textarea
            id="ask-pg-question"
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What am I currently working on?"
            maxLength={500}
            rows={2}
            style={{
              width: "100%",
              resize: "none",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "8px 10px",
              fontSize: "13px",
              color: "#111827",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
            aria-describedby="ask-pg-note"
          />
          <p id="ask-pg-note" style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
            Answers use only your own PGS information. AI is an assistant — always verify important details with your counselor.
          </p>
          <button
            type="submit"
            disabled={pending || question.trim().length < 2}
            style={{
              background: pending || question.trim().length < 2 ? "#a78bfa" : "#5b21b6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "9px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: pending || question.trim().length < 2 ? "not-allowed" : "pointer",
              width: "100%",
            }}
          >
            {pending ? "Asking…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
