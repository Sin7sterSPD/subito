import { create } from 'zustand';
import { PaymentMethod, PaymentStatus } from '../types/api';
import { paymentsApi } from '../services/api';

interface PaymentOptions {
  upi: PaymentMethod[];
  cards: PaymentMethod[];
  netbanking: PaymentMethod[];
  wallets: PaymentMethod[];
}

interface PaymentsState {
  paymentOptions: PaymentOptions | null;
  selectedPaymentMethod: PaymentMethod | null;
  currentOrderId: string | null;
  paymentStatus: PaymentStatus | null;
  isLoading: boolean;

  fetchPaymentOptions: (platform?: 'android' | 'ios') => Promise<void>;
  verifyUpi: (upiId: string) => Promise<{ isVerified: boolean; customerName?: string }>;
  initiatePayment: (orderId: string, amount: number, paymentMethodId?: string) => Promise<{ clientAuthToken: string | null }>;
  processOrder: (orderId: string, status?: string, txnId?: string) => Promise<{ success: boolean; bookingId?: string }>;
  checkPaymentStatus: (orderId: string) => Promise<PaymentStatus | null>;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  setCurrentOrderId: (orderId: string | null) => void;
  reset: () => void;
}

export const usePaymentsStore = create<PaymentsState>((set) => ({
  paymentOptions: null,
  selectedPaymentMethod: null,
  currentOrderId: null,
  paymentStatus: null,
  isLoading: false,

  fetchPaymentOptions: async (platform = 'android') => {
    set({ isLoading: true });
    try {
      const response = await paymentsApi.getPaymentOptions(platform);
      if (response.success && response.data) {
        set({ paymentOptions: response.data });
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  verifyUpi: async (upiId) => {
    set({ isLoading: true });
    try {
      const response = await paymentsApi.verifyUpi(upiId);
      if (response.success && response.data) {
        return response.data;
      }
      return { isVerified: false };
    } catch {
      return { isVerified: false };
    } finally {
      set({ isLoading: false });
    }
  },

  initiatePayment: async (orderId, amount, paymentMethodId) => {
    set({ isLoading: true, currentOrderId: orderId });
    try {
      const response = await paymentsApi.initiatePayment({
        orderId,
        amount,
        paymentMethodId,
      });
      if (response.success && response.data) {
        return { clientAuthToken: response.data.clientAuthToken };
      }
      return { clientAuthToken: null };
    } catch {
      return { clientAuthToken: null };
    } finally {
      set({ isLoading: false });
    }
  },

  processOrder: async (orderId, status, txnId) => {
    set({ isLoading: true });
    try {
      const response = await paymentsApi.processOrder({
        orderId,
        status,
        txnId,
      });
      if (response.success && response.data?.status?.success) {
        return {
          success: true,
          bookingId: response.data.data.bookingId,
        };
      }
      return { success: false };
    } catch {
      return { success: false };
    } finally {
      set({ isLoading: false });
    }
  },

  checkPaymentStatus: async (orderId) => {
    try {
      const response = await paymentsApi.getPaymentStatus(orderId);
      if (response.success && response.data) {
        set({ paymentStatus: response.data.status });
        return response.data.status;
      }
      return null;
    } catch {
      return null;
    }
  },

  setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
  setCurrentOrderId: (orderId) => set({ currentOrderId: orderId }),

  reset: () =>
    set({
      paymentOptions: null,
      selectedPaymentMethod: null,
      currentOrderId: null,
      paymentStatus: null,
      isLoading: false,
    }),
}));
