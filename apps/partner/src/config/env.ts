import Constants from "expo-constants"

function normalizeApiBase(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "")
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`
}

/**
 * API origin including `/v1`. Override with `EXPO_PUBLIC_API_BASE_URL`
 * (e.g. `http://192.168.1.4:4000/v1` for physical devices on your LAN,
 * or `http://10.0.2.2:4000/v1` for the Android emulator).
 */
export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
      ?.apiBaseUrl

  if (fromEnv && fromEnv.length > 0) {
    return normalizeApiBase(fromEnv)
  }

  if (__DEV__) {
    return normalizeApiBase("http://localhost:4000")
  }

  return normalizeApiBase("https://api.subito.app")
}
