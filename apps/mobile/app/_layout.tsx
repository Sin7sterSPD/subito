import { Stack } from "expo-router"
import { HeroUINativeProvider } from "heroui-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import type { HeroUINativeConfig } from "heroui-native"

const config: HeroUINativeConfig = {
  textProps: {
    // Disable font scaling for accessibility
    allowFontScaling: false,
    // Auto-adjust font size to fit container
    adjustsFontSizeToFit: false,
    // Maximum font size multiplier when scaling
    maxFontSizeMultiplier: 1.5,
  },
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={config}>
        <Stack />
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  )
}
