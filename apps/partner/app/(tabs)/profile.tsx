import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { useAuthStore, useJobsStore } from "../../src/store";

export default function ProfileScreen() {
  const { user, partnerProfile, logout } = useAuthStore();
  const resetJobs = useJobsStore((s) => s.reset);

  const onLogout = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          resetJobs();
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{partnerProfile?.name || "Partner"}</Text>
      <Text style={styles.meta}>{user?.phone}</Text>
      <Text style={styles.meta}>Partner ID: {partnerProfile?.id}</Text>
      <Text style={styles.meta}>
        Availability: {partnerProfile?.availabilityStatus ?? "—"}
      </Text>
      <Pressable style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  name: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  meta: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  button: {
    marginTop: 32,
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
