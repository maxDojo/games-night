import Constants from 'expo-constants';
import { io, type Socket } from 'socket.io-client';
import type { paths } from '../../../api/generated/api-types';

type HealthResponse =
  paths['/v1/health']['get']['responses'][200]['content']['application/json'];

interface ApiConfig {
  baseUrl: string;
  socketUrl: string;
}

interface ExpoExtraConfig {
  apiBaseUrl?: string;
  baseUrl?: string;
  socketUrl?: string;
}

const extra = Constants.expoConfig?.extra as ExpoExtraConfig | undefined;

export const apiConfig: ApiConfig = {
  baseUrl: extra?.baseUrl ?? extra?.apiBaseUrl ?? 'http://localhost:3000/v1',
  socketUrl: extra?.socketUrl ?? 'http://localhost:3000',
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiConfig.baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}

export function createPartySocket(): Socket {
  return io(apiConfig.socketUrl, {
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket'],
  });
}
