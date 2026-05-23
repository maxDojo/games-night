# AGENTS.md - project context for AI coding agents

> **What this file is.** A primer for any AI coding agent (Codex, Cursor, Aider, Claude Code, etc.) working on this repo, so the agent does not have to be re-briefed from scratch. Follows the [agents.md](https://agents.md) cross-tool convention.
>
> **Audience.** Coding agents. The human user already knows this stuff.
>
> **Companion file.** There is currently no root `CLAUDE.md` in the repo. If one is reintroduced, keep it in sync with this file.

---

## 1. What this app is (60 seconds)

Backend API for a **multi-team party games night app**. A host on a phone creates a Party (gets a short join-code), 2-8 teams of up to 10 players each join, and they play rounds of **Trivia / Charades / Taboo / custom games**. Real-time over Socket.IO. Unified **"Party Points"** scoring keeps different game types comparable on one leaderboard.

The current repo is an **API-first pnpm monorepo** with a rebuilt Expo mobile app shell. The backend lives in `apps/api`; the mobile app lives in `apps/mobile` and currently covers the agreed host/player shell, local session persistence, API contract wiring, and placeholder screens for the next mobile milestones. `apps/web` may exist as an empty placeholder, but no web app is currently shipped.

---

## 2. Project lanes and state of play

Keep milestones and task lists separated by project. The current shipped work is mostly API work; web and mobile lanes are intentionally light until the user defines them.

### Repo-wide

| Milestone      | What                                              | Status |
| -------------- | ------------------------------------------------- | ------ |
| **Repo shape** | pnpm monorepo conversion; exploratory mobile scaffold removed, Expo mobile shell rebuilt | Done   |

### API (`apps/api`)

#### API milestones

| Milestone                                  | What                                                                                  | Status |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ------ |
| **M0** Bootstrap                           | Fastify + TS scaffold, Prisma schema, Socket.IO, scoring engine, Swagger              | Done   |
| **M1** Auth + party lifecycle              | register/login, parties, teams, players, `party:state` broadcasts                     | Done   |
| **M1.5** Provider abstraction              | Open Trivia DB + AI(disabled) seam, free defaults, idempotent seed pipeline           | Done   |
| **M2 foundation**                          | Round state machine, manual scoring, leaderboard, `emitToParty`                       | Done   |
| **M2 Trivia engine**                       | Server-side timer, time bonus, streak bonus, auto-end                                 | Done   |
| **M2 Charades engine**                     | Turn-based host-judged phrase play, team-private phrase emission                      | Done   |
| **M2 config/content filters**              | Per-game Zod config schemas, categories, difficulty filters                           | Done   |
| **M2 Taboo engine**                        | Turn-based clue play, forbidden-word penalties, challenger flow                       | Done   |
| **Host planning**                          | Saved party plans and reusable round queues via `PartyPlan` / `PartyPlanItem`         | Done   |
| **API Client Contract + Mobile Readiness** | REST/socket contract hardening, generated client guardrails, mobile integration notes | Done   |
| **Operational Polish**                     | CI, coverage, integration checks, deploy readiness, production seams                  | Next   |
| **Persistent Teams + Mobile Host Controls** | API support for reusable teams/period leaderboards, host-only prompts, point overrides | Planned |
| **Custom Games + Score Audit**             | Host-defined games, manual scoring workflows, correction history, dispute support     | Planned |
| **Venue Controls + Display Modes**         | Optional location verification, team capacity limits, player-phone trivia display     | Planned |
| **Room Identity + Theming**                | Host/period/party names, cover photos, inherited theme resolution, safe palettes      | Planned |

#### API feature backlog

- **Custom Games** - promoted back into the main roadmap after real games-night observation. The product needs host-defined games to cover common local/manual games such as word scramble, improvised Taboo variants, lounge-specific challenges, and other games the room already plays.

#### API task list

- **API Client Contract + Mobile Readiness** - done
  - Done: audit current REST/OpenAPI/socket contract gaps.
  - Done: add public `GET /v1/games` for game discovery.
  - Done: expose typed built-in game config alternatives in OpenAPI.
  - Done: introduce shared Socket.IO event types and payload validation.
  - Done: generate TypeScript API types from `/docs/json` and compile a usage fixture.
  - Done: write mobile integration notes in `docs/mobile-integration.md`.
- **Operational Polish** - next
  - Done: add CI guardrails for `pnpm test:api`, `pnpm build:api`, `pnpm smoke:docs`, and `pnpm api-client:check`.
  - Done: add Vitest coverage tooling and a `test:api:coverage` script.
  - Done: establish initial coverage baseline before setting hard thresholds.
    - Baseline: 88.15% statements/lines, 83.16% branches, 87.5% functions.
  - Done: add optional real-Postgres integration test support gated on `INTEGRATION_TEST_DATABASE_URL`.
  - Done: add a first integration slice covering readiness plus party/team/player lifecycle.
  - Done: review deployment readiness for `Dockerfile`, `fly.toml`, runtime env vars, and Prisma migrate/deploy flow.
  - Done: add an error-tracking provider seam; defer a concrete Sentry implementation until deploy/runtime needs are clearer.
  - Decide whether OTP/passwordless auth belongs before or after the first rebuilt mobile scaffold.
- **Persistent Teams + Mobile Host Controls** - planned
  - Done: spec the API/mobile contract direction for persistent periods, capacity-aware teams, check-in, score audit, custom games, venue controls, and trivia display modes in `docs/mobile-integration.md`.
  - Spec the product model for persistent host-owned periods, such as event, season, league, weekend, or trip.
  - Add a persistent container above `Party` so a host can group multiple parties under one scoring period.
  - Allow teams to belong either to a single party or to the persistent container.
  - Add player team check-in for persistent teams without requiring durable individual identity.
  - Add host-configurable team capacity limits so full teams cannot keep accumulating extra check-ins.
  - Add host override flows for moving players or allowing exceptions.
  - Add leaderboard aggregation modes: current party only and persistent period.
  - Review `Round.config` and scoring inputs so the host can set points per round/game from mobile.
  - Change Charades and Taboo private prompt delivery so prompts/forbidden words are host-control-device only, not team-room broadcasts.
  - Update REST/OpenAPI/socket contracts and mobile integration notes for the new flows.
  - Add integration coverage for persistent team check-in and period leaderboard aggregation.
- **Custom Games + Score Audit** - planned
  - Done: capture the planned mobile/API contract shape in `docs/mobile-integration.md`.
  - Keep Trivia, Charades, and Taboo as polished first-class built-ins rather than narrowing the product to Trivia-only.
  - Define a generic custom-game model for host-authored games with name, rules, scoring mode, default points, penalties, and optional timer.
  - Support reusable custom-game templates that can be saved in plans and queued like built-in games.
  - Treat document/JSON-style game packs as a later extension for content/rules templates, not as a replacement for built-in engine behavior until custom-game patterns are proven.
  - Add manual score events with team identity, point delta, reason, and actor.
  - Add correction history so wrong awards can be reversed or amended without losing auditability.
  - Add dispute-friendly host UI affordances: visible score log, correction reason, and clear team color/icon/name display to avoid similar-name mistakes.
  - Keep individual player identity optional; scoring remains team-first by default.
  - Add tests for custom-game queueing, scoring, correction history, and leaderboard aggregation.
- **Venue Controls + Display Modes** - planned
  - Done: capture the planned mobile/API contract shape in `docs/mobile-integration.md`.
  - Add optional location verification for party join/check-in. It should be host-enabled, radius-based, and include host override for bad indoor GPS.
  - Store minimal join/check-in verification status, not continuous player tracking.
  - Add trivia display mode settings: `shared_screen_only`, `player_devices`, and `both`.
  - Ensure player-device trivia payloads include question text/options only when the display mode allows it.
  - Keep shared screen/cast mode useful for lounges with multiple TVs, while preserving host-only secrecy for Charades and Taboo prompts.
  - Add tests for team capacity enforcement, location-gated check-in decisions, and trivia display payload gating.
- **Room Identity + Theming** - planned
  - Done: capture the planned mobile/API contract shape in `docs/mobile-integration.md`.
  - Add host/period/party theme profiles with display name, cover image, optional avatar/logo, accent color, and derived safe palette.
  - Resolve active theme by inheritance: party -> period -> host -> system default.
  - Add a storage/provider path for cover images when uploads are implemented.
  - Keep text contrast and gameplay clarity enforced regardless of uploaded theme assets.
- **Housekeeping** - deferred follow-up bucket
  - Add mid-round persistence or a `Round.events` audit log so active rounds can recover after restart.
  - Add prompt/card deduplication across rounds in the same party/night.
  - Expand prompt pool reservation so small Charades/Taboo seed sets do not overlap heavily across teams.
  - Add rich mobile config-form metadata if generated OpenAPI types are not enough for the mobile UI.
  - Decide production content sourcing for Trivia and Taboo-style cards.
  - Add email, push, storage, and concrete error-tracking provider implementations when product flows require them.
  - Normalize REST and socket error envelopes if client error handling becomes repetitive.

### Web (`apps/web`)

#### Web milestones

- No web milestones defined yet.

#### Web task list

- Await user direction before adding web tasks.

### Mobile (`apps/mobile`)

#### Mobile milestones

- Selected visual direction: arcade-first, saturated, playful. Current design reference: `/Users/adodojo/Documents/Games_night_mob.pen`.

| Milestone | What | Status |
| --------- | ---- | ------ |
| **Mobile M0** App shell + API contract | Recreate mobile app shell, generated API client usage, Socket.IO lifecycle, host/player mode routing, local session persistence | Done |
| **Mobile M1** Player join/check-in | Join by code, choose/check into team, capacity-aware check-in, optional location verification prompt, view party status without live standings, answer Trivia when active | In progress |
| **Mobile M2** Host party control | Host auth/session, create party, create/select teams, queue rounds, configure points, start/end/skip rounds, manual score adjustments, special bonuses, score log/corrections, score reveal | Planned |
| **Mobile M3** Host game control screens | Trivia status/control, host-only Charades prompt display, host-only Taboo card/forbidden-word display, correct/skip/taboo/challenge controls | Planned |
| **Mobile M4** Persistent teams + period leaderboard | Create/select persistent period, reuse teams across parties, player team check-in, capacity limits, aggregate leaderboard across the period | Planned |
| **Mobile M5** Custom games + venue display | Create/queue custom games, manual scoring controls, correction history, shared-screen/player-phone trivia display choices | Planned |

#### Mobile task list

- **Mobile product contract** - agreed direction
  - Hybrid model: host controls setup and moderation; players use lightweight screens for check-in, party status, Trivia answers, and a post-reveal score report.
  - Host can choose whether teams and leaderboard are one-night only or persistent for a defined period.
  - Player devices should not show live team totals by default; the host controls a big reveal, after which players can view score history and verify accuracy.
  - Persistent player participation is team-based: players check into a team, but the product does not need durable individual identity.
  - Charades and Taboo prompts/forbidden words are host-device only. The host may hand their phone to the active player; other team/player devices should not receive those private prompts.
  - Host can modify point values per round/game from their phone before or during round setup.
  - Host can award special bonuses, such as best dressed or most vibrant, as auditable score events.
  - Team capacity limits are host-controlled so one team cannot inflate scores through extra check-ins.
  - Optional location verification can gate join/check-in for venue-only play, but must include host override because indoor GPS is unreliable.
  - Trivia can display questions on shared screens, player phones, or both depending on host setting and venue screen availability.
  - Custom games are a major product path, not a distant add-on, because real games nights often use local/manual games.
  - Score corrections and audit trails are first-class because manual scorekeeping causes wrong awards and disputes.
  - Host/period/party theming should let a host brand the room, for example `Greg's House`, with a cover photo and safe generated palette.
  - Basic games-night hosting remains free; monetisation should target depth, content, organizations, or marketplace features later.
- **Mobile M0** - done
  - Done: choose Expo/React Native in `apps/mobile`.
  - Done: create app shell and navigation split for host/player modes.
  - Done: wire generated API type usage and Socket.IO lifecycle helper.
  - Done: define a local `ThemeProfile` UI type so the arcade-first design is tokenized instead of hardcoded.
  - Done: add local secure session persistence for host token, join code, team selection, and last party.
  - Done: add placeholder screens for the agreed M1-M5 flows.
  - Done: add local stateful shell flows for capacity-aware player check-in, hidden player scores, host bonus award, host score reveal, and post-reveal score reporting.
  - Done: verify the shell on Android emulator with Expo Go, including player check-in guard, player answer flow, host lobby controls, hidden player scores, score reveal, and bottom-nav spacing.
- **Mobile M1** - in progress
  - **M1.1 API-backed join by code** - done
    - Done: replace local mock join flow with API calls.
    - Done: validate the party code against the backend.
    - Done: show party theme/name/status from backend data.
  - **M1.2 Team selection + capacity-aware check-in** - done
    - Done: fetch teams for the selected party.
    - Done: show team capacity states clearly, including full/disabled teams.
    - Done: check the player into the selected team.
    - Done: persist local player/session context after successful check-in.
  - **M1.3 Player party status without live scores** - done
    - Done: show current and next round state from public rounds plus socket updates.
    - Done: hide leaderboard and team point totals until host reveal.
    - Done: show the player's team identity plus waiting/current game context.
  - **M1.4 Trivia answer path** - done
    - Done: receive active Trivia question state from socket `prompt:next`.
    - Done: submit answers to the backend through `round:event`.
    - Done: show submitted/locked answer state.
    - Done: avoid exposing live scoring details on player devices.
    - Follow-up: backend/mobile currently do not replay the active Trivia question to a player who reconnects after `prompt:next`; they receive the next question instead.
  - **M1.5 Optional location verification placeholder** - done
    - Done: add the UI request path for venue-only join/check-in when future party settings require it.
    - Done: show failed-check and host-override placeholder states without continuous player tracking.
    - Done: keep backend enforcement, real device location capture, and host override persistence for a later API-backed slice.
  - Recommended first implementation PR: combine M1.1 and M1.2 as one vertical slice covering join code, party lookup, team list, and player check-in.

### Cross-project coordination

- Keep API, web, and mobile milestones/task lists separate in this file.
- When work spans projects, record the project-specific parts under each relevant lane and only put shared repo mechanics under Repo-wide.
- Work from agreed phases/trees for API, mobile, and web. Plan phases with the user, then record the agreed milestones and task lists in this file before executing substantial work.
- Progress through each project's agreed plan in sequence unless the user explicitly reprioritizes.
- For each milestone, agree on a concrete task list before implementation. Each task should have a descriptive branch name and, when ready, a descriptive PR.

### What's in flight

No active in-repo feature work is assumed from this file. The next direction should come from the user unless a task is already explicit in the current conversation.

---

## 3. Tech stack (locked-in choices)

| Layer           | Choice                      | Why locked-in                                                                  |
| --------------- | --------------------------- | ------------------------------------------------------------------------------ |
| Runtime         | **Node.js 20 + TypeScript** | User answered this at bootstrap.                                               |
| Package manager | **pnpm 10.x workspaces**    | Current monorepo standard. Use pnpm scripts by default.                        |
| HTTP            | **Fastify 4**               | Lean, plugin model fits modular games. Not Fastify 5 (see version pins).       |
| Realtime        | **Socket.IO**               | Rooms map cleanly to parties; auto-reconnect.                                  |
| DB              | **PostgreSQL**              | Local Docker in dev, Neon planned for prod.                                    |
| ORM             | **Prisma 5.x**              | Type-safe queries, first-class migrations.                                     |
| Validation      | **Zod**                     | Drives both runtime validation and OpenAPI via `fastify-type-provider-zod@^2`. |
| Auth            | `@fastify/jwt` + `argon2`   | Hosts authed; players can be anonymous.                                        |
| Hosting         | **Fly.io** (planned)        | WebSockets work, multi-region, free tier.                                      |

### Version pins to remember

- `fastify-type-provider-zod@^2.1.0` - not 4+, which requires Fastify 5. Do not bump without bumping Fastify.
- `@fastify/swagger@^8` - same reason.
- Prisma 5.x. v7 is available but no need to upgrade.
- Root `package.json` pins `packageManager: pnpm@10.12.1` and allowlists build scripts for Prisma, argon2, and esbuild under `pnpm.onlyBuiltDependencies`.

---

## 4. Conventions that show up everywhere

### Routes

- Every route module exports `FastifyPluginAsyncZod` and declares schemas inline:
  ```ts
  app.post('/foo', { schema: { body, response, ... } }, handler)
  ```
- Schemas are **Zod**, never hand-written JSON Schema. The type provider turns them into the OpenAPI doc.
- Authenticated endpoints use `preHandler: [app.authenticate]`.
- Validation errors return `400 { error: 'ValidationError', issues }` via the global `setErrorHandler`.

### Plugins

- Anything that decorates `app.*` is wrapped with `fastify-plugin` so the decorator escapes encapsulation. Without `fp()`, the decoration is invisible to sibling-scope routes.
- Plugins that need to be testable (for example `prisma`, `socket`) accept options so tests can inject mocks or disable side effects.

### Tests

- **vitest** + Fastify's `app.inject()` (no supertest).
- Mock Prisma via `apps/api/tests/helpers/mockPrisma.ts`. Extend it whenever you use a new model method.
- Game engines use a **custom manual fake clock** (not `vi.useFakeTimers`) - see `apps/api/tests/games/trivia.test.ts` for the pattern. It gives precise tick control.
- Route tests usually build the app with mock prisma + `disableSockets: true`, close it in `afterAll`, and reset mocks in `beforeEach`.
- Current API test suite is 160 tests.

### Providers

- Every external dependency goes through `apps/api/src/config/providers.ts`. Defaults should be free / zero-dep.
- Currently wired: `trivia` (Open Trivia DB), `ai` (disabled), and `errors` (disabled). Future: `email`, `push`, `storage`, and concrete provider implementations.
- Documented in `apps/api/README.md` section 6. Adding a new domain is a 3-step process documented in `apps/api/src/config/providers.ts`.

### Game engines

- Per-game module under `apps/api/src/games/<slug>/`:
  - `runner.ts` - `RoundRunner` class implementing `start() / handleEvent(type, input) / abort()`
  - `config.ts` - Zod schema for the game's config
  - Factory exported at the bottom of `runner.ts` (`triviaEngine`, `charadesEngine`, `tabooEngine`)
- Registered in `apps/api/src/plugins/games.ts`.
- Engines are **per-round** and **in-memory** (no mid-round persistence).
- `EngineClock` is injected so tests drive timers deterministically.

### Scoring

- The unified formula lives in `apps/api/src/lib/scoring.ts -> scoreEvent()`:
  ```text
  points = basePoints x difficultyMultiplier x (1 + timeBonus) + streakBonus - penalties
  ```
- Charades uses `correctCount x base - skips x penalty`, clamped at 0.
- Taboo uses `correctCount x base - skips x skipPenalty - taboo/challenge penalties`, clamped at 0.
- See `apps/api/README.md` section 4 for the canonical writeup.

---

## 5. Important architectural decisions and why

| Decision                                                      | Why                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anonymous players are first-class**                         | The use case is a games night with acquaintances, not a sign-up funnel. Players can join with just a nickname; an optional JWT links them to a User.                                                                       |
| **Hosts have unilateral authority**                           | Only the host creates teams, queues rounds, force-ends rounds, saves/applies plans, and overrides scores. Players have no admin powers. Matches the "one person on their phone runs the night" model.                      |
| **Engines are in-memory**                                     | Server restart mid-round = stuck `ACTIVE` round. Host force-ends to recover. Documented as MVP-acceptable. Persistence is a future `Round.events` audit log.                                                               |
| **`Round.config` is stored fully-resolved**                   | Defaults merge with overrides at queue time. Historical rounds stay replayable even if `GameDefinition.defaults` changes later.                                                                                            |
| **`Round` rows are the concrete party queue**                 | Saved plans are reusable templates; applying a plan appends concrete `Round` rows to the target party.                                                                                                                     |
| **`PartyPlan` / `PartyPlanItem` are host-authored templates** | The host can prepare a games-night sequence on mobile and reuse it later without making the saved template itself an active party.                                                                                         |
| **One generic socket event for game actions**                 | `round:event { roundId, type, payload? }`. Trivia -> `answer`; Charades -> `correct` / `skip`; Taboo -> `correct` / `skip` / `taboo` / `challenge`. Engines branch on type. `round:answer` remains as a back-compat alias. |
| **Team rooms for private prompts**                            | `party:join` subscribes sockets to both `party:<id>` and `team:<teamId>`. Charades and Taboo can emit cards/phrases only to the acting or challenger team room.                                                            |
| **Server-side timers are authoritative**                      | Clients suggest, server decides. Otherwise leaderboards become contestable.                                                                                                                                                |
| **Provider abstraction added before M2**                      | Engines call provider interfaces, not inlined API clients. Upgrading to paid tiers later should be a config change.                                                                                                        |
| **First-answer-per-team locking (Trivia)**                    | Otherwise teammates could spam answers. Server timestamps the first answer; later answers from the same team are ignored.                                                                                                  |
| **Only valid teams can drive turn actions**                   | Charades accepts correct/skip only from the acting team. Taboo adds opposing-team challenge/forbidden-word flows where appropriate.                                                                                        |
| **Team scoring takes precedence over individual scoring**     | Real games-night observation confirmed people cared about teams first. Individual identity should stay optional; check-ins only need to attach participation to a team.                                                     |
| **Custom games are a core product path**                      | Real hosts play local/manual games such as word scramble and house-rule variants. The app must support host-defined games rather than only built-in engines.                                                               |
| **Score history matters because disputes are part of play**   | Manual scoring caused a wrong team award and heated arguments. The product should preserve banter while making point changes auditable and correctable.                                                                    |
| **Shared screens are useful but not guaranteed**              | Lounge screens helped for Kahoot-style trivia, but player-phone question display should be available when screens are down, distant, or not usable.                                                                        |

---

## 6. The story so far (chronological, with rationale)

> Explains why some weird-looking things exist.

1. **Original bootstrap** - scaffold, schema, scoring engine, Swagger. User picked Fastify + Postgres + Fly.io.
2. **Plugin encapsulation fix** - decorators were silently scoped. `prisma` and `socket` plugins are wrapped with `fastify-plugin`.
3. **Zod type provider pin** - `fastify-type-provider-zod@2` is pinned because v4+ needs Fastify 5. Routes declare Zod schemas inline and those schemas drive validation and OpenAPI.
4. **M1 auth + lifecycle** - register/login (argon2 + JWT), party lifecycle, teams, players. `party:state` broadcasts via `app.broadcastPartyState(partyId)` and no-ops when sockets are disabled in tests.
5. **Provider abstraction** - trivia + AI were abstracted behind `apps/api/src/config/providers.ts`. Trivia = Open Trivia DB; AI = disabled placeholder.
6. **M2 foundation** - `Round` state machine (`PENDING -> ACTIVE -> COMPLETED / SKIPPED`), round start/end/skip/score routes, leaderboard with ranked ties, and `app.emitToParty(partyId, event, payload)`.
7. **Trivia engine** - first engine. Server-side question timers, time bonus, streak bonus, auto-end via `onCompleted`.
8. **Charades engine + config schemas** - generalized `handleAnswer` into `handleEvent(type, input)`, added per-game config validation and prompt filters.
9. **Repo reset/import into fresh GitHub repo** - current public history starts with an empty `main`, then PR #1 imported the API as a pnpm monorepo.
10. **PR #1: pnpm monorepo, Taboo, saved plans** - bootstrapped the current repo shape, added the Taboo engine, and added host-saved party plans that can queue games for a night.
11. **PR #2: remove mobile scaffold** - deleted `apps/mobile` and related scripts/lockfile entries. The user intends to rebuild mobile deliberately, step by step.
12. **API client contract hardening** - added game discovery, typed OpenAPI built-in config alternatives, typed Socket.IO event contracts, generated API client types, a compile-only client usage fixture, and mobile integration notes.
13. **Games-night field notes** - observed weekly lounge play with month-long teams, manual scorekeeping errors, heated point disputes, team-first scoring, Kahoot-style phone trivia, shared screens, and many custom/manual games. This promoted persistent teams, custom games, score audit, team capacity, optional location verification, and flexible trivia display into planned work.
14. **Mobile M0 shell completed** - rebuilt `apps/mobile` as an Expo app shell with arcade-first styling, host/player mode routing, local session persistence helpers, API type import, Socket.IO client helper, placeholder screens for check-in, host controls, private prompt play, persistent teams, custom games, venue display, and theming, then verified it in Expo Go on Android.

---

## 7. Known limitations (intentional for MVP)

1. **Mobile app is shell-only** - `apps/mobile` exists, but it is not yet connected to live API flows beyond the typed client/socket helpers. Treat real host/player workflows as upcoming M1+ work.
2. **No mid-round engine persistence** - server restart kills the in-memory runner. Host force-ends to recover.
3. **No prompt dedup across rounds in the same party** - the same trivia question / charades phrase / taboo card could appear twice in one night.
4. **Prompt/card pools can overlap when seed content is small** - phrase/card pools are shared across teams unless future logic reserves used prompts.
5. **No rich mobile config-form metadata yet** - OpenAPI exposes typed built-in config alternatives, but there is no dedicated endpoint for mobile labels, control types, presets, or explanatory copy.
6. **Email / push / storage providers are not wired yet** - interfaces deferred until something actually needs them. Error tracking has a disabled provider seam, but no concrete Sentry-style implementation.
7. **No live integration tests against a real DB** - the suite mocks Prisma. Adding `apps/api/tests/integration/*.test.ts` gated on `INTEGRATION_TEST_DATABASE_URL` is a fine future addition.

---

## 8. PR / git workflow conventions

- **Never work directly on `main`**. Documentation, code, tests, and generated files should all be changed from a task branch.
- **Start every task by syncing from origin**: switch to `main`, pull updates from origin, then create the task branch.
- **One agreed task = one branch / PR by default**. A milestone can produce multiple PRs if its task list is split that way.
- **Branch naming**: use `staging/` for agent-created branches unless the user asks otherwise. Historical branches also used `codex/`, `feat/m{N}-<slug>`, `chore/<slug>`, and `fix/<slug>`.
- **Branch names should describe the task**, not just the milestone. Example: `staging/api-typed-client-generation`.
- **Create PRs only after user approval**. Complete the work, run relevant checks, summarize the result, then wait for approval before opening the PR.
- **PR body** should use structured sections: Summary, What's new, Tests, Live-verified, Reviewer notes, Test plan.
- **Co-author trailer** on every commit: include a `Co-Authored-By:` trailer identifying the agent that produced the commit.
- **Force-push** only with `--force-with-lease`. Never `--force`.
- **Stacked PRs**: avoid when possible. If you stack, retarget the child PR to `main` the moment the parent merges.
- **Never push to main directly.** Always via PR.

---

## 9. Running it locally

See `apps/api/README.md` section 7 for the canonical local-dev steps. Quick reference:

```bash
docker start games-night-postgres || docker run --name games-night-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
cp apps/api/.env.example apps/api/.env   # fill in DATABASE_URL + JWT_SECRET (32+ chars)
pnpm install
pnpm prisma:migrate
pnpm --filter @games-night/api db:seed          # fetches trivia from Open Trivia DB
# OR for no-network: pnpm db:seed:offline
pnpm dev:api                                    # http://localhost:3000  /docs  /socket.io
pnpm test:api                                   # 160 tests
pnpm test:api:integration                       # skips unless INTEGRATION_TEST_DATABASE_URL is set
pnpm build:api                                  # TypeScript build
```

Useful: `pnpm smoke:docs` boots the app with a stub Prisma and verifies `/docs/` plus the OpenAPI JSON. No live DB needed.

Mobile shell:

```bash
pnpm install
pnpm build:mobile
pnpm dev:mobile
```

---

## 10. Files to know

| Path                                           | Purpose                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `package.json`                                 | Root pnpm workspace scripts and build-script allowlist                          |
| `pnpm-workspace.yaml`                          | Workspace package globs                                                         |
| `docs/mobile-integration.md`                   | Mobile-facing API integration notes                                             |
| `apps/mobile/README.md`                        | Mobile shell scope and local run notes                                          |
| `apps/mobile/app/`                             | Expo Router routes, route layouts, redirects, and route-owned actions           |
| `apps/mobile/src/screens/`                     | Host/player placeholder screen composition                                      |
| `apps/mobile/src/components/`                  | Reusable mobile layout, navigation, game, and UI primitives                     |
| `apps/mobile/src/api/client.ts`                | Mobile API config, generated OpenAPI type usage, and Socket.IO client helper    |
| `apps/mobile/src/storage/sessionStore.ts`      | Secure local session persistence for host/player context                        |
| `apps/mobile/src/theme/`                       | Tokenized arcade-first theme profile, shared styles, and style hook             |
| `apps/api/src/app.ts`                          | Fastify wiring (security, swagger, plugins, routes)                             |
| `apps/api/src/config/env.ts`                   | Zod-validated environment                                                       |
| `apps/api/src/config/providers.ts`             | Single source of truth for external-dep selection                               |
| `apps/api/src/lib/scoring.ts`                  | Unified "Party Points" formula                                                  |
| `apps/api/src/lib/round-state.ts`              | Pure state-machine guards + leaderboard tally                                   |
| `apps/api/src/games/types.ts`                  | `GameEngineFactory` / `RoundRunner` / `EngineClock` interfaces                  |
| `apps/api/src/games/config-contracts.ts`       | OpenAPI-visible round/plan config request schemas                               |
| `apps/api/src/games/registry.ts`               | slug -> factory + roundId -> live runner                                        |
| `apps/api/src/games/<slug>/runner.ts`          | Engine class + factory export                                                   |
| `apps/api/src/games/<slug>/config.ts`          | Per-game Zod config schema                                                      |
| `apps/api/src/games/taboo/`                    | Taboo engine and config                                                         |
| `apps/api/src/plugins/games.ts`                | Decorates `app.games` + builds engine deps                                      |
| `apps/api/src/plugins/socket.ts`               | Socket.IO setup + `emitToParty` / `broadcastPartyState` helpers                 |
| `apps/api/src/sockets/contracts.ts`            | Typed Socket.IO client/server event contract                                    |
| `apps/api/src/modules/plans/plans.routes.ts`   | Saved host party plans and apply-to-party queueing                              |
| `apps/api/src/modules/<area>/<area>.routes.ts` | HTTP routes (rounds, parties, teams, players, auth, leaderboard, health)        |
| `apps/api/generated/api-types.d.ts`            | Generated OpenAPI TypeScript contract for client usage                          |
| `apps/api/prisma/schema.prisma`                | Domain model - read it before any DB work                                       |
| `apps/api/prisma/seeds/`                       | `games.ts` (GameDefinitions) + `prompts.ts` (provider + JSON)                   |
| `apps/api/data/*.seed.json`                    | Static charades + taboo starter content                                         |
| `apps/api/tests/helpers/mockPrisma.ts`         | Mock Prisma factory. Extend when using new model methods.                       |
| `apps/api/tests/games/<slug>.test.ts`          | Engine tests with the manual fake-clock pattern                                 |
| `apps/api/tests/integration/`                  | Opt-in real-Postgres integration tests gated by `INTEGRATION_TEST_DATABASE_URL` |

---

## 11. Open questions / decisions waiting on the user

- **Mobile live API wiring** - `apps/mobile` now has a verified Expo shell, but real API-backed host/player workflows remain M1+ work.
- **Content sourcing strategy for production** - free Open Trivia DB seed works for dev but is CC-BY-SA. The Trivia API has a paid commercial tier; Kaggle bulk imports are another option. Taboo-style content is trickier because of trademark/content concerns, so AI-generation + curation is probably the play.
- **Push notifications** - backend prep deferred to M4. Will need a `DeviceToken` model + push provider abstraction.
- **OTP / passwordless auth** - better for mobile than passwords. Probably M4.

---

## 12. Where to find the monetisation thinking

In `apps/api/README.md` section 9. **Principle: never paywall the ability to run a basic games night.** Monetise depth (premium packs, themed AI generation), B2B (workplaces tier), and a creator marketplace later. The provider abstraction is partly there to make swapping to paid trivia / AI a one-line env change when revenue justifies it.

---

## 13. If you're about to start work in a new session

1. `git checkout main && git pull --ff-only`
2. `pnpm install && pnpm test:api` - expect 160 green tests
3. Check open PRs on GitHub if the tooling is available
4. Read this file + `apps/api/README.md`
5. Confirm the user's current requested next step and the relevant project lane: API, mobile, or web
6. Confirm or update the agreed phase/milestone/task list in this file
7. Create a descriptive task branch from updated `main`
8. Work, test, summarize, and wait for user approval before opening a PR

You're caught up.
