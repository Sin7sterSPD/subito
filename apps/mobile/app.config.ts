import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    name: config.name ?? 'mobile',
    slug: config.slug ?? 'mobile',
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    },
  }) as ExpoConfig;
