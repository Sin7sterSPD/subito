import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PartnerProfile, User } from "../types/api";
import { apiClient } from "../services/api-client";
import { authApi, partnersApi } from "../services/api";
import { clearSecureTokens, loadSecureTokens, saveSecureTokens } from "../lib/secure-tokens";
import { signOutFirebase } from "../config/firebase";

interface AuthState {
  user: User | null;
  partnerProfile: PartnerProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  verificationToken: string | null;
  mobileNumber: string | null;

  login: (mobileNumber: string) => Promise<{ success: boolean; isExistingUser: boolean }>;
  verify: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  refreshAccessToken: () => Promise<boolean>;
  syncSessionFromSecureStorage: () => Promise<void>;
  loadPartnerProfile: () => Promise<void>;
  logout: () => Promise<void>;
  clearVerification: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      partnerProfile: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      verificationToken: null,
      mobileNumber: null,

      clearVerification: () => set({ verificationToken: null, mobileNumber: null }),

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

      verify: async (idToken) => {
        const { verificationToken, mobileNumber } = get();
        if (!verificationToken || !mobileNumber) {
          return { success: false, error: "Session expired. Start again." };
        }

        set({ isLoading: true });
        try {
          const response = await authApi.verify({
            token: verificationToken,
            idtoken: idToken,
            mobileNumber,
          });

          if (!response.success || !response.data) {
            return {
              success: false,
              error: response.error?.message || "Verification failed",
            };
          }

          const { jwt_token, refreshToken, userData } = response.data;

          if (userData.role !== "partner") {
            return {
              success: false,
              error: "This app is for partner accounts only. Use the customer app instead.",
            };
          }

          await saveSecureTokens(jwt_token, refreshToken);
          apiClient.setAuthToken(jwt_token);

          const me = await partnersApi.getMe();
          if (!me.success || !me.data) {
            await clearSecureTokens();
            apiClient.setAuthToken(null);
            return {
              success: false,
              error:
                me.error?.message ||
                "No partner profile found. Contact support to be onboarded as a partner.",
            };
          }

          set({
            user: userData,
            partnerProfile: me.data,
            accessToken: jwt_token,
            refreshToken,
            isAuthenticated: true,
            verificationToken: null,
            mobileNumber: null,
          });

          return { success: true };
        } catch {
          return { success: false, error: "Something went wrong" };
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
            const { jwt_token, refreshToken: next } = response.data;
            await saveSecureTokens(jwt_token, next);
            apiClient.setAuthToken(jwt_token);
            set({ accessToken: jwt_token, refreshToken: next });
            return true;
          }
          await get().logout();
          return false;
        } catch {
          await get().logout();
          return false;
        }
      },

      syncSessionFromSecureStorage: async () => {
        const stored = await loadSecureTokens();
        let access = stored.accessToken;
        let refresh = stored.refreshToken;
        if (!access || !refresh) {
          const legacyA = get().accessToken;
          const legacyR = get().refreshToken;
          if (legacyA && legacyR) {
            await saveSecureTokens(legacyA, legacyR);
            access = legacyA;
            refresh = legacyR;
          }
        }
        if (access && refresh) {
          apiClient.setAuthToken(access);
          set({
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
          });
          return;
        }
        apiClient.setAuthToken(null);
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          user: null,
          partnerProfile: null,
        });
      },

      loadPartnerProfile: async () => {
        const { accessToken, user } = get();
        if (!accessToken || user?.role !== "partner") return;
        const me = await partnersApi.getMe();
        if (me.success && me.data) {
          set({ partnerProfile: me.data });
          return;
        }
        const code = me.error?.code;
        if (code === "UNAUTHORIZED" || code === "NOT_FOUND") {
          await get().logout();
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        await signOutFirebase();
        await clearSecureTokens();
        apiClient.setAuthToken(null);
        set({
          user: null,
          partnerProfile: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          verificationToken: null,
          mobileNumber: null,
        });
      },
    }),
    {
      name: "partner-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user }),
    }
  )
);
