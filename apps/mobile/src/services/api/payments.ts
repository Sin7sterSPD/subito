import { apiClient } from "../api-client"
import { PaymentMethod, PaymentStatus } from "../../types/api"

/** Matches `GET /payments/status` (order + booking fields). */
export interface PaymentStatusPayload {
  orderId: string
  status: string
  amount: string
  bookingId: string | null
  bookingStatus: string | null
  bookingNumber: string | null
  terminal: boolean
  latestPayment: unknown
}

export interface InitiatePaymentResponse {
  orderId: string
  amount: number
  currency: string
  clientAuthToken: string
  clientAuthTokenExpiry: string
  merchantId: string
  clientId: string
  environment: string
  sdkPayload: Record<string, unknown>
}

interface PaymentOptionsApiBody {
  options: {
    id: string
    name: string
    type: string
    icon?: string
    description?: string
    providers?: { id: string; name: string; icon?: string }[]
  }[]
}

interface UpiVerificationResponse {
  upiId: string
  isValid: boolean
  name: string | null
}

interface PaymentHistory {
  payments: {
    id: string
    amount: string
    status: PaymentStatus
    type: string
    createdAt: string
  }[]
  refunds: {
    id: string
    amount: string
    status: string
    createdAt: string
  }[]
}

interface InitiatePaymentData {
  orderId: string
  amount: number
  paymentMethodId?: string
}

interface ProcessOrderData {
  orderId: string
  status: "SUCCESS" | "CHARGED" | "FAILED" | "PENDING"
  txnId?: string
}

export interface ProcessOrderResult {
  success: boolean
  orderId: string
  paymentId?: string
  status: string
  reason?: string
}

export const paymentsApi = {
  getPaymentOptions: (platform: "android" | "ios" = "android") =>
    apiClient.get<PaymentOptionsApiBody>(
      `/payments/options?platform=${platform}`
    ),

  verifyUpi: (upiId: string) =>
    apiClient.get<UpiVerificationResponse>(
      `/payments/verify-upi?upiId=${encodeURIComponent(upiId)}`
    ),

  getPaymentHistory: (page = 1, limit = 10) =>
    apiClient.get<PaymentHistory>(`/payments?page=${page}&limit=${limit}`),

  getPaymentStatus: (orderId: string) =>
    apiClient.get<PaymentStatusPayload>(
      `/payments/status?orderId=${encodeURIComponent(orderId)}`
    ),

  initiatePayment: (data: InitiatePaymentData) =>
    apiClient.post<InitiatePaymentResponse>("/payments/initiate", data),

  processOrder: (data: ProcessOrderData) =>
    apiClient.post<ProcessOrderResult>("/process-order", data),

  requestRefund: (data: { bookingId: string; reason: string }) =>
    apiClient.post<{ refundId: string; amount: string }>(
      "/payments/refund",
      data
    ),
}
