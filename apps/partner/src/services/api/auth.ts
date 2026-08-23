import { apiClient } from "../api-client"
import type { User } from "../../types/api"

interface LoginResponse {
  challengeId: string
  isExistingUser: boolean
  mobileNumber: string
  retryAfterSec?: number
}

export interface AuthSuccessPayload {
  jwt_token: string
  refreshToken: string
  expiresIn?: number
  refreshExpiresIn?: number
  tokenType?: string
  sessionId?: string
  userData: User
  isNewUser?: boolean
}

interface RefreshTokenResponse {
  jwt_token: string
  refreshToken: string
  expiresIn?: number
  refreshExpiresIn?: number
  tokenType?: string
  sessionId?: string
}

export const authApi = {
  login: (mobileNumber: string) =>
    apiClient.post<LoginResponse>(
      "/auth/login",
      { mobileNumber },
      { skipAuthRefresh: true }
    ),

  verify: (data: {
    challengeId: string
    firebaseIdToken: string
    mobileNumber: string
    referralCode?: string
    appType?: "customer" | "partner"
  }) =>
    apiClient.post<AuthSuccessPayload>("/auth/verify", data, {
      skipAuthRefresh: true,
    }),

  refresh: (refreshToken: string) =>
    apiClient.post<RefreshTokenResponse>(
      "/auth/refresh",
      { refreshToken },
      { skipAuthRefresh: true }
    ),

  logout: () =>
    apiClient.post<{ loggedOut: boolean }>("/auth/logout", {}, {
      skipAuthRefresh: true,
    }),
}
