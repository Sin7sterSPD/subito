import { create } from "zustand"
import {
  paymentsApi,
  type PaymentStatusPayload,
  type InitiatePaymentResponse,
} from "../services/api/payments"

interface PaymentsState {
  currentOrderId: string | null
  paymentStatus: string | null
  isLoading: boolean
  isPaymentProviderOpen: boolean
  isPaymentInitiated: boolean
  bookingId: string | null

  initiatePayment: (
    orderId: string,
    amount: number,
    paymentMethodId?: string
  ) => Promise<InitiatePaymentResponse | null>
  processOrder: (input: {
    orderId: string
    status: "SUCCESS" | "CHARGED" | "FAILED" | "PENDING"
    razorpayPaymentId?: string
    razorpaySignature?: string
    razorpayOrderId?: string
  }) => Promise<{ success: boolean }>
  checkPaymentStatus: (orderId: string) => Promise<PaymentStatusPayload | null>
  waitForPaymentTerminal: (
    orderId: string,
    options?: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal }
  ) => Promise<{
    ok: boolean
    payload?: PaymentStatusPayload
    timedOut?: boolean
    aborted?: boolean
  }>
  setCurrentOrderId: (orderId: string | null) => void
  setIsPaymentProviderOpen: (open: boolean) => void
  setIsPaymentInitiated: (v: boolean) => void
  setPaymentDetails: (status: string, bookingId: string | null) => void
  reset: () => void
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export const usePaymentsStore = create<PaymentsState>((set) => ({
  currentOrderId: null,
  paymentStatus: null,
  isLoading: false,
  isPaymentProviderOpen: false,
  isPaymentInitiated: false,
  bookingId: null,

  initiatePayment: async (orderId, amount, paymentMethodId) => {
    set({ isLoading: true, currentOrderId: orderId })
    try {
      const response = await paymentsApi.initiatePayment({
        orderId,
        amount,
        paymentMethodId,
      })
      if (response.success && response.data) {
        return response.data
      }
      return null
    } catch {
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  processOrder: async (input) => {
    set({ isLoading: true })
    try {
      const response = await paymentsApi.processOrder(input)
      if (response.success && response.data?.success) {
        return { success: true }
      }
      return { success: false }
    } catch {
      return { success: false }
    } finally {
      set({ isLoading: false })
    }
  },

  checkPaymentStatus: async (orderId) => {
    try {
      const response = await paymentsApi.getPaymentStatus(orderId)
      if (response.success && response.data) {
        set({ paymentStatus: response.data.status })
        return response.data
      }
      return null
    } catch {
      return null
    }
  },

  waitForPaymentTerminal: async (orderId, options = {}) => {
    const intervalMs = options.intervalMs ?? 2500
    const timeoutMs = options.timeoutMs ?? 120_000
    const signal = options.signal
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      if (signal?.aborted) {
        return { ok: false, aborted: true }
      }
      const response = await paymentsApi.getPaymentStatus(orderId)
      const payload = response.success && response.data ? response.data : null
      if (payload?.terminal) {
        if (payload.status) {
          set({ paymentStatus: payload.status })
        }
        if (payload.bookingId) {
          set({ bookingId: payload.bookingId })
        }
        return { ok: payload.status === "COMPLETED", payload }
      }
      await sleep(intervalMs)
    }

    return { ok: false, timedOut: true }
  },

  setCurrentOrderId: (orderId) => set({ currentOrderId: orderId }),
  setIsPaymentProviderOpen: (open) => set({ isPaymentProviderOpen: open }),
  setIsPaymentInitiated: (v) => set({ isPaymentInitiated: v }),
  setPaymentDetails: (status, bookingId) =>
    set({ paymentStatus: status, bookingId }),

  reset: () =>
    set({
      currentOrderId: null,
      paymentStatus: null,
      isLoading: false,
      isPaymentProviderOpen: false,
      isPaymentInitiated: false,
      bookingId: null,
    }),
}))
