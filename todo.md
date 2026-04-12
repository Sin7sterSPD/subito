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

- [x] **API base** — `EXPO_PUBLIC_API_BASE_URL` / `extra.apiBaseUrl`; paths relative to **`…/v1`** (`getApiBaseUrl()`).
- [x] **TanStack Query** — `QueryClientProvider` in `app/_layout.tsx` + shared `queryClient` (per-query `staleTime` can be tuned as screens migrate to `useQuery`).
- [x] **SecureStore** — access + refresh in SecureStore; Zustand persist holds **`user` only** (legacy token snapshot migrated once on launch).
- [x] **API client**
  - [x] Timeouts: reads 15s, mutations 30s, payment/checkout paths 60s.
  - [x] Retries: max 3, exponential backoff, network + 502/503/504 + 429.
  - [x] **401** — single-flight refresh + one retry; else session invalid → logout.
  - [x] **Headers**: `Authorization`, `X-Platform`, `X-App-Version`, `X-Device-ID` (`expo-application` + fallback).
  - [x] **Safe JSON** — JSON only when `Content-Type` indicates JSON.
  - [x] **`Idempotency-Key`** — `apiClient.post` options; wired for cart checkout + bookings create/extend.
  - [x] Errors — no fabricated `data`; `ApiResponse.data` optional on failure.
- [x] **Payment UX** — `POST /process-order` then **`waitForPaymentTerminal`** (polls `GET /payments/status`) + timeout copy.
- [x] **Logout coordinator** — `runLogoutSideEffects`: clears user-scoped queries + cart/bookings/payments/user stores; **keeps** listings + location + app prefs.
- [x] **Sentry** — `src/analytics/sentry.ts`; DSN via `EXPO_PUBLIC_SENTRY_DSN` / `extra` (skipped in `__DEV__` unless you set DSN).
- [x] **CleverTap** — `cleverTapOnUserLogin` after verify + `cleverTapOnUserLogout` in coordinator (native SDK optional via `require`).
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