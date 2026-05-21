# Oxformals Mobile

Expo (React Native) client for Oxformals — Oxford formal seat marketplace. Convex backend code lives in this repo under `convex/` (shared with the same deployment as web).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure Convex (same deployment as web):

```bash
# .env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

3. When you change Convex functions or schema, regenerate types from the **mobile project root**:

```bash
npx convex dev
```

(Use `npx convex dev --once` for a single codegen/sync pass, or keep it running while you edit `convex/`.)

4. Start the mobile app:

```bash
npx expo start
```

### Push notifications (chat)

Chat message pushes require a **development or production build** on a physical device (not Expo Go).

1. Initialize EAS and set your project ID in `app.json` → `expo.extra.eas.projectId` (run `eas init`, then paste the UUID from `eas.json` or the Expo dashboard).
2. Configure credentials: `eas credentials` (iOS APNs, Android FCM).
3. Rebuild: `npx expo run:ios` or `npx expo run:android` (or an EAS build).

Until `projectId` is set, the app skips token registration without crashing.

### Test account (dev only)

For local testing without checking email, set a fixed OTP on your **dev** Convex deployment only (never production):

```bash
npx convex env set AUTH_TEST_EMAIL test@ox.ac.uk
npx convex env set AUTH_TEST_OTP 000000
```

In `.env.local`, match the test email so the app routes to the `test-email` provider:

```
EXPO_PUBLIC_AUTH_TEST_EMAIL=test@ox.ac.uk
```

Then sign in with `test@ox.ac.uk` and the fixed 6-digit code (`000000` above). No email is sent. Complete the profile step on first sign-in if needed.

## Features

- **Browse** — public listing feed with college/search filters
- **Listings** — manage your formals, accept/decline requests
- **Chats** — DMs and group threads (real-time via Convex)
- **Me** — profile, wishlist, theme settings
- **Auth** — Oxford email OTP (same Convex Auth as web)

## Project structure

- `src/app/` — Expo Router screens
- `src/components/` — UI, swap, chat, auth
- `src/lib/` — shared types/utils (ported from web)
- `convex/` — Convex backend (functions, schema; `convex/_generated` for client `api` types)
