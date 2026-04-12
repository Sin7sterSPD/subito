import { apiClient } from '../api-client';
import { ReferralSummary } from '../../types/api';

export const referralsApi = {
  getSummary: () => apiClient.get<ReferralSummary>('/referral/summary'),

  checkCodeExists: (code: string) =>
    apiClient.get<{ exists: boolean; message?: string }>(`/referral/${code}/exists`),
};
