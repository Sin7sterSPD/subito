import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/api';
import { apiClient } from '../services/api-client';
import { authApi, usersApi } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  verificationToken: string | null;
  mobileNumber: string | null;

  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setVerification: (token: string, mobileNumber: string) => void;
  login: (mobileNumber: string) => Promise<{ success: boolean; isExistingUser: boolean }>;
  verify: (idtoken: string, referralCode?: string) => Promise<{ success: boolean; isNewUser: boolean }>;
  refreshAccessToken: () => Promise<boolean>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearVerification: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      verificationToken: null,
      mobileNumber: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => {
        apiClient.setAuthToken(accessToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setVerification: (token, mobileNumber) =>
        set({ verificationToken: token, mobileNumber }),

      clearVerification: () =>
        set({ verificationToken: null, mobileNumber: null }),

      login: async (mobileNumber) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(mobileNumber);
          if (response.success && response.data) {
            set({
              verificationToken: response.data.token,
              mobileNumber: response.data.mobileNumber,
            });
            return { success: true, isExistingUser: response.data.isExistingUser };
          }
          return { success: false, isExistingUser: false };
        } catch {
          return { success: false, isExistingUser: false };
        } finally {
          set({ isLoading: false });
        }
      },

      verify: async (idtoken, referralCode) => {
        const { verificationToken, mobileNumber } = get();
        if (!verificationToken || !mobileNumber) {
          return { success: false, isNewUser: false };
        }

        set({ isLoading: true });
        try {
          const response = await authApi.verify({
            token: verificationToken,
            idtoken,
            mobileNumber,
            referralCode,
          });

          if (response.success && response.data) {
            const { jwt_token, refreshToken, userData, isNewUser } = response.data;
            apiClient.setAuthToken(jwt_token);
            set({
              user: userData,
              accessToken: jwt_token,
              refreshToken,
              isAuthenticated: true,
              verificationToken: null,
              mobileNumber: null,
            });
            return { success: true, isNewUser };
          }
          return { success: false, isNewUser: false };
        } catch {
          return { success: false, isNewUser: false };
        } finally {
          set({ isLoading: false });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const response = await authApi.refresh(refreshToken);
          if (response.success && response.data) {
            const { jwt_token, refreshToken: newRefreshToken } = response.data;
            apiClient.setAuthToken(jwt_token);
            set({
              accessToken: jwt_token,
              refreshToken: newRefreshToken,
            });
            return true;
          }
          // If refresh fails, logout
          get().logout();
          return false;
        } catch {
          get().logout();
          return false;
        }
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const response = await usersApi.getUser();
          if (response.success && response.data) {
            set({ user: response.data });
          }
        } catch {
          // Silent fail
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Continue logout even if API fails
        }
        apiClient.setAuthToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          verificationToken: null,
          mobileNumber: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          apiClient.setAuthToken(state.accessToken);
        }
      },
    }
  )
);
