import { apiClient } from '../api-client';
import { User, UserPreferences } from '../../types/api';

interface CreateUserData {
  firstName: string;
  lastName?: string;
  mobileNumber: string;
  type: 'USER';
  email?: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}

export const usersApi = {
  getUser: () => apiClient.get<User>('/users'),

  updateUser: (data: UpdateUserData) => apiClient.patch<User>('/users', data),

  createUser: (data: CreateUserData) =>
    apiClient.post<{ success: boolean }>('/users/create_user', data),

  checkUserExists: (mobileNumber: string) =>
    apiClient.get<{ exists: boolean }>(`/users/mobile/${mobileNumber}/exists`),

  getPreferences: () => apiClient.get<UserPreferences>('/users/preferences'),

  submitReferralDetails: (data: { referralCode: string }) =>
    apiClient.post<{ success: boolean }>('/users/referral-details', data),
};
