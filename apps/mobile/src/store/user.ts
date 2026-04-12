import { create } from 'zustand';
import { Address, UserPreferences, ReferralSummary } from '../types/api';
import { usersApi, addressesApi, referralsApi } from '../services/api';

interface UserState {
  addresses: Address[];
  selectedAddress: Address | null;
  preferences: UserPreferences | null;
  referralSummary: ReferralSummary | null;
  isLoading: boolean;

  // Address actions
  fetchAddresses: (lat?: number, lng?: number) => Promise<void>;
  addAddress: (address: Omit<Address, 'id' | 'userId' | 'canDelete'>) => Promise<Address | null>;
  updateAddress: (address: Partial<Address> & { id: string }) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setSelectedAddress: (address: Address | null) => void;

  // Preferences actions
  fetchPreferences: () => Promise<void>;

  // Profile actions
  updateProfile: (data: { firstName?: string; lastName?: string; email?: string; profileImage?: string }) => Promise<boolean>;

  // Referral actions
  fetchReferralSummary: () => Promise<void>;

  // Reset
  reset: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  addresses: [],
  selectedAddress: null,
  preferences: null,
  referralSummary: null,
  isLoading: false,

  fetchAddresses: async (lat, lng) => {
    set({ isLoading: true });
    try {
      const response = await addressesApi.getAddresses({
        lat,
        lng,
        nearestAddressRequired: true,
      });
      if (response.success && response.data) {
        const addresses = response.data;
        set({ addresses });

        // Auto-select default or nearest
        const defaultAddr = addresses.find((a) => a.isDefault);
        if (defaultAddr && !get().selectedAddress) {
          set({ selectedAddress: defaultAddr });
        } else if (!get().selectedAddress && addresses.length > 0) {
          set({ selectedAddress: addresses[0] });
        }
      }
    } catch {
      // Silent fail
    } finally {
      set({ isLoading: false });
    }
  },

  addAddress: async (addressData) => {
    set({ isLoading: true });
    try {
      const response = await addressesApi.createAddress(addressData as Parameters<typeof addressesApi.createAddress>[0]);
      if (response.success && response.data) {
        const newAddress = response.data;
        set((state) => ({
          addresses: [...state.addresses, newAddress],
        }));
        return newAddress;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateAddress: async (addressData) => {
    set({ isLoading: true });
    try {
      const response = await addressesApi.updateAddress(addressData);
      if (response.success && response.data) {
        const updated = response.data;
        set((state) => ({
          addresses: state.addresses.map((a) =>
            a.id === updated.id ? updated : a
          ),
          selectedAddress:
            state.selectedAddress?.id === updated.id
              ? updated
              : state.selectedAddress,
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

  deleteAddress: async (id) => {
    set({ isLoading: true });
    try {
      const response = await addressesApi.deleteAddress(id);
      if (response.success) {
        set((state) => ({
          addresses: state.addresses.filter((a) => a.id !== id),
          selectedAddress:
            state.selectedAddress?.id === id ? null : state.selectedAddress,
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

  setSelectedAddress: (address) => set({ selectedAddress: address }),

  fetchPreferences: async () => {
    try {
      const response = await usersApi.getPreferences();
      if (response.success && response.data) {
        set({ preferences: response.data });
      }
    } catch {
      // Silent fail
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const response = await usersApi.updateUser(data);
      if (response.success) {
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchReferralSummary: async () => {
    try {
      const response = await referralsApi.getSummary();
      if (response.success && response.data) {
        set({ referralSummary: response.data });
      }
    } catch {
      // Silent fail
    }
  },

  reset: () =>
    set({
      addresses: [],
      selectedAddress: null,
      preferences: null,
      referralSummary: null,
      isLoading: false,
    }),
}));
