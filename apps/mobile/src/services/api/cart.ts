import { apiClient } from '../api-client';
import { Cart, BookingType, RecurringType } from '../../types/api';

interface AddItemData {
  catalogInfo: {
    catalogId: string;
    quantity: number;
    propertyConfig?: Record<string, unknown>;
  };
  isQuickAdd?: boolean;
  forceAdd?: boolean;
  bundleId?: string;
  bundleInfo?: { bundleId: string };
}

interface UpdateCartData {
  deliveryAddressId?: string;
  bookingType?: BookingType;
  timeSlot?: { time: { start: string }[] };
  recurringType?: RecurringType;
}

interface UpdateCartItemData {
  catalogItemId: string;
  changeType: 'INCREMENT' | 'DECREMENT';
  isQuickAdd?: boolean;
  quantity?: number;
  listingItemId?: string;
}

interface CheckoutData {
  paymentMethodId?: string;
  amount?: number;
  meta?: { orderSource: string };
  cartVersion: number;
}

interface CheckoutV2Data {
  cartVersion: number;
}

interface ExtendedCheckoutData {
  bookingId: string;
  additionalItems: { catalogId: string; quantity: number }[];
  cartVersion: number;
}

interface VerifyPaymentData {
  orderId: string;
  paymentId: string;
  signature: string;
}

export const cartApi = {
  getCart: () => apiClient.get<Cart>('/cart/v2'),

  addItem: (data: AddItemData) => apiClient.post<Cart>('/cart/v2', data),

  createCart: () => apiClient.post<Cart>('/cart'),

  updateCart: (data: UpdateCartData) => apiClient.patch<Cart>('/cart', data),

  updateCartItem: (data: UpdateCartItemData) =>
    apiClient.patch<Cart>('/cart/UpdateCartItem', data),

  removeItem: (data: { itemId?: string; bundleId?: string }) =>
    apiClient.delete<Cart>('/cart/item', data),

  removeInactiveItems: () => apiClient.post<Cart>('/cart/remove-inactive', {}),

  checkout: (data: CheckoutData, idempotencyKey?: string) => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return apiClient.post<{ orderId: string; amount: string; currency: string; status: string }>(
      '/cart/checkout',
      data
    );
  },

  checkoutV2: (data: CheckoutV2Data, idempotencyKey?: string) =>
    apiClient.post<{
      bookingId: string;
      bookingNumber: string;
      orderId: string;
      amount: string;
      currency: string;
      status: string;
    }>('/cart/checkout-v2', data),

  extendedCheckout: (data: ExtendedCheckoutData, idempotencyKey?: string) =>
    apiClient.post<{
      bookingId: string;
      extensionOrderId: string;
      extensionAmount: string;
      newTotalAmount: string;
    }>('/cart/checkout/extended', data),

  verifyPayment: (data: VerifyPaymentData) =>
    apiClient.post<{ verified: boolean; orderId: string }>('/cart/verify-payment', data),
};
