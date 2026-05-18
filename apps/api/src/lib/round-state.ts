// ---------------------------------------------------------------------------
// Round state machine — pure functions, no DB access.
// ---------------------------------------------------------------------------
//
// Lifecycle:
//
//   PENDING ──start──> ACTIVE ──end──> COMPLETED
//      └─skip──> SKIPPED
//
// Rules:
// - A round may be CREATED any time the party is not FINISHED or CANCELLED.
// - A round may START only if it's PENDING and no other round in the party
//   is currently ACTIVE.
// - A round may END only if it's ACTIVE.
// - A round may SKIP only while PENDING.
// - Manual score writes are allowed while the round is ACTIVE (so the host
//   can adjust mid-game). Once COMPLETED, scores are immutable.
//
// These functions return either { ok: true } or { ok: false, reason: string }
// so route handlers can map cleanly to HTTP 4xx responses.
// ---------------------------------------------------------------------------

export type RoundStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED';
export type PartyStatus = 'LOBBY' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'CANCELLED';

export type Guard = { ok: true } | { ok: false, reason: string };

export function canCreateRound(party: { status: PartyStatus }): Guard {
  if (party.status === 'FINISHED') return { ok: false, reason: 'Party is finished' };
  if (party.status === 'CANCELLED') return { ok: false, reason: 'Party is cancelled' };
  return { ok: true };
}

export function canStartRound(
  round: { status: RoundStatus },
  party: { status: PartyStatus },
  hasOtherActiveRound: boolean,
): Guard {
  if (round.status !== 'PENDING')
    return { ok: false, reason: `Round is ${round.status}; only PENDING rounds may start` };
  if (party.status === 'FINISHED' || party.status === 'CANCELLED')
    return { ok: false, reason: `Party is ${party.status}` };
  if (hasOtherActiveRound)
    return { ok: false, reason: 'Another round in this party is already ACTIVE' };
  return { ok: true };
}

export function canEndRound(round: { status: RoundStatus }): Guard {
  if (round.status !== 'ACTIVE')
    return { ok: false, reason: `Round is ${round.status}; only ACTIVE rounds may end` };
  return { ok: true };
}

export function canSkipRound(round: { status: RoundStatus }): Guard {
  if (round.status !== 'PENDING')
    return { ok: false, reason: `Round is ${round.status}; only PENDING rounds may be skipped` };
  return { ok: true };
}

export function canWriteScore(round: { status: RoundStatus }): Guard {
  if (round.status !== 'ACTIVE')
    return {
      ok: false,
      reason: `Cannot write scores for a ${round.status} round (only ACTIVE)`,
    };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Config merge — shallow merge of GameDefinition.defaultConfig with host
// overrides. We deliberately keep this shallow; deep merging surprises hosts.
// ---------------------------------------------------------------------------

export function mergeRoundConfig(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...defaults, ...(overrides ?? {}) };
}

// ---------------------------------------------------------------------------
// Leaderboard tally — sum Score.points per team, sort desc, include zero-
// score teams so the UI doesn't have to merge two lists.
// ---------------------------------------------------------------------------

export interface LeaderboardTeam {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface LeaderboardScore {
  teamId: string;
  points: number;
}

export interface LeaderboardEntry {
  teamId: string;
  name: string;
  color: string;
  position: number;
  totalPoints: number;
  roundsPlayed: number;
  rank: number; // 1-based; ties share a rank
}

export function tallyLeaderboard(
  teams: readonly LeaderboardTeam[],
  scores: readonly LeaderboardScore[],
): LeaderboardEntry[] {
  // Aggregate scores per team.
  const agg = new Map<string, { points: number; rounds: number }>();
  for (const s of scores) {
    const cur = agg.get(s.teamId) ?? { points: 0, rounds: 0 };
    cur.points += s.points;
    cur.rounds += 1;
    agg.set(s.teamId, cur);
  }

  const sorted = teams
    .map((t) => {
      const a = agg.get(t.id) ?? { points: 0, rounds: 0 };
      return {
        teamId: t.id,
        name: t.name,
        color: t.color,
        position: t.position,
        totalPoints: a.points,
        roundsPlayed: a.rounds,
      };
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      // Tie-break by team position (stable, deterministic, host-set order).
      return a.position - b.position;
    });

  // Assign ranks; teams tied on totalPoints share a rank.
  let lastPoints = Number.NaN;
  let lastRank = 0;
  return sorted.map((row, i) => {
    const rank = row.totalPoints === lastPoints ? lastRank : i + 1;
    lastPoints = row.totalPoints;
    lastRank = rank;
    return { ...row, rank };
  });
}
