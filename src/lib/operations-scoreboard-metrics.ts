export const SCOREBOARD_TIME_ZONE = "Asia/Kolkata";

export type ScoreboardStudentFact = {
  joinedAt: string;
  isPremium: boolean;
  isAssigned: boolean;
};

export type ScoreboardCounts = {
  total: number;
  premium: number;
  standard: number;
  assigned: number;
  unassigned: number;
  premiumAwaitingMentor: number;
  joinedThisMonth: number;
  joinedThisYear: number;
};

function periodParts(value: Date): { year: string; month: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCOREBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(value);
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? ""
  };
}

export function summarizeScoreboardFacts(
  facts: ScoreboardStudentFact[],
  now = new Date()
): ScoreboardCounts {
  const current = periodParts(now);
  return facts.reduce<ScoreboardCounts>((summary, fact) => {
    const joined = periodParts(new Date(fact.joinedAt));
    summary.total += 1;
    if (fact.isPremium) summary.premium += 1;
    else summary.standard += 1;
    if (fact.isAssigned) summary.assigned += 1;
    else summary.unassigned += 1;
    if (fact.isPremium && !fact.isAssigned) summary.premiumAwaitingMentor += 1;
    if (joined.year === current.year) {
      summary.joinedThisYear += 1;
      if (joined.month === current.month) summary.joinedThisMonth += 1;
    }
    return summary;
  }, {
    total: 0,
    premium: 0,
    standard: 0,
    assigned: 0,
    unassigned: 0,
    premiumAwaitingMentor: 0,
    joinedThisMonth: 0,
    joinedThisYear: 0
  });
}
