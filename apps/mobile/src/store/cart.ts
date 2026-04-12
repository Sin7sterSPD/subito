import { create } from 'zustand';
import { Cart, CartItem, BookingType, RecurringType } from '../types/api';
import { cartApi, couponsApi } from '../services/api';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;

  fetchCart: () => Promise<void>;
  addItem: (
    catalogId: string,
    quantity: number,
    options?: {
      isQuickAdd?: boolean;
      forceAdd?: boolean;
      bundleId?: string;
      propertyConfig?: Record<string, unknown>;
    }
  ) => Promise<boolean>;
  updateItem: (
    catalogItemId: string,
    changeType: 'INCREMENT' | 'DECREMENT',
    options?: { quantity?: number; listingItemId?: string; isQuickAdd?: boolean }
  ) => Promise<boolean>;
  removeItem: (itemId?: string, bundleId?: string) => Promise<boolean>;
  removeInactiveItems: () => Promise<boolean>;
  updateCart: (data: {
    deliveryAddressId?: string;
    bookingType?: BookingType;
    timeSlot?: { time: { start: string }[] };
    recurringType?: RecurringType;
  }) => Promise<boolean>;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: () => Promise<boolean>;
  checkout: (paymentMethodId?: string, amount?: number) => Promise<{ orderId: string | null; error?: string }>;
  checkoutV2: () => Promise<{ bookingId: string | null; orderId: string | null; error?: string }>;
  clearCart: () => void;
  setCart: (cart: Cart) => void;
  reset: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.getCart();
      if (response.success && response.data) {
        set({ cart: response.data });
      }
    } catch {
      set({ error: 'Failed to fetch cart' });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (catalogId, quantity, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.addItem({
        catalogInfo: {
          catalogId,
          quantity,
          propertyConfig: options.propertyConfig,
        },
        isQuickAdd: options.isQuickAdd,
        forceAdd: options.forceAdd,
        bundleId: options.bundleId,
        bundleInfo: options.bundleId ? { bundleId: options.bundleId } : undefined,
      });
      if (response.success && response.data) {
        set({ cart: response.data });
        return true;
      }
      return false;
    } catch {
      set({ error: 'Failed to add item' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (catalogItemId, changeType, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.updateCartItem({
        catalogItemId,
        changeType,
        quantity: options.quantity,
        listingItemId: options.listingItemId,
        isQuickAdd: options.isQuickAdd,
      });
      if (response.success && response.data) {
        set({ cart: response.data });
        return true;
      }
      return false;
    } catch {
      set({ error: 'Failed to update item' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (itemId, bundleId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.removeItem({ itemId, bundleId });
      if (response.success && response.data) {
        set({ cart: response.data });
        return true;
      }
      return false;
    } catch {
      set({ error: 'Failed to remove item' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  removeInactiveItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.removeInactiveItems();
      if (response.success && response.data) {
        set({ cart: response.data });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateCart: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.updateCart(data);
      if (response.success && response.data) {
        set({ cart: response.data });
        return true;
      }
      return false;
    } catch {
      set({ error: 'Failed to update cart' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  applyCoupon: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const response = await couponsApi.applyCoupon(code);
      if (response.success) {
        await get().fetchCart();
        return { success: true };
      }
      return { success: false, error: response.error?.message || 'Failed to apply coupon' };
    } catch {
      return { success: false, error: 'Failed to apply coupon' };
    } finally {
      set({ isLoading: false });
    }
  },

  removeCoupon: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await couponsApi.removeCoupon();
      if (response.success) {
        await get().fetchCart();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  checkout: async (paymentMethodId, amount) => {
    const { cart } = get();
    if (!cart) return { orderId: null, error: 'No cart' };

    set({ isLoading: true, error: null });
    try {
      const idempotencyKey = `checkout_${cart.id}_${Date.now()}`;
      const response = await cartApi.checkout(
        {
          paymentMethodId,
          amount,
          meta: { orderSource: 'mobile' },
          cartVersion: cart.version,
        },
        idempotencyKey
      );
      if (response.success && response.data) {
        return { orderId: response.data.orderId };
      }
      return { orderId: null, error: response.error?.message || 'Checkout failed' };
    } catch {
      return { orderId: null, error: 'Checkout failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  checkoutV2: async () => {
    const { cart } = get();
    if (!cart) return { bookingId: null, orderId: null, error: 'No cart' };

    set({ isLoading: true, error: null });
    try {
      const idempotencyKey = `checkout_v2_${cart.id}_${Date.now()}`;
      const response = await cartApi.checkoutV2(
        { cartVersion: cart.version },
        idempotencyKey
      );
      if (response.success && response.data) {
        return {
          bookingId: response.data.bookingId,
          orderId: response.data.orderId,
        };
      }
      return { bookingId: null, orderId: null, error: response.error?.message || 'Checkout failed' };
    } catch {
      return { bookingId: null, orderId: null, error: 'Checkout failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: () => set({ cart: null }),
  setCart: (cart) => set({ cart }),

  reset: () =>
    set({
      cart: null,
      isLoading: false,
      error: null,
    }),
}));
