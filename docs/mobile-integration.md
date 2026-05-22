# Mobile Integration Notes

These notes describe how a React Native client should integrate with the current API contract.

## Product Contract Direction

The mobile app is a hybrid host/player experience:

- Host mode controls setup, teams, game queue, score corrections, and live moderation.
- Player mode stays lightweight: join by code, check into a team, answer Trivia when enabled, and view current standings.
- Team scoring is the default product model. Individual player identity remains optional.
- Persistent teams and period leaderboards are core planned behavior because real games nights may reuse teams across weekly parties.
- Custom games are a core planned feature because hosts commonly run local/manual games that do not fit built-in engines.
- Charades and Taboo private prompts must be host-device only. The host can hand the phone to the active player; other player devices must not receive the private phrase/card.
- Shared screens are useful, but Trivia must also support displaying questions on player phones when venue screens are down or far away.
- Score corrections and score-event history are first-class because manual scoring errors and point disputes are expected in normal play.
- Optional location verification and team capacity limits are host controls, not mandatory join friction.

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

## Planned Host Flow Extensions

These are not implemented yet, but mobile navigation and local types should reserve space for them.

### Persistent periods / seasons

Planned model:

- A host-owned period groups multiple parties under one scoreboard window.
- Product names can be flexible in UI: season, league, event, weekend, trip, or period.
- A party can be standalone or linked to one active period.
- Teams can be party-only or reusable within the period.

Planned REST shape:

- `POST /v1/periods`
  - Create a host-owned period.
  - Body: `{ name, startsAt?, endsAt?, teamCapacity?, locationVerification? }`
- `GET /v1/periods`
  - List host periods.
- `GET /v1/periods/{periodId}`
  - Read period settings, teams, linked parties, and aggregate standings summary.
- `PATCH /v1/periods/{periodId}`
  - Update name, dates, team capacity, location verification, or active status.
- `POST /v1/periods/{periodId}/parties`
  - Create a party linked to a period.
- `POST /v1/parties`
  - Existing party creation should eventually accept optional `periodId`.

Planned mobile behavior:

- Mobile M0 can model `periodId?: string` and show placeholders.
- Mobile M1 should support party-only check-in first.
- Mobile M4 should add period selection, reusable teams, and period leaderboard views.

### Capacity-aware teams

Planned model:

- Host can set a global `teamCapacity` for party/period.
- Individual teams may later override capacity.
- Check-in rejects full teams unless the host explicitly overrides or moves a player.

Planned REST shape:

- `POST /v1/parties/{joinCode}/teams`
  - Add optional `capacity`.
- `PATCH /v1/teams/{teamId}`
  - Add/update `capacity`, `name`, `color`, `icon`.
- `POST /v1/teams/{teamId}/players`
  - Reject with a domain error when capacity is full.
  - Response should include current `checkedInCount` and `capacity`.
- `POST /v1/teams/{teamId}/players/{playerId}/move`
  - Planned host-only override to move a checked-in player to another team.

Recommended mobile error handling:

- Treat full-team rejection as recoverable.
- Show `Team full` with available alternatives.
- Host mode should expose manual move/override later; player mode should not bypass capacity.

### Optional location verification

Planned model:

- Host can enable venue-only check-in.
- Host sets venue latitude/longitude and radius, or captures current host location at party start.
- Player location permission is requested only when verification is enabled.
- Server stores minimal verification status for check-in, not continuous tracking.
- Host override is required because GPS can fail indoors.

Planned REST shape:

- `PATCH /v1/parties/{joinCode}/venue`
  - Host-only. Body: `{ locationVerificationEnabled, latitude?, longitude?, radiusMeters? }`
- `POST /v1/teams/{teamId}/players`
  - Optional body fields when verification is enabled:
    - `{ location?: { latitude, longitude, accuracyMeters? } }`
  - Response should include:
    - `{ locationVerified?: boolean, locationVerificationStatus?: "not_required" | "verified" | "failed" | "overridden" }`
- `POST /v1/players/{playerId}/location-override`
  - Planned host-only override.

Mobile guidance:

- Do not ask for location permission until the API says it is required.
- Explain failure as venue check-in failure, not as auth failure.
- Keep an offline/manual fallback visible to the host.

### Custom games

Planned model:

- Custom games are host-authored templates.
- Templates can be saved, reused in plans, queued as rounds, and scored manually.
- Custom game MVP should support:
  - name
  - rules/instructions
  - default points
  - scoring mode
  - optional penalties
  - optional timer
  - whether player phones are passive or interactive

Planned REST shape:

- `POST /v1/custom-games`
  - Host-only. Create reusable custom game template.
- `GET /v1/custom-games`
  - Host-only. List templates.
- `GET /v1/custom-games/{customGameId}`
  - Host-only. Read template.
- `PATCH /v1/custom-games/{customGameId}`
  - Host-only. Update template.
- `DELETE /v1/custom-games/{customGameId}`
  - Host-only. Archive/delete template.
