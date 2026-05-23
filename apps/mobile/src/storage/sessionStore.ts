import * as SecureStore from 'expo-secure-store';

export interface MobileSession {
  hostToken?: string;
  hostUser?: {
    id: string;
    email: string;
    displayName: string;
  };
  hostParty?: {
    id: string;
    joinCode: string;
    name: string;
    status: string;
    maxTeams: number;
    maxPerTeam: number;
  };
  joinCode?: string;
  playerId?: string;
  teamId?: string;
  playerNickname?: string;
  lastPartyId?: string;
}

const sessionKey = 'games-night.mobile-session';

export async function loadSession(): Promise<MobileSession | undefined> {
  const raw = await SecureStore.getItemAsync(sessionKey);
  return raw ? (JSON.parse(raw) as MobileSession) : undefined;
}

export async function saveSession(session: MobileSession): Promise<void> {
  const current = await loadSession();
  await SecureStore.setItemAsync(sessionKey, JSON.stringify({ ...current, ...session }));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(sessionKey);
}
