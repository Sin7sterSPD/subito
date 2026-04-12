import { apiClient } from '../api-client';
import { AppSettings } from '../../types/api';

interface SupportContact {
  email: string;
  phone: string;
}

interface ComplaintData {
  bookingId: string;
  issue: string;
  description: string;
}

export const settingsApi = {
  getSettings: () => apiClient.get<AppSettings>('/settings'),

  getSupportContact: () => apiClient.get<SupportContact>('/support/contact'),

  submitComplaint: (data: ComplaintData) =>
    apiClient.post<{ success: boolean; ticketId: string }>('/support/complaint', data),
};
