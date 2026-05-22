import * as SecureStore from 'expo-secure-store';

export interface MobileSession {
  hostToken?: string;
  joinCode?: string;
  playerId?: string;
  teamId?: string;
  lastPartyId?: string;
}

const sessionKey = 'games-night.mobile-session';

export async function loadSession(): Promise<MobileSession | undefined> {
  const raw = await SecureStore.getItemAsync(sessionKey);
  return raw ? (JSON.parse(raw) as MobileSession) : undefined;
}

export async function saveSession(session: MobileSession): Promise<void> {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(sessionKey);
}
