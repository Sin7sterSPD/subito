// Common API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// User types
export interface User {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImage: string | null;
  role: 'customer' | 'partner' | 'admin';
  referralCode: string | null;
  isOnboarded: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  notificationsEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  language: string;
}

// Address types
export type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

export interface Address {
  id: string;
  userId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  type: AddressType;
  houseNo?: string;
  buildingName?: string;
  landmark?: string;
  floor?: number;
  bhk?: number;
  bathroom?: number;
  balcony?: number;
  otherName?: string;
  otherPhone?: string;
  isDefault: boolean;
  canDelete: boolean;
}

// Location types
export type ServiceabilityStatus = 'SERVICEABLE' | 'NOT_SERVICEABLE' | 'NOT_EXIST';

export interface LocationAvailability {
  serviceable: ServiceabilityStatus;
  hubId?: string;
  microHubId?: string;
  dayClosingTime?: string;
  serviceableEndHour?: number;
  areaFeatureConfig?: Record<string, unknown>;
  kitConfig?: Record<string, unknown>;
}

export interface GeocodedAddress {
  address: string;
  city: string;
  state: string;
  pincode: string;
  area: string;
  closestPlace: string;
}

// Listing types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Catalog {
  id: string;
  name: string;
  description?: string;
  price: string;
  discountedPrice?: string;
  unit?: string;
  minQuantity: number;
  maxQuantity: number;
  stepQuantity: number;
  displayUnit?: string;
  dependentOn?: string;
  pricing?: CatalogPricing[];
}

export interface CatalogPricing {
  dependentOn: string;
  dependentValue: string;
  price: string;
}

export interface AddOn {
  id: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
}

export interface Listing {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  images?: string[];
  basePrice?: string;
  duration?: number;
  tags?: string[];
  faqs?: { question: string; answer: string }[];
  highlights?: string[];
  howItWorks?: string[];
  catalogs: Catalog[];
  addOns: AddOn[];
  category?: Category;
}

export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  originalPrice: string;
  bundlePrice: string;
  discountPercentage?: string;
  items: { catalogId: string; quantity: number; catalog: Catalog }[];
}

// Cart types
export type BookingType = 'INSTANT' | 'SCHEDULED' | 'RECURRING';
export type RecurringType = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface CartItem {
  id: string;
  catalogId: string;
  catalog?: Catalog;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  isQuickAdd: boolean;
  propertyConfig?: Record<string, unknown>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  bundle?: Bundle | null;
  coupon?: Coupon | null;
  deliveryAddressId?: string;
  address?: Address | null;
  bookingType: BookingType;
  recurringType?: RecurringType;
  timeSlot?: { time: { start: string }[] };
  totalPrice: string;
  totalAfterDiscount: string;
  discountAmount: string;
  gst: string;
  surgeApplicable: boolean;
  surgePrice: string;
  finalTotalAmount: string;
  version: number;
}

// Booking types
export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_MATCH'
  | 'MATCHED'
  | 'ARRIVING'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface BookingItem {
  id: string;
  catalogId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  catalog?: Catalog;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  userId: string;
  partnerId?: string;
  addressId: string;
  status: BookingStatus;
  bookingType: BookingType;
  recurringType?: RecurringType;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  subtotal?: string;
  discountAmount?: string;
  gstAmount?: string;
  surgeAmount?: string;
  totalAmount?: string;
  finalAmount?: string;
  customerNotes?: string;
  items: BookingItem[];
  address?: Address;
  partner?: Partner;
  startOtp?: string;
  endOtp?: string;
  createdAt: string;
}

export interface BookingSlot {
  startTime: string;
  isFull: boolean;
  isExperiencingSurge: boolean;
  surgePrice: number;
}

// Partner types
export type PartnerStatus = 'EN_ROUTE' | 'ARRIVED' | 'WORKING' | 'COMPLETED';

export interface Partner {
  id: string;
  userId: string;
  user?: User;
  phone?: string;
  name?: string;
  profileImage?: string;
  rating?: number;
  totalBookings?: number;
}

export interface PartnerLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  recordedAt: string;
}

// Coupon types
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: string;
  maxDiscountValue?: string;
  minCartValue?: string;
  validFrom?: string;
  validUntil?: string;
  isFirstTimeOnly: boolean;
  isActive: boolean;
}

// Payment types
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentMethod {
  id: string;
  type: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
  name: string;
  icon?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  bookingId?: string;
}

// Rating types
export interface Rating {
  id: string;
  bookingId: string;
  userId: string;
  partnerId?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// Referral types
export interface ReferralSummary {
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: string;
}

// Settings types
export interface AppSettings {
  isRecurring: boolean;
  isInstantBookingDisabled: boolean;
  isScheduleBookingDisabled: boolean;
  isRecurringBookingDisabled: boolean;
  testPhoneNumbers: string[];
  supportEmail: string;
  supportNumber: string;
  appVersions: {
    android: string;
    ios: string;
  };
  servicesExcludedForCleaningKit: string[];
}

// Refund types
export type RefundStatus = 'SUBMITTED' | 'PENDING' | 'CREDITED' | 'REJECTED';

export interface RefundDetails {
  refundStatus: RefundStatus;
  refundAmount: string;
  referenceId: string;
  timeLineData: { title: string; subtitle: string }[];
}
