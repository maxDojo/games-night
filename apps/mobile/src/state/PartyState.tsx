import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Socket } from 'socket.io-client';

import {
  createPartySocket,
  getPartyByJoinCode,
  getPartyRounds,
  isTriviaQuestionPayload,
  isTriviaRevealPayload,
  joinPartyRoom,
  joinTeam,
  normalizeJoinCode,
  submitRoundEvent,
  type PartyByCodeResponse,
  type RoundEndedPayload,
  type RoundStartedPayload,
} from '../api/client';
import { bonusAwards, joinCode, period, queuedRounds, scoreEvents, teams } from '../data/mockState';
import {
  getFirstAvailableTeamId,
  getPlayerError,
  mapPartyRound,
  mapPartyTeams,
  mapStartedRound,
  mapTriviaQuestion,
  mapTriviaReveal,
} from './partyMappers';
import { loadSession, saveSession, type MobileSession } from '../storage/sessionStore';
import type {
  BonusAwardSummary,
  PlayerRoundStatus,
  PlayerTriviaQuestion,
  PlayerTriviaReveal,
  ScoreEventSummary,
  TeamSummary,
} from '../types/product';

interface PartyState {
  joinCode: string;
  partyId?: string;
  partyName: string;
  partyStatus?: PartyByCodeResponse['status'];
  partySource: 'mock' | 'api';
  period: typeof period;
  teams: TeamSummary[];
  playerRounds: PlayerRoundStatus[];
  queuedRounds: typeof queuedRounds;
  bonusAwards: BonusAwardSummary[];
  scoreEvents: ScoreEventSummary[];
  selectedTeamId?: string;
  checkedInTeamId?: string;
  checkedInPlayerId?: string;
  playerNickname?: string;
  isLoadingParty: boolean;
  isLoadingRounds: boolean;
  isCheckingIn: boolean;
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
  checkedInTeam?: TeamSummary;
  selectedTeam?: TeamSummary;
  currentRound?: PlayerRoundStatus;
  nextRound?: PlayerRoundStatus;
  totalPlayers: number;
  selectTeam: (teamId: string) => void;
  loadPlayerParty: (joinCode: string) => Promise<void>;
  checkInSelectedTeam: (nickname: string) => Promise<TeamSummary | undefined>;
  submitTriviaAnswer: (choice: string) => void;
  revealScores: () => void;
  awardNextBonus: () => void;
}

type PartyAction =
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
  | { type: 'roundStarted'; round: PlayerRoundStatus }
  | { type: 'roundEnded'; roundId: string }
  | { type: 'triviaQuestion'; question: PlayerTriviaQuestion }
  | { type: 'triviaAnswerSubmitted'; choice: string }
  | { type: 'triviaReveal'; reveal: PlayerTriviaReveal }
  | { type: 'triviaSubmitFailure'; error: string }
  | { type: 'revealScores' }
  | { type: 'awardBonus'; bonusId: string; teamId: string };

const firstAvailableTeam = teams.find((team) => team.checkedIn < team.capacity);

const initialState: PartyState = {
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
  scoresRevealed: false,
  awardedBonusIds: [],
};

const PartyStateContext = createContext<PartyStateContextValue | undefined>(undefined);

function partyReducer(state: PartyState, action: PartyAction): PartyState {
  switch (action.type) {
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

      return {
        ...state,
        joinCode: action.party.joinCode,
        partyId: action.party.id,
        partyName: action.party.name,
        partyStatus: action.party.status,
        partySource: 'api',
        teams: mappedTeams.map((team) => ({ ...team, isSelected: team.id === selectedTeamId })),
        selectedTeamId,
        checkedInTeamId: persistedTeamId,
        checkedInPlayerId: action.session?.playerId,
        playerNickname: action.session?.playerNickname,
        isLoadingParty: false,
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
    case 'revealScores':
      return { ...state, scoresRevealed: true };
    case 'awardBonus': {
      if (state.awardedBonusIds.includes(action.bonusId)) {
        return state;
      }

      const bonus = state.bonusAwards.find((item) => item.id === action.bonusId);
      const team = state.teams.find((item) => item.id === action.teamId);
      if (!bonus || !team) {
        return state;
      }

      const event: ScoreEventSummary = {
        id: `score-${bonus.id}`,
        label: `Bonus: ${bonus.label.toLowerCase()}`,
        delta: bonus.points,
        teamName: team.name,
        source: 'bonus',
      };

      return {
        ...state,
        awardedBonusIds: [...state.awardedBonusIds, bonus.id],
        scoreEvents: [...state.scoreEvents, event],
        teams: state.teams.map((item) =>
          item.id === action.teamId ? { ...item, points: item.points + bonus.points } : item,
        ),
      };
    }
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
      await saveSession({ joinCode: party.joinCode, lastPartyId: party.id });
      dispatch({ type: 'loadPartySuccess', party });
      void refreshPlayerRounds(party.joinCode);
    } catch (error) {
      dispatch({ type: 'loadPartyFailure', error: getPlayerError(error) });
    }
  }, [refreshPlayerRounds]);

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
      state.partyId,
      state.partySource,
      state.selectedTeamId,
      state.teams,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    async function restorePlayerSession() {
      const session = await loadSession();
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

    void restorePlayerSession();

    return () => {
      cancelled = true;
      playerSocketRef.current?.disconnect();
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
      checkedInTeam,
      selectedTeam,
      currentRound,
      nextRound,
      totalPlayers,
      selectTeam: (teamId) => dispatch({ type: 'selectTeam', teamId }),
      loadPlayerParty,
      checkInSelectedTeam,
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
      revealScores: () => dispatch({ type: 'revealScores' }),
      awardNextBonus: () => {
        const bonus = state.bonusAwards.find((item) => !state.awardedBonusIds.includes(item.id));
        const targetTeam = state.teams.find((team) => team.id === state.checkedInTeamId) ?? state.teams[0];

        if (bonus && targetTeam) {
          dispatch({ type: 'awardBonus', bonusId: bonus.id, teamId: targetTeam.id });
        }
      },
    };
  }, [checkInSelectedTeam, loadPlayerParty, state]);

  return <PartyStateContext.Provider value={value}>{children}</PartyStateContext.Provider>;
}

export function usePartyState() {
  const value = useContext(PartyStateContext);
  if (!value) {
    throw new Error('usePartyState must be used inside PartyStateProvider');
  }

  return value;
}
