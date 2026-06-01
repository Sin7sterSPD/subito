import { Platform } from "react-native"

import { Constants } from "expo-constants"
import type { ApiResponse } from "../types/api"
import { getApiBaseUrl } from "../config/env"
import { isAccessTokenExpiringSoon } from "@subito/utils/jwt-access"

export type ClientRequestOptions = {
  timeoutMs?: number
  idempotencyKey?: string
  skipAuthRefresh?: boolean
  isMultipart?: boolean
  headers?: Record<string, string>
}

type AuthHandlers = {
  refresh: () => Promise<boolean>
  onSessionInvalid: () => void
}

let authHandlers: AuthHandlers | null = null

export function registerApiAuthHandlers(handlers: AuthHandlers): void {
  authHandlers = handlers
}

let refreshFlight: Promise<boolean> | null = null

function singleFlightRefresh(): Promise<boolean> {
  if (!authHandlers) return Promise.resolve(false)
  if (!refreshFlight) {
    refreshFlight = authHandlers.refresh().finally(() => {
      refreshFlight = null
    })
  }
  return refreshFlight
}
