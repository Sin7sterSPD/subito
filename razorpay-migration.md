# Migration Plan: Juspay → Razorpay

## Why

Juspay account verification blocked builds. Moving to Razorpay (account already has test keys). `react-native-razorpay` is already installed in the mobile app.

## Integration Flow

```
Mobile App (react-native-razorpay)       API Server                    Razorpay
  ┌─────────────────┐                   ┌────────────────────┐       ┌─────────┐
  │ payment.tsx      │──POST /initiate──>│ initiatePayment()  │       │         │
  │ (gets key_id +   │                   │  razorpay.orders   │──────>│POST     │
  │  razorpay_order  │<──response───────│  .create()         │       │/orders  │
  │  _id)            │                   └────────────────────┘       │         │
  └────────┬────────┘                                                 └─────────┘
           │ openRazorpayCheckout()
           ▼
  ┌─────────────────┐                   ┌────────────────────┐
  │ Razorpay Sheet   │                   │ processOrder()     │
  │ (user pays)      │──POST /process──>│  verify Razorpay   │
  │ callback returns │                   │  HMAC signature    │
  │ payment_id +     │<──response───────│  DB transaction    │
  │ signature        │                   └────────────────────┘
  └────────┬────────┘
           │ Poll GET /payments/status
           ▼                          ┌────────────────────┐
  ┌──────────────────┐                │ Razorpay Webhook   │
  │ payment-success  │                │ handleWebhook()    │
  └──────────────────┘                │ → enqueue reconcile│
                                      │   paymentRecon-    │
                                      │   ciliationQueue   │
                                      └────────────────────┘
```

## Decisions Log

| #   | Decision                                          | Choice                                                                                                                    |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Integration flow                                  | Standard Razorpay Checkout via `react-native-razorpay`                                                                    |
| 2   | DB schema strategy                                | **Option A** — Generic gateway-agnostic columns (`gateway_order_id`, `gateway_data` JSONB, etc.)                          |
| 3   | Mobile payment UI                                 | Razorpay checkout sheet handles all payment method selection (UPI, cards, netbanking, wallets)                            |
| 4   | Webhook strategy                                  | Webhooks + client callback (both)                                                                                         |
| 5   | Env var naming                                    | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`                                                       |
| 6   | Server-side library                               | `razorpay` npm package in `packages/shared`                                                                               |
| 7   | Webhook endpoint                                  | `POST /payments/razorpay/webhook` (explicit naming)                                                                       |
| 8   | Signature utility                                 | `razorpay-signature.ts` (replaces `juspay-signature.ts`)                                                                  |
| 9   | Mobile screens                                    | Simplify to 2 screens: `payment.tsx` + `payment-success.tsx`. Remove `payment-methods.tsx`, `add-upi.tsx`, `add-card.tsx` |
| 10  | Remove verifyPayment                              | Remove from cart service (covered by process-order + webhooks)                                                            |
| 11  | Remove /payments/options and /payments/verify-upi | Removed (Razorpay handles its own UI)                                                                                     |
| 12  | Payment reconciliation queue                      | Reused as-is, just swap function calls                                                                                    |

---

## Phase 1 — Database Schema

**File:** `packages/db/src/schema/payments.ts`

### Orders table

| Before                                      | After                                |
| ------------------------------------------- | ------------------------------------ |
| `juspay_order_id` varchar(100)              | `gateway_order_id` varchar(100)      |
| `juspay_client_auth_token` text             | _removed_ → stored in `gateway_data` |
| `juspay_client_auth_token_expiry` timestamp | _removed_ → stored in `gateway_data` |
| _(none)_                                    | `gateway_data` jsonb                 |

### Payments table

| Before                       | After                         |
| ---------------------------- | ----------------------------- |
| `juspay_txn_id` varchar(100) | `gateway_txn_id` varchar(100) |
| _(none)_                     | `gateway_data` jsonb          |

### Refunds table

| Before                          | After                            |
| ------------------------------- | -------------------------------- |
| `juspay_refund_id` varchar(100) | `gateway_refund_id` varchar(100) |
| _(none)_                        | `gateway_data` jsonb             |

Generate a new Drizzle migration (`drizzle-kit generate`).

### Seed data (`packages/db/src/seed.ts`)

- Remove `juspayOrderId`, `juspayTxnId` from seed inserts
- No replacement needed — gateway fields can be null in dev seed

---

## Phase 2 — Shared Payment Gateway

**File:** `packages/shared/src/payment-gateway.ts`

Install `razorpay` in `packages/shared/`:

```bash
pnpm --filter @subito/shared add razorpay
```

Replace the entire file with generic gateway-agnostic functions that wrap the Razorpay SDK internally.

### New exports

```typescript
// Create a Razorpay order (replaces createJuspayOrder)
createGatewayOrder(input: {
  orderId: string
  amount: string        // INR major units, e.g. "199.00"
  currency?: string     // default "INR"
  customerId: string
  customerPhone: string
  customerEmail: string
  description?: string
}): Promise<{
  success: true
  orderId: string
  gatewayOrderId: string    // razorpay_order_id
  gatewayData: Record<string, unknown>
} | { success: false, error: string }>

