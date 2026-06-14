import type { ConfigContext, ExpoConfig } from "expo/config"

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
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        },
      ],
    ],
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  }) as ExpoConfig