- `POST /v1/parties/{joinCode}/rounds`
  - Eventually support either `gameSlug` for built-ins or `customGameId` for custom rounds.

Draft custom-game config:

```ts
type CustomGameConfig = {
  rules: string;
  defaultPoints: number;
  scoringMode: "manual_delta" | "ranked" | "per_correct" | "pass_fail";
  timerSeconds?: number;
  penalties?: Array<{ label: string; points: number }>;
  playerInteractionMode: "none" | "answer" | "vote";
};
```

Mobile guidance:

- Mobile M0 should reserve routes/placeholders for custom games.
- Do not build the full custom-game editor until the API schema is implemented.
- Early host UI can support simple manual-score custom rounds before richer interactive custom games.

### Score events and correction audit

Planned model:

- Every point change should be represented as an append-only score event.
- Corrections should reference the original event rather than silently mutating history.
- Host UI should show who changed points, which team changed, the delta, and the reason.

Planned REST shape:

- `GET /v1/parties/{joinCode}/score-events`
  - Host-visible audit log, optionally visible to players later.
- `POST /v1/rounds/{roundId}/score-events`
  - Host-only. Body: `{ teamId, delta, reason, source }`.
- `POST /v1/score-events/{scoreEventId}/corrections`
  - Host-only. Body: `{ delta, reason }`.
- `GET /v1/parties/{joinCode}/leaderboard`
  - Should continue returning current standings, now derived from score events.

Draft score event:

```ts
type ScoreEvent = {
  id: string;
  partyId: string;
  periodId?: string;
  roundId?: string;
  teamId: string;
  delta: number;
  reason: string;
  source: "engine" | "manual" | "correction" | "penalty";
  correctsScoreEventId?: string;
  createdByUserId?: string;
  createdAt: string;
};
```

Mobile guidance:

- Show clear team color/icon/name on every score action to reduce wrong-team awards.
- Host score correction should require a reason, even if short.
- Player-facing history can be delayed; host-facing history is the priority.

### Trivia display modes

Planned model:

- Trivia round config should control where question content appears.
- Host can choose:
  - `shared_screen_only`
  - `player_devices`
  - `both`

Draft config:

```ts
type TriviaDisplayMode = "shared_screen_only" | "player_devices" | "both";

type TriviaConfig = {
  questionDisplayMode?: TriviaDisplayMode;
  // existing Trivia config fields remain.
};
```

Socket payload rules:

- `shared_screen_only`
  - Player devices receive answer labels/slots or a waiting state, not full question text/options.
- `player_devices`
  - Player devices receive question text and answer options.
- `both`
  - Shared screen and player devices receive question text and answer options.

Mobile guidance:

- Build Trivia answer UI so it can render both “answer-only” and “question + answers” states.
- Default to `both` only if the host explicitly chooses it or if no shared display is configured.

## Player Flow

- Join by code:
  - `GET /v1/parties/{joinCode}`
  - `GET /v1/parties/{joinCode}/teams`
- Join a team:
  - `POST /v1/teams/{teamId}/players`
  - Persist the returned `playerId` for reconnects during the party.
  - Planned: handle capacity rejection, optional location verification, and period-aware check-in.
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

- Current behavior:
  - Trivia prompts are emitted to the full party room.
  - Charades phrases are emitted only to the acting team room.
  - Taboo cards are emitted only to the acting team room.
  - Taboo challenge cards are emitted through `prompt:challenge` for opposing-team challenge UI.
- Target behavior:
  - Trivia prompts follow the configured display mode.
  - Charades phrases are host-control-device only.
  - Taboo cards and forbidden words are host-control-device only.
  - Player/team devices should see only timer, acting team, score state, and non-secret round status for Charades/Taboo.
- Do not rely on client-side filtering for private prompts; the server is responsible for room scoping.

## Game Config Guidance

- For built-in games, use typed request bodies from generated OpenAPI types:
  - `gameSlug: "trivia"` uses Trivia config overrides.
  - `gameSlug: "charades"` uses Charades config overrides.
  - `gameSlug: "taboo"` uses Taboo config overrides.
- Missing config fields use server defaults.
- `GET /v1/games` returns `defaultConfig`; use it to prefill forms.
- The OpenAPI contract validates field names/ranges, but it does not yet provide rich mobile form metadata such as labels, help text, control type, or presets. Add that later if the mobile UI needs dynamic forms.
- Custom games are now a planned major feature. Until the custom-game schema exists, mobile should show placeholders or a simple manual-score flow rather than a polished authoring UI.

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

- No real Socket.IO lifecycle integration tests yet.
- No published API client package yet.
- No push notification provider or `DeviceToken` model yet.
- No OTP/passwordless host auth yet.
- No rich config-form metadata endpoint yet.
- No persistent period/season model yet.
- No team capacity enforcement yet.
- No optional location verification yet.
- No custom-game template API yet.
- No score event/correction audit log yet.
- No host-only Charades/Taboo prompt delivery yet.
- No Trivia player-phone display mode yet.
