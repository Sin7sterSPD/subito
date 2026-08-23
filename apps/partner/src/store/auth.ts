import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { PartnerProfile, User } from "../types/api"
import { apiClient } from "../services/api-client"
import { authApi, partnersApi } from "../services/api"
import {
  clearSecureTokens,
  loadSecureTokens,
  saveSecureTokens,
} from "../lib/secure-tokens"
import { signOutFirebase } from "../config/firebase"

interface LoginResult {
  success: boolean
  error?: string
  isExistingUser?: boolean
  retryAfterSec?: number
}

interface VerifyResult {
  success: boolean
  error?: string
}

interface AuthState {
  user: User | null
  partnerProfile: PartnerProfile | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isUpdatingAvailability: boolean
  firebaseVerificationId: string | null
  backendChallengeId: string | null
  mobileNumber: string | null
  resendRetryAfterSec: number | null

  setVerification: (input: {
    firebaseVerificationId: string
    backendChallengeId: string
    mobileNumber: string
    retryAfterSec?: number
  }) => void
  clearVerification: () => void
  login: (mobileNumber: string) => Promise<LoginResult>
  verify: (idToken: string) => Promise<VerifyResult>
  refreshAccessToken: () => Promise<boolean>
  syncSessionFromSecureStorage: () => Promise<void>
  loadPartnerProfile: () => Promise<void>
  updateAvailability: (
    availability: "online" | "offline"
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
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
      isUpdatingAvailability: false,
      firebaseVerificationId: null,
      backendChallengeId: null,
      mobileNumber: null,
      resendRetryAfterSec: null,

      setVerification: ({
        firebaseVerificationId,
        backendChallengeId,
        mobileNumber,
        retryAfterSec,
      }) =>
        set({
          firebaseVerificationId,
          backendChallengeId,
          mobileNumber,
          resendRetryAfterSec: retryAfterSec ?? null,
        }),

      clearVerification: () =>
        set({
          firebaseVerificationId: null,
          backendChallengeId: null,
          mobileNumber: null,
          resendRetryAfterSec: null,
        }),

      login: async (mobileNumber) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(mobileNumber)
          if (response.success && response.data) {
            set({
              backendChallengeId: response.data.challengeId,
              mobileNumber: response.data.mobileNumber,
            })
            return {
              success: true,
              isExistingUser: response.data.isExistingUser,
              retryAfterSec: response.data.retryAfterSec,
            }
          }
          return {
            success: false,
            error: response.error?.message || "Failed to send OTP",
          }
        } catch {
          return { success: false, error: "Something went wrong" }
        } finally {
          set({ isLoading: false })
        }
      },

      verify: async (idToken) => {
        const { backendChallengeId, mobileNumber } = get()
        if (!backendChallengeId || !mobileNumber) {
          return { success: false, error: "Session expired. Start again." }
        }

        set({ isLoading: true })
        try {
          const response = await authApi.verify({
            challengeId: backendChallengeId,
            firebaseIdToken: idToken,
            mobileNumber,
            appType: "partner",
          })

          if (!response.success || !response.data) {
            return {
              success: false,
              error: response.error?.message || "Verification failed",
            }
          }

          const { jwt_token, refreshToken, userData } = response.data

          await saveSecureTokens(jwt_token, refreshToken)
          apiClient.setAuthToken(jwt_token)

          // A partner token is valid, but the account may not have a partner
          // profile yet (seeded/approved) — gate the app on /partners/me.
          const me = await partnersApi.getMe()
          if (!me.success || !me.data) {
            await clearSecureTokens()
            apiClient.setAuthToken(null)
            return {
              success: false,
              error:
                me.error?.message ||
                "No partner profile found. Contact support to be onboarded as a partner.",
            }
          }

          set({
            user: userData,
            partnerProfile: me.data,
            accessToken: jwt_token,
            refreshToken,
            isAuthenticated: true,
            firebaseVerificationId: null,
            backendChallengeId: null,
            mobileNumber: null,
            resendRetryAfterSec: null,
          })

          return { success: true }
        } catch {
          return { success: false, error: "Something went wrong" }
        } finally {
          set({ isLoading: false })
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return false
        try {
          const response = await authApi.refresh(refreshToken)
          if (response.success && response.data) {
            const { jwt_token, refreshToken: next } = response.data
            await saveSecureTokens(jwt_token, next)
            apiClient.setAuthToken(jwt_token)
            set({ accessToken: jwt_token, refreshToken: next })
            return true
          }
          await get().logout()
          return false
        } catch {
          await get().logout()
          return false
        }
      },

      syncSessionFromSecureStorage: async () => {
        const stored = await loadSecureTokens()
        let access = stored.accessToken
        let refresh = stored.refreshToken
        if (!access || !refresh) {
          const legacyA = get().accessToken
          const legacyR = get().refreshToken
          if (legacyA && legacyR) {
            await saveSecureTokens(legacyA, legacyR)
            access = legacyA
            refresh = legacyR
          }
        }
        if (access && refresh) {
          apiClient.setAuthToken(access)
          set({
            accessToken: access,
            refreshToken: refresh,
            isAuthenticated: true,
          })
          return
        }
        apiClient.setAuthToken(null)
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          user: null,
          partnerProfile: null,
        })
      },

      loadPartnerProfile: async () => {
        const { accessToken } = get()
        if (!accessToken) return
        const me = await partnersApi.getMe()
        if (me.success && me.data) {
          set({ partnerProfile: me.data })
          return
        }
        const code = me.error?.code
        if (code === "UNAUTHORIZED" || code === "NOT_FOUND") {
          await get().logout()
        }
      },

      updateAvailability: async (availability) => {
        set({ isUpdatingAvailability: true })
        try {
          const response = await partnersApi.setAvailability(availability)
          if (response.success) {
            const profile = get().partnerProfile
            if (profile) {
              set({
                partnerProfile: { ...profile, availabilityStatus: availability },
              })
            }
            return { success: true }
          }
          return {
            success: false,
            error: response.error?.message || "Failed to update availability",
          }
        } catch {
          return { success: false, error: "Something went wrong" }
        } finally {
          set({ isUpdatingAvailability: false })
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          /* ignore */
        }
        await signOutFirebase()
        await clearSecureTokens()
        apiClient.setAuthToken(null)
        set({
          user: null,
          partnerProfile: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          firebaseVerificationId: null,
          backendChallengeId: null,
          mobileNumber: null,
          resendRetryAfterSec: null,
        })
      },
    }),
    {
      name: "partner-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user }),
    }
  )
)
