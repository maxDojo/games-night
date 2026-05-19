// Game engine seam — every built-in game type (and future custom variants
// that reuse a built-in flow) implements `GameEngineFactory`. The registry
// turns a `gameSlug` into a `RoundRunner` for a specific live round.
//
// Runners are per-round and in-memory. If the server restarts mid-round,
// the runner is lost and the round must be ended manually by the host.
// This is acceptable for MVP; persisting answer-by-answer events is a
// future enhancement (Round.events table or similar).

import type { PrismaClient } from '@prisma/client';
import type { ZodTypeAny } from 'zod';
import type {
  ServerToClientEventName,
  ServerToClientPayload,
} from '../sockets/contracts.js';

export interface PartyEmitter {
  /** Emit any event to a party id or explicit Socket.IO room such as team:<id>. */
  <E extends ServerToClientEventName>(
    partyId: string,
    event: E,
    payload: ServerToClientPayload<E>,
  ): void;
}

export interface EngineClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: EngineClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export interface EngineDeps {
  prisma: PrismaClient;
  emit: PartyEmitter;
  clock: EngineClock;
  /** Hook called when the runner has finished the last question; used by the
   *  registry to flip the Round to COMPLETED and clean up. */
  onCompleted: (roundId: string) => Promise<void>;
}

export interface RoundRunner {
  readonly roundId: string;
  /** Begin server-driven gameplay. Resolves once the first prompt is out. */
  start(): Promise<void>;
  /** Handle an incoming player event from a socket. The engine decides which
   *  event types it cares about — trivia listens for 'answer'; charades for
   *  'correct' and 'skip'; unknown types are ignored. */
  handleEvent(type: string, input: PlayerEvent): Promise<void>;
  /** Called when the host force-ends the round. Cancels any pending timers. */
  abort(): Promise<void>;
}

export interface PlayerEvent {
  /** Player who fired it, looked up from socket.id by the dispatcher. */
  playerId: string;
  teamId: string;
  /** Engine-specific payload. Trivia uses { choice: string }; charades omits. */
  payload: unknown;
}

export interface GameEngineFactory {
  /** Matches the GameDefinition.slug. */
  readonly slug: string;
  /** Zod schema used to validate (and default-fill) host-supplied config at
   *  queue time. The parsed value is what gets stored in Round.config and
   *  later read by the runner. Optional for slugs that intentionally accept
   *  any config shape. */
  readonly configSchema?: ZodTypeAny;
  create(input: CreateRunnerInput): Promise<RoundRunner>;
}

export interface CreateRunnerInput {
  roundId: string;
  partyId: string;
  config: Record<string, unknown>;
  deps: EngineDeps;
}
