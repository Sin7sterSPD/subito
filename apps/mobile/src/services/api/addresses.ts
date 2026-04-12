import { apiClient } from '../api-client';
import { Address } from '../../types/api';

interface CreateAddressData {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  type: 'HOME' | 'OFFICE' | 'OTHER';
  houseNo?: string;
  buildingName?: string;
  landmark?: string;
  floor?: number;
  bhk?: number;
  bathroom?: number;
  balcony?: number;
  otherName?: string;
  otherPhone?: string;
}

interface UpdateAddressData extends Partial<CreateAddressData> {
  id: string;
}

export const addressesApi = {
  getAddresses: (params?: { lat?: number; lng?: number; nearestAddressRequired?: boolean }) => {
    let endpoint = '/users/addresses';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.lat) searchParams.append('lat', params.lat.toString());
      if (params.lng) searchParams.append('lng', params.lng.toString());
      if (params.nearestAddressRequired) {
        searchParams.append('nearestAddressRequired', 'true');
      }
      const queryString = searchParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    return apiClient.get<Address[]>(endpoint);
  },

  createAddress: (data: CreateAddressData) =>
    apiClient.post<Address>('/users/addresses', data),

  updateAddress: (data: UpdateAddressData) =>
    apiClient.patch<Address>('/users/addresses', data),

  deleteAddress: (id: string) =>
    apiClient.delete<{ deleted: boolean }>('/users/addresses', { id }),
};
