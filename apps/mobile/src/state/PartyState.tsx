import { createContext, type ReactNode, useContext, useMemo, useReducer } from 'react';

import { bonusAwards, joinCode, period, queuedRounds, scoreEvents, teams } from '../data/mockState';
import type { BonusAwardSummary, ScoreEventSummary, TeamSummary } from '../types/product';

interface PartyState {
  joinCode: string;
  period: typeof period;
  teams: TeamSummary[];
  queuedRounds: typeof queuedRounds;
  bonusAwards: BonusAwardSummary[];
  scoreEvents: ScoreEventSummary[];
  selectedTeamId?: string;
  checkedInTeamId?: string;
  scoresRevealed: boolean;
  awardedBonusIds: string[];
}

interface PartyStateContextValue extends PartyState {
  checkedInTeam?: TeamSummary;
  selectedTeam?: TeamSummary;
  totalPlayers: number;
  selectTeam: (teamId: string) => void;
  checkInSelectedTeam: () => TeamSummary | undefined;
  revealScores: () => void;
  awardNextBonus: () => void;
}

type PartyAction =
  | { type: 'selectTeam'; teamId: string }
  | { type: 'checkInSelectedTeam' }
  | { type: 'revealScores' }
  | { type: 'awardBonus'; bonusId: string; teamId: string };

const firstAvailableTeam = teams.find((team) => team.checkedIn < team.capacity);

const initialState: PartyState = {
  joinCode,
  period,
  teams: teams.map((team) => ({ ...team, isSelected: team.id === firstAvailableTeam?.id })),
  queuedRounds,
  bonusAwards,
  scoreEvents,
  selectedTeamId: firstAvailableTeam?.id,
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
        selectedTeamId: action.teamId,
        teams: state.teams.map((team) => ({ ...team, isSelected: team.id === action.teamId })),
      };
    }
    case 'checkInSelectedTeam': {
      if (state.checkedInTeamId || !state.selectedTeamId) {
        return state;
      }

      const selectedTeam = state.teams.find((team) => team.id === state.selectedTeamId);
      if (!selectedTeam || selectedTeam.checkedIn >= selectedTeam.capacity) {
        return state;
      }

      return {
        ...state,
        checkedInTeamId: state.selectedTeamId,
        teams: state.teams.map((team) =>
          team.id === state.selectedTeamId ? { ...team, checkedIn: team.checkedIn + 1, isSelected: true } : team,
        ),
      };
    }
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

  const value = useMemo<PartyStateContextValue>(() => {
    const checkedInTeam = state.teams.find((team) => team.id === state.checkedInTeamId);
    const selectedTeam = state.teams.find((team) => team.id === state.selectedTeamId);
    const totalPlayers = state.teams.reduce((total, team) => total + team.checkedIn, 0);

    return {
      ...state,
      checkedInTeam,
      selectedTeam,
      totalPlayers,
      selectTeam: (teamId) => dispatch({ type: 'selectTeam', teamId }),
      checkInSelectedTeam: () => {
        dispatch({ type: 'checkInSelectedTeam' });
        return selectedTeam;
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
  }, [state]);

  return <PartyStateContext.Provider value={value}>{children}</PartyStateContext.Provider>;
}

export function usePartyState() {
  const value = useContext(PartyStateContext);
  if (!value) {
    throw new Error('usePartyState must be used inside PartyStateProvider');
  }

  return value;
}
