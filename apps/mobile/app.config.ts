import type { ConfigContext, ExpoConfig } from "expo/config"

export default ({ config }: ConfigContext): ExpoConfig => {
  const existingPlugins = config.plugins ?? []

  return {
    ...config,
    name: config.name ?? "subito",
    slug: config.slug ?? "subito",
    plugins: [
      ...existingPlugins,
    ],
    extra: {
      ...config.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  } as ExpoConfig
}
