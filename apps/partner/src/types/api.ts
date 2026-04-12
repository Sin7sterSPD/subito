export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface User {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImage: string | null;
  role: "customer" | "partner" | "admin";
  referralCode: string | null;
  isOnboarded: boolean;
}

export interface PartnerProfile {
  id: string;
  userId: string;
  name: string;
  phone: string;
  profileImage: string | null;
  status: string;
  availabilityStatus: string;
  rating: string | null;
  totalRatings: number | null;
  totalBookings: number | null;
  completedBookings: number | null;
  services: { id: string; partnerId: string; serviceId: string; isActive: boolean }[];
}

export interface PartnerBookingListItem {
  id: string;
  bookingNumber: string;
  status: string;
  partnerId: string | null;
  cancellationAwaitingPartnerAck: boolean;
  scheduledDate: string | null;
  scheduledStartTime: string | null;
  address: {
    addressLine1: string;
    city: string;
    latitude: number;
    longitude: number;
  } | null;
  items: { id: string; name: string; quantity: number }[];
}
