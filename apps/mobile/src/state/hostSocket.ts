import type { Socket } from 'socket.io-client';

import {
  createPartySocket,
  isCharadesPromptPayload,
  isTabooPromptPayload,
  joinHostControls,
  type RoundEndedPayload,
  type ScoreUpdatedPayload,
  type TurnEndedPayload,
  type TurnStartedPayload,
} from '../api/client';
import type { HostGamePrompt } from '../types/product';

interface HostControlSocketHandlers {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
  onPrompt: (prompt: HostGamePrompt) => void;
  onRoundEnded: (payload: RoundEndedPayload) => void;
  onScoreUpdated: (payload: ScoreUpdatedPayload) => void;
  onTurnEnded: (payload: TurnEndedPayload) => void;
  onTurnStarted: (payload: TurnStartedPayload) => void;
}

interface ConnectHostControlSocketInput extends HostControlSocketHandlers {
  joinCode: string;
  token: string;
}

export function connectHostControlSocket({
  joinCode,
  onConnected,
  onDisconnected,
  onError,
  onPrompt,
  onRoundEnded,
  onScoreUpdated,
  onTurnEnded,
  onTurnStarted,
  token,
}: ConnectHostControlSocketInput): Socket {
  const socket = createPartySocket();

  socket.on('connect', () => {
    onConnected();
    joinHostControls(socket, joinCode, token);
  });
  socket.on('disconnect', onDisconnected);
  socket.on('turn:started', onTurnStarted);
  socket.on('turn:ended', onTurnEnded);
  socket.on('prompt:next', (payload: unknown) => {
    if (isCharadesPromptPayload(payload) || isTabooPromptPayload(payload)) {
      onPrompt(payload);
    }
  });
  socket.on('score:updated', onScoreUpdated);
  socket.on('round:ended', onRoundEnded);
  socket.on('error', (payload: { message?: string }) => {
    onError(payload.message ?? 'Host socket error.');
  });
  socket.connect();

  return socket;
}
