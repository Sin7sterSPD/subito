import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { cleverTapOnUserLogout } from '../analytics/clevertap';
import { useCartStore } from '../store/cart';
import { useBookingsStore } from '../store/bookings';
import { usePaymentsStore } from '../store/payments';
import { useUserStore } from '../store/user';
/**
 * Clears user-bound client state and TanStack Query caches tagged as user-scoped.
 * Does not touch coarse location, listing/category cache, or anonymous prefs (`useAppStore` / `useLocationStore` / `useListingsStore`).
 */
export function runLogoutSideEffects(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: queryKeys.user.all, exact: false });

  useCartStore.getState().reset();
  useBookingsStore.getState().reset();
  usePaymentsStore.getState().reset();
  useUserStore.getState().reset();

  cleverTapOnUserLogout();
}
