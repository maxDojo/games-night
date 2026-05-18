import type {
  CreateRunnerInput,
  GameEngineFactory,
  RoundRunner,
} from './types.js';

// ---------------------------------------------------------------------------
// Engine registry
// ---------------------------------------------------------------------------
// - Static map of gameSlug → factory (registered at startup)
// - Live map of roundId → runner (the per-round runners currently in memory)
//
// Concurrency model: a given roundId has at most one runner. The registry
// guards against double-starts and lets the rounds route ask "is there a
// runner for this round id?" before/after end+abort.

export class GameRegistry {
  private readonly factories = new Map<string, GameEngineFactory>();
  private readonly runners = new Map<string, RoundRunner>();

  register(factory: GameEngineFactory) {
    this.factories.set(factory.slug, factory);
  }

  /** Returns true iff a factory is registered for this slug. */
  has(slug: string): boolean {
    return this.factories.has(slug);
  }

  /** Lookup the factory for a slug. Used by the rounds route to access
   *  configSchema before a runner exists. */
  getFactory(slug: string): GameEngineFactory | undefined {
    return this.factories.get(slug);
  }

  /** Construct + start a runner for this round. Returns the runner so callers
   *  can chain. Throws if no factory matches the slug. */
  async startRound(slug: string, input: CreateRunnerInput): Promise<RoundRunner | null> {
    const factory = this.factories.get(slug);
    if (!factory) return null; // engine not registered; manual-scoring round
    if (this.runners.has(input.roundId)) {
      throw new Error(`Runner already exists for round ${input.roundId}`);
    }
    const runner = await factory.create(input);
    this.runners.set(input.roundId, runner);
    await runner.start();
    return runner;
  }

  /** Lookup the runner for a round, if any. */
  get(roundId: string): RoundRunner | undefined {
    return this.runners.get(roundId);
  }

  /** Tear down the runner (called from /end and on engine onCompleted). */
  async stop(roundId: string): Promise<void> {
    const runner = this.runners.get(roundId);
    if (!runner) return;
    await runner.abort();
    this.runners.delete(roundId);
  }
}
