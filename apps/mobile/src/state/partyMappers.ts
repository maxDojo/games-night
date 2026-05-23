import type { PartyByCodeResponse } from '../api/client';
import type { TeamSummary } from '../types/product';

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
