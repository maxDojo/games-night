# Games Night API

Backend for Games Night, a multi-team games night app. Hosts live sessions of trivia, charades, taboo, and user-defined custom games for **2–8 teams of up to 10 players each**.

> This workspace is the backend API. The monorepo root coordinates API, web, and mobile apps.

---

## 1. Product summary

**Use case.** A group of acquaintances or colleagues out for the weekend wants to play a games night. One person hosts on their phone/laptop; everyone else joins via a short code and is sorted into teams. The app runs round-by-round games and keeps a unified leaderboard.

**Core flow.**
1. Host creates a **Party** → gets a 6-character `joinCode`.
2. Players join the party, picking/creating a **Team** (max 8 teams, 10 players each).
3. Host queues up **Rounds** of games (Trivia, Charades, Taboo, or any Custom game).
4. Server orchestrates each round in real time over **WebSockets** (timers, prompts, buzzers, scoring).
5. At the end, points are summed into a final leaderboard.

**Key differentiators.**
- **Unified "Party Points"** scoring so games of different types are comparable in the final tally.
- **Custom games** — users can author their own trivia packs, taboo decks, charades lists, and share them publicly.
- **Team-based**, not free-for-all — designed for the office-night / weekend-out social context.

---

## 2. Tech stack

| Layer        | Choice                                       | Why |
|--------------|----------------------------------------------|-----|
| Runtime      | **Node.js 20 + TypeScript**                  | Strong types, huge ecosystem, ideal for real-time. |
| HTTP         | **Fastify**                                  | Lean, very fast, plugin model fits modular game logic. |
| Realtime     | **Socket.IO**                                | Rooms/namespaces map cleanly to parties; auto-reconnect & fallbacks. |
| DB           | **PostgreSQL** (Neon in prod)                | Relational fits teams/scores/leaderboards. |
| ORM          | **Prisma**                                   | Type-safe queries + first-class migrations. |
| Auth         | `@fastify/jwt` + `argon2`                    | Standard stateless auth for the host; players can be anonymous. |
| Validation   | **Zod**                                      | Runtime + compile-time schema validation. |
| Docs         | `@fastify/swagger` → `/docs`                 | OpenAPI for client teams. |
| Hosting      | **Fly.io** (app) + **Neon** (Postgres)       | Persistent WS works, multi-region, generous free tier. |
| CI/CD        | GitHub Actions → Fly deploy                  | Simple, free for public repos. |

---

## 3. Domain model

```
User ─┬─< Party ──< Team ──< Player
      └─< CustomGame ──< Prompt
                Party ──< Round >── GameDefinition ──< Prompt
                          Round ──< Score >── Team
```

See `prisma/schema.prisma` for the full schema. Highlights:
- `Party.joinCode` is the short, shareable code players use to join.
- `Round.config` is the host-resolved config (defaults merged with overrides) so historical rounds remain replayable.
- `Score.breakdown` (JSON) records *why* a team got their points — for UI transparency and dispute resolution.

---

## 4. Scoring system ("Party Points")

Every game contributes points on the same scale so the final leaderboard is meaningful even when teams played different mixes. Implemented in `src/lib/scoring.ts`.

```
points = basePoints
       × difficultyMultiplier         // 1.0 → 2.0 across difficulty 1..5
       × (1 + timeBonus)              // 0..+50% for fast answers
       + streakBonus                  // flat add every Nth consecutive correct
       − penalties                    // skips, forbidden-word violations, wrong buzzers
```

**Defaults per built-in game:**

| Game     | Base | Time bonus | Streak | Penalties |
|----------|------|------------|--------|-----------|
| Trivia   | 100  | up to +50% by speed | +50 every 3 correct | none (wrong = 0) |
| Charades | 100 per correct guess | n/a (timer-capped) | none | −25 per skip (max 3) |
| Taboo    | 100 per correct guess | n/a | none | −50 per forbidden-word violation, −25 per skip |

**Tie-breaks (in order):** total correct → fewest penalties → coin flip.

### Per-game config

Each game's runtime behaviour is driven by a Zod-validated `config` object. Hosts pass any subset of these fields as `config` when queueing a round (`POST /v1/parties/:joinCode/rounds`); the rest fall back to defaults. Invalid values come back as `400 ValidationError` with field-level details.

**Trivia** (`src/games/trivia/config.ts`):

