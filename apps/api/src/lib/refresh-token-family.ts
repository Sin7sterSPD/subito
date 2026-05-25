import { redis } from "./redis"

const familyRevokedKey = (familyId: string) =>
  `auth:refresh:family:revoked:${familyId}`
const rotatedTokenKey = (familyId: string, tokenHash: string) =>
  `auth:refresh:family:used:${familyId}:${tokenHash}`

export async function markRefreshTokenRotated(
  familyId: string,
  tokenHash: string,
  ttlSec: number
): Promise<void> {
  await redis.setex(rotatedTokenKey(familyId, tokenHash), ttlSec, "1")
}

export async function wasRefreshTokenRotated(
  familyId: string,
  tokenHash: string
): Promise<boolean> {
  const result = await redis.get(rotatedTokenKey(familyId, tokenHash))
  return result === "1"
}

export async function revokeRefreshTokenFamily(
  familyId: string,
  ttlSec: number
): Promise<void> {
  await redis.setex(familyRevokedKey(familyId), ttlSec, "1")
}

export async function isRefreshTokenFamilyRevoked(
  familyId: string
): Promise<boolean> {
  const result = await redis.get(familyRevokedKey(familyId))
  return result === "1"
}
