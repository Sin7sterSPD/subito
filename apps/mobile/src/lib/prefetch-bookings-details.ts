import { queryClient } from "./query-client"
import { queryKeys } from "./query-keys"
import { bookingsApi } from "../services/api"

const PREFETCH_TOP_N = 5

/**
 * Warms React Query for the first N bookings so opening a detail screen can reuse cache.
 * Safe to call from list fetch; errors are non-fatal (prefetch only).
 */
export function prefetchTopBookingDetails(bookings: { id: string }[]): void {
  for (const b of bookings.slice(0, PREFETCH_TOP_N)) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.user.booking(b.id),
      queryFn: async () => {
        const r = await bookingsApi.getBookingById(b.id)
        if (!r.success || !r.data) {
          throw new Error("prefetch_get_booking_failed")
        }
        return r.data
      },
    })
  }
}
