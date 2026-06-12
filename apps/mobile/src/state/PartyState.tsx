import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Socket } from 'socket.io-client';

import {
  awardBonus,
  createParty,
  createPartySocket,
  createTeam,
  getGames,
  getHostParties,
  getLeaderboard,
  getPartyByJoinCode,
  getPartyTeams,
  getPartyRounds,
  getScoreEvents,
  isTriviaQuestionPayload,
  isTriviaRevealPayload,
  endParty,
  endRound,
  joinPartyRoom,
  joinTeam,
  loginHost,
  normalizeJoinCode,
  queueRound,
  revealPartyScores,
  registerHost,
  setCurrentParty,
  skipRound,
  startRound,
  submitRoundEvent,
  updatePartySettings,
  writeRoundScore,
  type AuthResponse,
  type CreatePartyResponse,
  type GameDefinitionResponse,
  type HostPartyListResponse,
  type HostPartySummary,
  type LeaderboardResponse,
  type PartyByCodeResponse,
  type QueueRoundRequest,
  type RoundEndedPayload,
  type RoundStartedPayload,
  type ScoreUpdatedPayload,
  type TurnEndedPayload,
  type TurnStartedPayload,
  type UpdatePartySettingsRequest,
} from '../api/client';
import { bonusAwards, joinCode, period, queuedRounds, scoreEvents, teams } from '../data/mockState';
import { connectHostControlSocket } from './hostSocket';
import {
  applyLeaderboardToTeams,
  getFirstAvailableTeamId,
  getPlayerError,
  mapHostTeam,
  mapPartyRound,
  mapPartyTeams,
  mapQueuedRound,
  mapScoreEvents,
  mapStartedRound,
  mapTriviaQuestion,
  mapTriviaReveal,
} from './partyMappers';
import { loadSession, saveSession, type MobileSession } from '../storage/sessionStore';
import type {
  BonusAwardSummary,
  HostGamePrompt,
  HostTurnStatus,
  LocationVerificationStatus,
  PlayerRoundStatus,
  PlayerTriviaQuestion,
  PlayerTriviaReveal,
  QueuedRoundSummary,
  ScoreEventSummary,
  TeamSummary,
} from '../types/product';

interface PartyState {
  hostToken?: string;
  hostUser?: MobileSession['hostUser'];
  hostParty?: NonNullable<MobileSession['hostParty']>;
  hostParties: HostPartySummary[];
  hostTeams: TeamSummary[];
  isRestoringHostSession: boolean;
  isHostAuthenticating: boolean;
  isCreatingHostParty: boolean;
  isLoadingHostParties: boolean;
  isSwitchingHostParty: boolean;
  isUpdatingHostSettings: boolean;
  isLoadingHostTeams: boolean;
  isCreatingHostTeam: boolean;
  isLoadingHostGames: boolean;
  isLoadingHostRounds: boolean;
  isQueueingHostRound: boolean;
  isControllingHostRound: boolean;
  isWritingHostScore: boolean;
  isAwardingBonus: boolean;
  isEndingNight: boolean;
  isRevealingScores: boolean;
  isLoadingScoreReport: boolean;
  isHostSocketConnected: boolean;
  isSendingHostRoundEvent: boolean;
  hostAuthError?: string;
  hostPartyError?: string;
  hostPartyListError?: string;
  hostSettingsError?: string;
  hostSettingsMessage?: string;
  hostTeamError?: string;
  hostQueueError?: string;
  hostStageError?: string;
  hostStageMessage?: string;
  hostBonusError?: string;
  hostTurn?: HostTurnStatus;
  hostGamePrompt?: HostGamePrompt;
  hostGames: GameDefinitionResponse[];
  selectedHostTeamId?: string;
  joinCode: string;
  partyId?: string;
  partyName: string;
  partyStatus?: PartyByCodeResponse['status'];
  partySource: 'mock' | 'api';
  period: typeof period;
  teams: TeamSummary[];
  playerRounds: PlayerRoundStatus[];
  queuedRounds: QueuedRoundSummary[];
  bonusAwards: BonusAwardSummary[];
  scoreEvents: ScoreEventSummary[];
  selectedTeamId?: string;
  checkedInTeamId?: string;
  checkedInPlayerId?: string;
  playerNickname?: string;
  isLoadingParty: boolean;
  isLoadingRounds: boolean;
  isCheckingIn: boolean;
  locationVerificationRequired: boolean;
  locationVerificationStatus: LocationVerificationStatus;
  locationVerificationMessage?: string;
  triviaQuestion?: PlayerTriviaQuestion;
  triviaReveal?: PlayerTriviaReveal;
  triviaSelectedChoice?: string;
  triviaSubmittedChoice?: string;
  triviaError?: string;
  playerError?: string;
  scoresRevealed: boolean;
  awardedBonusIds: string[];
}

interface PartyStateContextValue extends PartyState {
  isHostAuthenticated: boolean;
  checkedInTeam?: TeamSummary;
  selectedTeam?: TeamSummary;
  currentRound?: PlayerRoundStatus;
  nextRound?: PlayerRoundStatus;
  totalPlayers: number;
  loginHostAccount: (email: string, password: string) => Promise<boolean>;
  registerHostAccount: (email: string, displayName: string, password: string) => Promise<boolean>;
  createHostParty: (name: string, maxTeams: number, maxPerTeam: number) => Promise<boolean>;
  refreshHostParties: () => Promise<void>;
  selectCurrentHostParty: (joinCode: string) => Promise<boolean>;
  updateHostPartySettings: (request: UpdatePartySettingsRequest) => Promise<boolean>;
  refreshHostTeams: () => Promise<void>;
  createHostTeam: (name: string, color: string) => Promise<boolean>;
  selectHostTeam: (teamId: string) => void;
  refreshHostRoundSetup: () => Promise<void>;
  queueHostRound: (request: QueueRoundRequest) => Promise<boolean>;
  startHostRound: (roundId: string) => Promise<boolean>;
  endHostRound: (roundId: string) => Promise<boolean>;
  skipHostRound: (roundId: string) => Promise<boolean>;
  writeHostScore: (roundId: string, teamId: string, points: number) => Promise<boolean>;
  sendHostRoundEvent: (roundId: string, type: string, teamId: string, payload?: unknown) => Promise<boolean>;
  selectTeam: (teamId: string) => void;
  loadPlayerParty: (joinCode: string) => Promise<void>;
  checkInSelectedTeam: (nickname: string) => Promise<TeamSummary | undefined>;
  requestLocationVerification: () => void;
  markLocationOverride: () => void;
  submitTriviaAnswer: (choice: string) => void;
  refreshScoreReport: () => Promise<void>;
  revealScores: () => Promise<boolean>;
  endNight: () => Promise<boolean>;
  awardBonusToTeam: (bonusId: string, teamId: string) => Promise<boolean>;
}

