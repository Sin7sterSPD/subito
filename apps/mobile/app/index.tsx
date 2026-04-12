import { Redirect } from 'expo-router';
import { useAuthStore, useAppStore } from '../src/store';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  const { isOnboardingComplete } = useAppStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isOnboardingComplete && user && !user.isOnboarded) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
