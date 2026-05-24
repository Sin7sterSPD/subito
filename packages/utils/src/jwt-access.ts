/** Decode JWT `exp` (unix seconds) without verifying — client-side hint only. */
export function getJwtExpiryUnix(token: string | null): number | null {
  if (!token) return null
  const parts = token.split(".")
  if (parts.length < 2) return null
  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/")
    const pad = "=".repeat((4 - (base64.length % 4)) % 4)
    const json = atob(base64 + pad)
    const payload = JSON.parse(json) as { exp?: number }
    return typeof payload.exp === "number" ? payload.exp : null
  } catch {
    return null
  }
}

export function isAccessTokenExpiringSoon(
  token: string | null,
  bufferSec = 120
): boolean {
  const exp = getJwtExpiryUnix(token)
  if (exp == null) return false
  const now = Math.floor(Date.now() / 1000)
  return exp - now < bufferSec
}
