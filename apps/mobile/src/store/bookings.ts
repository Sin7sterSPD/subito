import { create } from 'zustand';
import { Booking, BookingSlot, BookingStatus, BookingType, PartnerLocation } from '../types/api';
import { bookingsApi } from '../services/api';

interface BookingsState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  slots: Record<string, BookingSlot[]>;
  availableDates: string[];
  partnerLocation: PartnerLocation | null;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  fetchBookings: (status?: BookingStatus[], refresh?: boolean) => Promise<void>;
  fetchBookingsV2: (status?: BookingStatus[], bookingType?: BookingType[], refresh?: boolean) => Promise<void>;
  fetchBookingById: (id: string) => Promise<Booking | null>;
  fetchLatestBooking: (userId: string) => Promise<Booking | null>;
  fetchSlots: (lat: number, lng: number, bookingType?: BookingType, days?: number) => Promise<void>;
  fetchPartnerLocation: (bookingId: string) => Promise<PartnerLocation | null>;
  cancelBooking: (bookingId: string, reason: string) => Promise<boolean>;
  rescheduleBooking: (instanceId: string, rescheduleTo: string) => Promise<boolean>;
  setSelectedBooking: (booking: Booking | null) => void;
  reset: () => void;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  bookings: [],
  selectedBooking: null,
  slots: {},
  availableDates: [],
  partnerLocation: null,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchBookings: async (status, refresh = false) => {
    const currentPage = refresh ? 1 : get().page;
    set({ isLoading: true });

    try {
      const response = await bookingsApi.getBookings({
        page: currentPage,
        limit: 10,
        status,
      });

      if (response.success && response.data) {
        const { bookings, meta } = response.data;
        set((state) => ({
          bookings: refresh ? bookings : [...state.bookings, ...bookings],
          hasMore: meta.hasMore,
          page: currentPage + 1,
        }));
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBookingsV2: async (status, bookingType, refresh = false) => {
    const currentPage = refresh ? 1 : get().page;
    set({ isLoading: true });

    try {
      const response = await bookingsApi.getBookingsV2({
        page: currentPage,
        limit: 10,
        status,
        bookingType,
      });

      if (response.success && response.data) {
        const { bookings, meta } = response.data;
        set((state) => ({
          bookings: refresh ? bookings : [...state.bookings, ...bookings],
          hasMore: meta.hasMore,
          page: currentPage + 1,
        }));
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBookingById: async (id) => {
    set({ isLoading: true });
    try {
      const response = await bookingsApi.getBookingById(id);
      if (response.success && response.data) {
        set({ selectedBooking: response.data });
        return response.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLatestBooking: async (userId) => {
    try {
      const response = await bookingsApi.getLatestBooking(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  fetchSlots: async (lat, lng, bookingType, days = 7) => {
    set({ isLoading: true });
    try {
      const response = await bookingsApi.getSlots({
        lat,
        lng,
        bookingType,
        days,
      });
      if (response.success && response.data) {
        set({
          slots: response.data.slots,
          availableDates: response.data.availableDates,
        });
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPartnerLocation: async (bookingId) => {
    try {
      const response = await bookingsApi.getPartnerLocation(bookingId);
      if (response.success && response.data?.location) {
        set({ partnerLocation: response.data.location });
        return response.data.location;
      }
      return null;
    } catch {
      return null;
    }
  },

  cancelBooking: async (bookingId, reason) => {
    set({ isLoading: true });
    try {
      const response = await bookingsApi.cancelBooking({ bookingId, reason });
      if (response.success) {
        // Update the booking in the list
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'CANCELLED' as BookingStatus } : b
          ),
          selectedBooking:
            state.selectedBooking?.id === bookingId
              ? { ...state.selectedBooking, status: 'CANCELLED' as BookingStatus }
              : state.selectedBooking,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  rescheduleBooking: async (instanceId, rescheduleTo) => {
    set({ isLoading: true });
    try {
      const response = await bookingsApi.rescheduleInstance(instanceId, {
        rescheduleTo,
      });
      return response.success;
    } catch {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedBooking: (booking) => set({ selectedBooking: booking }),

  reset: () =>
    set({
      bookings: [],
      selectedBooking: null,
      slots: {},
      availableDates: [],
      partnerLocation: null,
      isLoading: false,
      hasMore: true,
      page: 1,
    }),
}));