| Field | Type / range | Default | Notes |
|---|---|---:|---|
| `questionsPerRound` | int 1–50 | 10 | |
| `secondsPerQuestion` | int 5–300 | 20 | |
| `secondsPerReveal` | int 1–30 | 4 | pause between reveal & next |
| `basePoints` | int 1–10000 | 100 | |
| `timeBonusMaxPct` | 0–2 | 0.5 | max fractional bonus for fast answers |
| `difficultyMultiplier` | `{ "1"..."5": number }` | 1.0/1.25/1.5/1.75/2.0 | |
| `streakBonusEvery` | int 2–20 | 3 | Nth correct in a row |
| `streakBonusPoints` | int 0–10000 | 50 | flat bonus on streak milestones |
| `categories` | `string[]` | (none) | filter prompts by `Prompt.tags` overlap |
| `difficultyMin` / `difficultyMax` | int 1–5 | 1 / 5 | inclusive range; min ≤ max |

**Charades** (`src/games/charades/config.ts`):

| Field | Type / range | Default | Notes |
|---|---|---:|---|
| `secondsPerTurn` | int 5–300 | 60 | per-team turn length |
| `secondsBetweenTurns` | int 0–60 | 4 | 0 = no gap |
| `phrasesPerTurn` | int 1–50 | 20 | hand size dealt to each team |
| `basePointsPerCorrect` | int 1–10000 | 100 | |
| `skipPenalty` | int 0–10000 | 25 | deducted per skip; turn clamps at 0 |
| `maxSkipsPerTurn` | int 0–20 | 3 | further skips are no-ops |
| `categories` | `string[]` | (none) | e.g. `["movies","animals"]` |
| `difficultyMin` / `difficultyMax` | int 1–5 | 1 / 5 | |

Example — a quick "easy office-night" Trivia round:

```http
POST /v1/parties/ABCD23/rounds
Authorization: Bearer <host token>

{
  "gameSlug": "trivia",
  "config": {
    "questionsPerRound": 5,
    "secondsPerQuestion": 15,
    "categories": ["Entertainment: Film", "Entertainment: Music"],
    "difficultyMax": 3
  }
}
```

---

## 5. API surface (v0.1)

Health
- `GET  /v1/health` · `GET /v1/ready`

Auth
- `POST /v1/auth/register` — create account, returns `{ user, token }`
- `POST /v1/auth/login` — exchange credentials for a JWT

Parties
- `POST /v1/parties` 🔒 — create party (auth required, host = `req.user.sub`)
- `GET  /v1/parties/:joinCode` — fetch party + teams + players (public)

Teams
- `GET    /v1/parties/:joinCode/teams` — list teams (public)
- `POST   /v1/parties/:joinCode/teams` 🔒 — host creates a team
- `PATCH  /v1/teams/:teamId` 🔒 — host updates a team
- `DELETE /v1/teams/:teamId` 🔒 — host deletes a team

Players
- `POST   /v1/teams/:teamId/players` — join a team (anonymous; auth optional, links to user)
- `DELETE /v1/players/:playerId` 🔒 — player removes self, or host removes them

Rounds
- `GET    /v1/parties/:joinCode/rounds` — list rounds (public)
- `POST   /v1/parties/:joinCode/rounds` 🔒 — host queues a round (game slug + optional config overrides)
- `POST   /v1/rounds/:roundId/start` 🔒 — `PENDING → ACTIVE`; flips party to `IN_PROGRESS`
- `POST   /v1/rounds/:roundId/end` 🔒 — `ACTIVE → COMPLETED`; returns final scores
- `POST   /v1/rounds/:roundId/skip` 🔒 — `PENDING → SKIPPED`
- `POST   /v1/rounds/:roundId/score` 🔒 — write/overwrite a team's score (manual scoring + host override)

Leaderboard
- `GET    /v1/parties/:joinCode/leaderboard` — totals across all rounds, ranked, ties share rank

Planned (see roadmap):
- Game engines: Trivia, Charades, Taboo (consume Prompts, score via the engine, write Scores)
- `POST /v1/custom-games` · `GET /v1/custom-games?public=true`

### Socket events

