import Constants from 'expo-constants';
import { io, type Socket } from 'socket.io-client';
import type { paths } from '../../../api/generated/api-types';

type HealthResponse =
  paths['/v1/health']['get']['responses'][200]['content']['application/json'];
export type PartyByCodeResponse =
  paths['/v1/parties/{joinCode}']['get']['responses'][200]['content']['application/json'];
export type CreatePartyResponse =
  paths['/v1/parties']['post']['responses'][201]['content']['application/json'];
export type AuthResponse =
  paths['/v1/auth/login']['post']['responses'][200]['content']['application/json'];
export type TeamListResponse =
  paths['/v1/parties/{joinCode}/teams']['get']['responses'][200]['content']['application/json'];
export type TeamResponse = TeamListResponse[number];
export type GameListResponse = paths['/v1/games']['get']['responses'][200]['content']['application/json'];
export type GameDefinitionResponse = GameListResponse[number];
export type JoinPlayerResponse =
  paths['/v1/teams/{teamId}/players']['post']['responses'][201]['content']['application/json'];
export type RoundListResponse =
  paths['/v1/parties/{joinCode}/rounds']['get']['responses'][200]['content']['application/json'];
export type PartyRoundResponse = RoundListResponse[number];
export type QueueRoundResponse =
  paths['/v1/parties/{joinCode}/rounds']['post']['responses'][201]['content']['application/json'];
export type RoundActionResponse =
  paths['/v1/rounds/{roundId}/start']['post']['responses'][200]['content']['application/json'];
export type EndRoundResponse =
  paths['/v1/rounds/{roundId}/end']['post']['responses'][200]['content']['application/json'];
export type WriteScoreResponse =
  paths['/v1/rounds/{roundId}/score']['post']['responses'][200]['content']['application/json'];
type JoinPlayerRequest =
  paths['/v1/teams/{teamId}/players']['post']['requestBody']['content']['application/json'];
export type QueueRoundRequest =
  NonNullable<paths['/v1/parties/{joinCode}/rounds']['post']['requestBody']>['content']['application/json'];
type WriteScoreRequest =
  paths['/v1/rounds/{roundId}/score']['post']['requestBody']['content']['application/json'];
type HostLoginRequest =
  paths['/v1/auth/login']['post']['requestBody']['content']['application/json'];
type HostRegisterRequest =
  paths['/v1/auth/register']['post']['requestBody']['content']['application/json'];
type CreatePartyRequest =
  paths['/v1/parties']['post']['requestBody']['content']['application/json'];
type CreateTeamRequest =
  paths['/v1/parties/{joinCode}/teams']['post']['requestBody']['content']['application/json'];

export interface RoundStartedPayload {
  roundId: string;
  gameSlug: string | null;
  order: number;
  config: unknown;
  startedAt: string | Date | null;
}

export interface RoundEndedPayload {
  roundId: string;
  scores: Array<{ teamId: string; points: number }>;
}

export interface TriviaQuestionPayload {
  kind: 'trivia-question';
  roundId: string;
  promptId: string;
  questionNumber: number;
  total: number;
  question: string;
  choices: string[];
  difficulty: number;
  deadlineAt: string;
}

export interface TriviaRevealPayload {
  kind: 'trivia-answer';
  roundId: string;
  promptId: string;
  questionNumber: number;
  correctAnswer: string;
  perTeam: Record<string, { correct: boolean; choice: string | null; points: number }>;
}

export function isTriviaQuestionPayload(payload: unknown): payload is TriviaQuestionPayload {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'kind' in payload &&
      (payload as { kind?: unknown }).kind === 'trivia-question',
  );
}

export function isTriviaRevealPayload(payload: unknown): payload is TriviaRevealPayload {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'kind' in payload &&
      (payload as { kind?: unknown }).kind === 'trivia-answer',
  );
}

interface ApiConfig {
  baseUrl: string;
  socketUrl: string;
}

interface ExpoExtraConfig {
  apiBaseUrl?: string;
  baseUrl?: string;
  socketUrl?: string;
}

interface ExpoHostConfig {
  expoConfig?: {
    extra?: ExpoExtraConfig;
    hostUri?: string;
  };
  expoGoConfig?: {
    debuggerHost?: string;
  };
}