type PartyAction =
  | { type: 'restoreHostSession'; session?: MobileSession }
  | { type: 'hostAuthStart' }
  | { type: 'hostAuthSuccess'; auth: AuthResponse }
  | { type: 'hostAuthFailure'; error: string }
  | { type: 'createHostPartyStart' }
  | { type: 'createHostPartySuccess'; party: CreatePartyResponse }
  | { type: 'createHostPartyFailure'; error: string }
  | { type: 'loadHostPartiesStart' }
  | { type: 'loadHostPartiesSuccess'; response: HostPartyListResponse }
  | { type: 'loadHostPartiesFailure'; error: string }
  | { type: 'switchHostPartyStart' }
  | { type: 'switchHostPartySuccess'; party: HostPartySummary }
  | { type: 'switchHostPartyFailure'; error: string }
  | { type: 'updateHostSettingsStart' }
  | { type: 'updateHostSettingsSuccess'; party: PartyByCodeResponse | CreatePartyResponse }
  | { type: 'updateHostSettingsFailure'; error: string }
  | { type: 'loadHostTeamsStart' }
  | { type: 'loadHostTeamsSuccess'; teams: TeamSummary[] }
  | { type: 'loadHostTeamsFailure'; error: string }
  | { type: 'createHostTeamStart' }
  | { type: 'createHostTeamSuccess'; team: TeamSummary }
  | { type: 'createHostTeamFailure'; error: string }
  | { type: 'selectHostTeam'; teamId: string }
  | { type: 'loadHostGamesStart' }
  | { type: 'loadHostGamesSuccess'; games: GameDefinitionResponse[] }
  | { type: 'loadHostGamesFailure'; error: string }
  | { type: 'loadHostRoundsStart' }
  | { type: 'loadHostRoundsSuccess'; rounds: QueuedRoundSummary[] }
  | { type: 'loadHostRoundsFailure'; error: string }
  | { type: 'queueHostRoundStart' }
  | { type: 'queueHostRoundSuccess'; rounds: QueuedRoundSummary[] }
  | { type: 'queueHostRoundFailure'; error: string }
  | { type: 'hostRoundControlStart' }
  | { type: 'hostRoundControlSuccess'; rounds: QueuedRoundSummary[]; message: string }
  | { type: 'hostRoundControlFailure'; error: string }
  | { type: 'hostScoreWriteStart' }
  | { type: 'hostScoreWriteSuccess'; message: string }
  | { type: 'hostScoreWriteFailure'; error: string }
  | { type: 'hostSocketConnected' }
  | { type: 'hostSocketDisconnected' }
  | { type: 'hostTurnStarted'; turn: HostTurnStatus }
  | { type: 'hostTurnEnded'; turn: TurnEndedPayload }
  | { type: 'hostPromptNext'; prompt: HostGamePrompt }
  | { type: 'hostScoreUpdated'; score: ScoreUpdatedPayload }
  | { type: 'hostRoundEventStart' }
  | { type: 'hostRoundEventSuccess'; message: string }
  | { type: 'hostRoundEventFailure'; error: string }
  | { type: 'scoreReportStart' }
  | { type: 'scoreReportSuccess'; scoresRevealed: boolean; leaderboard: LeaderboardResponse; events: ScoreEventSummary[] }
  | { type: 'scoreReportFailure' }
  | { type: 'hostBonusStart' }
  | { type: 'hostBonusSuccess'; bonusId: string; event: ScoreEventSummary; teamId: string; points: number }
  | { type: 'hostBonusFailure'; error: string }
  | { type: 'revealScoresStart' }
  | { type: 'revealScoresSuccess' }
  | { type: 'revealScoresFailure'; error: string }
  | { type: 'endNightStart' }
  | { type: 'endNightSuccess' }
  | { type: 'endNightFailure'; error: string }
  | { type: 'selectTeam'; teamId: string }
  | { type: 'loadPartyStart'; joinCode: string }
  | { type: 'loadPartySuccess'; party: PartyByCodeResponse; session?: MobileSession }
  | { type: 'loadPartyFailure'; error: string }
  | { type: 'loadRoundsStart' }
  | { type: 'loadRoundsSuccess'; rounds: PlayerRoundStatus[] }
  | { type: 'loadRoundsFailure' }
  | { type: 'checkInStart' }
  | { type: 'checkInSuccess'; playerId: string; teamId: string; nickname: string }
  | { type: 'checkInFailure'; error: string }
  | { type: 'locationVerificationRequested' }
  | { type: 'locationVerificationUnavailable' }
  | { type: 'locationOverrideMarked' }
  | { type: 'roundStarted'; round: PlayerRoundStatus }
  | { type: 'roundEnded'; roundId: string }
  | { type: 'triviaQuestion'; question: PlayerTriviaQuestion }
  | { type: 'triviaAnswerSubmitted'; choice: string }
  | { type: 'triviaReveal'; reveal: PlayerTriviaReveal }
  | { type: 'triviaSubmitFailure'; error: string };

const firstAvailableTeam = teams.find((team) => team.checkedIn < team.capacity);

const initialState: PartyState = {
  isRestoringHostSession: true,
  isHostAuthenticating: false,
  isCreatingHostParty: false,
  isLoadingHostParties: false,
  isSwitchingHostParty: false,
  isUpdatingHostSettings: false,
  isLoadingHostTeams: false,
  isCreatingHostTeam: false,
  isLoadingHostGames: false,
  isLoadingHostRounds: false,
  isQueueingHostRound: false,
  isControllingHostRound: false,
  isWritingHostScore: false,
  isAwardingBonus: false,
  isEndingNight: false,
  isRevealingScores: false,
  isLoadingScoreReport: false,
  isHostSocketConnected: false,
  isSendingHostRoundEvent: false,
  hostGames: [],
  hostParties: [],
  hostTeams: [],
  joinCode,
  partyName: period.name,
  partySource: 'mock',
  period,
  teams: teams.map((team) => ({ ...team, isSelected: team.id === firstAvailableTeam?.id })),
  playerRounds: [],
  queuedRounds,
  bonusAwards,
  scoreEvents,
  selectedTeamId: firstAvailableTeam?.id,
  isLoadingParty: false,
  isLoadingRounds: false,
  isCheckingIn: false,
  locationVerificationRequired: false,
  locationVerificationStatus: 'not_required',
  scoresRevealed: false,
  awardedBonusIds: [],
};

const PartyStateContext = createContext<PartyStateContextValue | undefined>(undefined);

