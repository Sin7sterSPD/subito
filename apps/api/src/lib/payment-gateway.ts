/**
 * Re-export shared gateway client.
 */
export {
  fetchGatewayOrderStatus,
  createGatewayOrder,
  createGatewayRefund,
  verifyGatewaySignature,
  type GatewayOrderStatus,
  type FetchGatewayOrderStatusResult,
  type CreateGatewayOrderInput,
  type CreateGatewayOrderResult,
  type CreateGatewayRefundResult,
} from "@subito/shared"
