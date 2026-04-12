import { apiClient } from '../api-client';
import { PaymentMethod, PaymentStatus } from '../../types/api';

/** Matches `GET /payments/status` (order + booking fields). */
export interface PaymentStatusPayload {
  orderId: string;
  status: string;
  amount: string;
  bookingId: string | null;
  bookingStatus: string | null;
  bookingNumber: string | null;
  terminal: boolean;
  latestPayment: unknown;
}

interface PaymentOptionsResponse {
  upi: PaymentMethod[];
  cards: PaymentMethod[];
  netbanking: PaymentMethod[];
  wallets: PaymentMethod[];
}

interface UpiVerification {
  isVerified: boolean;
  customerName?: string;
}

interface PaymentHistory {
  payments: {
    id: string;
    amount: string;
    status: PaymentStatus;
    type: string;
    createdAt: string;
  }[];
  refunds: {
    id: string;
    amount: string;
    status: string;
    createdAt: string;
  }[];
}

interface InitiatePaymentData {
  orderId: string;
  amount: number;
  paymentMethodId?: string;
}

interface ProcessOrderData {
  orderId: string;
  status: 'SUCCESS' | 'CHARGED' | 'FAILED' | 'PENDING';
  txnId?: string;
}

export interface ProcessOrderResult {
  success: boolean;
  orderId: string;
  paymentId?: string;
  status: string;
  reason?: string;
}

export const paymentsApi = {
  getPaymentOptions: (platform: 'android' | 'ios' = 'android') =>
    apiClient.get<PaymentOptionsResponse>(`/payments/options?platform=${platform}`),

  verifyUpi: (upiId: string) =>
    apiClient.get<UpiVerification>(`/payments/verify-upi?upiId=${encodeURIComponent(upiId)}`),

  getPaymentHistory: (page = 1, limit = 10) =>
    apiClient.get<PaymentHistory>(`/payments?page=${page}&limit=${limit}`),

  getPaymentStatus: (orderId: string) =>
    apiClient.get<PaymentStatusPayload>(`/payments/status?orderId=${encodeURIComponent(orderId)}`),

  initiatePayment: (data: InitiatePaymentData) =>
    apiClient.post<{ clientAuthToken: string; orderId: string }>('/payments/initiate', data),

  processOrder: (data: ProcessOrderData) =>
    apiClient.post<ProcessOrderResult>('/process-order', data),
};
