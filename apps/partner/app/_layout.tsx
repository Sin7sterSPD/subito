import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore, useJobsStore } from "../src/store";
import { apiClient, registerApiAuthHandlers } from "../src/services/api-client";
import { getApiBaseUrl } from "../src/config/env";

export default function RootLayout() {
  const { accessToken, syncSessionFromSecureStorage, loadPartnerProfile } = useAuthStore();
  const resetJobs = useJobsStore((s) => s.reset);

  useEffect(() => {
    apiClient.setBaseUrl(getApiBaseUrl());
    registerApiAuthHandlers({
      refresh: () => useAuthStore.getState().refreshAccessToken(),
      onSessionInvalid: () => {
        resetJobs();
        void useAuthStore.getState().logout();
      },
    });
  }, [resetJobs]);

  useEffect(() => {
    void (async () => {
      await syncSessionFromSecureStorage();
      await loadPartnerProfile();
    })();
  }, [syncSessionFromSecureStorage, loadPartnerProfile]);

  useEffect(() => {
    void (async () => {
      let nextId: string | null = null;
      try {
        if (Platform.OS === "android") {
          nextId = Application.getAndroidId() || null;
        } else {
          nextId = await Application.getIosIdForVendorAsync();
        }
      } catch {
        nextId = null;
      }
      if (!nextId) {
        nextId = `partner_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      }
      apiClient.setDeviceId(nextId);
    })();
  }, []);

  useEffect(() => {
    if (accessToken) {
      apiClient.setAuthToken(accessToken);
    }
  }, [accessToken]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" options={{ headerShown: true, title: "Job" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
