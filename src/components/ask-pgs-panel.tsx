"use client";

import { useState, useRef, useTransition } from "react";
import { Bot, ExternalLink, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { AiAnswer } from "@/lib/ai/response-schema";

type Props = {
  studentId?: string; // If provided, asks about a specific student.
};

const SUGGESTED_PROMPTS = [
  "What needs my attention today?",
  "Which Premium students have no mentor?",
  "What is overdue in work targets?",
  "Summarize today's operational status.",
];

function AiAnswerView({ answer }: { answer: AiAnswer }) {
  return (
    <div className="ops:space-y-3">
      {answer.facts.length > 0 && (
        <div>
          <p className="ops:mb-1.5 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-wide ops:text-muted-foreground">
            PGS Data
          </p>
          <ul className="ops:space-y-1">
            {answer.facts.map((fact: string, i: number) => (
              <li key={i} className="ops:text-sm ops:text-foreground">
                · {fact}
              </li>
            ))}
          </ul>
        </div>
      )}
      {answer.summary && (
        <div>
          <p className="ops:mb-1.5 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-wide ops:text-muted-foreground">
            AI Summary
          </p>
          <p className="ops:text-sm ops:text-foreground">{answer.summary}</p>
        </div>
      )}
      {answer.suggested_next_step && (
        <div className="ops:rounded-md ops:border ops:border-border ops:bg-accent ops:p-2.5">
          <p className="ops:text-xs ops:font-semibold ops:text-muted-foreground">Suggested next step</p>
          <p className="ops:text-sm ops:text-foreground">{answer.suggested_next_step}</p>
        </div>
      )}
      {answer.sources.length > 0 && (
        <div>
          <p className="ops:mb-1.5 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-wide ops:text-muted-foreground">
            Sources
          </p>
          <ul className="ops:flex ops:flex-wrap ops:gap-2">
            {answer.sources.map((source: { label: string; href: string }, i: number) => (
              <li key={i}>
                <a
                  href={source.href}
                  className="ops:inline-flex ops:items-center ops:gap-1 ops:rounded ops:bg-secondary ops:px-2 ops:py-1 ops:text-xs ops:font-medium ops:text-foreground ops:hover:bg-accent"
                >
                  {source.label}
                  <ExternalLink aria-hidden="true" className="ops:size-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AskPgsPanel({ studentId }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setAnswer(null);
    setError("");
    setUnavailable(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/ops", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            ...(studentId ? { student_id: studentId } : {}),
          }),
        });
        const data = await res.json() as {
          ok: boolean;
          answer?: AiAnswer;
          unavailable?: boolean;
          message?: string;
        };
        if (data.unavailable) {
          setUnavailable(true);
          return;
        }
        if (!res.ok || !data.ok) {
          setError(data.message ?? "An error occurred.");
          return;
        }
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

  function handleSuggest(prompt: string) {
    setQuestion(prompt);
    void submit(prompt);
    inputRef.current?.focus();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open Ask PGS AI assistant"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "ops-ask-pgs-trigger"
          )}
        >
          <Bot aria-hidden="true" className="ops:size-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="ops:flex ops:w-[min(28rem,95vw)] ops:flex-col ops:border-l ops:bg-card ops:p-0"
        aria-label="Ask PGS AI panel"
      >
        <SheetHeader className="ops:border-b ops:border-border ops:px-4 ops:py-4">
          <div className="ops:flex ops:items-center ops:justify-between">
            <div className="ops:flex ops:items-center ops:gap-2">
              <Bot aria-hidden="true" className="ops:size-4 ops:text-muted-foreground" />
              <SheetTitle className="ops:text-sm ops:font-semibold">Ask PGS</SheetTitle>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Ask PGS panel"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "ops:size-7")}
            >
              <X aria-hidden="true" className="ops:size-4" />
            </button>
          </div>
          <SheetDescription className="ops:text-xs ops:text-muted-foreground">
            Ask questions about your authorized PGS data. AI answers use only information your role permits.
          </SheetDescription>
        </SheetHeader>

        <div className="ops:flex ops:flex-1 ops:flex-col ops:gap-4 ops:overflow-y-auto ops:p-4">
          {!answer && !pending && !error && !unavailable && (
            <div>
              <p className="ops:mb-2 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-wide ops:text-muted-foreground">
                Suggested questions
              </p>
              <ul className="ops:flex ops:flex-col ops:gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <li key={prompt}>
                    <button
                      type="button"
                      onClick={() => handleSuggest(prompt)}
                      className="ops:w-full ops:rounded ops:border ops:border-border ops:bg-background ops:px-3 ops:py-2 ops:text-left ops:text-xs ops:text-foreground ops:hover:bg-accent"
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending && (
            <div role="status" aria-live="polite" className="ops:flex ops:flex-col ops:items-center ops:gap-2 ops:py-8 ops:text-muted-foreground">
              <Bot aria-hidden="true" className="ops:size-6 ops:animate-pulse" />
              <p className="ops:text-sm">Thinking…</p>
            </div>
          )}

          {unavailable && (
            <div role="alert" className="ops:rounded ops:border ops:border-border ops:p-3 ops:text-sm ops:text-muted-foreground">
              AI Assistant is temporarily unavailable. Your PGS data remains accessible from the regular Operations screens.
            </div>
          )}

          {error && (
            <div role="alert" className="ops:rounded ops:border ops:border-destructive ops:bg-destructive/5 ops:p-3 ops:text-sm ops:text-destructive">
              {error}
            </div>
          )}

          {answer && !pending && (
            <div>
              <p className="ops:mb-3 ops:text-xs ops:font-semibold ops:uppercase ops:tracking-wide ops:text-muted-foreground">
                Answer
              </p>
              <AiAnswerView answer={answer} />
              <button
                type="button"
                onClick={() => { setAnswer(null); setQuestion(""); }}
                className="ops:mt-4 ops:text-xs ops:text-muted-foreground ops:hover:text-foreground"
              >
                Ask another question
              </button>
            </div>
          )}
        </div>

        <div className="ops:border-t ops:border-border ops:p-4">
          <form onSubmit={handleSubmit} className="ops:flex ops:flex-col ops:gap-2">
            <label htmlFor="ask-pgs-question" className="ops:text-xs ops:font-medium ops:text-muted-foreground">
              Your question
            </label>
            <textarea
              id="ask-pgs-question"
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What needs my attention today?"
              maxLength={500}
              rows={3}
              className="ops:w-full ops:resize-none ops:rounded-md ops:border ops:border-border ops:bg-background ops:p-2.5 ops:text-sm ops:text-foreground ops:placeholder:text-muted-foreground focus:ops:outline-none focus:ops:ring-2 focus:ops:ring-ring"
              aria-describedby="ask-pgs-note"
            />
            <p id="ask-pgs-note" className="ops:text-xs ops:text-muted-foreground">
              AI uses only your permitted PGS data. Answers are informational — data management remains in PGS.
            </p>
            <button
              type="submit"
              disabled={pending || question.trim().length < 2}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "ops:w-full"
              )}
            >
              {pending ? "Asking…" : "Ask"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