Client → server:
- `party:join` `{ joinCode, playerId }` — subscribes the socket to the party room AND the player's team room
- `round:event` `{ roundId, type, payload? }` — generic game event
  - Trivia: `type: 'answer'`, `payload: { choice: string }`
  - Charades: `type: 'correct' | 'skip'` (only the acting team's players are honoured)
- `round:answer` — back-compat alias for `round:event { type: 'answer' }`

Server → clients:
- `party:state` (party room) — full lobby snapshot
- `round:started` (party room) `{ roundId, order, config, startedAt }`
- `round:ended` (party room) `{ roundId, scores: [{ teamId, points }] }`
- `prompt:next` — destination depends on game:
  - Trivia (party room): `{ promptId, questionNumber, total, question, choices, difficulty, deadlineAt }`
  - Charades (team room only): `{ promptId, teamId, phrase, category }` — keeps the phrase private
- `prompt:reveal` (party room, trivia) `{ promptId, correctAnswer, perTeam }`
- `turn:started` (party room, charades) `{ roundId, teamId, turnNumber, total, deadlineAt }`
- `turn:ended` (party room, charades) `{ roundId, teamId, correct, skips, turnPoints, totalPoints }`
- `score:updated` (party room) `{ roundId, teamId, delta, reason?, promptId? }`

---

## 6. Providers (pluggable external dependencies)

Every external dependency (content sources, AI generation, push, email, storage, error tracking) is reached through `src/config/providers.ts`. **Defaults are all free / zero-dependency.** Switching to a paid tier is a one-line env change — no code changes elsewhere.

### Currently wired

| Domain | Env var | Free default | Upgrade path |
|---|---|---|---|
| **Trivia content** | `TRIVIA_PROVIDER` | `open-trivia-db` — public CC-BY-SA API via native `fetch`, no key needed | The Trivia API (commercial), Kaggle bulk imports, licensed packs |
| **AI generation** | `AI_PROVIDER` | `disabled` — interface exists, no calls made | Anthropic / OpenAI (paid) or Ollama (free, local install) — add an impl under `src/providers/ai/` and register it |

To add new domains (e.g. `EMAIL_PROVIDER`, `PUSH_PROVIDER`, `ERROR_PROVIDER`, `STORAGE_PROVIDER`) when they're needed:

1. Create `src/providers/<domain>/{types,impl-a,impl-b,index}.ts` with an interface and a noop default.
2. Add the env var to `src/config/env.ts` (zod enum).
3. Register the factory in `src/config/providers.ts`.
4. Update this table.

### Seeding content

```bash
npm run db:seed --workspace @games-night/api            # GameDefinitions + prompts (fetches ~100 trivia Qs via provider)
npm run db:seed:prompts --workspace @games-night/api    # Prompts only (game defs already exist)
npm run db:seed:offline --workspace @games-night/api    # Skip the trivia provider - useful in CI / offline
npm run db:seed --workspace @games-night/api -- --trivia=500   # Target a specific trivia count
```

Trivia seed respects Open Trivia DB's 1-req-per-5s rate limit by chunking and back-off. Seeds are **idempotent**: re-running the script skips content that's already in the DB.

Charades and Taboo seed from static JSON under `data/`. Expand those files freely.

---

## 7. Local development

```bash
# 1. Install
npm install

# 2. Set up env
cp apps/api/.env.example apps/api/.env
# (edit DATABASE_URL and JWT_SECRET)

# 3. Run Postgres locally (or point DATABASE_URL at Neon)
# docker run --name games-night-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# 4. Migrate + seed (seed needs network for trivia; use db:seed:offline to skip)
npm run prisma:migrate --workspace @games-night/api
npm run db:seed --workspace @games-night/api

# 5. Dev server (hot reload)
npm run dev:api
# → http://localhost:3000  · docs at /docs  · socket at /socket.io
```

### Integration tests

The default API test suite uses mocked Prisma and needs no database. Real Postgres integration tests are opt-in and skipped unless `INTEGRATION_TEST_DATABASE_URL` is set.

```bash
pnpm test:api:integration

# To run against a real database:
INTEGRATION_TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/games_night_test?schema=public" pnpm prisma:deploy
INTEGRATION_TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/games_night_test?schema=public" pnpm test:api:integration
```

---

## 8. Project plan & task list

### Milestone 0 — Bootstrap *(this commit)*
- [x] Fastify + TS project skeleton
- [x] Prisma schema (User, Party, Team, Player, GameDefinition, CustomGame, Prompt, Round, Score)
- [x] Socket.IO plugin + party-room wiring stub
- [x] Scoring engine (`src/lib/scoring.ts`)
- [x] Health/readiness endpoints
- [x] Swagger docs at `/docs`
- [x] Dockerfile + `fly.toml`

### Milestone 1 — Auth & party lifecycle ✅
- [x] `POST /auth/register` + `POST /auth/login` (argon2 + JWT)
- [x] `POST /parties` requires authed host; pull `hostId` from JWT
- [x] Team CRUD (create/update/delete); enforce max 8 teams
- [x] Player join (anonymous or authed) with max 10 per team enforcement
- [x] `party:state` broadcast on every team/player mutation
- [x] Integration tests covering auth, parties, teams, players (44 tests)

### Milestone 1.5 — Provider abstraction ✅
- [x] Pluggable trivia provider (Open Trivia DB default, free)
- [x] AI provider interface with `disabled` default (real impls deferred)
- [x] Idempotent seed pipeline (`db:seed`, `db:seed:prompts`, `db:seed:offline`)
- [x] Static charades + taboo starter sets in `data/`

### Milestone 2 — Built-in games (week 3–4)
- [x] Round state machine (`PENDING → ACTIVE → COMPLETED` / `SKIPPED`)
- [x] `POST /parties/:id/rounds` / `start` / `end` / `skip` / `score` (manual scoring path)
- [x] `GET /parties/:id/leaderboard` with rank/ties
- [x] Generic `emitToParty` socket helper (`round:started`, `round:ended`, `score:updated`)
- [x] Engine registry pattern (`src/games/`) + per-round runners
- [x] Trivia engine: server-side timer, time bonus, streak bonus, first-answer-per-team locking, auto-end on last question
- [x] Charades engine: turn-based (teams act in position order), per-team timer, correct/skip buttons over sockets, max-skips guard, phrase privacy via team room
- [ ] Taboo engine: forbidden-word penalty button for the opposing team
- [ ] Expand trivia/charades/taboo seed content to ≥200 each

### Milestone 3 — Custom games (week 5)
- [ ] `POST /custom-games` + `POST /custom-games/:id/prompts`
- [ ] Public vs. private; share by slug
- [ ] Per-type payload validation (trivia/taboo/charades shapes)
- [ ] Bulk import (CSV/JSON) for trivia packs

### Milestone 4 — Polish & ops (week 6)
- [ ] Structured logs → Logtail/Better Stack
- [ ] Sentry error reporting
- [ ] Rate-limit + abuse protection on join endpoints
- [ ] CI: lint + test + Prisma generate + deploy to Fly on `main`
- [ ] Load test: 100 concurrent parties × 60 sockets each

### Milestone 5 — Stretch (post-MVP)
- [ ] Spectator mode
- [ ] Reactions / emoji during rounds
- [ ] Voice room (LiveKit) for remote-play parties
- [ ] AI-generated trivia packs (themed by group interests)
- [ ] Re-playable "party recap" page

---

## 9. Monetisation roadmap

**Principle:** never paywall the host's ability to *run a basic games night*. Monetise depth, scale, and content.

### Phase 1 — Free, build the network *(month 0–3)*
- Everything free. Goal: get to ~1,000 active hosts.
- Light brand presence ("Powered by …" in finished-party share cards).

### Phase 2 — Pro subscription *(month 3–6)*
**Games Night Pro** — ~$4.99/month or $39/year:
- Premium trivia/taboo packs (curated, themed: 90s, sports, office, NSFW, etc.)
- Unlock custom branding for company events (logo on the share card, custom colours)
- Save & re-run party templates
- Detailed stats history per player/team

### Phase 3 — One-off content & teams *(month 6–9)*
- **À-la-carte premium packs** ($1.99–$3.99 each) for users who don't want a sub.
- **Teams / Workplaces tier** (~$49/month per workspace): admin dashboard, SSO, shared private game library, post-event PDF recap — sold into HR/people-ops teams for remote-team building.

### Phase 4 — Marketplace *(month 9–12)*
- Let creators sell their own custom packs; platform takes 20–30%.
- Curated leaderboard, ratings, refunds.

### Phase 5 — Adjacencies *(year 2)*
- White-label API for bars / pub-quiz operators.
- "Party Night Box" — physical/printed companion (cards, prompts) sold via partner.
- Sponsored rounds (opt-in): "This trivia round brought to you by [brand], with a real prize."

### Not monetising
- Number of teams / players (within the 8×10 limit — that's the product).
- Hosting a basic night.
- Core game types.

---

## 10. Deployment (Fly.io + Neon)

```bash
# One-time
fly launch --no-deploy           # creates app, edit name in fly.toml
fly secrets set DATABASE_URL=... JWT_SECRET=...

# Each deploy
fly deploy
# Migrations run as a release_command (add to fly.toml when ready):
# [deploy]
#   release_command = "npx prisma migrate deploy"
```

Neon: create a project, copy the pooled connection string into `DATABASE_URL`.

---

## 11. License

TBD.
