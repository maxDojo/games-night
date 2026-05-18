# API Contract Audit

Date: 2026-05-18
Branch: `codex/api-contract-audit`

## Scope

This audit covers the API surface needed before rebuilding the mobile client:

- REST routes exposed through `/docs/json`
- generated OpenAPI request/response clarity
- per-game round config discoverability
- Socket.IO client/server event contracts
- contract-test gaps

## Verification

Commands run:

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm smoke:docs
```

Result:

- `/docs/json` returns 200.
- `/docs/` returns 200.
- `/v1/health` returns 200.
- OpenAPI currently exposes 19 paths.

Note: the first `pnpm smoke:docs` attempt failed in the sandbox because `tsx` could not create its IPC pipe. Rerunning outside the sandbox passed after `pnpm prisma:generate`.

## REST Contract Inventory

Current OpenAPI paths:

- `GET /v1/health`
- `GET /v1/ready`
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/parties`
- `GET /v1/parties/{joinCode}`
- `GET /v1/parties/{joinCode}/teams`
- `POST /v1/parties/{joinCode}/teams`
- `PATCH /v1/teams/{teamId}`
- `DELETE /v1/teams/{teamId}`
- `POST /v1/teams/{teamId}/players`
- `DELETE /v1/players/{playerId}`
- `GET /v1/parties/{joinCode}/rounds`
- `POST /v1/parties/{joinCode}/rounds`
- `POST /v1/rounds/{roundId}/start`
- `POST /v1/rounds/{roundId}/end`
- `POST /v1/rounds/{roundId}/skip`
- `POST /v1/rounds/{roundId}/score`
- `GET /v1/plans`
- `POST /v1/plans`
- `PUT /v1/plans/{planId}`
- `POST /v1/parties/{joinCode}/plans/{planId}/apply`
- `GET /v1/parties/{joinCode}/leaderboard`

The path count printed by `smoke:docs` is 19 because each path can contain multiple methods.

## Findings

### P1: Mobile Cannot Discover Game Definitions

There is no REST endpoint for the client to list available games, default configs, display names, or config metadata.

Evidence:

- `GameDefinition` is used by round and plan creation.
- `POST /v1/parties/{joinCode}/rounds` accepts `gameSlug`.
- `POST /v1/plans` accepts plan rounds with `gameSlug`.
- No `GET /v1/games` or equivalent route exists.

Impact:

Mobile would need to hard-code Trivia / Charades / Taboo metadata, default config fields, and allowed game slugs. That creates avoidable drift.

Recommended task:

- Add a public `GET /v1/games` endpoint returning at least `slug`, `name`, `type`, and `defaultConfig`.
- Consider returning mobile-friendly config metadata in a later task if OpenAPI alone is not enough for dynamic forms.

### P1: Per-Game Config OpenAPI Is Too Generic

Round and plan creation validate per-game configs server-side, but OpenAPI exposes config as a generic object.

Generated schema evidence for `POST /v1/parties/{joinCode}/rounds`:

```json
{
  "gameSlug": { "type": "string" },
  "config": { "type": "object", "additionalProperties": {} }
}
```

Generated schema evidence for `POST /v1/plans`:

```json
{
  "rounds": [
    {
      "gameSlug": { "type": "string" },
      "config": { "type": "object", "additionalProperties": {} }
    }
  ]
}
```

Impact:

A generated TypeScript client will not know which config fields are valid for Trivia, Charades, or Taboo. Mobile form code would still be hand-authored and easy to drift from backend validation.

Recommended task:

- Expose discriminated request types for queueing rounds and saving plans, or add explicit schema references that generated clients can consume.
- Keep the existing game config Zod schemas as the source of truth.

### P1: Socket.IO Events Are Not a Typed Contract

Socket events are currently documented in comments and emitted through stringly typed helpers:

- `emitToParty(partyId, event: string, payload: unknown)`
- `EngineDeps.emit(target, event, payload)`
- socket handlers accept loose `unknown` payloads and silently ignore many invalid events.

Impact:

Mobile will depend on sockets for live gameplay, but there is no compile-time contract for event names, payloads, privacy scope, or expected client behavior.

Recommended task:

- Add shared TypeScript types for client-to-server and server-to-client socket events.
- Use those types in socket handlers and engine emitters where practical.
- Add validation at the socket boundary for externally supplied events.

### P1: Some Socket Events Have Inconsistent Payload Shapes

Specific inconsistencies:

- `party:state`
  - `party:join` emits `{ partyId, status }`.
  - `broadcastPartyState` emits the full party with teams and players.
- `round:started`
  - route emits `{ roundId, order, config, startedAt }`.
  - socket comment says `{ roundId, gameSlug, config }`.
  - mobile will need `gameSlug` to choose the right active-round UI.
- `prompt:next`
  - Trivia emits a public question payload.
  - Charades emits a private phrase payload.
  - Taboo emits a private card payload.
  - No discriminant identifies the game/prompt kind.
- `score:updated`
  - Manual score writes emit `{ roundId, teamId, points }`.
  - Trivia emits running total plus answer details.
  - Charades/Taboo emit deltas/reasons during turns.
- `turn:ended`
  - Charades emits `correct`, `skips`, `turnPoints`, `totalPoints`.
  - Taboo adds `taboos`.

Impact:

Mobile must either use broad `any` handlers or infer event shape from current screen state. Both are fragile during reconnects and background/foreground transitions.

Recommended task:

- Standardize core event envelopes with `roundId`, `gameSlug`, and an event-specific payload.
- Either split game-specific prompt events or add a discriminant such as `kind: 'trivia-question' | 'charades-phrase' | 'taboo-card'`.

### P2: Error Envelopes Are Not Fully Unified

REST mostly returns `{ error: string }`, but validation errors return `{ error: 'ValidationError', issues }`. Socket errors use `{ message: string }`.

Impact:

Mobile will need separate error parsing for REST validation, REST domain errors, and socket errors.

Recommended task:

- Define a shared error envelope for REST and a matching socket error payload.
- Keep validation detail, but make the top-level shape predictable.

### P2: Optional Auth Is Not Clear in OpenAPI

`POST /v1/teams/{teamId}/players` supports anonymous join and optional Bearer auth, but its OpenAPI security declaration lists bearer auth.

Impact:

Generated clients and mobile developers may treat auth as required when it is intentionally optional.

Recommended task:

- Adjust or document optional-auth semantics for this endpoint.

### P2: Contract Tests Are Too Shallow

`pnpm smoke:docs` confirms docs are served and lists paths, but does not assert:

- key request schemas remain typed enough for generation
- generated clients compile
- socket event types match emitters
- game config schemas are represented in generated output

Recommended task:

- Add OpenAPI contract tests for key endpoints.
- Add a client generation compile check once the generator is selected.
- Add socket payload type tests or compile-time assertions.

## Recommended Next Task Sequence

1. Add `GET /v1/games` so clients can discover game definitions.
2. Improve per-game config OpenAPI for round queueing and saved plans.
3. Introduce shared Socket.IO event types and standard event envelopes.
4. Add contract tests around OpenAPI output and generated client compilation.
5. Add mobile integration notes after the contract is stable.

## Non-Goals For This Audit

- No API behavior changes.
- No generated client added yet.
- No socket event names changed yet.
- No mobile app scaffold created.
