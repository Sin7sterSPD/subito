import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useAuthStore, useAppStore } from '../src/store';
import { apiClient } from '../src/services/api-client';
import '../global.css';

export default function RootLayout() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { fetchSettings, deviceId, setDeviceId } = useAppStore();

  useEffect(() => {
    if (accessToken) {
      apiClient.setAuthToken(accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!deviceId) {
      const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setDeviceId(newDeviceId);
      apiClient.setDeviceId(newDeviceId);
    } else {
      apiClient.setDeviceId(deviceId);
    }
  }, [deviceId, setDeviceId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(screens)" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
