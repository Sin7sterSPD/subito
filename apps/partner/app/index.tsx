import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { Redirect } from "expo-router"
import { useAuthStore } from "@/src/store"

export default function Index() {
  const { isAuthenticated, accessToken, partnerProfile, loadPartnerProfile } =
    useAuthStore()

  // Rehydrate the partner profile on cold start — the persisted store only
  // keeps `user`, so until this lands we can't tell a partner account from a
  // stale customer session.
  useEffect(() => {
    if (isAuthenticated && accessToken && !partnerProfile) {
      void loadPartnerProfile()
    }
  }, [isAuthenticated, accessToken, partnerProfile, loadPartnerProfile])

  if (!isAuthenticated || !accessToken) {
    return <Redirect href="/(auth)/login" />
  }

  if (!partnerProfile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1D54E2" />
      </View>
    )
  }

  return <Redirect href="/(tabs)" />
}
