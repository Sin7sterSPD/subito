import { apiClient } from '../api-client';
import { Rating } from '../../types/api';

interface SubmitRatingData {
  bookingId: string;
  rating: number;
  comment?: string;
  partnerId?: string;
}

export const ratingsApi = {
  getRating: (bookingId: string) =>
    apiClient.get<{ rating: Rating | null }>(`/rating?bookingId=${bookingId}`),

  submitRating: (data: SubmitRatingData) =>
    apiClient.post<{ success: boolean }>('/rating', data),

  discardRating: (ratingId: string) =>
    apiClient.put<{ discarded: boolean }>(`/rating/${ratingId}/discard`),
};
