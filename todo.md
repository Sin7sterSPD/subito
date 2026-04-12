# Subito — Implementation roadmap

Production alignment: **TanStack Query + Zustand**, **Expo Router**, **single `/v1` API** (except `/health`), **SecureStore tokens**, **webhook + reconciliation as payment source of truth**, **dual idempotency** (Redis + DB), **partner matching enqueued from every payment-complete path**.

---

## Phase 1 — Launch blockers (current)

### API (`apps/api`)

- [x] Track in repo — **single `/v1` mount** for all domain routes; **`GET /health`** unversioned only; remove legacy unversioned mounts.
- [x] **CORS** — environment-aware allowed origins (`CORS_ORIGINS` / production vs dev).
- [x] **JWT** — fail fast if `JWT_SECRET` missing; **`ACCESS_TOKEN_EXPIRY`** env-driven (default `15m`, no week-long fallback in code).
- [x] **Logout** — revoke **refresh tokens** in DB + keep access token blacklist.
- [x] **Payments**
  - [x] **`POST /v1/process-order`** alias (same handler as `/v1/payments/process-order`) for coordinated mobile contract.
  - [x] **`processOrder` schema** — strict status enum (no arbitrary strings).
  - [x] **Enqueue `partner-matching-queue`** after booking → `PENDING_MATCH` from `processOrder`, `verifyPayment`, webhook/reconciliation success paths.
  - [x] **`GET /v1/payments/status`** — suitable for mobile polling until terminal state (align with reconciliation/webhook).
  - [x] **Webhook handler** — minimal staging behavior: verify signature (stub/env flag), enqueue **payment reconciliation** or update order; never no-op only in prod path.
- [x] **Cart `verifyPayment`** — after `PENDING_MATCH`, enqueue partner match (same helper).
- [x] **Partner matching helper** — `apps/api/src/lib/enqueue-partner-match.ts` (load booking + address + listing IDs from line items).
- [x] **Worker `payment.processor`** — avoid infinite PENDING loop when order already `COMPLETED` / payment `CAPTURED`; enqueue partner match when reconciliation succeeds.
- [x] **Worker `partner.processor`** — when `serviceIds` present, filter partners via **`partner_services`** / listing capability.
- [x] **Partner cancel / release ack**
  - [x] DB: `cancellationAwaitingPartnerAck`, `partnerReleaseAcknowledgedAt` (and related timestamps if needed).
  - [x] **Customer cancel** — if `MATCHED` / `ARRIVING` with assigned partner: set awaiting ack (or internal state), do not complete cancel until partner ack or timeout policy.
  - [x] **`POST /v1/partners/.../acknowledge-release`** (partner-authenticated) — ack, release partner, complete cancellation path.
- [x] **Request logging** — log `X-Platform`, `X-App-Version`, `X-Device-ID` (middleware).

### Mobile (`apps/mobile`)

- [ ] **API base** — `API_BASE_URL` ends with `/v1` (or equivalent) so all module paths stay relative.
- [ ] **TanStack Query** — `QueryClientProvider`, global defaults (`staleTime`: listings 10m, bookings 1m, addresses 5m, **cart 0**).
- [ ] **SecureStore** — access + refresh tokens only; **no tokens in AsyncStorage**; Zustand persist for non-secret prefs only.
- [ ] **API client**
  - [ ] Timeouts: reads 10–15s, mutations 20–30s, checkout/payment 45–60s.
  - [ ] Retries: max 3, exponential backoff, network + 502/503/504 + 429 (`Retry-After`).
  - [ ] **401** — single-flight refresh, retry once, else logout.
  - [ ] **Headers**: `Authorization`, `X-Platform`, `X-App-Version` (expo-constants), `X-Device-ID` (stable install id, e.g. `expo-application`).
  - [ ] **Safe JSON parse** — check `Content-Type` before `json()`.
  - [ ] **`post/patch` with extra headers** — `Idempotency-Key` on checkout, bookings, extend.
  - [ ] Error shape — **only** backend `{ success, error: { code, message, details? } }` (no fake `data: null`).
- [ ] **Payment UX** — after HyperSDK: **Processing** + poll `GET /v1/payments/status?orderId=` until success / failure / timeout + fallback UI.
- [ ] **Logout coordinator** — clear Zustand user-bound state, **invalidate** user-scoped queries; **retain** anonymous-safe cache only (coarse location + listings), per product spec.
- [ ] **Sentry** — `@sentry/react-native`, DSN from env for staging + production; dev console-only.
- [ ] **CleverTap** — `onUserLogin` with `userId` + phone; **`onUserLogout`** on logout.
- [ ] **Firebase Analytics** — session + key events (minimal Phase 1 wiring).

### Infra / docs

- [x] **`.env.example`** — document `CORS_ORIGINS`, `ACCESS_TOKEN_EXPIRY`, `SENTRY_DSN`, Juspay webhook secret, etc.

---

## Phase 2 — Reliability & security hardening

- [ ] **Payment** — real Juspay server APIs + HyperSDK; **no** trusting client `processOrder` for money movement; gateway verify before `COMPLETED`.
- [ ] **Webhook** — HMAC verification, idempotent processing, structured event types.
- [ ] **Rate limiter** — atomic SET + EX (fix TOCTOU) on Redis.
- [ ] **Redis `cacheDelPattern`** — use `SCAN` not `KEYS`.
- [ ] **DB transactions** — `createBooking`, `checkoutV2`, `processOrder`, `extendBooking`, refresh rotation.
- [ ] **Pagination** — real `total` counts (`COUNT(*)`), not page-length.
- [ ] **Authorization gaps** — e.g. `getBridgingContext` must scope by `userId`.
- [ ] **`verifyPayment` / signatures** — verify payment provider signature before state transitions.

---

## Phase 3 — Performance & data layer

- [ ] **Drizzle indexes** — hot paths: `bookings(userId, status)`, `orders(orderId)`, `orders(userId)`, etc.
- [ ] **Migrations** — versioned SQL via `drizzle-kit`; no `db:push` in production.
- [ ] **API graceful shutdown** — drain connections, close Redis, stop accepting requests.
- [ ] **Connection pooling** — explicit `pg` pool config for API/worker.
- [ ] **React Query** — prefetch booking detail from list where useful; optimistic cart quantity with rollback.

---

## Phase 4 — Architecture & polish (ongoing)

- [ ] **Feature folders** under `app/(screens)/` (optional refactor when it blocks velocity).
- [ ] **Split `types/` by domain** (`auth.ts`, `booking.ts`, …).
- [ ] **Shared hooks** — `useDebounce`, `useOnlineStatus`, etc.
- [ ] **Constants** — route names, error code → message map, magic numbers.
- [ ] **Deep linking** — bookings, payments, referrals.
- [ ] **Remote config** — ` /v1/settings` primary; Firebase Remote Config optional.
- [ ] **Accessibility & i18n** — backlog.

---

## Definition of done (release gate)

End-to-end: **book → pay → webhook/reconciliation confirms → partner match enqueued → match → basic tracking**, with **staging** using real integration shapes (test credentials), minimal drift from production config.

---

## References

- Plan docs: `plan/client-mobile/*.md`
- Architectural comparison and backend audit: user-authored reports in chat / internal docs