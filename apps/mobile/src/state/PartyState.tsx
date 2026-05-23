import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Socket } from 'socket.io-client';

import {
  createParty,
  createPartySocket,
  createTeam,
  getPartyByJoinCode,
  getPartyTeams,
  getPartyRounds,
  isTriviaQuestionPayload,
  isTriviaRevealPayload,
  joinPartyRoom,
  joinTeam,
  loginHost,
  normalizeJoinCode,
  registerHost,
  submitRoundEvent,
  type AuthResponse,
  type CreatePartyResponse,
  type PartyByCodeResponse,
  type RoundEndedPayload,
  type RoundStartedPayload,
} from '../api/client';
import { bonusAwards, joinCode, period, queuedRounds, scoreEvents, teams } from '../data/mockState';
import {
  getFirstAvailableTeamId,
  getPlayerError,
  mapHostTeam,
  mapPartyRound,
  mapPartyTeams,
  mapStartedRound,
  mapTriviaQuestion,
  mapTriviaReveal,
} from './partyMappers';
import { loadSession, saveSession, type MobileSession } from '../storage/sessionStore';
import type {
  BonusAwardSummary,
  LocationVerificationStatus,
  PlayerRoundStatus,
  PlayerTriviaQuestion,
  PlayerTriviaReveal,
  ScoreEventSummary,
  TeamSummary,
} from '../types/product';

interface PartyState {
  hostToken?: string;
  hostUser?: MobileSession['hostUser'];
  hostParty?: MobileSession['hostParty'];
  hostTeams: TeamSummary[];
  isRestoringHostSession: boolean;
  isHostAuthenticating: boolean;
  isCreatingHostParty: boolean;
  isLoadingHostTeams: boolean;
  isCreatingHostTeam: boolean;
  hostAuthError?: string;
  hostPartyError?: string;
  hostTeamError?: string;
  selectedHostTeamId?: string;
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
  refreshHostTeams: () => Promise<void>;
  createHostTeam: (name: string, color: string) => Promise<boolean>;
  selectHostTeam: (teamId: string) => void;
  selectTeam: (teamId: string) => void;
  loadPlayerParty: (joinCode: string) => Promise<void>;
  checkInSelectedTeam: (nickname: string) => Promise<TeamSummary | undefined>;
  requestLocationVerification: () => void;
  markLocationOverride: () => void;
  submitTriviaAnswer: (choice: string) => void;
  revealScores: () => void;
  awardNextBonus: () => void;
}

type PartyAction =
  | { type: 'restoreHostSession'; session?: MobileSession }
  | { type: 'hostAuthStart' }
  | { type: 'hostAuthSuccess'; auth: AuthResponse }
  | { type: 'hostAuthFailure'; error: string }
  | { type: 'createHostPartyStart' }
  | { type: 'createHostPartySuccess'; party: CreatePartyResponse }
  | { type: 'createHostPartyFailure'; error: string }
  | { type: 'loadHostTeamsStart' }
  | { type: 'loadHostTeamsSuccess'; teams: TeamSummary[] }
  | { type: 'loadHostTeamsFailure'; error: string }
  | { type: 'createHostTeamStart' }
  | { type: 'createHostTeamSuccess'; team: TeamSummary }
  | { type: 'createHostTeamFailure'; error: string }
  | { type: 'selectHostTeam'; teamId: string }
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
  | { type: 'triviaSubmitFailure'; error: string }
  | { type: 'revealScores' }
  | { type: 'awardBonus'; bonusId: string; teamId: string };

const firstAvailableTeam = teams.find((team) => team.checkedIn < team.capacity);

const initialState: PartyState = {
  isRestoringHostSession: true,
  isHostAuthenticating: false,
  isCreatingHostParty: false,
  isLoadingHostTeams: false,
  isCreatingHostTeam: false,
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
        hostParty: action.session?.hostParty,
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
        selectedHostTeamId: undefined,
        isCreatingHostParty: false,
        hostPartyError: undefined,
      };
    case 'createHostPartyFailure':
      return { ...state, isCreatingHostParty: false, hostPartyError: action.error };
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
        return true;
      } catch (error) {
        dispatch({ type: 'createHostPartyFailure', error: getPlayerError(error) });
        return false;
      }
    },
    [state.hostToken],
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
      refreshHostTeams,
      createHostTeam,
      selectHostTeam: (teamId) => dispatch({ type: 'selectHostTeam', teamId }),
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
      revealScores: () => dispatch({ type: 'revealScores' }),
      awardNextBonus: () => {
        const bonus = state.bonusAwards.find((item) => !state.awardedBonusIds.includes(item.id));
        const targetTeam = state.teams.find((team) => team.id === state.checkedInTeamId) ?? state.teams[0];

        if (bonus && targetTeam) {
          dispatch({ type: 'awardBonus', bonusId: bonus.id, teamId: targetTeam.id });
        }
      },
    };
  }, [
    checkInSelectedTeam,
    createHostParty,
    createHostTeam,
    loadPlayerParty,
    loginHostAccount,
    refreshHostTeams,
    registerHostAccount,
    state,
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

function mapHostParty(party: CreatePartyResponse | PartyByCodeResponse): NonNullable<MobileSession['hostParty']> {
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
