import { nanoid } from "nanoid";

export function generateBookingNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = nanoid(6).toUpperCase();
  return `BK${year}${month}${day}${random}`;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(8).toUpperCase();
  return `ORD${timestamp}${random}`;
}

export function generateRefundId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `RF${timestamp}${random}`;
}

export function generatePaymentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(8).toUpperCase();
  return `PAY${timestamp}${random}`;
}

export function generateTicketNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = nanoid(6).toUpperCase();
  return `TKT${year}${month}${random}`;
}

export function generateReferralCode(name?: string): string {
  const prefix = name
    ? name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X")
    : "REF";
  const random = nanoid(5).toUpperCase();
  return `${prefix}${random}`;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
} {
  const total = items.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = items.slice(startIndex, endIndex);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      hasMore: endIndex < total,
    },
  };
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}

export function calculateGST(amount: number, rate = 0.18): number {
  return roundToTwoDecimals(amount * rate);
}
