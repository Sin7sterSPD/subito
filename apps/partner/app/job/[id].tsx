import { useCallback, useEffect, useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import * as Location from "expo-location"
import { Button, Spinner } from "heroui-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuthStore } from "@/src/store"
import { bookingsApi, partnersApi } from "@/src/services/api"
import { BookingStatusChip } from "@/src/components/status-chip"
import type {
  PartnerBookingAction,
  PartnerBookingDetail,
} from "@/src/types/api"

const LOCATION_PING_INTERVAL_MS = 25_000

const ACTIVE_BOOKING_STATUSES = ["MATCHED", "ARRIVING", "STARTED"]

const TIMELINE_STEPS = [
  { key: "MATCHED", label: "Assigned", icon: "briefcase-outline" },
  { key: "ARRIVING", label: "On the way", icon: "car-outline" },
  { key: "STARTED", label: "In progress", icon: "construct-outline" },
  { key: "COMPLETED", label: "Completed", icon: "checkmark-circle-outline" },
] as const

function formatSchedule(booking: PartnerBookingDetail): string | null {
  if (!booking.scheduledDate) return null
  const time = booking.scheduledStartTime
    ? ` · ${booking.scheduledStartTime.slice(0, 5)}`
    : ""
  return `${booking.scheduledDate}${time}`
}

function timelineIndex(status: string): number {
  switch (status) {
    case "MATCHED":
    case "PENDING_MATCH":
      return 0
    case "ARRIVING":
      return 1
    case "STARTED":
      return 2
    case "COMPLETED":
      return 3
    default:
      return -1
  }
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const partnerProfile = useAuthStore((s) => s.partnerProfile)
  const loadPartnerProfile = useAuthStore((s) => s.loadPartnerProfile)
  const [booking, setBooking] = useState<PartnerBookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await bookingsApi.getById(id)
      if (res.success && res.data) {
        setBooking(res.data as PartnerBookingDetail)
      } else {
        setBooking(null)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  // Share GPS with the API while this job is active so the customer app can
  // track the partner. Foreground-only, tied to this screen being open.
  const partnerId = partnerProfile?.id
  const bookingStatus = booking?.status
  useEffect(() => {
    if (!partnerId || !bookingStatus) return
    if (!ACTIVE_BOOKING_STATUSES.includes(bookingStatus)) return

    let interval: ReturnType<typeof setInterval> | undefined

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      const tick = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({})
          await partnersApi.updateLocation(partnerId, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? undefined,
          })
        } catch {
          /* ignore ping failures */
        }
      }

      await tick()
      interval = setInterval(tick, LOCATION_PING_INTERVAL_MS)
    })()

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [partnerId, bookingStatus])

  const runStatus = (status: PartnerBookingAction, confirm?: string) => {
    if (!partnerProfile || !booking) return
    const execute = async () => {
      setActing(true)
      try {
        const res = await partnersApi.updateStatus(partnerProfile.id, {
          status,
          bookingId: booking.id,
        })
        if (res.success) {
          await load()
          // Completing a job flips availability back to online server-side.
          if (status === "COMPLETED") void loadPartnerProfile()
        } else {
          Alert.alert("Update failed", res.error?.message || "Try again")
        }
      } finally {
        setActing(false)
      }
    }

    if (confirm) {
      Alert.alert(confirm, undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "default", onPress: () => void execute() },
      ])
    } else {
      void execute()
    }
  }

  const runAck = async () => {
    if (!partnerProfile || !booking) return
    setActing(true)
    try {
      const res = await partnersApi.acknowledgeRelease(
        partnerProfile.id,
        booking.id
      )
      if (res.success) {
        Alert.alert("Done", "Cancellation acknowledged.")
        void loadPartnerProfile()
        router.back()
      } else {
        Alert.alert("Failed", res.error?.message || "Try again")
      }
    } finally {
      setActing(false)
    }
  }

  const openDirections = () => {
    const lat = booking?.address?.latitude
    const lng = booking?.address?.longitude
    if (lat == null || lng == null) return
    void Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}`)
  }

  if (loading && !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f8" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Spinner size="lg" />
        </View>
      </SafeAreaView>
    )
  }

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f8" }}>
        <TouchableOpacity onPress={() => router.back()} className="p-4">
          <Ionicons name="arrow-back" size={24} color="#14151A" />
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={40} color="#9ea2ad" />
          <Text className="text-body-s font-inter-semibold text-gray-12 mt-3">
            Job not found
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const addr = booking.address
  const schedule = formatSchedule(booking)
  const needsAck = booking.cancellationAwaitingPartnerAck
  const activeIdx = timelineIndex(booking.status)
  const isTerminal = booking.status === "COMPLETED" || booking.status === "CANCELLED"

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#f7f7f8" }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#14151A" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-body-s font-inter-bold text-gray-13">
            #{booking.bookingNumber}
          </Text>
        </View>
        <BookingStatusChip status={booking.status} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void load()}
            tintColor="#1D54E2"
          />
        }
      >
        {/* Timeline */}
        {!needsAck && activeIdx >= 0 ? (
          <View className="mx-4 mt-2 rounded-2xl bg-white p-5">
            <View className="flex-row items-center justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const done = i <= activeIdx
                const current = i === activeIdx
                return (
                  <View key={step.key} className="items-center flex-1">
                    <View
                      className={`h-9 w-9 rounded-full items-center justify-center ${
                        done ? "bg-green-01" : "bg-gray-02"
                      }`}
                    >
                      <Ionicons
                        name={step.icon}
                        size={16}
                        color={done ? "#21a65e" : "#9ea2ad"}
                      />
                    </View>
                    {current ? (
                      <View className="h-1 w-1 rounded-full bg-blue-03 mt-1.5" />
                    ) : (
                      <View className="h-1 w-1 mt-1.5" />
                    )}
                    <Text
                      className={`text-caption-m font-inter-regular mt-0.5 text-center ${
                        done ? "text-gray-12" : "text-gray-07"
                      }`}
                    >
                      {step.label}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        ) : null}

        {/* Cancellation ack banner */}
        {needsAck ? (
          <View className="mx-4 mt-3 rounded-2xl bg-orange-01 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="warning" size={18} color="#d9760c" />
              <Text className="text-body-s font-inter-semibold text-orange-09">
                Customer cancelled this job
              </Text>
            </View>
            <Text className="text-caption-l text-orange-09 font-inter-regular mt-2">
              Acknowledge the release to close this job and go back online.
            </Text>
            <Button
              variant="primary"
              className="bg-orange-08 mt-3 py-3"
              isDisabled={acting}
              onPress={() => void runAck()}
            >
              {acting ? <Spinner size="sm" /> : <Button.Label>Acknowledge release</Button.Label>}
            </Button>
          </View>
        ) : null}

        {/* Address */}
        {addr ? (
          <View className="mx-4 mt-3 rounded-2xl bg-white p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location" size={16} color="#1d54e2" />
              <Text className="text-caption-l font-inter-semibold text-gray-12">
                Service address
              </Text>
            </View>
            <Text className="text-body-s text-gray-12 font-inter-regular mt-2">
              {addr.addressLine1}
              {addr.addressLine2 ? `\n${addr.addressLine2}` : ""}
              {addr.city ? `, ${addr.city}` : ""}
              {addr.pincode ? ` - ${addr.pincode}` : ""}
            </Text>
            {addr.latitude != null && addr.longitude != null ? (
              <TouchableOpacity
                className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-blue-01 px-3 py-2"
                onPress={openDirections}
              >
                <Ionicons name="navigate" size={14} color="#1d54e2" />
                <Text className="text-caption-l font-inter-semibold text-blue-09">
                  Get directions
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Schedule + notes */}
        {schedule || booking.customerNotes ? (
          <View className="mx-4 mt-3 rounded-2xl bg-white p-5">
            {schedule ? (
              <View className="flex-row items-center gap-2">
                <Ionicons name="calendar-outline" size={16} color="#1d54e2" />
                <Text className="text-caption-l text-gray-12 font-inter-regular">
                  Scheduled for {schedule}
                </Text>
              </View>
            ) : null}
            {booking.customerNotes ? (
              <View className={schedule ? "mt-3" : ""}>
                <Text className="text-caption-l font-inter-semibold text-gray-12">
                  Customer notes
                </Text>
                <Text className="text-caption-l text-gray-09 font-inter-regular mt-1">
                  {booking.customerNotes}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Items */}
        {booking.items?.length ? (
          <View className="mx-4 mt-3 rounded-2xl bg-white p-5">
            <Text className="text-caption-l font-inter-semibold text-gray-12">
              Services ({booking.items.length})
            </Text>
            <View className="mt-3 gap-2.5">
              {booking.items.map((item) => (
                <View key={item.id} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="h-7 w-7 rounded-lg bg-gray-02 items-center justify-center">
                      <Text className="text-caption-m font-inter-semibold text-gray-12">
                        {item.quantity}
                      </Text>
                    </View>
                    <Text className="text-caption-l text-gray-12 font-inter-regular flex-1">
                      {item.name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Actions */}
        {!needsAck && !isTerminal ? (
          <View className="mx-4 mt-4 gap-3">
            {booking.status === "MATCHED" ? (
              <Button
                variant="primary"
                className="bg-blue-03 py-4"
                isDisabled={acting}
                onPress={() => runStatus("EN_ROUTE")}
              >
                {acting ? <Spinner size="sm" /> : null}
                <Button.Label>I&apos;m on my way</Button.Label>
              </Button>
            ) : null}

            {booking.status === "ARRIVING" ? (
              <>
                <Button
                  variant="primary"
                  className="bg-blue-03 py-4"
                  isDisabled={acting}
                  onPress={() => runStatus("ARRIVED")}
                >
                  {acting ? <Spinner size="sm" /> : null}
                  <Button.Label>I&apos;ve arrived</Button.Label>
                </Button>
                <Button
                  variant="secondary"
                  className="py-4"
                  isDisabled={acting}
                  onPress={() => runStatus("WORKING")}
                >
                  <Button.Label>Start work</Button.Label>
                </Button>
              </>
            ) : null}

            {booking.status === "STARTED" ? (
              <Button
                variant="primary"
                className="bg-green-08 py-4"
                isDisabled={acting}
                onPress={() =>
                  runStatus("COMPLETED", "Mark this job as completed?")
                }
              >
                {acting ? <Spinner size="sm" /> : null}
                <Button.Label>Complete job</Button.Label>
              </Button>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
