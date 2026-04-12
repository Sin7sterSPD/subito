import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../src/store";

export default function Index() {
  const { isAuthenticated, user, partnerProfile, loadPartnerProfile } = useAuthStore();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && isAuthenticated && user?.role === "partner" && !partnerProfile) {
      void loadPartnerProfile();
    }
  }, [hydrated, isAuthenticated, user?.role, partnerProfile, loadPartnerProfile]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated || !user || user.role !== "partner") {
    return <Redirect href="/(auth)/login" />;
  }

  if (!partnerProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
