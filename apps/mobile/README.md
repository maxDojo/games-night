# Games Night Mobile

Expo/React Native app shell for the Games Night host and player experience.

## Current scope

- Expo Router file-based host/player routing.
- Arcade-first theme tokens based on the current Pencil direction.
- API-backed host login/register, secure host token persistence, and host route gating.
- API-backed player join-code lookup, capacity-aware team selection, optional venue-check placeholder, anonymous player check-in, player-safe party status, Trivia answer submission, and Socket.IO party-room join.
- Local party state for host bonus awards, score reveal, post-reveal report flows, and live player check-in state.
- Local secure session helpers for host token, join code, player ID, selected team, nickname, and last party.
- Generated API type import from `apps/api/generated/api-types.d.ts`.
- Socket.IO client helper for future party subscriptions.
- Placeholder screens for locked reveal report, host lobby, queue, team management, bonuses, and host-only prompt control.

## Structure

- `app/` - Expo Router routes, route layouts, redirects, and route-owned actions.
- `src/screens/` - host/player screen composition.
- `src/components/` - reusable game, layout, navigation, and UI primitives.
- `src/theme/` - theme profile, shared styles, and `useAppStyles()`.
- `src/state/` - shared party state, including live player check-in and mock host/demo state.
- `src/data/` - temporary mock state until live API flows replace it.
- `src/api/` and `src/storage/` - API/socket and local session boundaries.

## Run

```bash
pnpm install
pnpm build:mobile
pnpm dev:mobile
```

The shell reads API defaults from `app.json`:

- `extra.apiBaseUrl`: defaults to `http://localhost:3000/v1`
- `extra.socketUrl`: defaults to `http://localhost:3000`

When testing on a physical device, point those values at a reachable LAN URL instead of `localhost`. During Expo development, the app also rewrites localhost API defaults to the Expo dev host when available so Android/Expo Go can reach a local API server on the same machine.
