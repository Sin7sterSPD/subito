import * as SecureStore from "expo-secure-store"
import * as Application from "expo-application"
import { Platform } from "react-native"

const DEVICE_ID_KEY = "subito.device-id"

function randomHex(length: number): string {
  let output = ""
  while (output.length < length) {
    output += Math.floor(Math.random() * 16).toString(16)
  }
  return output.slice(0, length)
}

function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return [
    randomHex(8),
    randomHex(4),
    `4${randomHex(3)}`,
    `${(Math.floor(Math.random() * 4) + 8).toString(16)}${randomHex(3)}`,
    randomHex(12),
  ].join("-")
}

async function getNativeInstallationId(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      return Application.getAndroidId() || null
    }
    return await Application.getIosIdForVendorAsync()
  } catch {
    return null
  }
}

export async function getOrCreateDeviceId(
  legacyDeviceId?: string | null
): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (existing) {
    return existing
  }

  const migratedLegacyId = legacyDeviceId?.trim()
  if (migratedLegacyId) {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, migratedLegacyId)
    return migratedLegacyId
  }

  await getNativeInstallationId()

  const deviceId = generateUuid()
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId)
  return deviceId
}
