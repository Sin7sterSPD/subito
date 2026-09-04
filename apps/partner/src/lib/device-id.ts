import * as SecureStore from "expo-secure-store"

const DEVICE_ID_KEY = "subito.partner.device-id"

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

/**
 * Stable per-installation ID sent as X-Device-ID. The API binds sessions to
 * the device they were issued on, so this must never change while a session
 * exists — hence SecureStore, not AsyncStorage.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (existing) {
    return existing
  }

  const deviceId = generateUuid()
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId)
  return deviceId
}
