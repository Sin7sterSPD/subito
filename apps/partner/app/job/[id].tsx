import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Location from "expo-location";
import { useAuthStore } from "../../src/store";
import { bookingsApi } from "../../src/services/api/bookings";
import { partnersApi } from "../../src/services/api/partners";

type BookingDetail = {
  id: string;
  bookingNumber: string;
  status: string;
  cancellationAwaitingPartnerAck?: boolean;
  address?: {
    addressLine1?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  items?: { name: string; quantity: number }[];
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const partnerProfile = useAuthStore((s) => s.partnerProfile);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await bookingsApi.getById(id);
      if (res.success && res.data) {
        setBooking(res.data as unknown as BookingDetail);
      } else {
        setBooking(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!partnerProfile?.id || !booking || booking.status === "COMPLETED") return;

    let interval: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const tick = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          await partnersApi.updateLocation(partnerProfile.id, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
          });
        } catch {
          /* ignore */
        }
      };

      await tick();
      interval = setInterval(tick, 25000);
    })();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [partnerProfile?.id, booking?.status, booking?.id]);

  const runStatus = async (status: "EN_ROUTE" | "ARRIVED" | "WORKING" | "COMPLETED") => {
    if (!partnerProfile || !booking) return;
    setActing(true);
    try {
      const res = await partnersApi.updateStatus(partnerProfile.id, {
        status,
        bookingId: booking.id,
      });
      if (res.success) await load();
      else Alert.alert("Update failed", res.error?.message || "Try again");
    } finally {
      setActing(false);
    }
  };

  const runAck = async () => {
    if (!partnerProfile || !booking) return;
    setActing(true);
    try {
      const res = await partnersApi.acknowledgeRelease(partnerProfile.id, booking.id);
      if (res.success) {
        Alert.alert("Done", "Cancellation acknowledged.");
        router.back();
      } else {
        Alert.alert("Failed", res.error?.message || "Try again");
      }
    } finally {
      setActing(false);
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const addr = booking.address;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{booking.bookingNumber}</Text>
      <Text style={styles.status}>{booking.status}</Text>

      {booking.cancellationAwaitingPartnerAck ? (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            Customer requested cancellation. Acknowledge to complete and go back online.
          </Text>
          <Pressable
            style={[styles.primaryBtn, acting && styles.btnDisabled]}
            onPress={runAck}
            disabled={acting}
          >
            <Text style={styles.primaryBtnText}>Acknowledge release</Text>
          </Pressable>
        </View>
      ) : null}

      {addr ? (
        <Text style={styles.block}>
          {addr.addressLine1}
          {"\n"}
          {addr.city}
        </Text>
      ) : null}

      {booking.items?.length ? (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Items</Text>
          {booking.items.map((it, i) => (
            <Text key={i}>
              • {it.name} × {it.quantity}
            </Text>
          ))}
        </View>
      ) : null}

      {!booking.cancellationAwaitingPartnerAck ? (
        <View style={styles.actions}>
          <Text style={styles.sectionTitle}>Update job</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => runStatus("EN_ROUTE")}
            disabled={acting}
          >
            <Text>En route</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => runStatus("ARRIVED")}
            disabled={acting}
          >
            <Text>Arrived</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => runStatus("WORKING")}
            disabled={acting}
          >
            <Text>Start work</Text>
          </Pressable>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => runStatus("COMPLETED")}
            disabled={acting}
          >
            <Text style={styles.primaryBtnText}>Complete</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "700" },
  status: { color: "#64748b", marginTop: 4, textTransform: "capitalize" },
  block: { marginTop: 16, fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  warnBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
  },
  warnText: { color: "#92400e", marginBottom: 12 },
  actions: { marginTop: 24, gap: 10 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  btnDisabled: { opacity: 0.6 },
});
