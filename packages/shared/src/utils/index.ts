export function formatPhone(phone: string): string {
  if (phone.startsWith("+91")) {
    return phone
  }
  if (phone.startsWith("91") && phone.length === 12) {
    return `+${phone}`
  }
  if (phone.length === 10) {
    return `+91${phone}`
  }
  return phone
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/
  return phoneRegex.test(phone.replace(/\s/g, ""))
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100
}