import { apiClient } from '../api-client';
import { PaymentMethod, Order, PaymentStatus } from '../../types/api';

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
  status?: string;
  txnId?: string;
}

export const paymentsApi = {
  getPaymentOptions: (platform: 'android' | 'ios' = 'android') =>
    apiClient.get<PaymentOptionsResponse>(`/v1/payment/options?platform=${platform}`),

  verifyUpi: (upiId: string) =>
    apiClient.get<UpiVerification>(`/v1/payment/verify-upi?upiId=${encodeURIComponent(upiId)}`),

  getPaymentHistory: (page = 1, limit = 10) =>
    apiClient.get<PaymentHistory>(`/payments?page=${page}&limit=${limit}`),

  getPaymentStatus: (orderId: string) =>
    apiClient.get<{ status: PaymentStatus; orderId: string }>(`/payments/status?orderId=${orderId}`),

  initiatePayment: (data: InitiatePaymentData) =>
    apiClient.post<{ clientAuthToken: string; orderId: string }>('/payments/initiate', data),

  processOrder: (data: ProcessOrderData) =>
    apiClient.post<{ status: { success: boolean }; data: { bookingId: string; bookingStatus: string; paymentStatus: string } }>('/v1/process-order', data),
};
