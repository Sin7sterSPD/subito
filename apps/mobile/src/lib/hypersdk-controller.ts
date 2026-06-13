/**
 * Juspay HyperSDK bridge (hyper-sdk-react).
 *
 * Native setup (not Expo Go):
 * - Android: add Juspay maven repo + clientId / hyperSDKVersion in root build.gradle (see hyper-sdk-react README).
 * - iOS: pod install, MerchantConfig.txt, optional Fuse.rb post_install.
 * - Run `npx expo prebuild` and open the generated android/ios projects when adding native deps.
 */
import HyperSdkReact from "hyper-sdk-react"
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from "react-native"
import Constants from "expo-constants"

export const HYPERSDK_SERVICE = "in.juspay.hyperapi"

export const HYPERSDK_ACTIONS = {
  INITIATE: "initiate",
  UPI_TXN: "upiTxn",
  CARD_TXN: "cardTxn",
} as const

export type HyperEnvironment = "sandbox" | "production" | string

export type HyperInitConfig = {
  merchantId: string
  clientId: string
  orderId: string
  clientAuthToken: string
  environment: HyperEnvironment
}

export type HyperUpiDetails =
  | { type: "COLLECT"; upiId: string; customerName?: string }
  | { type: "INTENT"; packageName: string }

export type HyperCardDetails = {
  cardNumber: string
  cardExpMonth: string
  cardExpYear: string
  nameOnCard: string
  cardSecurityCode: string
  saveToLocker?: boolean
}

export type InstalledUpiApp = {
  packageName: string
  appName: string
}

type HyperEventPayload = {
  event?: string
  payload?: Record<string, unknown>
}

function newRequestId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID()
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function parseHyperEvent(raw: string | object): HyperEventPayload {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as HyperEventPayload
    } catch {
      return {}
    }
  }
  return raw as HyperEventPayload
}

function getNativeModule(): typeof HyperSdkReact | null {
  if (Platform.OS === "web" || !NativeModules.HyperSdkReact) {
    return null
  }
  return HyperSdkReact
}

function defaultMerchantId(): string {
  return (
    (
      Constants.expoConfig?.extra as
        | Record<string, string | undefined>
        | undefined
    )?.juspayMerchantId ??
    process.env.EXPO_PUBLIC_JUSPAY_MERCHANT_ID ??
    ""
  )
}

function defaultClientId(): string {
  return (
    (
      Constants.expoConfig?.extra as
        | Record<string, string | undefined>
        | undefined
    )?.juspayClientId ??
    process.env.EXPO_PUBLIC_JUSPAY_CLIENT_ID ??
    ""
  )
}

function defaultEnvironment(): HyperEnvironment {
  const e = (
    Constants.expoConfig?.extra as
      | Record<string, string | undefined>
      | undefined
  )?.juspayEnvironment
  if (e === "production" || e === "sandbox") {
    return e
  }
  const env = process.env.EXPO_PUBLIC_JUSPAY_ENVIRONMENT
  if (env === "production" || env === "sandbox") {
    return env
  }
  return __DEV__ ? "sandbox" : "production"
}

/**
 * Merge server `initiatePayment` fields with app config fallbacks.
 */
export function buildHyperInitConfig(params: {
  orderId: string
  clientAuthToken: string
  merchantId?: string
  clientId?: string
  environment?: HyperEnvironment
}): HyperInitConfig {
  const merchantId = params.merchantId?.trim() || defaultMerchantId()
  const clientId = params.clientId?.trim() || defaultClientId()
  const environment = params.environment ?? defaultEnvironment()
  if (!merchantId || !clientId) {
    throw new Error(
      "HyperSDK: merchantId and clientId are required (from API or EXPO_PUBLIC_JUSPAY_* / app.config extra)."
    )
  }
  return {
    merchantId,
    clientId,
    orderId: params.orderId,
    clientAuthToken: params.clientAuthToken,
    environment,
  }
}