// Fetch order status from Razorpay (replaces fetchGatewayOrderStatus)
fetchGatewayOrderStatus(gatewayOrderId: string): Promise<{
  status: "CHARGED" | "FAILED" | "PENDING"
  gatewayUnreachable: boolean
}>

// Create refund (replaces createJuspayRefund)
createGatewayRefund(input: {
  gatewayTxnId: string     // razorpay_payment_id
  amount: string
  uniqueRequestId: string
}): Promise<{
  success: true
  refundId?: string
  raw?: Record<string, unknown>
} | { success: false, error: string }>

// Verify Razorpay payment signature
verifyGatewaySignature(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): boolean
```

### Upstream consumers update

**`apps/api/src/lib/payment-gateway.ts`** — Keep as re-export layer from `@subito/shared`:

- Remove `trustClientOrderSuccessInDev()` (no longer needed — Razorpay returns definitive status)
- Update named exports to match new function names

**`apps/worker/`** — The worker imports `fetchGatewayOrderStatus` and references `order.juspayOrderId`:

- Import updated `fetchGatewayOrderStatus`
- Change `order.juspayOrderId` → `order.gatewayOrderId`

---

## Phase 3 — API Signature Verification

**File:** `apps/api/src/lib/juspay-signature.ts` → rename to `razorpay-signature.ts`

```typescript
import { createHmac, timingSafeEqual } from "crypto"

export function verifyRazorpayCallbackSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  // ... HMAC-SHA256 of `${razorpayOrderId}|${razorpayPaymentId}` using secret
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  // ... HMAC-SHA256 of raw body using webhook secret
}
```

Remove `JUSPAY_RESPONSE_KEY`, `JUSPAY_ALLOW_UNSIGNED_VERIFY` references.

---

## Phase 4 — API Payment Service

**File:** `apps/api/src/modules/payments/payments.service.ts`

### Removed

- `getPaymentOptions()` — entire function
- `verifyUpi()` — entire function
- Juspay env constants (`JUSPAY_MERCHANT_ID`, `JUSPAY_SDK_CLIENT_ID`, `JUSPAY_RETURN_URL`)
- `trustClientOrderSuccessInDev()` import

### Modified: `initiatePayment()`

- Remove Juspay order creation logic (mock + real)
- Call `createGatewayOrder()` from shared package
- Return Razorpay-friendly response:

```json
{
  "orderId": "subito-xxx",
  "amount": 19900,
  "currency": "INR",
  "keyId": "rzp_test_...",
  "razorpayOrderId": "order_xxxxx",
  "gatewayData": { ... }
}
```

- Update DB insert/update to use `gatewayOrderId`, `gateway_data` instead of `juspayOrderId`, `juspayClientAuthToken`, etc.

### Modified: `processOrder()`

- Input data adds `razorpayPaymentId: string` and `razorpaySignature: string`
- Replace gateway status fetch with Razorpay signature verification:
  ```typescript
  const isValid = verifyGatewaySignature({
    razorpayOrderId: order.gatewayOrderId,
    razorpayPaymentId: data.razorpayPaymentId,
    razorpaySignature: data.razorpaySignature,
  })
  if (!isValid) throw new BadRequestError("Invalid payment signature")
  ```
- Save `gatewayTxnId` instead of `juspayTxnId`
- Save `gateway_data` with any Razorpay-specific fields

### Modified: `tryAutoRefundAfterBookingCancel()`

- Replace `createJuspayRefund()` with `createGatewayRefund()`
- Use `gatewayTxnId` instead of `juspayTxnId` to look up the payment reference
- Store `gatewayRefundId` instead of `juspayRefundId`

### Modified: `handleWebhook()`

- Accept Razorpay payload structure (different from Juspay)
- Update event name extraction for Razorpay format
- Update Redis idempotency key: `webhook:razorpay:${orderId}:...`
- Call `verifyRazorpayWebhookSignature()` instead of Juspay HMAC check
- Enqueue same `paymentReconciliationQueue`

---

## Phase 5 — API Payment Routes

**File:** `apps/api/src/modules/payments/payment.routes.ts`

### Removed routes

| Method | Path                   | Reason                                     |
| ------ | ---------------------- | ------------------------------------------ |
| GET    | `/payments/options`    | Razorpay handles its own payment method UI |
| GET    | `/payments/verify-upi` | Razorpay validates UPI internally          |

### Modified routes

| Method | Path                       | Change                                                     |
| ------ | -------------------------- | ---------------------------------------------------------- |
| POST   | `/payments/initiate`       | Response shape changes (see Phase 4)                       |
| POST   | `/payments/process-order`  | Input schema adds `razorpayPaymentId`, `razorpaySignature` |
| POST   | `/payments/juspay/webhook` | **Replaced** with `POST /payments/razorpay/webhook`        |

### New webhook route `POST /payments/razorpay/webhook`

- Verify Razorpay webhook HMAC signature via `x-razorpay-signature` header
- Use `RAZORPAY_WEBHOOK_SECRET` env var
- Parse Razorpay webhook event payload
- Call `handleWebhook()` (same underlying function, adapted for Razorpay events)
- Remove all Juspay webhook verification code

---

## Phase 6 — Cart Service

**File:** `apps/api/src/modules/cart/cart.service.ts`

- Remove `import { verifyPaymentResponseSignature } from "@/lib/juspay-signature"`
- Remove `verifyPayment()` function entirely
- This endpoint is superseded by `POST /payments/process-order` with Razorpay signature verification

---

## Phase 7 — Queue Worker

**File:** `apps/worker/` (wherever the worker lives)

- Update import from `@subito/shared`: replace `fetchGatewayOrderStatus` with updated version
- Change `order.juspayOrderId` → `order.gatewayOrderId` in the gateway lookup call
- Worker logic (transaction, notifications, partner matching) stays the same

---

## Phase 8 — Mobile App: Remove HyperSDK

### Delete files

| File                                              | Reason                                           |
| ------------------------------------------------- | ------------------------------------------------ |
| `apps/mobile/src/lib/hypersdk-controller.ts`      | HyperSDK bridge — no longer needed               |
| `apps/mobile/src/lib/map-hyper-process-result.ts` | Juspay result mapper — no longer needed          |
| `apps/mobile/plugins/withJuspayHyperSdkBypass.js` | Expo config plugin for Juspay — no longer needed |

---

## Phase 9 — Mobile App: Razorpay Helper

**New file:** `apps/mobile/src/lib/razorpay.ts`

```typescript
import RazorpayCheckout from "react-native-razorpay"

