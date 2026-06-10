/**
 * Re-export shared gateway client; dev-only client-trust escape hatch stays in API.
 */
export {
  fetchGatewayOrderStatus,
  createJuspayOrder,
  createJuspayRefund,
  type GatewayOrderStatus,
  type FetchGatewayOrderStatusResult,
  type CreateJuspayOrderInput,
  type CreateJuspayOrderResult,
  type CreateJuspayOrderSuccess,
  type CreateJuspayOrderFailure,
  type CreateJuspayRefundResult,
} from "@subito/shared"

/** Explicit dev-only escape hatch; never set in production. */
export function trustClientOrderSuccessInDev(): boolean {
  const env = process.env.NODE_ENV
  return (
    (env === "development" || env === "test") &&
    process.env.JUSPAY_TRUST_CLIENT_ORDER_STATUS === "true"
  )
}
