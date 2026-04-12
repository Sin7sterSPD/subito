import { create } from 'zustand';
import { Category, Listing, Bundle } from '../types/api';
import { listingsApi } from '../services/api';

interface CategoryWithListings extends Category {
  listings: Listing[];
}

interface ListingsState {
  categories: CategoryWithListings[];
  bundles: Bundle[];
  selectedCategory: Category | null;
  selectedListing: Listing | null;
  isLoading: boolean;

  fetchListings: (lat?: number, lng?: number) => Promise<void>;
  fetchPublicListings: (lat?: number, lng?: number) => Promise<void>;
  fetchListingById: (id: string) => Promise<Listing | null>;
  fetchServiceById: (id: string) => Promise<Listing | null>;
  setSelectedCategory: (category: Category | null) => void;
  setSelectedListing: (listing: Listing | null) => void;
  reset: () => void;
}

export const useListingsStore = create<ListingsState>((set) => ({
  categories: [],
  bundles: [],
  selectedCategory: null,
  selectedListing: null,
  isLoading: false,

  fetchListings: async (lat, lng) => {
    set({ isLoading: true });
    try {
      const response = await listingsApi.getListings({ lat, lng });
      if (response.success && response.data) {
        set({
          categories: response.data.categories,
          bundles: response.data.bundles || [],
        });
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPublicListings: async (lat, lng) => {
    set({ isLoading: true });
    try {
      const response = await listingsApi.getPublicListings({ lat, lng });
      if (response.success && response.data) {
        set({
          categories: response.data.categories,
          bundles: response.data.bundles || [],
        });
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  fetchListingById: async (id) => {
    set({ isLoading: true });
    try {
      const response = await listingsApi.getListingById(id);
      if (response.success && response.data) {
        set({ selectedListing: response.data });
        return response.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchServiceById: async (id) => {
    set({ isLoading: true });
    try {
      const response = await listingsApi.getServiceById(id);
      if (response.success && response.data) {
        set({ selectedListing: response.data });
        return response.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedListing: (listing) => set({ selectedListing: listing }),

  reset: () =>
    set({
      categories: [],
      bundles: [],
      selectedCategory: null,
      selectedListing: null,
      isLoading: false,
    }),
}));
