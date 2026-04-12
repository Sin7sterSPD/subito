import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, Coupon } from '../types/api';
import { settingsApi, couponsApi } from '../services/api';

interface AppState {
  settings: AppSettings | null;
  bestCoupon: Coupon | null;
  availableCoupons: Coupon[];
  isOnboardingComplete: boolean;
  fcmToken: string | null;
  deviceId: string | null;

  fetchSettings: () => Promise<void>;
  fetchBestCoupon: (lat: number, lng: number) => Promise<void>;
  fetchCoupons: () => Promise<void>;
  setOnboardingComplete: (complete: boolean) => void;
  setFcmToken: (token: string) => void;
  setDeviceId: (deviceId: string) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: null,
      bestCoupon: null,
      availableCoupons: [],
      isOnboardingComplete: false,
      fcmToken: null,
      deviceId: null,

      fetchSettings: async () => {
        try {
          const response = await settingsApi.getSettings();
          if (response.success && response.data) {
            set({ settings: response.data });
          }
        } catch {
          // Silent fail
        }
      },

      fetchBestCoupon: async (lat, lng) => {
        try {
          const response = await couponsApi.getBestCoupon(lat, lng);
          if (response.success && response.data) {
            set({ bestCoupon: response.data });
          }
        } catch {
          // Silent fail
        }
      },

      fetchCoupons: async () => {
        try {
          const response = await couponsApi.getCoupons();
          if (response.success && response.data) {
            set({ availableCoupons: response.data });
          }
        } catch {
          // Silent fail
        }
      },

      setOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),
      setFcmToken: (token) => set({ fcmToken: token }),
      setDeviceId: (deviceId) => set({ deviceId }),

      reset: () =>
        set({
          settings: null,
          bestCoupon: null,
          availableCoupons: [],
        }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isOnboardingComplete: state.isOnboardingComplete,
        fcmToken: state.fcmToken,
        deviceId: state.deviceId,
      }),
    }
  )
);
