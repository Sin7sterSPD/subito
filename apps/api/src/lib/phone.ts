import { parsePhoneNumberFromString } from "libphonenumber-js"
import { BadRequestError } from "./errors"

const DEFAULT_COUNTRY = "IN"

function parsePhone(phone: string) {
  return parsePhoneNumberFromString(phone, DEFAULT_COUNTRY)
}

export function normalizePhoneNumber(phone: string): string {
  const parsed = parsePhone(phone)
  if (!parsed || !parsed.isValid()) {
    throw new BadRequestError("Invalid phone number")
  }
  return parsed.number
}

export function getPhoneLookupCandidates(phone: string): string[] {
  const parsed = parsePhone(phone)
  if (!parsed || !parsed.isValid()) {
    return [phone.trim()]
  }

  const candidates = new Set<string>()
  candidates.add(parsed.number)

  const nationalNumber = parsed.nationalNumber
  if (nationalNumber) {
    candidates.add(nationalNumber)
  }

  return [...candidates]
}

export function phonesMatch(a: string, b: string): boolean {
  try {
    return normalizePhoneNumber(a) === normalizePhoneNumber(b)
  } catch {
    return false
  }
}

export function normalizePhoneKey(phone: string): string {
  try {
    return normalizePhoneNumber(phone)
  } catch {
    return phone.replace(/\s+/g, "").trim()
  }
}
