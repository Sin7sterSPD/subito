import { useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useJobsStore, useAuthStore } from "../../src/store";
import type { PartnerBookingListItem } from "../../src/types/api";

function JobRow({ item }: { item: PartnerBookingListItem }) {
  const addr = item.address;
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/job/${item.id}` as never)}
    >
      <View style={styles.rowTop}>
        <Text style={styles.bookingNo}>{item.bookingNumber}</Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
      {item.cancellationAwaitingPartnerAck ? (
        <Text style={styles.badge}>Customer cancel — action needed</Text>
      ) : null}
      {addr ? (
        <Text style={styles.sub} numberOfLines={2}>
          {addr.addressLine1}, {addr.city}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function JobsScreen() {
  const { bookings, isLoading, error, fetchBookings } = useJobsStore();
  const { isAuthenticated, user, partnerProfile } = useAuthStore();

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && user?.role === "partner" && partnerProfile) {
        void fetchBookings();
      }
    }, [isAuthenticated, user?.role, partnerProfile, fetchBookings])
  );

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "partner" || !partnerProfile) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, user, partnerProfile]);

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      {isLoading && bookings.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : null}
      <FlatList
        data={bookings}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <JobRow item={item} />}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => void fetchBookings()} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>No active assignments.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loader: { marginTop: 24 },
  errorBanner: { backgroundColor: "#fee2e2", color: "#991b1b", padding: 12 },
  row: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  bookingNo: { fontWeight: "700", fontSize: 16 },
  status: { color: "#64748b", textTransform: "capitalize" },
  badge: {
    color: "#b45309",
    fontWeight: "600",
    marginBottom: 6,
    fontSize: 13,
  },
  sub: { color: "#475569", fontSize: 14 },
  empty: { textAlign: "center", marginTop: 48, color: "#64748b" },
});
