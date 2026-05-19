import { describe, expect, it } from 'vitest';
import {
  PartyJoinPayloadSchema,
  RoundEventPayloadSchema,
  type PromptNextPayload,
  type ServerToClientEvents,
  type SocketErrorPayload,
} from '../src/sockets/contracts.js';

describe('socket contracts', () => {
  it('validates party join payloads at the socket boundary', () => {
    expect(PartyJoinPayloadSchema.safeParse({ joinCode: 'ABCDEF', playerId: 'player_1' }).success)
      .toBe(true);
    expect(PartyJoinPayloadSchema.safeParse({ joinCode: 'bad', playerId: 'player_1' }).success)
      .toBe(false);
  });

  it('validates round event payloads while preserving engine-specific payloads', () => {
    const parsed = RoundEventPayloadSchema.safeParse({
      roundId: 'round_1',
      type: 'answer',
      payload: { choice: 'A' },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.payload).toEqual({ choice: 'A' });
    expect(RoundEventPayloadSchema.safeParse({ type: 'answer' }).success).toBe(false);
  });

  it('types game-specific prompt payloads with discriminating kind fields', () => {
    const payloads: PromptNextPayload[] = [
      {
        kind: 'trivia-question',
        roundId: 'round_1',
        promptId: 'prompt_1',
        questionNumber: 1,
        total: 10,
        question: 'Question?',
        choices: ['A', 'B'],
        difficulty: 2,
        deadlineAt: new Date().toISOString(),
      },
      {
        kind: 'charades-phrase',
        roundId: 'round_1',
        promptId: 'prompt_2',
        teamId: 'team_1',
        phrase: 'Make coffee',
        category: 'actions',
      },
      {
        kind: 'taboo-card',
        roundId: 'round_1',
        promptId: 'prompt_3',
        teamId: 'team_1',
        word: 'Office',
        forbidden: ['work', 'desk'],
        category: 'office',
      },
    ];

    expect(payloads.map((payload) => payload.kind)).toEqual([
      'trivia-question',
      'charades-phrase',
      'taboo-card',
    ]);
  });

  it('uses a consistent socket error envelope', () => {
    const error: SocketErrorPayload = {
      error: 'ValidationError',
      message: 'Invalid round event payload',
      issues: { fieldErrors: {} },
    };

    let emitted: SocketErrorPayload | null = null;
    const emitError: ServerToClientEvents['error'] = (payload) => {
      emitted = payload;
    };
    emitError(error);

    expect(emitted).toEqual(error);
  });
});
