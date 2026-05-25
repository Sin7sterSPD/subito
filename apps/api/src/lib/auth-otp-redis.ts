import { redis } from "./redis"
import { normalizePhoneKey } from "./phone"

const OTP_SEND_PHONE_PREFIX = "auth:otp:ratelimit:phone:"
const OTP_SEND_DEVICE_PREFIX = "auth:otp:ratelimit:device:"
const OTP_SEND_IP_PREFIX = "auth:otp:ratelimit:ip:"
const OTP_COOLDOWN_PREFIX = "auth:otp:cooldown:"
const OTP_ATTEMPT_PREFIX = "auth:otp:attempts:"

const MAX_PHONE_OTP_SENDS = 5
const MAX_DEVICE_OTP_SENDS = 10
const MAX_IP_OTP_SENDS = 20
const OTP_SEND_WINDOW_SEC = 15 * 60
const OTP_RESEND_COOLDOWN_SEC = 30

const MAX_VERIFY_ATTEMPTS = 5
const VERIFY_LOCKOUT_SEC = 15 * 60

const cooldownKey = (phone: string, deviceId: string | null) =>
  `${OTP_COOLDOWN_PREFIX}${phone}:${deviceId ?? "unknown"}`

async function checkRateLimitBucket(
  key: string,
  limit: number
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const raw = await redis.get(key)
  const count = raw ? parseInt(raw, 10) : 0
  if (count >= limit) {
    const ttl = await redis.ttl(key)
    return {
      allowed: false,
      retryAfterSec: ttl > 0 ? ttl : OTP_SEND_WINDOW_SEC,
    }
  }
  return { allowed: true }
}

export async function checkOtpSendAllowed(input: {
  phone: string
  deviceId: string | null
  ip: string | null
}): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const phone = normalizePhoneKey(input.phone)
  const resendCooldownKey = cooldownKey(phone, input.deviceId)
  const cooldownTtl = await redis.ttl(resendCooldownKey)
  if (cooldownTtl > 0) {
    return { allowed: false, retryAfterSec: cooldownTtl }
  }

  const bucketChecks = [
    checkRateLimitBucket(
      `${OTP_SEND_PHONE_PREFIX}${phone}`,
      MAX_PHONE_OTP_SENDS
    ),
  ]

  if (input.deviceId) {
    bucketChecks.push(
      checkRateLimitBucket(
        `${OTP_SEND_DEVICE_PREFIX}${input.deviceId}`,
        MAX_DEVICE_OTP_SENDS
      )
    )
  }

  if (input.ip) {
    bucketChecks.push(
      checkRateLimitBucket(`${OTP_SEND_IP_PREFIX}${input.ip}`, MAX_IP_OTP_SENDS)
    )
  }

  for (const result of await Promise.all(bucketChecks)) {
    if (!result.allowed) {
      return result
    }
  }

  return { allowed: true }
}

export async function recordOtpSend(input: {
  phone: string
  deviceId: string | null
  ip: string | null
}): Promise<number> {
  const phone = normalizePhoneKey(input.phone)
  const pipeline = redis.multi()

  pipeline.incr(`${OTP_SEND_PHONE_PREFIX}${phone}`)
  pipeline.expire(`${OTP_SEND_PHONE_PREFIX}${phone}`, OTP_SEND_WINDOW_SEC)

  if (input.deviceId) {
    pipeline.incr(`${OTP_SEND_DEVICE_PREFIX}${input.deviceId}`)
    pipeline.expire(
      `${OTP_SEND_DEVICE_PREFIX}${input.deviceId}`,
      OTP_SEND_WINDOW_SEC
    )
  }

  if (input.ip) {
    pipeline.incr(`${OTP_SEND_IP_PREFIX}${input.ip}`)
    pipeline.expire(`${OTP_SEND_IP_PREFIX}${input.ip}`, OTP_SEND_WINDOW_SEC)
  }

  pipeline.setex(
    cooldownKey(phone, input.deviceId),
    OTP_RESEND_COOLDOWN_SEC,
    "1"
  )

  await pipeline.exec()
  return OTP_RESEND_COOLDOWN_SEC
}

export async function checkVerifyAttemptsAllowed(
  phone: string
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const key = `${OTP_ATTEMPT_PREFIX}${normalizePhoneKey(phone)}`
  const raw = await redis.get(key)
  const count = raw ? parseInt(raw, 10) : 0
  if (count >= MAX_VERIFY_ATTEMPTS) {
    const ttl = await redis.ttl(key)
    return {
      allowed: false,
      retryAfterSec: ttl > 0 ? ttl : VERIFY_LOCKOUT_SEC,
    }
  }
  return { allowed: true }
}

export async function recordVerifyFailure(phone: string): Promise<void> {
  const key = `${OTP_ATTEMPT_PREFIX}${normalizePhoneKey(phone)}`
  const pipeline = redis.multi()
  pipeline.incr(key)
  pipeline.expire(key, VERIFY_LOCKOUT_SEC)
  await pipeline.exec()
}

export async function clearOtpKeysForPhone(phone: string): Promise<void> {
  const p = normalizePhoneKey(phone)
  await redis.del(`${OTP_SEND_PHONE_PREFIX}${p}`, `${OTP_ATTEMPT_PREFIX}${p}`)
}
