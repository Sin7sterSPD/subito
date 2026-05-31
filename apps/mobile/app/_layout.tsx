import { Stack } from "expo-router"
import "../global.css"

import { HeroUINativeProvider } from "heroui-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  )
}
