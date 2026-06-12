import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  } | null;
  joinCode?: string;
  playerId?: string;
  teamId?: string;
  playerNickname?: string;
  lastPartyId?: string;
}

const sessionKey = 'games-night.mobile-session';

export async function loadSession(): Promise<MobileSession | undefined> {
  const raw =
    Platform.OS === 'web'
      ? typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(sessionKey)
      : await SecureStore.getItemAsync(sessionKey);
  return raw ? (JSON.parse(raw) as MobileSession) : undefined;
}

export async function saveSession(session: MobileSession): Promise<void> {
  const current = await loadSession();
  const value = JSON.stringify({ ...current, ...session });

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(sessionKey, value);
    }
    return;
  }

  await SecureStore.setItemAsync(sessionKey, value);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(sessionKey);
    }
    return;
  }

  await SecureStore.deleteItemAsync(sessionKey);
}
