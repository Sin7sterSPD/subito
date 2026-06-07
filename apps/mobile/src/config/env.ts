import Constants from "expo-constants"

function normalizeApiBase(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "")
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`
}

export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
      ?.apiBaseUrl

  if (fromEnv && fromEnv.length > 0) {
    return normalizeApiBase(fromEnv)
  }

  if (__DEV__) {
    return normalizeApiBase(
      process.env.EXPO_PUBLIC_API_BASE_URL_DEV || "http://localhost:4000"
    )
  }

  return normalizeApiBase("https://api.subito.app")
}
