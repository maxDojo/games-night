import { describe, it, expect } from 'vitest';
import { scoreEvent } from '../src/lib/scoring.js';

describe('scoreEvent', () => {
  it('returns base points when nothing else is set', () => {
    const r = scoreEvent({ basePoints: 100 });
    expect(r.points).toBe(100);
    expect(r.breakdown.base).toBe(100);
    expect(r.breakdown.timeBonus).toBe(0);
  });

  it('applies difficulty multiplier', () => {
    const r = scoreEvent({
      basePoints: 100,
      difficulty: 3,
      difficultyMultiplier: { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2 },
    });
    expect(r.points).toBe(150);
    expect(r.breakdown.difficultyMultiplier).toBe(1.5);
  });

  it('awards a time bonus capped at timeBonusMaxPct', () => {
    // Answered with 10/20 seconds left = half the bonus cap (cap 0.5 → +25%)
    const r = scoreEvent({
      basePoints: 100,
      timeRemaining: 10,
      timeAllowed: 20,
      timeBonusMaxPct: 0.5,
    });
    expect(r.points).toBe(125);
    expect(r.breakdown.timeBonus).toBeCloseTo(0.25);
  });

  it('caps the time bonus at the configured max', () => {
    // timeRemaining > timeAllowed shouldn't blow up the bonus.
    const r = scoreEvent({
      basePoints: 100,
      timeRemaining: 100,
      timeAllowed: 20,
      timeBonusMaxPct: 0.5,
    });
    expect(r.points).toBe(150); // exactly +50%, clamped
  });

  it('awards streak bonus on the Nth consecutive correct', () => {
    const r = scoreEvent({
      basePoints: 100,
      currentStreak: 3,
      streakBonusEvery: 3,
      streakBonusPoints: 50,
    });
    expect(r.points).toBe(150);
    expect(r.breakdown.streakBonus).toBe(50);
  });

  it('does not award streak bonus off-cadence', () => {
    const r = scoreEvent({
      basePoints: 100,
      currentStreak: 2,
      streakBonusEvery: 3,
      streakBonusPoints: 50,
    });
    expect(r.points).toBe(100);
    expect(r.breakdown.streakBonus).toBe(0);
  });

  it('subtracts penalties and never returns negative points', () => {
    const r = scoreEvent({ basePoints: 50, penalties: 200 });
    expect(r.points).toBe(0);
  });

  it('combines every modifier in one event', () => {
    // base 100 × diff 1.5 × (1 + 0.25 time) + 50 streak − 25 penalty
    // = 100 * 1.5 * 1.25 + 50 - 25 = 187.5 + 25 = 212.5 → 213
    const r = scoreEvent({
      basePoints: 100,
      difficulty: 3,
      difficultyMultiplier: { 1: 1, 2: 1.25, 3: 1.5, 4: 1.75, 5: 2 },
      timeRemaining: 10,
      timeAllowed: 20,
      timeBonusMaxPct: 0.5,
      currentStreak: 3,
      streakBonusEvery: 3,
      streakBonusPoints: 50,
      penalties: 25,
    });
    expect(r.points).toBe(213);
  });
});
