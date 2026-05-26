import "../env"
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto"

const PREFIX = "pii1:"
const IV_LEN = 12
const TAG_LEN = 16

function getKey32(): Buffer | null {
  const raw = process.env.PII_ENCRYPTION_KEY
  if (!raw || raw.length < 8) {
    return null
  }
  // 32 bytes: pass hex (64 chars) or any string (scrypt-stretched for dev)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex")
  }
  return scryptSync(raw, "subito-pii-salt", 32)
}

/**
 * AES-256-GCM at-rest for partner PII columns. If PII_ENCRYPTION_KEY is unset, returns plaintext (dev only).
 * Production: set 64-char hex (32 bytes) in PII_ENCRYPTION_KEY.
 */
export function encryptPii(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") {
    return plain ?? null
  }
  const key = getKey32()
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PII_ENCRYPTION_KEY is required in production to store partner PII"
      )
    }
    return plain
  }
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64url")
}

export function decryptPii(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") {
    return stored ?? null
  }
  if (!stored.startsWith(PREFIX)) {
    return stored
  }
  const key = getKey32()
  if (!key) {
    return stored
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64url")
  if (raw.length < IV_LEN + TAG_LEN) {
    return null
  }
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const data = raw.subarray(IV_LEN + TAG_LEN)
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    )
  } catch {
    return null
  }
}
