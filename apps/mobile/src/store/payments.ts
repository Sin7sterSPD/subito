import { create } from "zustand"
import { Platform } from "react-native"
import { PaymentMethod } from "../types/api"
import {
  paymentsApi,
  type PaymentStatusPayload,
  type InitiatePaymentResponse,
} from "../services/api/payments"

interface PaymentOptions {
  upi: PaymentMethod[]
  cards: PaymentMethod[]
  netbanking: PaymentMethod[]
  wallets: PaymentMethod[]
}

function normalizePaymentOptions(raw: {
  options?: {
    id: string
    name: string
    type: string
    icon?: string
    description?: string
    providers?: { id: string; name: string; icon?: string }[]
  }[]
}): PaymentOptions {
  const grouped: PaymentOptions = {
    upi: [],
    cards: [],
    netbanking: [],
    wallets: [],
  }
  const list = raw.options ?? []
  for (const opt of list) {
    const t = (opt.type || "").toUpperCase()
    const id = opt.id || "opt"

    if (t === "UPI") {
      if (opt.providers?.length) {
        for (const p of opt.providers) {
          grouped.upi.push({
            id: `upi:${p.id}`,
            type: "UPI",
            name: p.name,
            icon: p.icon ?? opt.icon,
          })
        }
      } else {
        grouped.upi.push({
          id: `upi:${id}`,
          type: "UPI",
          name: opt.name || "UPI",
          icon: opt.icon,
        })
      }
    } else if (t === "CARD" || id === "card") {
      grouped.cards.push({
        id: `card:${id}`,
        type: "CARD",
        name: opt.name || "Card",
        icon: opt.icon,
      })
    } else if (t === "NETBANKING" || id === "netbanking") {
      grouped.netbanking.push({
        id: `nb:${id}`,
        type: "NETBANKING",
        name: opt.name || "Net banking",
        icon: opt.icon,
      })
    } else if (t === "WALLET" || t === "APPLE_PAY") {
      if (opt.providers?.length) {
        for (const p of opt.providers) {
          grouped.wallets.push({
            id: `wallet:${p.id}`,
            type: "WALLET",
            name: p.name,
            icon: p.icon ?? opt.icon,
          })
        }
      } else {
        grouped.wallets.push({
          id: `wallet:${id}`,
          type: "WALLET",
          name: opt.name || "Wallet",
          icon: opt.icon,
        })
      }
    }
  }
  return grouped
}

interface PaymentsState {
  paymentOptions: PaymentOptions | null
  selectedPaymentMethod: PaymentMethod | null
  currentOrderId: string | null
  paymentStatus: string | null
  isLoading: boolean
  isPaymentProviderOpen: boolean
  isPaymentInitiated: boolean
  bookingId: string | null

  fetchPaymentOptions: (platform?: "android" | "ios") => Promise<void>
  verifyUpi: (
    upiId: string
  ) => Promise<{ isVerified: boolean; customerName?: string }>
  initiatePayment: (
    orderId: string,
    amount: number,
    paymentMethodId?: string
  ) => Promise<InitiatePaymentResponse | null>
  processOrder: (
    orderId: string,
    status: "SUCCESS" | "CHARGED" | "FAILED" | "PENDING",
    txnId?: string
  ) => Promise<{ success: boolean }>
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
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void
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
  paymentOptions: null,
  selectedPaymentMethod: null,
  currentOrderId: null,
  paymentStatus: null,
  isLoading: false,
  isPaymentProviderOpen: false,
  isPaymentInitiated: false,
  bookingId: null,

  fetchPaymentOptions: async (platform) => {
    const pf = platform ?? (Platform.OS === "ios" ? "ios" : "android")
    set({ isLoading: true })
    try {
      const response = await paymentsApi.getPaymentOptions(pf)
      if (response.success && response.data) {
        set({ paymentOptions: normalizePaymentOptions(response.data) })
      }
    } catch {
      /* silent */
    } finally {
      set({ isLoading: false })
    }
  },

  verifyUpi: async (upiId) => {
    set({ isLoading: true })
    try {
      const response = await paymentsApi.verifyUpi(upiId)
      if (response.success && response.data) {
        const d = response.data
        return {
          isVerified: d.isValid,
          customerName: d.name ?? undefined,
        }
      }
      return { isVerified: false }
    } catch {
      return { isVerified: false }
    } finally {
      set({ isLoading: false })
    }
  },

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

  processOrder: async (orderId, status, txnId) => {
    set({ isLoading: true })
    try {
      const response = await paymentsApi.processOrder({
        orderId,
        status,
        txnId,
      })
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

  setSelectedPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
  setCurrentOrderId: (orderId) => set({ currentOrderId: orderId }),
  setIsPaymentProviderOpen: (open) => set({ isPaymentProviderOpen: open }),
  setIsPaymentInitiated: (v) => set({ isPaymentInitiated: v }),
  setPaymentDetails: (status, bookingId) =>
    set({ paymentStatus: status, bookingId }),

  reset: () =>
    set({
      paymentOptions: null,
      selectedPaymentMethod: null,
      currentOrderId: null,
      paymentStatus: null,
      isLoading: false,
      isPaymentProviderOpen: false,
      isPaymentInitiated: false,
      bookingId: null,
    }),
}))
