// ---------------------------------------------------------------------------
// Unified scoring engine
// ---------------------------------------------------------------------------
// Every game contributes points on the same scale ("Party Points") so that
// final standings across a mixed-game night are comparable.
//
// Formula per scoring event:
//   points = basePoints
//          * difficultyMultiplier
//          * (1 + timeBonus)          // 0..timeBonusMaxPct
//          + streakBonus              // flat add every Nth in a row
//          - penalties                // skips, forbidden words, wrong answers
//
// Final standings = SUM(points across all rounds), tie-break on most-correct.
// ---------------------------------------------------------------------------

export interface ScoringContext {
  basePoints: number;
  difficulty?: number; // 1..5
  difficultyMultiplier?: Record<number, number>;
  /** seconds remaining when the answer was given */
  timeRemaining?: number;
  /** total seconds the question was open */
  timeAllowed?: number;
  /** max fractional bonus for speed, e.g. 0.5 = up to +50% */
  timeBonusMaxPct?: number;
  /** consecutive correct count including this one */
  currentStreak?: number;
  streakBonusEvery?: number;
  streakBonusPoints?: number;
  /** flat penalties to subtract */
  penalties?: number;
}

export interface ScoringResult {
  points: number;
  breakdown: {
    base: number;
    difficultyMultiplier: number;
    timeBonus: number; // multiplicative fraction
    streakBonus: number;
    penalties: number;
  };
}

export function scoreEvent(ctx: ScoringContext): ScoringResult {
  const diff = ctx.difficulty ?? 1;
  const diffMult = ctx.difficultyMultiplier?.[diff] ?? 1;

  const timeBonus =
    ctx.timeRemaining && ctx.timeAllowed && ctx.timeBonusMaxPct
      ? Math.max(0, Math.min(ctx.timeBonusMaxPct, (ctx.timeRemaining / ctx.timeAllowed) * ctx.timeBonusMaxPct))
      : 0;

  const streakBonus =
    ctx.currentStreak && ctx.streakBonusEvery && ctx.streakBonusPoints
      ? ctx.currentStreak % ctx.streakBonusEvery === 0
        ? ctx.streakBonusPoints
        : 0
      : 0;

  const penalties = ctx.penalties ?? 0;

  const raw = ctx.basePoints * diffMult * (1 + timeBonus) + streakBonus - penalties;
  const points = Math.max(0, Math.round(raw));

  return {
    points,
    breakdown: {
      base: ctx.basePoints,
      difficultyMultiplier: diffMult,
      timeBonus,
      streakBonus,
      penalties,
    },
  };
}
