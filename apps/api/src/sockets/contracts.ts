import { z } from 'zod';

export const PartyJoinPayloadSchema = z.object({
  joinCode: z.string().length(6).regex(/^[A-Z2-9]{6}$/),
  playerId: z.string().min(1),
});

export const RoundEventPayloadSchema = z.object({
  roundId: z.string().min(1),
  type: z.string().min(1).optional(),
  payload: z.unknown().optional(),
});

export type PartyJoinPayload = z.infer<typeof PartyJoinPayloadSchema>;
export type RoundEventPayload = z.infer<typeof RoundEventPayloadSchema>;

export interface SocketErrorPayload {
  error: string;
  message: string;
  issues?: unknown;
}

export interface PartyPlayerPayload {
  id: string;
  teamId: string;
  nickname: string;
  userId?: string | null;
  isCaptain?: boolean;
}

export interface PartyTeamPayload {
  id: string;
  partyId: string;
  name: string;
  color?: string | null;
  position: number;
  players: PartyPlayerPayload[];
}

export interface PartyStatePayload {
  id: string;
  joinCode: string;
  name: string;
  status: string;
  hostId: string;
  maxTeams: number;
  maxPerTeam: number;
  scoresRevealed: boolean;
  settings: unknown;
  createdAt: string | Date;
  startedAt: string | Date | null;
  finishedAt: string | Date | null;
  teams: PartyTeamPayload[];
}

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

export interface ScoreUpdatedPayload {
  roundId?: string;
  teamId: string;
  points?: number;
  delta?: number;
  reason?: 'correct' | 'skip' | 'taboo';
  promptId?: string;
  correct?: boolean;
  choice?: string | null;
  answer?: string;
  challengerTeamId?: string;
  forbiddenWord?: string;
}

export type PromptNextPayload =
  | {
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
  | {
      kind: 'charades-phrase';
      roundId: string;
      promptId: string;
      teamId: string;
      phrase: string;
      category: string | null;
    }
  | {
      kind: 'taboo-card';
      roundId: string;
      promptId: string;
      teamId: string;
      word: string;
      forbidden: string[];
      category: string | null;
    };

export interface PromptChallengePayload {
  kind: 'taboo-card';
  roundId: string;
  promptId: string;
  teamId: string;
  word: string;
  forbidden: string[];
  category: string | null;
}

export interface PromptRevealPayload {
  kind: 'trivia-answer';
  roundId: string;
  promptId: string;
  questionNumber: number;
  correctAnswer: string;
  perTeam: Record<string, { correct: boolean; choice: string | null; points: number }>;
}

export interface TurnStartedPayload {
  roundId: string;
  teamId: string;
  turnNumber: number;
  total: number;
  deadlineAt: string;
}

export interface TurnEndedPayload {
  roundId: string;
  teamId: string;
  correct: number;
  skips: number;
  taboos?: number;
  turnPoints: number;
  totalPoints: number;
}

export interface ClientToServerEvents {
  'party:join': (payload: PartyJoinPayload) => void;
  'round:event': (payload: RoundEventPayload) => void;
  'round:answer': (payload: Omit<RoundEventPayload, 'type'>) => void;
}

export interface ServerToClientEvents {
  error: (payload: SocketErrorPayload) => void;
  'party:state': (payload: PartyStatePayload) => void;
  'round:started': (payload: RoundStartedPayload) => void;
  'round:ended': (payload: RoundEndedPayload) => void;
  'score:updated': (payload: ScoreUpdatedPayload) => void;
  'prompt:next': (payload: PromptNextPayload) => void;
  'prompt:challenge': (payload: PromptChallengePayload) => void;
  'prompt:reveal': (payload: PromptRevealPayload) => void;
  'turn:started': (payload: TurnStartedPayload) => void;
  'turn:ended': (payload: TurnEndedPayload) => void;
}

export type ServerToClientEventName = keyof ServerToClientEvents;
export type ServerToClientPayload<E extends ServerToClientEventName> = Parameters<
  ServerToClientEvents[E]
>[0];

export interface InterServerEvents {}

export interface SocketData {}