const constants = Constants as unknown as ExpoHostConfig;
const extra = constants.expoConfig?.extra;
const devHost = constants.expoConfig?.hostUri?.split(':')[0] ?? constants.expoGoConfig?.debuggerHost?.split(':')[0];

function resolveLocalDevUrl(configuredUrl: string) {
  if (!devHost || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/u.test(configuredUrl)) {
    return configuredUrl;
  }

  try {
    const url = new URL(configuredUrl);
    url.hostname = devHost;
    return url.toString().replace(/\/$/u, '');
  } catch {
    return configuredUrl;
  }
}

export const apiConfig: ApiConfig = {
  baseUrl: resolveLocalDevUrl(extra?.baseUrl ?? extra?.apiBaseUrl ?? 'http://localhost:3000/v1'),
  socketUrl: resolveLocalDevUrl(extra?.socketUrl ?? 'http://localhost:3000'),
};

function getErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }
  }

  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => undefined)) as T | undefined;

  if (!response.ok) {
    throw new Error(getErrorMessage(body, `Request failed: ${response.status}`));
  }

  return body as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/health');
}

export async function getGames(): Promise<GameListResponse> {
  return requestJson<GameListResponse>('/games');
}

export async function loginHost(body: HostLoginRequest): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function registerHost(body: HostRegisterRequest): Promise<AuthResponse> {
  return requestJson<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createParty(body: CreatePartyRequest, token: string): Promise<CreatePartyResponse> {
  return requestJson<CreatePartyResponse>('/parties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export function normalizeJoinCode(joinCode: string) {
  return joinCode.trim().toUpperCase().replace(/\s+/gu, '');
}

export async function getPartyByJoinCode(joinCode: string): Promise<PartyByCodeResponse> {
  return requestJson<PartyByCodeResponse>(`/parties/${encodeURIComponent(normalizeJoinCode(joinCode))}`);
}

export async function getPartyTeams(joinCode: string): Promise<TeamListResponse> {
  return requestJson<TeamListResponse>(`/parties/${encodeURIComponent(normalizeJoinCode(joinCode))}/teams`);
}

export async function createTeam(joinCode: string, body: CreateTeamRequest, token: string): Promise<TeamResponse> {
  return requestJson<TeamResponse>(`/parties/${encodeURIComponent(normalizeJoinCode(joinCode))}/teams`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function getPartyRounds(joinCode: string): Promise<RoundListResponse> {
  return requestJson<RoundListResponse>(`/parties/${encodeURIComponent(normalizeJoinCode(joinCode))}/rounds`);
}

export async function queueRound(
  joinCode: string,
  body: QueueRoundRequest,
  token: string,
): Promise<QueueRoundResponse> {
  return requestJson<QueueRoundResponse>(`/parties/${encodeURIComponent(normalizeJoinCode(joinCode))}/rounds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function startRound(roundId: string, token: string): Promise<RoundActionResponse> {
  return requestJson<RoundActionResponse>(`/rounds/${encodeURIComponent(roundId)}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function endRound(roundId: string, token: string): Promise<EndRoundResponse> {
  return requestJson<EndRoundResponse>(`/rounds/${encodeURIComponent(roundId)}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function skipRound(roundId: string, token: string): Promise<RoundActionResponse> {
  return requestJson<RoundActionResponse>(`/rounds/${encodeURIComponent(roundId)}/skip`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function writeRoundScore(
  roundId: string,
  body: WriteScoreRequest,
  token: string,
): Promise<WriteScoreResponse> {
  return requestJson<WriteScoreResponse>(`/rounds/${encodeURIComponent(roundId)}/score`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function joinTeam(teamId: string, body: JoinPlayerRequest): Promise<JoinPlayerResponse> {
  return requestJson<JoinPlayerResponse>(`/teams/${encodeURIComponent(teamId)}/players`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createPartySocket(): Socket {
  return io(apiConfig.socketUrl, {
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket'],
  });
}

export function joinPartyRoom(socket: Socket, joinCode: string, playerId: string) {
  socket.emit('party:join', { joinCode: normalizeJoinCode(joinCode), playerId });
}

export function submitRoundEvent(socket: Socket, roundId: string, type: string, payload?: unknown) {
  socket.emit('round:event', { roundId, type, payload });
}