function partyReducer(state: PartyState, action: PartyAction): PartyState {
  switch (action.type) {
    case 'restoreHostSession':
      return {
        ...state,
        hostToken: action.session?.hostToken,
        hostUser: action.session?.hostUser,
        hostParty: action.session?.hostParty ?? undefined,
        isRestoringHostSession: false,
      };
    case 'hostAuthStart':
      return { ...state, isHostAuthenticating: true, hostAuthError: undefined };
    case 'hostAuthSuccess':
      return {
        ...state,
        hostToken: action.auth.token,
        hostUser: {
          id: action.auth.user.id,
          email: action.auth.user.email,
          displayName: action.auth.user.displayName,
        },
        isHostAuthenticating: false,
        isRestoringHostSession: false,
        hostAuthError: undefined,
      };
    case 'hostAuthFailure':
      return { ...state, isHostAuthenticating: false, hostAuthError: action.error };
    case 'createHostPartyStart':
      return { ...state, isCreatingHostParty: true, hostPartyError: undefined };
    case 'createHostPartySuccess':
      return {
        ...state,
        hostParty: mapHostParty(action.party),
        hostTeams: [],
        queuedRounds: [],
        selectedHostTeamId: undefined,
        isCreatingHostParty: false,
        hostPartyError: undefined,
        hostQueueError: undefined,
      };
    case 'createHostPartyFailure':
      return { ...state, isCreatingHostParty: false, hostPartyError: action.error };
    case 'loadHostPartiesStart':
      return { ...state, isLoadingHostParties: true, hostPartyListError: undefined };
    case 'loadHostPartiesSuccess': {
      const currentParty =
        action.response.parties.find((party) => party.id === action.response.currentPartyId) ??
        action.response.parties.find((party) => party.isCurrent);
      const currentPartyChanged = state.hostParty?.id !== currentParty?.id;

      return {
        ...state,
        hostParty: currentPartyChanged
          ? currentParty
            ? mapHostParty(currentParty)
            : undefined
          : state.hostParty,
        hostParties: action.response.parties,
        hostTeams: currentPartyChanged ? [] : state.hostTeams,
        queuedRounds: currentPartyChanged ? [] : state.queuedRounds,
        selectedHostTeamId: currentPartyChanged ? undefined : state.selectedHostTeamId,
        hostTurn: currentPartyChanged ? undefined : state.hostTurn,
        hostGamePrompt: currentPartyChanged ? undefined : state.hostGamePrompt,
        scoreEvents: currentPartyChanged ? [] : state.scoreEvents,
        scoresRevealed: currentParty?.scoresRevealed ?? false,
        awardedBonusIds: currentPartyChanged ? [] : state.awardedBonusIds,
        isLoadingHostParties: false,
        hostPartyListError: undefined,
      };
    }
    case 'loadHostPartiesFailure':
      return { ...state, isLoadingHostParties: false, hostPartyListError: action.error };
    case 'switchHostPartyStart':
      return { ...state, isSwitchingHostParty: true, hostPartyListError: undefined };
    case 'switchHostPartySuccess':
      return {
        ...state,
        hostParty: mapHostParty(action.party),
        hostParties: state.hostParties.map((party) => ({
          ...party,
          isCurrent: party.id === action.party.id,
        })),
        hostTeams: [],
        queuedRounds: [],
        selectedHostTeamId: undefined,
        hostTurn: undefined,
        hostGamePrompt: undefined,
        scoreEvents: [],
        scoresRevealed: action.party.scoresRevealed,
        awardedBonusIds: [],
        isSwitchingHostParty: false,
        hostPartyListError: undefined,
      };
    case 'switchHostPartyFailure':
      return { ...state, isSwitchingHostParty: false, hostPartyListError: action.error };
    case 'updateHostSettingsStart':
      return {
        ...state,
        isUpdatingHostSettings: true,
        hostSettingsError: undefined,
        hostSettingsMessage: undefined,
      };
    case 'updateHostSettingsSuccess': {
      const hostParty = mapHostParty(action.party);

      return {
        ...state,
        hostParty,
        hostTeams: state.hostTeams.map((team) => ({ ...team, capacity: hostParty.maxPerTeam })),
        isUpdatingHostSettings: false,
        hostSettingsError: undefined,
        hostSettingsMessage: 'Settings saved.',
      };
    }
    case 'updateHostSettingsFailure':
      return {
        ...state,
        isUpdatingHostSettings: false,
        hostSettingsError: action.error,
        hostSettingsMessage: undefined,
      };
    case 'loadHostTeamsStart':
      return { ...state, isLoadingHostTeams: true, hostTeamError: undefined };
    case 'loadHostTeamsSuccess':
      return {
        ...state,
        hostTeams: action.teams.map((team) => ({ ...team, isSelected: team.id === state.selectedHostTeamId })),
        isLoadingHostTeams: false,
        hostTeamError: undefined,
      };
    case 'loadHostTeamsFailure':
      return { ...state, isLoadingHostTeams: false, hostTeamError: action.error };
    case 'createHostTeamStart':
      return { ...state, isCreatingHostTeam: true, hostTeamError: undefined };
    case 'createHostTeamSuccess':
      return {
        ...state,
        hostTeams: [
          ...state.hostTeams.map((team) => ({ ...team, isSelected: false })),
          { ...action.team, isSelected: true },
        ],
        selectedHostTeamId: action.team.id,
        isCreatingHostTeam: false,
        hostTeamError: undefined,
      };
    case 'createHostTeamFailure':
      return { ...state, isCreatingHostTeam: false, hostTeamError: action.error };
    case 'selectHostTeam':
      return {
        ...state,
        selectedHostTeamId: action.teamId,
        hostTeams: state.hostTeams.map((team) => ({ ...team, isSelected: team.id === action.teamId })),
      };
    case 'loadHostGamesStart':
      return { ...state, isLoadingHostGames: true, hostQueueError: undefined };
    case 'loadHostGamesSuccess':
      return { ...state, hostGames: action.games, isLoadingHostGames: false, hostQueueError: undefined };
    case 'loadHostGamesFailure':
      return { ...state, isLoadingHostGames: false, hostQueueError: action.error };
    case 'loadHostRoundsStart':
      return { ...state, isLoadingHostRounds: true, hostQueueError: undefined };
    case 'loadHostRoundsSuccess':
      return {
        ...state,
        queuedRounds: action.rounds,
        isLoadingHostRounds: false,
        hostQueueError: undefined,
      };
    case 'loadHostRoundsFailure':
      return { ...state, isLoadingHostRounds: false, hostQueueError: action.error };
    case 'queueHostRoundStart':
      return { ...state, isQueueingHostRound: true, hostQueueError: undefined };
    case 'queueHostRoundSuccess':
      return {
        ...state,
        queuedRounds: action.rounds,
        isQueueingHostRound: false,
        hostQueueError: undefined,
      };
    case 'queueHostRoundFailure':
      return { ...state, isQueueingHostRound: false, hostQueueError: action.error };
    case 'hostRoundControlStart':
      return {
        ...state,
        isControllingHostRound: true,
        hostStageError: undefined,
        hostStageMessage: undefined,
      };
    case 'hostRoundControlSuccess':
      return {
        ...state,
        queuedRounds: action.rounds,
        isControllingHostRound: false,
        hostGamePrompt: action.rounds.some((round) => round.status === 'ACTIVE') ? state.hostGamePrompt : undefined,
        hostTurn: action.rounds.some((round) => round.status === 'ACTIVE') ? state.hostTurn : undefined,
        hostStageError: undefined,
        hostStageMessage: action.message,
      };
    case 'hostRoundControlFailure':
      return {
        ...state,
        isControllingHostRound: false,
        hostStageError: action.error,
        hostStageMessage: undefined,
      };
    case 'hostScoreWriteStart':
      return {
        ...state,
        isWritingHostScore: true,
        hostStageError: undefined,
        hostStageMessage: undefined,
      };
    case 'hostScoreWriteSuccess':
      return {
        ...state,
        isWritingHostScore: false,
        hostStageError: undefined,
        hostStageMessage: action.message,
      };
    case 'hostScoreWriteFailure':
      return {
        ...state,
        isWritingHostScore: false,
        hostStageError: action.error,
        hostStageMessage: undefined,
      };
    case 'hostSocketConnected':
      return { ...state, isHostSocketConnected: true };
    case 'hostSocketDisconnected':
      return { ...state, isHostSocketConnected: false };
    case 'hostTurnStarted':
      return {
        ...state,
        hostTurn: action.turn,
        hostGamePrompt: state.hostGamePrompt?.roundId === action.turn.roundId ? state.hostGamePrompt : undefined,
        hostStageMessage: `Turn ${action.turn.turnNumber} of ${action.turn.total} started.`,
      };
    case 'hostTurnEnded':
      return {
        ...state,
        hostTurn: state.hostTurn?.roundId === action.turn.roundId ? undefined : state.hostTurn,
        hostGamePrompt: state.hostGamePrompt?.roundId === action.turn.roundId ? undefined : state.hostGamePrompt,
        hostStageMessage: `Turn ended with ${action.turn.turnPoints} pts.`,
      };
    case 'hostPromptNext':
      return { ...state, hostGamePrompt: action.prompt, hostStageError: undefined };
    case 'hostScoreUpdated':
      return {
        ...state,
        hostStageMessage: action.score.delta
          ? `${action.score.delta > 0 ? '+' : ''}${action.score.delta} ${action.score.reason ?? 'points'}`
          : state.hostStageMessage,
      };
    case 'hostRoundEventStart':
      return { ...state, isSendingHostRoundEvent: true, hostStageError: undefined };
    case 'hostRoundEventSuccess':
      return { ...state, isSendingHostRoundEvent: false, hostStageMessage: action.message };
    case 'hostRoundEventFailure':
      return { ...state, isSendingHostRoundEvent: false, hostStageError: action.error };
    case 'scoreReportStart':
      return { ...state, isLoadingScoreReport: true };
    case 'scoreReportSuccess': {
      const teams = applyLeaderboardToTeams(state.teams, action.leaderboard);
      const hostTeams = applyLeaderboardToTeams(state.hostTeams, action.leaderboard);

      return {
        ...state,
        isLoadingScoreReport: false,
        scoresRevealed: action.scoresRevealed,
        teams,
        hostTeams,
        scoreEvents: action.events,
      };
    }
    case 'scoreReportFailure':
      return { ...state, isLoadingScoreReport: false };
    case 'hostBonusStart':
      return { ...state, isAwardingBonus: true, hostBonusError: undefined };
    case 'hostBonusSuccess':
      return {
        ...state,
        isAwardingBonus: false,
        hostBonusError: undefined,
        awardedBonusIds: [...state.awardedBonusIds, action.bonusId],
        scoreEvents: [...state.scoreEvents, action.event],
        teams: state.teams.map((team) =>
          team.id === action.teamId ? { ...team, points: team.points + action.points } : team,
        ),
        hostTeams: state.hostTeams.map((team) =>
          team.id === action.teamId ? { ...team, points: team.points + action.points } : team,
        ),
      };
    case 'hostBonusFailure':
      return { ...state, isAwardingBonus: false, hostBonusError: action.error };
    case 'revealScoresStart':
      return { ...state, isRevealingScores: true, hostBonusError: undefined };
    case 'revealScoresSuccess':
      return { ...state, isRevealingScores: false, scoresRevealed: true, hostBonusError: undefined };
    case 'revealScoresFailure':
      return { ...state, isRevealingScores: false, hostBonusError: action.error };
    case 'endNightStart':
      return { ...state, isEndingNight: true, hostPartyError: undefined };
    case 'endNightSuccess':
      return {
        ...state,
        isEndingNight: false,
        scoresRevealed: true,
        partyStatus: 'FINISHED',
        hostParty: state.hostParty ? { ...state.hostParty, status: 'FINISHED' } : state.hostParty,
        hostPartyError: undefined,
      };
    case 'endNightFailure':
      return { ...state, isEndingNight: false, hostPartyError: action.error };
    case 'selectTeam': {
      if (state.checkedInTeamId) {
        return state;
      }

      const selectedTeam = state.teams.find((team) => team.id === action.teamId);
      if (!selectedTeam || selectedTeam.checkedIn >= selectedTeam.capacity) {
        return state;
      }

      return {
        ...state,
        playerError: undefined,
        selectedTeamId: action.teamId,
        teams: state.teams.map((team) => ({ ...team, isSelected: team.id === action.teamId })),
      };
    }
    case 'loadPartyStart':
      return {
        ...state,
        joinCode: normalizeJoinCode(action.joinCode),
        isLoadingParty: true,
        isLoadingRounds: false,
        playerError: undefined,
      };
    case 'loadPartySuccess': {
      const persistedTeamId = action.session?.teamId;
      const mappedTeams = mapPartyTeams(action.party, persistedTeamId);
      const selectedTeamId = persistedTeamId ?? getFirstAvailableTeamId(mappedTeams);
      const locationVerificationRequired = isLocationVerificationRequired(action.party.settings);

      return {
        ...state,
        joinCode: action.party.joinCode,
        partyId: action.party.id,
        partyName: action.party.name,
        partyStatus: action.party.status,
        partySource: 'api',
        scoresRevealed: action.party.scoresRevealed,
        teams: mappedTeams.map((team) => ({ ...team, isSelected: team.id === selectedTeamId })),
        selectedTeamId,
        checkedInTeamId: persistedTeamId,
        checkedInPlayerId: action.session?.playerId,
        playerNickname: action.session?.playerNickname,
        isLoadingParty: false,
        locationVerificationRequired,
        locationVerificationStatus: locationVerificationRequired ? 'required' : 'not_required',
        locationVerificationMessage: locationVerificationRequired
          ? 'Venue-only check-in is enabled for this room.'
          : undefined,
        playerError: undefined,
      };
    }
    case 'loadPartyFailure':
      return { ...state, isLoadingParty: false, playerError: action.error };
    case 'loadRoundsStart':
      return { ...state, isLoadingRounds: true };
    case 'loadRoundsSuccess':
      return { ...state, playerRounds: action.rounds, isLoadingRounds: false };
    case 'loadRoundsFailure':
      return { ...state, isLoadingRounds: false };
    case 'checkInStart':
      return { ...state, isCheckingIn: true, playerError: undefined };
    case 'checkInSuccess':
      return {
        ...state,
        checkedInTeamId: action.teamId,
        checkedInPlayerId: action.playerId,
        playerNickname: action.nickname,
        isCheckingIn: false,
        teams: state.teams.map((team) =>
          team.id === action.teamId ? { ...team, checkedIn: team.checkedIn + 1, isSelected: true } : team,
        ),
      };
    case 'checkInFailure':
      return { ...state, isCheckingIn: false, playerError: action.error };
    case 'locationVerificationRequested':
      return {
        ...state,
        locationVerificationStatus: 'checking',
        locationVerificationMessage: 'Checking whether this device is at the venue.',
        playerError: undefined,
      };
    case 'locationVerificationUnavailable':
      return {
        ...state,
        locationVerificationStatus: 'failed',
        locationVerificationMessage: 'Mobile location capture is not wired to the backend yet. Ask the host to override.',
      };
    case 'locationOverrideMarked':
      return {
        ...state,
        locationVerificationStatus: 'overridden',
        locationVerificationMessage: 'Host override path noted for this check-in.',
        playerError: undefined,
      };
    case 'roundStarted': {
      const existing = state.playerRounds.some((round) => round.id === action.round.id);
      const rounds = existing
        ? state.playerRounds.map((round) =>
            round.id === action.round.id ? action.round : round.status === 'ACTIVE' ? { ...round, status: 'COMPLETED' as const, detail: 'Finished' } : round,
          )
        : [
            ...state.playerRounds.map((round) =>
              round.status === 'ACTIVE' ? { ...round, status: 'COMPLETED' as const, detail: 'Finished' } : round,
            ),
            action.round,
          ];

      return { ...state, playerRounds: rounds.sort((a, b) => a.order - b.order) };
    }
    case 'roundEnded':
      return {
        ...state,
        playerRounds: state.playerRounds.map((round) =>
          round.id === action.roundId ? { ...round, status: 'COMPLETED', detail: 'Finished' } : round,
        ),
        triviaQuestion: state.triviaQuestion?.roundId === action.roundId ? undefined : state.triviaQuestion,
        triviaReveal: state.triviaQuestion?.roundId === action.roundId ? undefined : state.triviaReveal,
        triviaSelectedChoice: state.triviaQuestion?.roundId === action.roundId ? undefined : state.triviaSelectedChoice,
        triviaSubmittedChoice: state.triviaQuestion?.roundId === action.roundId ? undefined : state.triviaSubmittedChoice,
        triviaError: undefined,
        hostTurn: state.hostTurn?.roundId === action.roundId ? undefined : state.hostTurn,
        hostGamePrompt: state.hostGamePrompt?.roundId === action.roundId ? undefined : state.hostGamePrompt,
      };
    case 'triviaQuestion':
      return {
        ...state,
        triviaQuestion: action.question,
        triviaReveal: undefined,
        triviaSelectedChoice: undefined,
        triviaSubmittedChoice: undefined,
        triviaError: undefined,
      };
    case 'triviaAnswerSubmitted':
      return {
        ...state,
        triviaSelectedChoice: action.choice,
        triviaSubmittedChoice: action.choice,
        triviaError: undefined,
      };
    case 'triviaReveal':
      return {
        ...state,
        triviaReveal: action.reveal,
        triviaSubmittedChoice: undefined,
        triviaSelectedChoice: action.reveal.selectedChoice ?? state.triviaSelectedChoice,
      };
    case 'triviaSubmitFailure':
      return { ...state, triviaError: action.error };
    default:
      return state;
  }
}