class HyperSDKController {
  private servicesCreated = false
  private eventSub: EmitterSubscription | null = null
  private initResolvers: Array<{
    resolve: (p: Record<string, unknown>) => void
    reject: (e: Error) => void
  }> = []
  private processResolvers: Array<{
    resolve: (p: Record<string, unknown>) => void
    reject: (e: Error) => void
  }> = []

  private ensureEventSubscription(): void {
    const mod = getNativeModule()
    if (!mod || this.eventSub) {
      return
    }
    const eventName =
      (mod as unknown as { HyperEvent?: string }).HyperEvent ?? "HyperEvent"
    const emitter = new NativeEventEmitter(
      NativeModules.HyperSdkReact as import("react-native").NativeModule
    )
    this.eventSub = emitter.addListener(eventName, (resp: string | object) => {
      const data = parseHyperEvent(resp)
      const event = data.event ?? ""
      const payload = (data.payload ?? {}) as Record<string, unknown>

      switch (event) {
        case "initiate_result": {
          const r = this.initResolvers.shift()
          if (r) {
            r.resolve(payload)
          }
          break
        }
        case "process_result": {
          const r = this.processResolvers.shift()
          if (r) {
            r.resolve(payload)
          }
          break
        }
        default:
          break
      }
    })
  }

  private ensureHyperServices(): void {
    const mod = getNativeModule()
    if (!mod || this.servicesCreated) {
      return
    }
    mod.createHyperServices()
    this.servicesCreated = true
  }

  isAvailable(): boolean {
    return getNativeModule() != null
  }

  /**
   * Android: delegate hardware back to Hyper when an SDK sheet is open.
   */
  handleBackPress(): boolean {
    const mod = getNativeModule()
    if (!mod || mod.isNull?.()) {
      return false
    }
    return mod.onBackPressed?.() ?? false
  }

  async init(config: HyperInitConfig): Promise<Record<string, unknown>> {
    const mod = getNativeModule()
    if (!mod) {
      throw new Error(
        "HyperSDK native module is not available. Use a dev build with hyper-sdk-react linked (not Expo Go)."
      )
    }

    this.ensureEventSubscription()
    this.ensureHyperServices()

    const requestId = newRequestId()
    const initiatePayload = {
      requestId,
      service: HYPERSDK_SERVICE,
      payload: {
        action: HYPERSDK_ACTIONS.INITIATE,
        merchantId: config.merchantId,
        clientId: config.clientId,
        environment: config.environment,
        orderId: config.orderId,
        clientAuthToken: config.clientAuthToken,
      },
    }

    const result = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        this.initResolvers.push({ resolve, reject })
        try {
          mod.initiate(JSON.stringify(initiatePayload))
        } catch (e) {
          this.initResolvers.pop()
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      }
    )

    const err =
      (result.error as boolean | undefined) === true ||
      (result.status as string)?.toLowerCase() === "error"
    if (err) {
      const msg =
        (result.errorMessage as string) ??
        (result.error_message as string) ??
        "HyperSDK initiate failed"
      throw new Error(msg)
    }

