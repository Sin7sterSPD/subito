import "dotenv/config"

import type { ConfigContext, ExpoConfig } from "expo/config"

const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY
const iosMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY

if (!androidMapsKey) {
  throw new Error("Missing Google Maps API key(s) for react-native-maps plugin")
}
export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    name: config.name ?? "mobile",
    slug: config.slug ?? "mobile",
    plugins: [
      ...(config.plugins ?? []),
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: androidMapsKey,
          ...(iosMapsKey ? { iosGoogleMapsApiKey: iosMapsKey } : {}),
        },
      ],
    ],
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  }) as ExpoConfig
