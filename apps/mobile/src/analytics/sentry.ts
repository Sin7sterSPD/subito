import * as Sentry from '@sentry/react-native';
import { getSentryDsn } from '../config/env';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = getSentryDsn();
  if (!dsn || __DEV__) {
    if (__DEV__) {
      console.info('[Sentry] Skipped in development (set EXPO_PUBLIC_SENTRY_DSN for staging builds).');
    }
    return;
  }
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
  initialized = true;
}

export { Sentry };
