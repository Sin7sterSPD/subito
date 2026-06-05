import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { User } from "../types/api"
import { authApi, usersApi } from "../services/api"
import { apiClient } from "../services/api-client"
import {
  clearSecureTokens,
  loadSecureTokens,
  saveSecureTokens,
} from "../lib/secure-tokens"

import { queryClient } from "../lib/query-client"
import { runLogoutSideEffects } from "../lib/logout-coordinator"

function extractRetryAfterSec(details: unknown): number | undefined {
  if (!details || typeof details !== "object") {
    return undefined
  }

  const retryAfterSec = (details as { retryAfterSec?: unknown }).retryAfterSec
  return typeof retryAfterSec === "number" ? retryAfterSec : undefined
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  firebaseVerificationId: string | null
  backendChallengeId: string | null
  mobileNumber: string | null
  resendRetryAfterSec: number | null

  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>
  setVerification: (input: {
    firebaseVerificationId: string
    backendChallengeId: string
    mobileNumber: string
    retryAfterSec?: number | null
  }) => void
  login: (mobileNumber: string) => Promise<{
    success: boolean
    isExistingUser: boolean
    retryAfterSec?: number
    error?: string
  }>
  verify: (
    firebaseIdToken: string,
    referralCode?: string
  ) => Promise<{ success: boolean; isNewUser: boolean; error?: string }>
  refreshAccessToken: () => Promise<boolean>
  /** Load tokens from SecureStore (and one-time migrate from legacy AsyncStorage persist). */
  syncSessionFromSecureStorage: () => Promise<void>
  fetchUser: () => Promise<void>
  logout: () => Promise<void>
  clearVerification: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      firebaseVerificationId: null,
      backendChallengeId: null,
      mobileNumber: null,
      resendRetryAfterSec: null,

      setUser: (user) =>
        set({ user, isAuthenticated: !!(user && get().accessToken) }),

      setTokens: async (accessToken, refreshToken) => {
        await saveSecureTokens(accessToken, refreshToken)
        apiClient.setAuthToken(accessToken)
        set({ accessToken, refreshToken, isAuthenticated: true })
      },

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
              resendRetryAfterSec: response.data.retryAfterSec ?? null,
            })
            return {
              success: true,
              isExistingUser: response.data.isExistingUser,
              retryAfterSec: response.data.retryAfterSec,
            }
          }
          return {
            success: false,
            isExistingUser: false,
            retryAfterSec: extractRetryAfterSec(response.error?.details),
            error: response.error?.message || "Failed to start verification",
          }
        } catch {
          return {
            success: false,
            isExistingUser: false,
            error: "Failed to start verification",
          }
        } finally {
          set({ isLoading: false })
        }
      },

      verify: async (firebaseIdToken, referralCode) => {
        const { backendChallengeId, mobileNumber } = get()
        if (!backendChallengeId || !mobileNumber) {
          return {
            success: false,
            isNewUser: false,
            error: "Missing verification state",
          }
        }

        set({ isLoading: true })
        try {
          const response = await authApi.verify({
            challengeId: backendChallengeId,
            firebaseIdToken,
            mobileNumber,
            referralCode,
            appType: "customer",
          })

          if (response.success && response.data) {
            const { jwt_token, refreshToken, userData, isNewUser } =
              response.data
            await saveSecureTokens(jwt_token, refreshToken)
            apiClient.setAuthToken(jwt_token)

            set({
              user: userData,
              accessToken: jwt_token,
              refreshToken,
              isAuthenticated: true,
              firebaseVerificationId: null,
              backendChallengeId: null,
              mobileNumber: null,
              resendRetryAfterSec: null,
            })
            return { success: true, isNewUser: !!isNewUser }
          }
          return {
            success: false,
            isNewUser: false,
            error: response.error?.message || "Verification failed",
          }
        } catch {
          return {
            success: false,
            isNewUser: false,
            error: "Verification failed",
          }
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
            const { jwt_token, refreshToken: newRefreshToken } = response.data
            await saveSecureTokens(jwt_token, newRefreshToken)
            apiClient.setAuthToken(jwt_token)
            set({
              accessToken: jwt_token,
              refreshToken: newRefreshToken,
            })
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
        })
      },

      fetchUser: async () => {
        set({ isLoading: true })
        try {
          const response = await usersApi.getUser()
          if (response.success && response.data) {
            set({ user: response.data })
          }
        } catch {
          // Silent fail
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // Continue logout even if API fails
        }
        await clearSecureTokens()
        apiClient.setAuthToken(null)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          firebaseVerificationId: null,
          backendChallengeId: null,
          mobileNumber: null,
          resendRetryAfterSec: null,
        })
        runLogoutSideEffects(queryClient)
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
)
