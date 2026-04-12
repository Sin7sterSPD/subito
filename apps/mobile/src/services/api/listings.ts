import { apiClient } from '../api-client';
import { Listing, Category, Bundle } from '../../types/api';

interface ListingsResponse {
  categories: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    image?: string;
    listings: Listing[];
  }[];
  bundles: Bundle[];
  promotions?: unknown[];
}

export const listingsApi = {
  getListings: (params?: { lat?: number; lng?: number; categoryId?: string }) => {
    let endpoint = '/listings';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.lat) searchParams.append('lat', params.lat.toString());
      if (params.lng) searchParams.append('lng', params.lng.toString());
      if (params.categoryId) searchParams.append('categoryId', params.categoryId);
      const queryString = searchParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    return apiClient.get<ListingsResponse>(endpoint);
  },

  getPublicListings: (params?: { lat?: number; lng?: number }) => {
    let endpoint = '/listings/public';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.lat) searchParams.append('lat', params.lat.toString());
      if (params.lng) searchParams.append('lng', params.lng.toString());
      const queryString = searchParams.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    return apiClient.get<ListingsResponse>(endpoint);
  },

  getListingById: (id: string) => apiClient.get<Listing>(`/listings/${id}`),

  getServiceById: (id: string) => apiClient.get<Listing>(`/services/${id}`),

  getExtensions: (bookingId: string) =>
    apiClient.get<{ extensions: unknown[] }>(`/listings/extensions?bookingId=${bookingId}`),

  getCategories: () => apiClient.get<Category[]>('/categories'),

  getCategoryById: (id: string) => apiClient.get<Category>(`/categories/${id}`),
};
