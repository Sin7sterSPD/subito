import { useEffect, useState } from "react"
import { Stack } from "expo-router"
import "../global.css"

import { HeroUINativeProvider } from "heroui-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/src/lib/query-client"
import { useFonts } from "expo-font"
import { ActivityIndicator, View } from "react-native"

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter"

import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans"

import { useAuthStore } from "@/src/store"
import {
  registerApiAuthHandlers,
  apiClient,
} from "@/src/services/api-client"
import { getOrCreateDeviceId } from "@/src/lib/device-id"

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,

    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const syncSessionFromSecureStorage = useAuthStore(
    (state) => state.syncSessionFromSecureStorage
  )
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    registerApiAuthHandlers({
      refresh: async () => {
        try {
          return await refreshAccessToken()
        } catch (e) {
          console.error("Token refresh failed in auth handlers:", e)
          return false
        }
      },
      onSessionInvalid: () => {
        logout()
      },
    })

    void (async () => {
      try {
        const deviceId = await getOrCreateDeviceId()
        apiClient.setDeviceId(deviceId)
      } catch (e) {
        console.error("Failed to set device ID:", e)
      }
      await syncSessionFromSecureStorage()
      setIsSessionLoaded(true)
    })()
  }, [syncSessionFromSecureStorage, refreshAccessToken, logout])

  if (!loaded || !isSessionLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1D54E2" />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <HeroUINativeProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen
              name="job/[id]"
              options={{ animation: "slide_from_right" }}
            />
          </Stack>
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}
