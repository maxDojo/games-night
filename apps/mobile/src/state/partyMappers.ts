import type {
  PartyByCodeResponse,
  PartyRoundResponse,
  ScoreEventsResponse,
  LeaderboardResponse,
  RoundStartedPayload,
  TeamResponse,
  TriviaQuestionPayload,
  TriviaRevealPayload,
} from '../api/client';
import type {
  PlayerRoundStatus,
  PlayerTriviaQuestion,
  PlayerTriviaReveal,
  QueuedRoundSummary,
  ScoreEventSummary,
  TeamSummary,
} from '../types/product';

export function getTeamShortName(name: string) {
  const initials = name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || name.slice(0, 2).toUpperCase();
}

export function mapPartyTeams(party: PartyByCodeResponse, selectedTeamId?: string): TeamSummary[] {
  return party.teams.map((team) => {
    const checkedIn = team.players.length;
    return {
      id: team.id,
      name: team.name,
      shortName: getTeamShortName(team.name),
      checkedIn,
      capacity: party.maxPerTeam,
      points: 0,
      color: team.color ?? '#888888',
      isSelected: team.id === selectedTeamId,
    };
  });
}

export function applyLeaderboardToTeams(
  teams: TeamSummary[],
  leaderboard: LeaderboardResponse,
): TeamSummary[] {
  return teams.map((team) => {
    const entry = leaderboard.entries.find((item) => item.teamId === team.id);
    return entry ? { ...team, points: entry.totalPoints } : team;
  });
}

export function mapScoreEvents(response: ScoreEventsResponse): ScoreEventSummary[] {
  return response.events.map((event) => ({
    id: event.id,
    label: event.reason ? `${event.label}: ${event.reason}` : event.label,
    delta: event.delta,
    teamName: event.team?.name ?? 'Team',
    source: event.source,
  }));
}

export function mapHostTeam(team: TeamResponse, capacity: number, selectedTeamId?: string): TeamSummary {
  return {
    id: team.id,
    name: team.name,
    shortName: getTeamShortName(team.name),
    checkedIn: team.players?.length ?? 0,
    capacity,
    points: 0,
    color: team.color,
    isSelected: team.id === selectedTeamId,
  };
}

export function getFirstAvailableTeamId(mappedTeams: TeamSummary[]) {
  return mappedTeams.find((team) => team.checkedIn < team.capacity)?.id;
}

export function getPlayerError(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function getRoundLabel(gameSlug?: string | null) {
  switch (gameSlug) {
    case 'trivia':
      return 'Trivia';
    case 'charades':
      return 'Charades';
    case 'taboo':
      return 'Taboo';
    case null:
    case undefined:
      return 'Round';
    default:
      return gameSlug
        .split(/[-_\s]+/u)
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
        .join(' ');
  }
}

function getRoundDetail(status: PlayerRoundStatus['status']) {
  switch (status) {
    case 'ACTIVE':
      return 'Live now';
    case 'PENDING':
      return 'Queued by host';
    case 'COMPLETED':
      return 'Finished';
    case 'SKIPPED':
      return 'Skipped';
    default:
      return 'Waiting';
  }
}

export function mapPartyRound(round: PartyRoundResponse): PlayerRoundStatus {
  const gameSlug = round.gameDefinition?.slug;

  return {
    id: round.id,
    order: round.order,
    status: round.status,
    label: `${getRoundLabel(gameSlug)} ${round.order}`,
    detail: getRoundDetail(round.status),
    gameSlug,
  };
}

export function mapQueuedRound(round: PartyRoundResponse): QueuedRoundSummary {
  const gameSlug = round.gameDefinition?.slug;
  const label = `${getRoundLabel(gameSlug)} ${round.order}`;
  const config = getConfigObject(round.config);
  const points = getRoundPoints(gameSlug, config);
  const timer = getRoundTimer(gameSlug, config);
  const status = getRoundDetail(round.status);

  return {
    id: round.id,
    order: round.order,
    label,
    detail: timer ? `${status} / ${timer}` : status,
    points,
    kind: getRoundKind(gameSlug),
    status: round.status,
    gameSlug,
  };
}

export function mapStartedRound(payload: RoundStartedPayload): PlayerRoundStatus {
  return {
    id: payload.roundId,
    order: payload.order,
    status: 'ACTIVE',
    label: `${getRoundLabel(payload.gameSlug)} ${payload.order}`,
    detail: 'Live now',
    gameSlug: payload.gameSlug,
  };
}

export function mapTriviaQuestion(payload: TriviaQuestionPayload): PlayerTriviaQuestion {
  return {
    roundId: payload.roundId,
    promptId: payload.promptId,
    questionNumber: payload.questionNumber,
    total: payload.total,
    question: payload.question,
    choices: payload.choices,
    deadlineAt: payload.deadlineAt,
  };
}

export function mapTriviaReveal(payload: TriviaRevealPayload, teamId?: string): PlayerTriviaReveal {
  const teamResult = teamId ? payload.perTeam[teamId] : undefined;

  return {
    promptId: payload.promptId,
    questionNumber: payload.questionNumber,
    correctAnswer: payload.correctAnswer,
    selectedChoice: teamResult?.choice ?? undefined,
    wasCorrect: teamResult?.correct,
  };
}

function getConfigObject(config: unknown): Record<string, unknown> {
  return config && typeof config === 'object' && !Array.isArray(config) ? (config as Record<string, unknown>) : {};
}

function getConfigNumber(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getRoundPoints(gameSlug: string | null | undefined, config: Record<string, unknown>) {
  if (gameSlug === 'trivia') {
    return getConfigNumber(config, 'basePoints', 100);
  }

  if (gameSlug === 'charades' || gameSlug === 'taboo') {
    return getConfigNumber(config, 'basePointsPerCorrect', 100);
  }

  return getConfigNumber(config, 'points', 0);
}

function getRoundTimer(gameSlug: string | null | undefined, config: Record<string, unknown>) {
  if (gameSlug === 'trivia') {
    return `${getConfigNumber(config, 'secondsPerQuestion', 20)}s/question`;
  }

  if (gameSlug === 'charades' || gameSlug === 'taboo') {
    return `${getConfigNumber(config, 'secondsPerTurn', 60)}s/turn`;
  }

  return undefined;
}

function getRoundKind(gameSlug: string | null | undefined): QueuedRoundSummary['kind'] {
  if (gameSlug === 'trivia' || gameSlug === 'charades' || gameSlug === 'taboo') {
    return gameSlug;
  }

  return 'custom';
}
