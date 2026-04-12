import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore, useAppStore } from '../src/store';
import { apiClient, registerApiAuthHandlers } from '../src/services/api-client';
import { getApiBaseUrl } from '../src/config/env';
import { queryClient } from '../src/lib/query-client';
import { initSentry } from '../src/analytics/sentry';
import '../global.css';

export default function RootLayout() {
  const { accessToken, syncSessionFromSecureStorage } = useAuthStore();
  const { fetchSettings, deviceId, setDeviceId } = useAppStore();

  useEffect(() => {
    initSentry();
    apiClient.setBaseUrl(getApiBaseUrl());

    registerApiAuthHandlers({
      refresh: () => useAuthStore.getState().refreshAccessToken(),
      onSessionInvalid: () => {
        void useAuthStore.getState().logout();
      },
    });
  }, []);

  useEffect(() => {
    void syncSessionFromSecureStorage();
  }, [syncSessionFromSecureStorage]);

  useEffect(() => {
    if (accessToken) {
      apiClient.setAuthToken(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      if (deviceId) {
        apiClient.setDeviceId(deviceId);
        return;
      }
      let nextId: string | null = null;
      try {
        if (Platform.OS === 'android') {
          nextId = Application.getAndroidId() || null;
        } else {
          nextId = await Application.getIosIdForVendorAsync();
        }
      } catch {
        nextId = null;
      }
      if (!nextId) {
        nextId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }
      setDeviceId(nextId);
      apiClient.setDeviceId(nextId);
    })();
  }, [deviceId, setDeviceId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(screens)" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