    return result
  }

  async initiateUpiTransaction(
    orderId: string,
    clientAuthToken: string,
    upiDetails: HyperUpiDetails,
    options?: { useActivity?: boolean }
  ): Promise<Record<string, unknown>> {
    const mod = getNativeModule()
    if (!mod) {
      throw new Error("HyperSDK native module is not available.")
    }

    this.ensureEventSubscription()

    if (Platform.OS === "ios") {
      mod.updateBaseViewController?.()
    }

    const requestId = newRequestId()
    const basePayload: Record<string, unknown> = {
      action: HYPERSDK_ACTIONS.UPI_TXN,
      orderId,
      clientAuthToken,
    }

    if (upiDetails.type === "COLLECT") {
      basePayload.custVpa = upiDetails.upiId
      basePayload.displayNote = "UPI Collect"
      basePayload.paymentMethod = "UPI_COLLECT"
    } else {
      basePayload.payWithApp = upiDetails.packageName
      basePayload.upiSdkPresent = true
      basePayload.displayNote = "UPI Intent"
      basePayload.paymentMethod = "UPI_PAY"
    }

    const processPayload = {
      requestId,
      service: HYPERSDK_SERVICE,
      payload: basePayload,
    }

    const json = JSON.stringify(processPayload)

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      this.processResolvers.push({ resolve, reject })
      try {
        if (options?.useActivity && mod.processWithActivity) {
          mod.processWithActivity(json)
        } else {
          mod.process(json)
        }
      } catch (e) {
        this.processResolvers.pop()
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  async initiateCardTransaction(
    orderId: string,
    clientAuthToken: string,
    cardDetails: HyperCardDetails,
    options?: { useActivity?: boolean }
  ): Promise<Record<string, unknown>> {
    const mod = getNativeModule()
    if (!mod) {
      throw new Error("HyperSDK native module is not available.")
    }

    this.ensureEventSubscription()

    if (Platform.OS === "ios") {
      mod.updateBaseViewController?.()
    }

    const requestId = newRequestId()
    const processPayload = {
      requestId,
      service: HYPERSDK_SERVICE,
      payload: {
        action: HYPERSDK_ACTIONS.CARD_TXN,
        orderId,
        clientAuthToken,
        cardNumber: cardDetails.cardNumber.replace(/\s/g, ""),
        cardExpMonth: cardDetails.cardExpMonth,
        cardExpYear: cardDetails.cardExpYear,
        nameOnCard: cardDetails.nameOnCard,
        cardSecurityCode: cardDetails.cardSecurityCode,
        saveToLocker: !!cardDetails.saveToLocker,
        tokenize: !!cardDetails.saveToLocker,
      },
    }

    const json = JSON.stringify(processPayload)

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      this.processResolvers.push({ resolve, reject })
      try {
        if (options?.useActivity && mod.processWithActivity) {
          mod.processWithActivity(json)
        } else {
          mod.process(json)
        }
      } catch (e) {
        this.processResolvers.pop()
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  }

  /**
   * List UPI apps on device (after a successful `init`). Requires a valid session order + token.
   */
  async getInstalledUpiApps(
    orderId: string,
    clientAuthToken: string
  ): Promise<InstalledUpiApp[]> {
    const mod = getNativeModule()
    if (!mod) {
      return []
    }

    this.ensureEventSubscription()

    if (Platform.OS === "ios") {
      mod.updateBaseViewController?.()
    }

    const requestId = newRequestId()
    const processPayload = {
      requestId,
      service: HYPERSDK_SERVICE,
      payload: {
        action: HYPERSDK_ACTIONS.UPI_TXN,
        orderId,
        clientAuthToken,
        getAvailableApps: true,
      },
    }

    try {
      const result = await new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          this.processResolvers.push({ resolve, reject })
          try {
            mod.process(JSON.stringify(processPayload))
          } catch (e) {
            this.processResolvers.pop()
            reject(e instanceof Error ? e : new Error(String(e)))
          }
        }
      )

      const apps = result.availableApps
      if (!Array.isArray(apps)) {
        return []
      }
      return apps.map((a) => {
        const row = a as Record<string, unknown>
        return {
          packageName: String(row.packageName ?? ""),
          appName: String(row.appName ?? row.packageName ?? "UPI"),
        }
      })
    } catch {
      return []
    }
  }

  preFetch(payload: Record<string, unknown>): void {
    const mod = getNativeModule()
    if (!mod?.preFetch) {
      return
    }
    try {
      mod.preFetch(JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }

  terminate(): void {
    const mod = getNativeModule()
    this.initResolvers.forEach(({ reject }) =>
      reject(new Error("HyperSDK terminated"))
    )
    this.processResolvers.forEach(({ reject }) =>
      reject(new Error("HyperSDK terminated"))
    )
    this.initResolvers = []
    this.processResolvers = []
    this.eventSub?.remove()
    this.eventSub = null
    this.servicesCreated = false
    try {
      mod?.terminate()
    } catch {
      /* ignore */
    }
  }
}

export const hyperSDKController = new HyperSDKController()
