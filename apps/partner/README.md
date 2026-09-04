# Subito Partner App

Expo (SDK 54) app for Subito service partners. Partners sign in with their
registered phone number, go online to receive job assignments, and work jobs
through their lifecycle (on the way → arrived → start work → complete).

Built on the same stack as the customer app (`apps/mobile`): expo-router,
HeroUI Native + uniwind (Tailwind v4 CSS-first via `global.css`), zustand
stores, and the shared single-flight-refresh API client pattern.

## Features

- **Phone OTP login** (Firebase phone auth + backend challenge; `appType:
  "partner"` — customer accounts are rejected). Tokens live in
  expo-secure-store; the API binds sessions to the device (`X-Device-ID`).
- **Availability toggle** — go online/offline from the Jobs screen
  (`PUT /v1/partners/me/availability`). "Busy" is system-controlled while a
  job is in progress.
- **Jobs list** — assigned bookings with status chips, customer-cancel
  action-needed badges, pull-to-refresh + refetch on focus.
- **Job detail** — status timeline, service address with directions,
  scheduled slot, customer notes, item list, contextual next actions
  (En route / Arrived / Start work / Complete), and cancellation
  acknowledge-release. While a job is active, the screen pings GPS to the
  API every 25s (foreground) so customers can track the partner.
- **Profile** — rating, completed/total jobs, account status, sign out.

## Setup

Prerequisites: Node 18+, pnpm, and the monorepo services (`apps/api` on port
4000, Postgres + Redis via docker, `apps/worker` for job auto-assignment).

```bash
# from the monorepo root (subito/subito)
pnpm install

# configure the API base URL for your device
# - Android emulator: http://10.0.2.2:4000/v1
# - Physical device:  http://<your-lan-ip>:4000/v1
# edit apps/partner/.env
```

### Firebase (required for OTP login)

The app uses `@react-native-firebase` phone auth, which does **not** work in
Expo Go — build a dev client:

```bash
cd apps/partner
pnpm android   # expo run:android
```

`google-services.json` must contain an Android client for package
**`com.subito.partner`** (Firebase project `subito-dev-e250f`). If the build
fails with a package-name mismatch, add the `com.subito.partner` Android app
in the Firebase console and re-download the config file.

### Test accounts

Seeded partner logins (`packages/db/src/seed.ts`):
`+91 9000000006` / `+91 9000000007` / `+91 9000000008`.

## Manual test plan

1. Start api + worker + redis/postgres (see monorepo README).
2. Sign in with a seeded partner phone; verify OTP flow lands on Jobs.
3. Toggle Online on the Jobs screen; confirm `GET /v1/partners/me` reflects
   `availabilityStatus: online`.
4. Place a booking from the customer app with an instant service → the
   worker auto-assigns it → pull-to-refresh on Jobs shows the new job.
5. Open the job, walk through: I'm on my way → I've arrived → Start work →
   Complete job. Availability should return to online after completion.
6. From the customer app, cancel an assigned booking → the partner app shows
   the "action needed" badge → acknowledge the release from job detail.

## Notes

- Job assignment is automatic (worker match by rating/completed/distance).
  There is no accept/decline flow yet.
- No push notifications yet — new jobs are discovered via focus refetch /
  pull-to-refresh.