interface PartyStateProviderProps {
  children: ReactNode;
}

export function PartyStateProvider({ children }: PartyStateProviderProps) {
  const [state, dispatch] = useReducer(partyReducer, initialState);
  const playerSocketRef = useRef<Socket | undefined>(undefined);
  const hostSocketRef = useRef<Socket | undefined>(undefined);

  const refreshPlayerRounds = useCallback(async (nextJoinCode: string) => {
    dispatch({ type: 'loadRoundsStart' });

    try {
      const rounds = await getPartyRounds(nextJoinCode);
      dispatch({ type: 'loadRoundsSuccess', rounds: rounds.map(mapPartyRound) });
    } catch {
      dispatch({ type: 'loadRoundsFailure' });
    }
  }, []);

  const connectPlayerSocket = useCallback(
    (nextJoinCode: string, playerId: string, teamId: string, nickname?: string) => {
      playerSocketRef.current?.disconnect();

      const socket = createPartySocket();
      playerSocketRef.current = socket;
      socket.on('connect', () => joinPartyRoom(socket, nextJoinCode, playerId));
      socket.on('party:state', (party: PartyByCodeResponse) => {
        dispatch({
          type: 'loadPartySuccess',
          party,
          session: { joinCode: party.joinCode, playerId, teamId, playerNickname: nickname },
        });
        void refreshPlayerRounds(party.joinCode);
      });
      socket.on('round:started', (payload: RoundStartedPayload) => {
        dispatch({ type: 'roundStarted', round: mapStartedRound(payload) });
      });
      socket.on('round:ended', (payload: RoundEndedPayload) => {
        dispatch({ type: 'roundEnded', roundId: payload.roundId });
        void refreshPlayerRounds(nextJoinCode);
      });
      socket.on('prompt:next', (payload: unknown) => {
        if (isTriviaQuestionPayload(payload)) {
          dispatch({ type: 'triviaQuestion', question: mapTriviaQuestion(payload) });
        }
      });
      socket.on('prompt:reveal', (payload: unknown) => {
        if (isTriviaRevealPayload(payload)) {
          dispatch({ type: 'triviaReveal', reveal: mapTriviaReveal(payload, teamId) });
        }
      });
      socket.connect();
    },
    [refreshPlayerRounds],
  );

  const loadPlayerParty = useCallback(async (nextJoinCode: string) => {
    const normalizedJoinCode = normalizeJoinCode(nextJoinCode);
    if (normalizedJoinCode.length !== 6) {
      dispatch({ type: 'loadPartyFailure', error: 'Enter the 6-character room code from the host.' });
      return;
    }

    dispatch({ type: 'loadPartyStart', joinCode: normalizedJoinCode });

    try {
      const party = await getPartyByJoinCode(normalizedJoinCode);
      const joinCodeError = getJoinCodeLifecycleError(party.status);
      if (joinCodeError) {
        dispatch({ type: 'loadPartyFailure', error: joinCodeError });
        return;
      }

      await saveSession({ joinCode: party.joinCode, lastPartyId: party.id });
      dispatch({ type: 'loadPartySuccess', party });
      void refreshPlayerRounds(party.joinCode);
    } catch (error) {
      dispatch({ type: 'loadPartyFailure', error: getPlayerError(error) });
    }
  }, [refreshPlayerRounds]);

  const loginHostAccount = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'hostAuthStart' });

    try {
      const auth = await loginHost({ email: email.trim().toLowerCase(), password });
      await saveSession({
        hostToken: auth.token,
        hostUser: {
          id: auth.user.id,
          email: auth.user.email,
          displayName: auth.user.displayName,
        },
      });
      dispatch({ type: 'hostAuthSuccess', auth });
      return true;
    } catch (error) {
      dispatch({ type: 'hostAuthFailure', error: getPlayerError(error) });
      return false;
    }
  }, []);

  const registerHostAccount = useCallback(async (email: string, displayName: string, password: string) => {
    dispatch({ type: 'hostAuthStart' });

    try {
      const auth = await registerHost({
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        password,
      });
      await saveSession({
        hostToken: auth.token,
        hostUser: {
          id: auth.user.id,
          email: auth.user.email,
          displayName: auth.user.displayName,
        },
      });
      dispatch({ type: 'hostAuthSuccess', auth });
      return true;
    } catch (error) {
      dispatch({ type: 'hostAuthFailure', error: getPlayerError(error) });
      return false;
    }
  }, []);

  const refreshHostParties = useCallback(async () => {
    if (!state.hostToken) {
      return;
    }

    dispatch({ type: 'loadHostPartiesStart' });

    try {
      const response = await getHostParties(state.hostToken);
      const currentParty =
        response.parties.find((party) => party.id === response.currentPartyId) ??
        response.parties.find((party) => party.isCurrent);
      await saveSession({ hostParty: currentParty ? mapHostParty(currentParty) : null });
      dispatch({ type: 'loadHostPartiesSuccess', response });
    } catch (error) {
      dispatch({ type: 'loadHostPartiesFailure', error: getPlayerError(error) });
    }
  }, [state.hostToken]);

  const selectCurrentHostParty = useCallback(
    async (nextJoinCode: string) => {
      if (!state.hostToken) {
        dispatch({ type: 'switchHostPartyFailure', error: 'Login as host before selecting a party.' });
        return false;
      }

      dispatch({ type: 'switchHostPartyStart' });

      try {
        const response = await setCurrentParty(nextJoinCode, state.hostToken);
        const hostParty = mapHostParty(response.party);
        await saveSession({ hostParty });
        dispatch({ type: 'switchHostPartySuccess', party: response.party });
        return true;
      } catch (error) {
        dispatch({ type: 'switchHostPartyFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [state.hostToken],
  );

  const createHostParty = useCallback(
    async (name: string, maxTeams: number, maxPerTeam: number) => {
      const trimmedName = name.trim();

      if (!state.hostToken) {
        dispatch({ type: 'createHostPartyFailure', error: 'Login as host before creating a party.' });
        return false;
      }

      if (!trimmedName) {
        dispatch({ type: 'createHostPartyFailure', error: 'Enter a party name.' });
        return false;
      }

      dispatch({ type: 'createHostPartyStart' });

      try {
        const party = await createParty(
          {
            name: trimmedName,
            maxTeams,
            maxPerTeam,
          },
          state.hostToken,
        );
        const hostParty = mapHostParty(party);
        await saveSession({ hostParty });
        dispatch({ type: 'createHostPartySuccess', party });
        void refreshHostParties();
        return true;
      } catch (error) {
        dispatch({ type: 'createHostPartyFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [refreshHostParties, state.hostToken],
  );

  const updateHostPartySettings = useCallback(
    async (request: UpdatePartySettingsRequest) => {
      if (!state.hostParty || !state.hostToken) {
        dispatch({ type: 'updateHostSettingsFailure', error: 'Create a host party before editing settings.' });
        return false;
      }

      dispatch({ type: 'updateHostSettingsStart' });

      try {
        const party = await updatePartySettings(state.hostParty.joinCode, request, state.hostToken);
        const hostParty = mapHostParty(party);
        await saveSession({ hostParty });
        dispatch({ type: 'updateHostSettingsSuccess', party });
        return true;
      } catch (error) {
        dispatch({ type: 'updateHostSettingsFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [state.hostParty, state.hostToken],
  );

  const refreshHostTeams = useCallback(async () => {
    if (!state.hostParty) {
      return;
    }

    dispatch({ type: 'loadHostTeamsStart' });

    try {
      const apiTeams = await getPartyTeams(state.hostParty.joinCode);
      const mappedTeams = apiTeams.map((team) =>
        mapHostTeam(team, state.hostParty?.maxPerTeam ?? 0, state.selectedHostTeamId),
      );
      dispatch({ type: 'loadHostTeamsSuccess', teams: mappedTeams });
    } catch (error) {
      dispatch({ type: 'loadHostTeamsFailure', error: getPlayerError(error) });
    }
  }, [state.hostParty, state.selectedHostTeamId]);

  const refreshHostRoundSetup = useCallback(async () => {
    dispatch({ type: 'loadHostGamesStart' });

    try {
      const games = await getGames();
      dispatch({ type: 'loadHostGamesSuccess', games });
    } catch (error) {
      dispatch({ type: 'loadHostGamesFailure', error: getPlayerError(error) });
    }

    if (!state.hostParty) {
      return;
    }

    dispatch({ type: 'loadHostRoundsStart' });

    try {
      const rounds = await getPartyRounds(state.hostParty.joinCode);
      dispatch({ type: 'loadHostRoundsSuccess', rounds: rounds.map(mapQueuedRound) });
    } catch (error) {
      dispatch({ type: 'loadHostRoundsFailure', error: getPlayerError(error) });
    }
  }, [state.hostParty]);

  const connectHostSocket = useCallback(
    (nextJoinCode: string, token: string) => {
      hostSocketRef.current?.disconnect();

      const socket = connectHostControlSocket({
        joinCode: nextJoinCode,
        token,
        onConnected: () => dispatch({ type: 'hostSocketConnected' }),
        onDisconnected: () => dispatch({ type: 'hostSocketDisconnected' }),
        onTurnStarted: (payload) => dispatch({ type: 'hostTurnStarted', turn: payload }),
        onTurnEnded: (payload) => dispatch({ type: 'hostTurnEnded', turn: payload }),
        onPrompt: (payload) => dispatch({ type: 'hostPromptNext', prompt: payload }),
        onScoreUpdated: (payload) => dispatch({ type: 'hostScoreUpdated', score: payload }),
        onRoundEnded: (payload) => {
          dispatch({ type: 'roundEnded', roundId: payload.roundId });
          void refreshHostRoundSetup();
        },
        onError: (message) => dispatch({ type: 'hostRoundEventFailure', error: message }),
      });
      hostSocketRef.current = socket;
    },
    [refreshHostRoundSetup],
  );

  const queueHostRound = useCallback(
    async (request: QueueRoundRequest) => {
      if (!state.hostParty || !state.hostToken) {
        dispatch({ type: 'queueHostRoundFailure', error: 'Create a host party before queueing rounds.' });
        return false;
      }

      dispatch({ type: 'queueHostRoundStart' });

      try {
        await queueRound(state.hostParty.joinCode, request, state.hostToken);
        const rounds = await getPartyRounds(state.hostParty.joinCode);
        dispatch({ type: 'queueHostRoundSuccess', rounds: rounds.map(mapQueuedRound) });
        return true;
      } catch (error) {
        dispatch({ type: 'queueHostRoundFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [state.hostParty, state.hostToken],
  );

  const refreshHostRounds = useCallback(async () => {
    if (!state.hostParty) {
      return [];
    }

    const rounds = await getPartyRounds(state.hostParty.joinCode);
    return rounds.map(mapQueuedRound);
  }, [state.hostParty]);

  const startHostRound = useCallback(
    async (roundId: string) => {
      if (!state.hostParty || !state.hostToken) {
        dispatch({ type: 'hostRoundControlFailure', error: 'Create a host party before controlling rounds.' });
        return false;
      }

      dispatch({ type: 'hostRoundControlStart' });

      try {
        await startRound(roundId, state.hostToken);
        const rounds = await refreshHostRounds();
        dispatch({ type: 'hostRoundControlSuccess', rounds, message: 'Round started.' });
        return true;
      } catch (error) {
        dispatch({ type: 'hostRoundControlFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [refreshHostRounds, state.hostParty, state.hostToken],
  );

  const endHostRound = useCallback(
    async (roundId: string) => {
      if (!state.hostParty || !state.hostToken) {
        dispatch({ type: 'hostRoundControlFailure', error: 'Create a host party before controlling rounds.' });
        return false;
      }

      dispatch({ type: 'hostRoundControlStart' });

      try {
        await endRound(roundId, state.hostToken);
        const rounds = await refreshHostRounds();
        dispatch({ type: 'hostRoundControlSuccess', rounds, message: 'Round ended.' });
        return true;
      } catch (error) {
        dispatch({ type: 'hostRoundControlFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [refreshHostRounds, state.hostParty, state.hostToken],
  );

  const skipHostRound = useCallback(
    async (roundId: string) => {
      if (!state.hostParty || !state.hostToken) {
        dispatch({ type: 'hostRoundControlFailure', error: 'Create a host party before controlling rounds.' });
        return false;
      }

      dispatch({ type: 'hostRoundControlStart' });

      try {
        await skipRound(roundId, state.hostToken);
        const rounds = await refreshHostRounds();
        dispatch({ type: 'hostRoundControlSuccess', rounds, message: 'Round skipped.' });
        return true;
      } catch (error) {
        dispatch({ type: 'hostRoundControlFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [refreshHostRounds, state.hostParty, state.hostToken],
  );

  const writeHostScore = useCallback(
    async (roundId: string, teamId: string, points: number) => {
      if (!state.hostToken) {
        dispatch({ type: 'hostScoreWriteFailure', error: 'Login as host before scoring rounds.' });
        return false;
      }

      dispatch({ type: 'hostScoreWriteStart' });

      try {
        await writeRoundScore(
          roundId,
          {
            teamId,
            points,
            breakdown: {
              source: 'mobile-host-manual',
            },
          },
          state.hostToken,
        );
        dispatch({ type: 'hostScoreWriteSuccess', message: 'Manual score saved.' });
        return true;
      } catch (error) {
        dispatch({ type: 'hostScoreWriteFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [state.hostToken],
  );

  const sendHostRoundEvent = useCallback(
    async (roundId: string, type: string, teamId: string, payload?: unknown) => {
      const socket = hostSocketRef.current;
      if (!socket?.connected) {
        dispatch({ type: 'hostRoundEventFailure', error: 'Host controls are reconnecting. Try again in a moment.' });
        return false;
      }

      dispatch({ type: 'hostRoundEventStart' });
      submitRoundEvent(socket, roundId, type, payload, teamId);
      dispatch({ type: 'hostRoundEventSuccess', message: `${type} sent.` });
      return true;
    },
    [],
  );

  const refreshScoreReport = useCallback(async () => {
    const reportJoinCode = state.hostParty?.joinCode ?? (state.partySource === 'api' ? state.joinCode : undefined);
    if (!reportJoinCode) {
      return;
    }

    dispatch({ type: 'scoreReportStart' });

    try {
      const [leaderboard, events] = await Promise.all([
        getLeaderboard(reportJoinCode),
        getScoreEvents(reportJoinCode),
      ]);
      dispatch({
        type: 'scoreReportSuccess',
        scoresRevealed: leaderboard.scoresRevealed || events.scoresRevealed,
        leaderboard,
        events: mapScoreEvents(events),
      });
    } catch {
      dispatch({ type: 'scoreReportFailure' });
    }
  }, [state.hostParty, state.joinCode, state.partySource]);

  const revealScores = useCallback(async () => {
    if (!state.hostParty || !state.hostToken) {
      dispatch({ type: 'revealScoresFailure', error: 'Create a host party before revealing scores.' });
      return false;
    }

    dispatch({ type: 'revealScoresStart' });

    try {
      await revealPartyScores(state.hostParty.joinCode, state.hostToken);
      dispatch({ type: 'revealScoresSuccess' });
      await refreshScoreReport();
      return true;
    } catch (error) {
      dispatch({ type: 'revealScoresFailure', error: getPlayerError(error) });
      return false;
    }
  }, [refreshScoreReport, state.hostParty, state.hostToken]);

  const endNight = useCallback(async () => {
    if (!state.hostParty || !state.hostToken) {
      dispatch({ type: 'endNightFailure', error: 'Create a host party before ending the night.' });
      return false;
    }

    dispatch({ type: 'endNightStart' });

    try {
      const endedParty = await endParty(state.hostParty.joinCode, state.hostToken);
      await saveSession({ hostParty: { ...state.hostParty, status: endedParty.status } });
      dispatch({ type: 'endNightSuccess' });
      await refreshScoreReport();
      return true;
    } catch (error) {
      dispatch({ type: 'endNightFailure', error: getPlayerError(error) });
      return false;
    }
  }, [refreshScoreReport, state.hostParty, state.hostToken]);

  const awardBonusToTeam = useCallback(async (bonusId: string, teamId: string) => {
    const bonus = state.bonusAwards.find((item) => item.id === bonusId);
    const targetTeam = state.hostTeams.find((team) => team.id === teamId);
    if (!bonus || !targetTeam) {
      dispatch({ type: 'hostBonusFailure', error: 'Choose a bonus and target team before awarding.' });
      return false;
    }

    if (state.awardedBonusIds.includes(bonus.id)) {
      dispatch({ type: 'hostBonusFailure', error: 'This bonus has already been awarded.' });
      return false;
    }

    if (!state.hostParty || !state.hostToken) {
      dispatch({ type: 'hostBonusFailure', error: 'Create a host party before awarding bonuses.' });
      return false;
    }

    dispatch({ type: 'hostBonusStart' });

    try {
      const event = await awardBonus(
        state.hostParty.joinCode,
        {
          teamId: targetTeam.id,
          label: bonus.label,
          points: bonus.points,
          reason: bonus.reason,
        },
        state.hostToken,
      );
      dispatch({
        type: 'hostBonusSuccess',
        bonusId: bonus.id,
        teamId: targetTeam.id,
        points: event.delta,
        event: {
          id: event.id,
          label: event.reason ? `${event.label}: ${event.reason}` : event.label,
          delta: event.delta,
          teamName: event.team?.name ?? targetTeam.name,
          source: event.source,
        },
      });
      return true;
    } catch (error) {
      dispatch({ type: 'hostBonusFailure', error: getPlayerError(error) });
      return false;
    }
  }, [
    state.awardedBonusIds,
    state.bonusAwards,
    state.hostParty,
    state.hostTeams,
    state.hostToken,
  ]);

  const createHostTeam = useCallback(
    async (name: string, color: string) => {
      const trimmedName = name.trim();

      if (!state.hostParty || !state.hostToken) {
        dispatch({ type: 'createHostTeamFailure', error: 'Create a host party before adding teams.' });
        return false;
      }

      if (!trimmedName) {
        dispatch({ type: 'createHostTeamFailure', error: 'Enter a team name.' });
        return false;
      }

      dispatch({ type: 'createHostTeamStart' });

      try {
        const team = await createTeam(state.hostParty.joinCode, { name: trimmedName, color }, state.hostToken);
        dispatch({ type: 'createHostTeamSuccess', team: mapHostTeam(team, state.hostParty.maxPerTeam, team.id) });
        return true;
      } catch (error) {
        dispatch({ type: 'createHostTeamFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [state.hostParty, state.hostToken],
  );

  const checkInSelectedTeam = useCallback(
    async (nickname: string) => {
      const trimmedNickname = nickname.trim();
      const selectedTeam = state.teams.find((team) => team.id === state.selectedTeamId);

      if (state.checkedInTeamId) {
        return state.teams.find((team) => team.id === state.checkedInTeamId);
      }

      if (state.partySource !== 'api') {
        dispatch({ type: 'checkInFailure', error: 'Find the party before choosing a team.' });
        return undefined;
      }

      if (
        state.locationVerificationRequired &&
        state.locationVerificationStatus !== 'verified' &&
        state.locationVerificationStatus !== 'overridden'
      ) {
        dispatch({ type: 'checkInFailure', error: 'Complete the venue check or ask the host to override it.' });
        return undefined;
      }

      if (!trimmedNickname) {
        dispatch({ type: 'checkInFailure', error: 'Enter a display name for this party.' });
        return undefined;
      }

      if (!selectedTeam || selectedTeam.checkedIn >= selectedTeam.capacity) {
        dispatch({ type: 'checkInFailure', error: 'Choose an open team.' });
        return undefined;
      }

      dispatch({ type: 'checkInStart' });

      try {
        const player = await joinTeam(selectedTeam.id, { nickname: trimmedNickname });
        const session: MobileSession = {
          joinCode: state.joinCode,
          playerId: player.id,
          teamId: selectedTeam.id,
          playerNickname: player.nickname,
          lastPartyId: state.partyId,
        };

        await saveSession(session);
        dispatch({
          type: 'checkInSuccess',
          playerId: player.id,
          teamId: selectedTeam.id,
          nickname: player.nickname,
        });
        connectPlayerSocket(state.joinCode, player.id, selectedTeam.id, player.nickname);

        return selectedTeam;
      } catch (error) {
        dispatch({ type: 'checkInFailure', error: getPlayerError(error) });
        return undefined;
      }
    },
    [
      connectPlayerSocket,
      state.checkedInTeamId,
      state.joinCode,
      state.locationVerificationRequired,
      state.locationVerificationStatus,
      state.partyId,
      state.partySource,
      state.selectedTeamId,
      state.teams,
    ],
  );

  useEffect(() => {
    if (!state.hostParty || !state.hostToken) {
      hostSocketRef.current?.disconnect();
      hostSocketRef.current = undefined;
      return undefined;
    }

    connectHostSocket(state.hostParty.joinCode, state.hostToken);

    return () => {
      hostSocketRef.current?.disconnect();
      hostSocketRef.current = undefined;
    };
  }, [connectHostSocket, state.hostParty, state.hostTeams.length, state.hostToken]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const session = await loadSession();
      if (!cancelled) {
        dispatch({ type: 'restoreHostSession', session });
      }

      if (!session?.joinCode) {
        return;
      }

      try {
        const party = await getPartyByJoinCode(session.joinCode);
        if (cancelled) {
          return;
        }

        dispatch({ type: 'loadPartySuccess', party, session });
        void refreshPlayerRounds(party.joinCode);

        if (session.playerId && session.teamId) {
          connectPlayerSocket(party.joinCode, session.playerId, session.teamId, session.playerNickname);
        }
      } catch {
        // Ignore stale saved rooms. The player can enter a fresh code.
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
      playerSocketRef.current?.disconnect();
      hostSocketRef.current?.disconnect();
    };
  }, [connectPlayerSocket, refreshPlayerRounds]);

  const value = useMemo<PartyStateContextValue>(() => {
    const checkedInTeam = state.teams.find((team) => team.id === state.checkedInTeamId);
    const selectedTeam = state.teams.find((team) => team.id === state.selectedTeamId);
    const currentRound = state.playerRounds.find((round) => round.status === 'ACTIVE');
    const nextRound = state.playerRounds.find((round) => round.status === 'PENDING');
    const totalPlayers = state.teams.reduce((total, team) => total + team.checkedIn, 0);

    return {
      ...state,
      isHostAuthenticated: Boolean(state.hostToken),
      checkedInTeam,
      selectedTeam,
      currentRound,
      nextRound,
      totalPlayers,
      loginHostAccount,
      registerHostAccount,
      createHostParty,
      refreshHostParties,
      selectCurrentHostParty,
      updateHostPartySettings,
      refreshHostTeams,
      createHostTeam,
      selectHostTeam: (teamId) => dispatch({ type: 'selectHostTeam', teamId }),
      refreshHostRoundSetup,
      queueHostRound,
      startHostRound,
      endHostRound,
      skipHostRound,
      writeHostScore,
      sendHostRoundEvent,
      selectTeam: (teamId) => dispatch({ type: 'selectTeam', teamId }),
      loadPlayerParty,
      checkInSelectedTeam,
      requestLocationVerification: () => {
        dispatch({ type: 'locationVerificationRequested' });
        setTimeout(() => dispatch({ type: 'locationVerificationUnavailable' }), 600);
      },
      markLocationOverride: () => dispatch({ type: 'locationOverrideMarked' }),
      submitTriviaAnswer: (choice) => {
        const socket = playerSocketRef.current;
        const activeQuestion = state.triviaQuestion;

        if (!socket?.connected || !activeQuestion) {
          dispatch({ type: 'triviaSubmitFailure', error: 'Waiting for the live question connection.' });
          return;
        }

        submitRoundEvent(socket, activeQuestion.roundId, 'answer', { choice });
        dispatch({ type: 'triviaAnswerSubmitted', choice });
      },
      refreshScoreReport,
      revealScores,
      endNight,
      awardBonusToTeam,
    };
  }, [
    checkInSelectedTeam,
    createHostParty,
    createHostTeam,
    endNight,
    endHostRound,
    loadPlayerParty,
    loginHostAccount,
    queueHostRound,
    awardBonusToTeam,
    refreshScoreReport,
    refreshHostRoundSetup,
    refreshHostParties,
    refreshHostTeams,
    registerHostAccount,
    revealScores,
    sendHostRoundEvent,
    selectCurrentHostParty,
    skipHostRound,
    startHostRound,
    state,
    updateHostPartySettings,
    writeHostScore,
  ]);

  return <PartyStateContext.Provider value={value}>{children}</PartyStateContext.Provider>;
}

function isLocationVerificationRequired(settings: unknown) {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const value = settings as {
    locationVerification?: unknown;
    locationVerificationEnabled?: unknown;
  };

  if (value.locationVerificationEnabled === true) {
    return true;
  }

  if (value.locationVerification && typeof value.locationVerification === 'object') {
    const locationVerification = value.locationVerification as { enabled?: unknown; required?: unknown };
    return locationVerification.enabled === true || locationVerification.required === true;
  }

  return false;
}

function getJoinCodeLifecycleError(status: PartyByCodeResponse['status']) {
  switch (status) {
    case 'LOBBY':
    case 'IN_PROGRESS':
      return undefined;
    case 'FINISHED':
      return 'This party has ended. Ask the host for the next active room code.';
    case 'CANCELLED':
      return 'This party was cancelled. Ask the host for the active room code.';
    case 'PAUSED':
      return 'This party is paused. Ask the host when check-in reopens.';
  }
}

function mapHostParty(
  party: CreatePartyResponse | PartyByCodeResponse | HostPartySummary,
): NonNullable<MobileSession['hostParty']> {
  return {
    id: party.id,
    joinCode: party.joinCode,
    name: party.name,
    status: party.status,
    maxTeams: party.maxTeams,
    maxPerTeam: party.maxPerTeam,
  };
}

export function usePartyState() {
  const value = useContext(PartyStateContext);
  if (!value) {
    throw new Error('usePartyState must be used inside PartyStateProvider');
  }

  return value;
}
