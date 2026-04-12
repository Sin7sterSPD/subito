/** User-scoped TanStack Query prefixes — cleared on logout (anonymous data retained). */
export const queryKeys = {
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    addresses: () => [...queryKeys.user.all, 'addresses'] as const,
    bookings: (filters?: unknown) => [...queryKeys.user.all, 'bookings', filters] as const,
    booking: (id: string) => [...queryKeys.user.all, 'booking', id] as const,
    cart: () => [...queryKeys.user.all, 'cart'] as const,
    payments: () => [...queryKeys.user.all, 'payments'] as const,
  },
  public: {
    all: ['public'] as const,
    listings: (params?: unknown) => [...queryKeys.public.all, 'listings', params] as const,
    categories: () => [...queryKeys.public.all, 'categories'] as const,
    settings: () => [...queryKeys.public.all, 'settings'] as const,
  },
} as const;