export interface RazorpayCheckoutParams {
  key_id: string
  amount: number        // in paise
  currency: string
  order_id: string      // Razorpay order ID
  name?: string         // default "Subito"
  description?: string
  prefill?: {
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
}

export interface RazorpayCheckoutResult {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export function openRazorpayCheckout(
  params: RazorpayCheckoutParams
): Promise<RazorpayCheckoutResult> {
  return RazorpayCheckout.open({
    key: params.key_id,
    amount: params.amount,
    currency: params.currency,
    order_id: params.order_id,
    name: params.name ?? "Subito",
    description: params.description,
    prefill: params.prefill,
    theme: params.theme ?? { color: "#000" },
  }) as Promise<RazorpayCheckoutResult>
}
```

---

## Phase 10 — Mobile App: Simplify Payment Screen

**File:** `apps/mobile/app/(screens)/payment.tsx`

### New flow

1. Receive params: `orderId`, `bookingId`, `amount` (from navigation)
2. On mount:
   - Call `POST /payments/initiate` → get `{ keyId, razorpayOrderId, amount }`
   - Convert amount to paise: `amount * 100`
   - Call `openRazorpayCheckout({ key_id: keyId, amount: amountInPaise, order_id: razorpayOrderId, currency: "INR" })`
3. On Razorpay success callback:
   - Extract `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
   - Call `POST /payments/process-order` with `{ orderId, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: "SUCCESS" }`
4. Poll `GET /payments/status` (same polling logic, 2.5s interval, 120s timeout)
5. On success → navigate to `payment-success.tsx`
6. On failure → show error with retry option

### Remove

- All HyperSDK imports and logic
- `clientAuthToken`, `merchantId`, `clientId`, `environment` params
- `upiDetails` / `cardDetails` parsing
- `hyperSDKController` calls

---

## Phase 11 — Mobile App: Remove Unused Screens

### Delete

| File                                            | Reason                                     |
| ----------------------------------------------- | ------------------------------------------ |
| `apps/mobile/app/(screens)/payment-methods.tsx` | Replaced — route directly to `payment.tsx` |
| `apps/mobile/app/(screens)/add-upi.tsx`         | Razorpay handles UPI input                 |
| `apps/mobile/app/(screens)/add-card.tsx`        | Razorpay handles card input                |

### Update navigation

Any screen that navigates to `payment-methods` should navigate directly to `payment` instead (passing `orderId`, `bookingId`, `amount`).

---

## Phase 12 — Mobile App: Update Store & API Client

### Store (`apps/mobile/src/store/payments.ts`)

| Change                                     | Details                                                             |
| ------------------------------------------ | ------------------------------------------------------------------- |
| Remove `paymentOptions` state              | No longer needed                                                    |
| Remove `selectedPaymentMethod` state       | No longer needed                                                    |
| Remove `fetchPaymentOptions()` action      | No longer needed                                                    |
| Remove `verifyUpi()` action                | No longer needed                                                    |
| Remove `setSelectedPaymentMethod()` action | No longer needed                                                    |
| Update `initiatePayment()` return type     | Match new response shape (`keyId`, `razorpayOrderId`)               |
| Update `processOrder()`                    | Accept `razorpayPaymentId` + `razorpaySignature` instead of `txnId` |
| Keep `waitForPaymentTerminal()`            | Same polling logic                                                  |

### API client (`apps/mobile/src/services/api/payments.ts`)

| Change                                                                                                     | Details                                                       |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Update `InitiatePaymentResponse` type                                                                      | Replace Juspay fields with `keyId`, `razorpayOrderId`         |
| Update `ProcessOrderData` type                                                                             | Replace `txnId` with `razorpayPaymentId`, `razorpaySignature` |
| Remove `getPaymentOptions()`                                                                               | API endpoint removed                                          |
| Remove `verifyUpi()`                                                                                       | API endpoint removed                                          |
| Keep `getPaymentHistory()`, `getPaymentStatus()`, `initiatePayment()`, `processOrder()`, `requestRefund()` | Same endpoints                                                |

---

## Phase 13 — Mobile App: Config

**File:** `apps/mobile/app.config.ts`

Replace Juspay extras:

```typescript
extra: {
  ...config.extra,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
}
```

Remove:

```typescript
juspayMerchantId: process.env.JUSPAY_MERCHANT_ID,
juspayClientId: process.env.JUSPAY_CLIENT_ID,
juspayEnvironment: process.env.JUSPAY_ENVIRONMENT ?? "sandbox",
```

---

## Phase 14 — Environment Variables

### Root `.env`

Remove all `JUSPAY_*` lines. Add:

```
# Razorpay
RAZORPAY_KEY_ID=rzp_test_T2yg3eoJmjvR7G
RAZORPAY_KEY_SECRET=OFiAQl0fz3rwBsUJp2nJBwky
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret
RAZORPAY_GATEWAY_TIMEOUT_MS=12000
```

### Mobile `.env`

Same changes. Remove `JUSPAY_*`. Keep/add:

```
RAZORPAY_KEY_ID=rz
RAZORPAY_KEY_SECRET
```

### `turbo.json`

Replace JUSPAY entries in `globalEnv`:

```json
"RAZORPAY_KEY_ID",
"RAZORPAY_KEY_SECRET",
"RAZORPAY_WEBHOOK_SECRET",
"RAZORPAY_GATEWAY_TIMEOUT_MS"
```

---

## Phase 15 — Package Cleanup

```bash
pnpm --filter @subito/shared add razorpay
pnpm --filter apps-mobile remove hyper-sdk-react
pnpm install
```

Also remove `hyper-sdk-react` from `apps/mobile/package.json` dependencies.

---

## Execution Order

```
Phase 1  (DB schema)
    ↓
Phase 2  (shared package — new Razorpay functions)
    ↓
Phase 3  (signature verification)
    ↓
Phase 4  (API payment service)
    ↓
Phase 5  (API payment routes)
    ↓
Phase 6  (cart service cleanup)
    ↓
Phase 7  (queue worker update)
    ↓
Phase 8  (remove HyperSDK files)
    ↓
Phase 9  (Razorpay helper)
    ↓
Phase 10 (payment screen rewrite)
    ↓
Phase 11 (remove unused screens)
    ↓
Phase 12 (store & API client)
    ↓
Phase 13 (app config)
    ↓
Phase 14 (env vars & turbo.json)
    ↓
Phase 15 (package cleanup)
```

Each phase can be implemented, typechecked, and linted independently before moving to the next.
