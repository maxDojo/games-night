# Mobile Integration Notes

These notes describe how a React Native client should integrate with the current API contract.

## Contract Sources

- REST/OpenAPI source of truth:
  - Runtime docs: `GET /docs/json`
  - Generated TypeScript types: `apps/api/generated/api-types.d.ts`
  - Regenerate/check with `pnpm api-client:check`
- Socket.IO source of truth:
  - Event types: `apps/api/src/sockets/contracts.ts`
  - Client emits: `ClientToServerEvents`
  - Server emits: `ServerToClientEvents`
- Game config source of truth:
  - Public catalog: `GET /v1/games`
  - Queue/save request schemas: `apps/api/src/games/config-contracts.ts`
  - Runtime engine validation: `apps/api/src/games/<slug>/config.ts`

## Environment Setup

- Use a versioned REST base URL ending in `/v1`, for example:
  - Local simulator on the same machine: `http://localhost:3000/v1`
  - Physical device: use a LAN IP or tunnel; `localhost` points at the device, not the dev machine.
  - Production: planned Fly.io API URL plus `/v1`
- Use the same host without `/v1` for sockets, with path `/socket.io`.
- Store the host JWT in secure device storage. Do not persist anonymous player IDs as auth tokens; they are party/session identifiers.

## Auth Model

- Hosts authenticate through:
  - `POST /v1/auth/register`
  - `POST /v1/auth/login`
- Host-only REST calls require:
  - `Authorization: Bearer <token>`
- Players can join anonymously:
  - `POST /v1/teams/{teamId}/players`
  - The endpoint intentionally supports anonymous usage. If the mobile user is also authenticated, the backend can link the player to the user.
- Current limitation:
  - OpenAPI may make optional auth look stricter than the runtime behavior for anonymous player join. Treat player join as public unless the endpoint response says otherwise.

## Host Flow

- Load game catalog:
  - `GET /v1/games`
  - Use `slug`, `name`, `type`, and `defaultConfig` to build the game picker.
- Prepare a reusable game-night plan:
  - `POST /v1/plans`
  - `PUT /v1/plans/{planId}`
  - `GET /v1/plans`
- Create a live party:
  - `POST /v1/parties`
  - Share the returned `joinCode`.
- Create teams before play:
  - `POST /v1/parties/{joinCode}/teams`
  - `PATCH /v1/teams/{teamId}`
  - `DELETE /v1/teams/{teamId}`
- Queue rounds:
  - Apply a saved plan with `POST /v1/parties/{joinCode}/plans/{planId}/apply`
  - Or queue one round with `POST /v1/parties/{joinCode}/rounds`
- Run the night:
  - `POST /v1/rounds/{roundId}/start`
  - Use sockets for active gameplay.
  - `POST /v1/rounds/{roundId}/score` for manual scoring or host override.
  - `POST /v1/rounds/{roundId}/end` to force-end or complete a round.
  - `POST /v1/rounds/{roundId}/skip` to skip a pending round.

## Player Flow

- Join by code:
  - `GET /v1/parties/{joinCode}`
  - `GET /v1/parties/{joinCode}/teams`
- Join a team:
  - `POST /v1/teams/{teamId}/players`
  - Persist the returned `playerId` for reconnects during the party.
- Subscribe to live state:
  - Connect Socket.IO to the API host.
  - Emit `party:join` with `{ joinCode, playerId }`.
  - The server joins the socket to both the party room and the player's team room.

## Socket Lifecycle

- Connect once the app has a `joinCode` and `playerId`.
- Immediately emit:
  - `party:join` `{ joinCode, playerId }`
- Handle server events:
  - `party:state` - lobby snapshot with teams and players
  - `round:started` - active round metadata, including `gameSlug`
  - `prompt:next` - discriminated gameplay prompt
  - `prompt:challenge` - private Taboo challenger card
  - `prompt:reveal` - Trivia answer reveal
  - `turn:started` - Charades/Taboo turn start
  - `turn:ended` - Charades/Taboo turn summary
  - `score:updated` - live score update
  - `round:ended` - final round scores
  - `error` - socket validation/domain error
- On reconnect:
  - Re-emit `party:join`.
  - Refetch `GET /v1/parties/{joinCode}`, `GET /v1/parties/{joinCode}/rounds`, and `GET /v1/parties/{joinCode}/leaderboard` to rebuild screen state.

## Gameplay Events

- Emit all gameplay actions through `round:event`.
- Trivia:
  - `{ roundId, type: "answer", payload: { choice } }`
  - Only the first answer per team counts.
- Charades:
  - `{ roundId, type: "correct" }`
  - `{ roundId, type: "skip" }`
  - Only the acting team's players are honored.
- Taboo:
  - `{ roundId, type: "correct" }`
  - `{ roundId, type: "skip" }`
  - `{ roundId, type: "taboo" }`
  - `{ roundId, type: "challenge", payload: { forbiddenWord } }`
- `round:answer` exists only as a back-compat alias for Trivia. New mobile code should use `round:event`.

## Prompt Privacy

- Trivia prompts are emitted to the full party room.
- Charades phrases are emitted only to the acting team room.
- Taboo cards are emitted only to the acting team room.
- Taboo challenge cards are emitted through `prompt:challenge` for opposing-team challenge UI.
- Do not rely on client-side filtering for private prompts; the server is responsible for room scoping.

## Game Config Guidance

- For built-in games, use typed request bodies from generated OpenAPI types:
  - `gameSlug: "trivia"` uses Trivia config overrides.
  - `gameSlug: "charades"` uses Charades config overrides.
  - `gameSlug: "taboo"` uses Taboo config overrides.
- Missing config fields use server defaults.
- `GET /v1/games` returns `defaultConfig`; use it to prefill forms.
- The OpenAPI contract validates field names/ranges, but it does not yet provide rich mobile form metadata such as labels, help text, control type, or presets. Add that later if the mobile UI needs dynamic forms.
- Custom/future games use a generic config object and need product definition before the client can present a polished authoring UI.

## Error Handling

- REST validation errors return:
  - `{ error: "ValidationError", issues }`
- Most REST domain errors return:
  - `{ error: string }`
- Socket errors return:
  - `{ error, message, issues? }`
- Mobile should normalize these into one app-level error shape before rendering.

## Client Generation

- Current backend check:
  - `pnpm api-client:check`
- The check:
  - generates `apps/api/generated/openapi.json`
  - generates `apps/api/generated/api-types.d.ts`
  - compiles `apps/api/tests/contracts/api-client-usage.ts`
- For a separate mobile repo, consume the generated types by copying/publishing `api-types.d.ts` or by generating from the deployed `/docs/json`.
- Do not hand-write built-in game config types in mobile unless the generated contract cannot express the needed UI.

## Current Mobile-Relevant Gaps

- No numeric coverage threshold or CI enforcement yet.
- No real database integration suite yet.
- No real Socket.IO lifecycle integration tests yet.
- No published API client package yet.
- No push notification provider or `DeviceToken` model yet.
- No OTP/passwordless host auth yet.
- No rich config-form metadata endpoint yet.
