export interface ApiResponse<T> {
  success: boolean
  data?: T
  /** Present on list endpoints (bookings). */
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

export interface User {
  id: string
  phone: string
  firstName: string | null
  lastName: string | null
  email: string | null
  profileImage: string | null
  role: "customer" | "partner" | "admin"
  referralCode: string | null
  isOnboarded: boolean
}

export interface PartnerProfile {
  id: string
  userId: string
  name: string
  phone: string
  profileImage: string | null
  status: string
  availabilityStatus: string
  rating: string | null
  totalRatings: number | null
  totalBookings: number | null
  completedBookings: number | null
  services: { id: string; partnerId: string; serviceId: string; isActive: boolean }[]
}

export interface BookingAddress {
  id?: string
  label?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  pincode?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface BookingItem {
  id: string
  name: string
  quantity: number
  unitPrice?: string | null
  totalPrice?: string | null
}

export interface PartnerBookingListItem {
  id: string
  bookingNumber: string
  status: string
  bookingType?: "INSTANT" | "SCHEDULED" | "RECURRING"
  cancellationAwaitingPartnerAck: boolean
  cancellationRequestedAt?: string | null
  scheduledDate: string | null
  scheduledStartTime: string | null
  scheduledEndTime?: string | null
  customerNotes?: string | null
  address: BookingAddress | null
  items: BookingItem[]
}

/** Full booking payload from GET /bookings/:id (partner-scoped). */
export interface PartnerBookingDetail extends PartnerBookingListItem {
  startedAt?: string | null
  completedAt?: string | null
  finalAmount?: string | null
  partnerNotes?: string | null
}

export type PartnerBookingAction =
  | "EN_ROUTE"
  | "ARRIVED"
  | "WORKING"
  | "COMPLETED"

export type AvailabilityStatus = "online" | "offline" | "busy"
