export type UserRole = "customer" | "partner" | "admin";

export type BookingType = "INSTANT" | "SCHEDULED" | "RECURRING";
export type RecurringType = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "PENDING_MATCH"
  | "MATCHED"
  | "ARRIVING"
  | "STARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended";
export type PartnerAvailabilityStatus = "online" | "offline" | "busy";
export type PartnerBookingStatus = "EN_ROUTE" | "ARRIVED" | "WORKING" | "COMPLETED";

export type AddressType = "HOME" | "OFFICE" | "OTHER";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod = "UPI" | "CARD" | "NETBANKING" | "WALLET" | "COD" | "OTHER";

export type DiscountType = "PERCENTAGE" | "FLAT";

export type ServiceabilityStatus = "SERVICEABLE" | "NOT_SERVICEABLE" | "NOT_EXIST";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface TimeSlot {
  time: { start: string }[];
}
