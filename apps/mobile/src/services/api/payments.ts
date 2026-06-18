import { apiClient } from "../api-client"

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
  keyId: string
  razorpayOrderId: string
  gatewayData: Record<string, unknown>
}

interface PaymentHistory {
  payments: {
    id: string
    amount: string
    status: string
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
  razorpayPaymentId?: string
  razorpaySignature?: string
  razorpayOrderId?: string
}

export interface ProcessOrderResult {
  success: boolean
  orderId: string
  paymentId?: string
  status: string
  reason?: string
}

export const paymentsApi = {
  getPaymentHistory: (page = 1, limit = 10) =>
    apiClient.get<PaymentHistory>(`/payments?page=${page}&limit=${limit}`),

  getPaymentStatus: (orderId: string) =>
    apiClient.get<PaymentStatusPayload>(
      `/payments/status?orderId=${encodeURIComponent(orderId)}`
    ),

  initiatePayment: (data: InitiatePaymentData) =>
    apiClient.post<InitiatePaymentResponse>("/payments/initiate", data),

  processOrder: (data: ProcessOrderData) =>
    apiClient.post<ProcessOrderResult>("/payments/process-order", data),

  requestRefund: (data: { bookingId: string; reason: string }) =>
    apiClient.post<{ refundId: string; amount: string }>(
      "/payments/refund",
      data
    ),
}
