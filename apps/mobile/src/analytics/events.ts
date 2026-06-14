import { Platform } from "react-native"
import * as Application from "expo-application"

function flattenParams(
  params: Record<string, unknown>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[k] = v
    } else if (Array.isArray(v)) {
      out[k] = v.map(String).join(",")
    } else {
      out[k] = JSON.stringify(v)
    }
  }
  return out
}

/** Central analytics dispatcher; extend with CleverTap / Mixpanel when needed. */
export function sendEventAnalytics(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  const version =
    Application.nativeApplicationVersion ?? Application.applicationId ?? ""
  const enriched = flattenParams({
    ...params,
    platform: Platform.OS,
    app_version: version,
  })

  if (__DEV__) {
    console.log("=== SEND EVENT ANALYTICS ===", eventName, enriched)
  }
}
