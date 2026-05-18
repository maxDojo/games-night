# AGENTS.md — project context for AI coding agents

> **What this file is.** A primer for any AI coding agent (Codex, Cursor, Aider, Claude Code, etc.) working on this repo, so the agent doesn't have to be re-briefed from scratch. Follows the [agents.md](https://agents.md) cross-tool convention.
>
> **Audience.** Coding agents. The human user already knows this stuff.
>
> **Companion file.** [`CLAUDE.md`](./CLAUDE.md) holds the same content for Claude Code's auto-loader. Keep them in sync if you edit one.

---

## 1. What this app is (60 seconds)

Backend API for a **multi-team party games night app**. A host on a phone creates a Party (gets a short join-code), 2–8 teams of up to 10 players each join, and they play rounds of **Trivia / Charades / Taboo / custom games**. Real-time over Socket.IO. Unified **"Party Points"** scoring so games of different types are comparable on one leaderboard. Use case: an office games night, a weekend out, ~10 acquaintances or colleagues.

This repo is now a **Games Night monorepo**. The existing backend API lives in `apps/api`; web and mobile apps are expected under `apps/web` and `apps/mobile`.

---

## 2. State of play (as of last commit)

### What's shipped to `main`

| Milestone | What | Status |
|---|---|---|
| **M0** Bootstrap | Fastify + TS scaffold, Prisma schema, Socket.IO, scoring engine, Swagger | ✅ |
| **M1** Auth + party lifecycle | register/login, parties, teams, players, `party:state` broadcasts | ✅ |
| **M1.5** Provider abstraction | Open Trivia DB + AI(disabled) seam, free defaults, idempotent seed pipeline | ✅ |
| **M2 foundation** | Round state machine, manual scoring, leaderboard, `emitToParty` | ✅ |
| **M2 Trivia engine** | Server-side timer, time bonus, streak bonus, auto-end | ✅ |

### What's in flight

PR #7 — **Charades engine** + **per-game config schemas** + **content filters** (categories / difficulty).

### What's next

- **Taboo engine** (turn-based like Charades, adds an opposing-team "challenge" button for forbidden words)
- Custom games (M3)
- Operational polish (M4) — Sentry, CI/CD, OTP login, push notifications

---

## 3. Tech stack (locked-in choices)

| Layer | Choice | Why locked-in |
|---|---|---|
| Runtime | **Node.js 20 + TypeScript** | User answered this at bootstrap. |
| HTTP | **Fastify 4** | Lean, plugin model fits modular games. Not Fastify 5 (see version pins). |
| Realtime | **Socket.IO** | Rooms map cleanly to parties; auto-reconnect. |
| DB | **PostgreSQL** | Local Docker in dev, **Neon** planned for prod. |
| ORM | **Prisma 5.22** | Type-safe queries, first-class migrations. |
| Validation | **Zod** | Drives both runtime validation **and** OpenAPI via `fastify-type-provider-zod@^2`. |
| Auth | `@fastify/jwt` + `argon2` | Hosts authed; players can be anonymous. |
| Hosting | **Fly.io** (planned) | WebSockets work, multi-region, free tier. |

### Version pins to remember

- `fastify-type-provider-zod@^2.1.0` — **not 4+**, which requires Fastify 5. Don't bump without bumping Fastify.
- `@fastify/swagger@^8` — same reason.
- Prisma 5.x. v7 is available but no need to upgrade.

---

## 4. Conventions that show up everywhere

### Routes
- Every route module exports `FastifyPluginAsyncZod` and declares schemas inline:
  ```ts
  app.post('/foo', { schema: { body, response, ... } }, handler)
  ```
- Schemas are **Zod**, never JSON Schema. The type provider turns them into the OpenAPI doc.
- 🔒 endpoints use `preHandler: [app.authenticate]`.
- Validation errors → `400 { error: 'ValidationError', issues }` via global `setErrorHandler`.

### Plugins
- Anything that decorates `app.*` is wrapped with `fastify-plugin` so the decorator escapes encapsulation. **Without `fp()`, the decoration is invisible to sibling-scope routes.** This bit us once.
- Plugins that need to be testable (e.g. `prisma`, `socket`) accept options so tests can inject mocks / disable side effects.

