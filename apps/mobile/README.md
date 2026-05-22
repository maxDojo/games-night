# Games Night Mobile

Expo/React Native app shell for the Games Night host and player experience.

## Current scope

- Host/player mode routing.
- Arcade-first theme tokens based on the current Pencil direction.
- Local secure session helpers for host token, join code, selected team, and last party.
- Generated API type import from `apps/api/generated/api-types.d.ts`.
- Socket.IO client helper for future party subscriptions.
- Placeholder screens for player check-in, Trivia answering, standings, host lobby, queue, team management, and host-only prompt control.

## Run

```bash
pnpm install
pnpm build:mobile
pnpm dev:mobile
```

The shell reads API defaults from `app.json`:

- `extra.apiBaseUrl`: defaults to `http://localhost:3000/v1`
- `extra.socketUrl`: defaults to `http://localhost:3000`

When testing on a physical device, point those values at a reachable LAN URL instead of `localhost`.
