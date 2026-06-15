import type { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY



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
        },
      ],
    ],
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      juspayMerchantId: process.env.JUSPAY_MERCHANT_ID,
      juspayClientId: process.env.JUSPAY_CLIENT_ID,
      juspayEnvironment:
        process.env.JUSPAY_ENVIRONMENT ?? "sandbox",
    },
  } as ExpoConfig
}
