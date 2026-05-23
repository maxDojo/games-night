import type {
  PartyByCodeResponse,
  PartyRoundResponse,
  RoundStartedPayload,
  TriviaQuestionPayload,
  TriviaRevealPayload,
} from '../api/client';
import type { PlayerRoundStatus, PlayerTriviaQuestion, PlayerTriviaReveal, TeamSummary } from '../types/product';

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
  return {
    id: round.id,
    order: round.order,
    status: round.status,
    label: `${getRoundLabel()} ${round.order}`,
    detail: getRoundDetail(round.status),
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
