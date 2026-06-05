import { Stack } from "expo-router"
import "../global.css"

import { HeroUINativeProvider } from "heroui-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/src/lib/query-client"

export default function RootLayout() {
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
              name="(screens)"
              options={{ animation: "slide_from_right" }}
            />
          </Stack>
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}
