
import type { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY
  const iosMapsKey = process.env.GOOGLE_MAPS_IOS_API_KEY

  if (!androidMapsKey) {
    throw new Error(
      "Missing GOOGLE_MAPS_ANDROID_API_KEY for react-native-maps plugin"
    )
  }

  return {
    ...config,
    name: config.name ?? "subito",
    slug: config.slug ?? "subito",
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
  } as ExpoConfig
}
