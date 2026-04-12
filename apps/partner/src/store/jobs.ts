import { create } from "zustand";
import type { PartnerBookingListItem } from "../types/api";
import { partnersApi } from "../services/api";

interface JobsState {
  bookings: PartnerBookingListItem[];
  isLoading: boolean;
  error: string | null;
  fetchBookings: () => Promise<void>;
  reset: () => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  bookings: [],
  isLoading: false,
  error: null,

  fetchBookings: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await partnersApi.getMyBookings();
      if (res.success && res.data) {
        set({ bookings: res.data as PartnerBookingListItem[] });
      } else {
        set({ error: res.error?.message || "Failed to load jobs" });
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to load jobs" });
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () => set({ bookings: [], isLoading: false, error: null }),
}));