### Tests
- **vitest** + Fastify's `app.inject()` (no supertest).
- Mock Prisma via `apps/api/tests/helpers/mockPrisma.ts`. Extend it whenever you use a new model method.
- Game engines use a **custom manual fake clock** (not `vi.useFakeTimers`) — see `apps/api/tests/games/trivia.test.ts` for the pattern. Gives precise tick control.
- Each route test file follows the same shape: `beforeAll` builds the app with mock prisma + `disableSockets: true`, `afterAll` closes, `beforeEach` resets mocks.

### Providers
- Every external dependency goes through `apps/api/src/config/providers.ts`. **Defaults are free / zero-dep.**
- Currently wired: `trivia` (Open Trivia DB) and `ai` (disabled). Future: `email`, `push`, `errors`, `storage`.
- Documented in `apps/api/README.md` §6. Adding a new domain is a 3-step process documented in `apps/api/src/config/providers.ts`.

### Game engines
- Per-game module under `apps/api/src/games/<slug>/`:
  - `runner.ts` — `RoundRunner` class implementing `start() / handleEvent(type, input) / abort()`
  - `config.ts` — Zod schema for the game's config (in flight on PR #7)
  - Factory exported at the bottom of `runner.ts` (`triviaEngine`, `charadesEngine`)
- Registered in `apps/api/src/plugins/games.ts`.
- Engines are **per-round** and **in-memory** (no mid-round persistence).
- `EngineClock` is injected so tests drive timers deterministically.

### Scoring
- The unified formula lives in `apps/api/src/lib/scoring.ts → scoreEvent()`:
  ```
  points = basePoints × difficultyMultiplier × (1 + timeBonus) + streakBonus − penalties
  ```
- Charades doesn't use difficulty/time/streak — just `correctCount × base − skips × penalty`, clamped at 0.
- See `apps/api/README.md` §4 for the canonical writeup.

---

## 5. Important architectural decisions and why

| Decision | Why |
|---|---|
| **Anonymous players are first-class** | The use case is a games night with acquaintances, not a sign-up funnel. Players can join with just a nickname; an optional JWT links them to a User. |
| **Hosts have unilateral authority** | Only the host creates teams, queues rounds, force-ends rounds, and overrides scores. Players have no admin powers. Matches the "one person on their phone runs the night" model. |
| **Engines are in-memory** | Server restart mid-round = stuck `ACTIVE` round. Host force-ends to recover. Documented as MVP-acceptable. Persistence is a future `Round.events` audit log. |
| **`Round.config` is stored fully-resolved** | Defaults merged with overrides at queue time. Means historical rounds are replayable even if `GameDefinition.defaults` changes later. |
| **One generic socket event for game actions** | `round:event { roundId, type, payload? }`. Trivia → `type='answer'`. Charades → `type='correct'|'skip'`. Engines branch on type. Keeps the dispatcher simple. `round:answer` kept as a back-compat alias. |
| **Team rooms for phrase privacy** | `party:join` subscribes the socket to both `party:<id>` and `team:<teamId>`. The Charades engine emits the phrase only to the team room. No client-side filtering needed. |
| **Server-side timers are authoritative** | Clients suggest, server decides. Otherwise leaderboards become contestable. |
| **Provider abstraction added before M2** | So `M2` engines call `providers.trivia.fetchQuestions(...)` etc., not inlined API clients. Upgrading to paid tiers later is a one-line env change. |
| **First-answer-per-team locking (Trivia)** | Otherwise teammates could spam answers. Server timestamps the first answer; later answers from the same team are silently ignored. |
| **Only the acting team can fire correct/skip (Charades)** | Engine drops events from other teams. Cooperative within a team, exclusive across teams. |

---

## 6. The story so far (chronological, with rationale)

> Explains *why* some weird-looking things exist.

