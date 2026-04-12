import { apiClient } from '../api-client';
import { User } from '../../types/api';

interface LoginResponse {
  token: string;
  isExistingUser: boolean;
  mobileNumber: string;
}

interface VerifyResponse {
  jwt_token: string;
  refreshToken: string;
  userData: User;
  isNewUser: boolean;
}

interface RefreshTokenResponse {
  jwt_token: string;
  refreshToken: string;
}

export const authApi = {
  login: (mobileNumber: string) =>
    apiClient.post<LoginResponse>('/auth/login', { mobileNumber }),

  verify: (data: {
    token: string;
    idtoken: string;
    mobileNumber: string;
    referralCode?: string;
  }) => apiClient.post<VerifyResponse>('/auth/verify', data),

  refresh: (refreshToken: string) =>
    apiClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post<{ loggedOut: boolean }>('/auth/logout'),
};
