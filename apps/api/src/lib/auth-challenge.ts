import { randomUUID } from "crypto"
import { redis } from "./redis"
import { normalizePhoneKey } from "./phone"

const CHALLENGE_TTL_SEC = 10 * 60
export const MAX_CHALLENGE_VERIFY_ATTEMPTS = 5

export interface AuthChallengeRecord {
  challengeId: string
  phone: string
  createdAt: number
  consumed: boolean
  attempts: number
  deviceId: string | null
  ip: string | null
}

const challengeKey = (challengeId: string) => `auth:challenge:${challengeId}`
const activePhoneKey = (phone: string) => `auth:challenge:active:phone:${phone}`
const activeDeviceKey = (phone: string, deviceId: string) =>
  `auth:challenge:active:device:${phone}:${deviceId}`

async function getTtlSec(challengeId: string): Promise<number> {
  const ttl = await redis.ttl(challengeKey(challengeId))
  return ttl > 0 ? ttl : CHALLENGE_TTL_SEC
}

async function persistChallenge(
  record: AuthChallengeRecord,
  ttlSec?: number
): Promise<void> {
  const nextTtl = ttlSec ?? (await getTtlSec(record.challengeId))
  await redis.setex(
    challengeKey(record.challengeId),
    nextTtl,
    JSON.stringify(record)
  )
}

export async function getChallenge(
  challengeId: string
): Promise<AuthChallengeRecord | null> {
  const raw = await redis.get(challengeKey(challengeId))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthChallengeRecord
  } catch {
    return null
  }
}

export async function invalidateChallenge(challengeId: string): Promise<void> {
  const challenge = await getChallenge(challengeId)
  await redis.del(challengeKey(challengeId))

  if (!challenge) {
    return
  }

  const normalizedPhone = normalizePhoneKey(challenge.phone)
  const phoneKey = activePhoneKey(normalizedPhone)
  const currentPhoneChallengeId = await redis.get(phoneKey)
  if (currentPhoneChallengeId === challengeId) {
    await redis.del(phoneKey)
  }

  if (challenge.deviceId) {
    const deviceKey = activeDeviceKey(normalizedPhone, challenge.deviceId)
    const currentDeviceChallengeId = await redis.get(deviceKey)
    if (currentDeviceChallengeId === challengeId) {
      await redis.del(deviceKey)
    }
  }
}

export async function createChallenge(input: {
  phone: string
  deviceId: string | null
  ip: string | null
}): Promise<AuthChallengeRecord> {
  const normalizedPhone = normalizePhoneKey(input.phone)
  const existingChallengeIds = new Set<string>()
  const previousByPhone = await redis.get(activePhoneKey(normalizedPhone))
  if (previousByPhone) {
    existingChallengeIds.add(previousByPhone)
  }
  if (input.deviceId) {
    const previousByDevice = await redis.get(
      activeDeviceKey(normalizedPhone, input.deviceId)
    )
    if (previousByDevice) {
      existingChallengeIds.add(previousByDevice)
    }
  }

  for (const challengeId of existingChallengeIds) {
    await invalidateChallenge(challengeId)
  }

  const record: AuthChallengeRecord = {
    challengeId: randomUUID(),
    phone: normalizedPhone,
    createdAt: Date.now(),
    consumed: false,
    attempts: 0,
    deviceId: input.deviceId,
    ip: input.ip,
  }

  await persistChallenge(record, CHALLENGE_TTL_SEC)
  await redis.setex(
    activePhoneKey(normalizedPhone),
    CHALLENGE_TTL_SEC,
    record.challengeId
  )

  if (input.deviceId) {
    await redis.setex(
      activeDeviceKey(normalizedPhone, input.deviceId),
      CHALLENGE_TTL_SEC,
      record.challengeId
    )
  }

  return record
}

export async function consumeChallenge(
  challengeId: string
): Promise<AuthChallengeRecord | null> {
  const challenge = await getChallenge(challengeId)
  if (!challenge) {
    return null
  }

  challenge.consumed = true
  await persistChallenge(challenge)
  return challenge
}

export async function incrementChallengeAttempts(
  challengeId: string
): Promise<AuthChallengeRecord | null> {
  const challenge = await getChallenge(challengeId)
  if (!challenge) {
    return null
  }

  challenge.attempts += 1
  await persistChallenge(challenge)
  return challenge
}