1. **Bootstrap (PR #1)** — scaffold, schema, scoring engine, Swagger. User picked Fastify + Postgres + Fly.io.
2. **Realised plugins need `fastify-plugin`** — decorators were silently scoped. Wrapped `prisma` and `socket` plugins with `fp()`.
3. **Added `fastify-type-provider-zod@2`** — pinned to v2 because v4+ needs Fastify 5. Routes now declare Zod schemas inline and they drive both validation **and** the OpenAPI doc.
4. **M1 (PR #2)** — register/login (argon2 + JWT), party lifecycle, teams, players. `party:state` broadcasts via `app.broadcastPartyState(partyId)` (no-op when sockets disabled in tests).
5. **Providers (PR #3)** — abstracted trivia + AI behind `apps/api/src/config/providers.ts`. Trivia = Open Trivia DB (free, rate-limited 1/5s, chunked). AI = `disabled` placeholder (user explicitly said "defer Ollama and anything with extra deps"). Provider tests exposed an infinite-loop bug in the trivia fetch (empty response → kept looping) — caught and fixed before live use.
6. **M2 foundation (PR #4)** — `Round` state machine (`PENDING → ACTIVE → COMPLETED / SKIPPED`), `POST /rounds/:id/{start,end,skip,score}`, leaderboard with ranked ties. New `app.emitToParty(partyId, event, payload)` helper.
7. **Trivia engine (PR #5)** — first engine. `TriviaRoundRunner` class. Server-side `setTimeout` per question, time bonus, streak bonus, auto-end via `onCompleted`. Tests use a custom manual fake clock for deterministic ticks.
8. **Stacked-PR pitfall (PR #6)** — PR #5 was merged into PR #4's branch (not main), so the trivia code never propagated. Fix: forward-merge PR. **Lesson: retarget stacked PRs to main as soon as the base merges.**
9. **Charades engine (PR #7, current)** — turn-based, host-judged. Subscribes sockets to team rooms so the phrase stays private. Generalised `handleAnswer` → `handleEvent(type, input)` (tiny refactor that unlocks Charades / Taboo / custom).
10. **Per-game config schemas + content filters (still on PR #7)** — Zod schemas per game in `apps/api/src/games/<slug>/config.ts`. Validated at queue time; out-of-range or `difficultyMin > Max` returns 400. Factories now filter `Prompt.findMany` by `tags hasSome categories` and difficulty range.

---

## 7. Known limitations (intentional for MVP)

1. **No mid-round engine persistence** — server restart kills the round. Host force-ends to recover.
2. **No prompt dedup across rounds in the same party** — the same trivia question / charades phrase could appear twice in one night.
3. **Phrase pool is shared across teams in Charades** — if the seed content is smaller than `phrasesPerTurn × numTeams`, teams will see overlapping phrases within the same round. Documented inline.
4. **Per-game config in Swagger is opaque** — the request body is still `Record<string, unknown>` in the OpenAPI doc. Validation happens server-side via the engine's `configSchema`. A future PR could use `oneOf + discriminator` on `gameSlug` to make it visible in `/docs`.
5. **Email / push / storage / error-tracking providers** aren't wired yet — interfaces deferred until M4 when something actually needs them.
6. **No live integration tests against a real DB.** The 135-test suite mocks Prisma everywhere. Adding `apps/api/tests/integration/*.test.ts` gated on `INTEGRATION_TEST_DATABASE_URL` is a fine future addition.

---

## 8. PR / git workflow conventions

- **One feature = one PR**, branched off `main`.
- **Branch naming**: `feat/m{N}-<slug>` for milestones, `chore/<slug>` for cleanups, `fix/<slug>` for bug fixes.
- **PR body** uses a HEREDOC with structured sections: Summary, What's new, Tests, Live-verified, Reviewer notes, Test plan. See PR #7 for the canonical example.
- **Co-author trailer** on every commit: include a `Co-Authored-By:` trailer identifying the agent that produced the commit.
- **Force-push** only with `--force-with-lease`. Never `--force`.
- **Stacked PRs**: avoid when possible. If you stack, **retarget the child PR to `main` the moment the parent merges**, or you'll get the "merged into the branch, not main" pitfall (we hit it once and had to open a forward-merge PR).
- **Never push to main directly.** Always via PR.

---

## 9. Running it locally

See `apps/api/README.md` §7 for the canonical local-dev steps. Quick reference:

```bash
docker start games-night-postgres || docker run --name games-night-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
cp apps/api/.env.example apps/api/.env   # fill in DATABASE_URL + JWT_SECRET (32+ chars)
npm install
npm run prisma:migrate --workspace @games-night/api
npm run db:seed --workspace @games-night/api          # fetches 100 trivia Qs from Open Trivia DB
# OR for no-network: npm run db:seed:offline --workspace @games-night/api
npm run dev:api                                      # http://localhost:3000  ·  /docs  ·  /socket.io
npm run test:api                                     # 135 tests, ~1.3s
npm run build:api                                    # tsc, no emit warnings
```

Useful: `npm run smoke:docs` boots the app with a stub Prisma and verifies `/docs/` + the OpenAPI JSON. No live DB needed.

---

## 10. Files to know

| Path | Purpose |
|---|---|
| `apps/api/src/app.ts` | Fastify wiring (security, swagger, plugins, routes) |
| `apps/api/src/config/env.ts` | Zod-validated environment |
| `apps/api/src/config/providers.ts` | Single source of truth for external-dep selection |
| `apps/api/src/lib/scoring.ts` | Unified "Party Points" formula |
| `apps/api/src/lib/round-state.ts` | Pure state-machine guards + leaderboard tally |
| `apps/api/src/games/types.ts` | `GameEngineFactory` / `RoundRunner` / `EngineClock` interfaces |
| `apps/api/src/games/registry.ts` | slug → factory + roundId → live runner |
| `apps/api/src/games/<slug>/runner.ts` | Engine class + factory export |
| `apps/api/src/games/<slug>/config.ts` | Per-game Zod config schema (in flight on PR #7) |
| `apps/api/src/plugins/games.ts` | Decorates `app.games` + builds engine deps |
| `apps/api/src/plugins/socket.ts` | Socket.IO setup + `emitToParty` / `broadcastPartyState` helpers |
| `apps/api/src/modules/<area>/<area>.routes.ts` | All HTTP routes (rounds, parties, teams, players, auth, leaderboard, health) |
| `apps/api/prisma/schema.prisma` | Domain model — read it before any DB work |
| `apps/api/prisma/seeds/` | `games.ts` (GameDefinitions) + `prompts.ts` (provider + JSON) |
| `apps/api/data/*.seed.json` | Static charades + taboo starter content (expand freely) |
| `apps/api/tests/helpers/mockPrisma.ts` | Mock Prisma factory. Extend when using new model methods. |
| `apps/api/tests/games/<slug>.test.ts` | Engine tests with the manual fake-clock pattern |

---

## 11. Open questions / decisions waiting on the user

- **Content sourcing strategy for production.** Free Open Trivia DB seed works for dev but is licensed CC-BY-SA. The Trivia API has a paid commercial tier; Kaggle bulk imports are another option. Taboo is the trickiest — Hasbro owns the trademark, so AI-generation + curation is probably the play.
- **Mobile client repo location** — separate. The user is building a React Native app. Backend should generate a typed TypeScript client from `/docs/json` for the client repo to consume.
- **Push notifications** — backend prep deferred to M4. Will need a `DeviceToken` model + push provider abstraction.
- **OTP / passwordless auth** — better for mobile than passwords. Probably M4.

---

## 12. Where to find the monetisation thinking

In `apps/api/README.md` §9. **Principle: never paywall the ability to run a basic games night.** Monetise depth (premium packs, themed AI generation), B2B (workplaces tier), and a creator marketplace (later). The provider abstraction is partly there to make swapping to paid trivia / AI a one-line env change when revenue justifies it.

---

## 13. If you're about to start work in a new session

1. `git checkout main && git pull`
2. `npm install && npm run test:api` → expect ≥ 135 green
3. Check `gh pr list` to see what's open
4. Read this file + root `README.md` + `apps/api/README.md`
5. Pick the next item from §2 ("What's next") or ask the user
6. Branch from main, work, test, commit, push, open PR

You're caught up.
