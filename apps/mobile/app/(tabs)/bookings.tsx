import React, { useEffect, useState, useCallback, useRef } from "react"
import { View, FlatList, TouchableOpacity, RefreshControl } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Typography, Card, Chip, Spinner, Button, Tabs } from "heroui-native"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useBookingsStore } from "../../src/store"
import { Booking, BookingStatus } from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const

const ACTIVE_STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT",
  "PENDING_MATCH",
  "MATCHED",
  "ARRIVING",
  "STARTED",
]
const COMPLETED_STATUSES: BookingStatus[] = ["COMPLETED"]
const CANCELLED_STATUSES: BookingStatus[] = ["CANCELLED", "REFUNDED"]

function getStatusColor(
  status: BookingStatus
): "accent" | "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PENDING_MATCH":
      return "warning"
    case "MATCHED":
    case "ARRIVING":
    case "STARTED":
      return "accent"
    case "COMPLETED":
      return "success"
    case "CANCELLED":
    case "REFUNDED":
      return "danger"
    default:
      return "default"
  }
}

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Payment Pending"
    case "PENDING_MATCH":
      return "Finding Partner"
    case "MATCHED":
      return "Partner Assigned"
    case "ARRIVING":
      return "Partner Arriving"
    case "STARTED":
      return "In Progress"
    case "COMPLETED":
      return "Completed"
    case "CANCELLED":
      return "Cancelled"
    case "REFUNDED":
      return "Refunded"
    default:
      return status
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatTime(timeString?: string): string {
  if (!timeString) return ""
  const hhmm = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(timeString)
  if (hhmm) {
    const [, h, m] = hhmm
    const d = new Date()
    d.setHours(Number(h), Number(m), 0, 0)
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  const date = new Date(timeString)
  if (Number.isNaN(date.getTime())) return timeString
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking
  onPress: () => void
}) {
  const serviceNames = booking.items?.map((i) => i.name).join(", ") || "Service"
  const date = booking.scheduledDate || booking.createdAt

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        className="border-gray-03 mb-3 rounded-sm border bg-white p-4"
        variant="default"
      >
        <View className="mb-3 flex-row items-center justify-between">
          <View className="bg-blue-01 border-blue-03/20 rounded-sm border px-2 py-0.5">
            <Typography
              type="body-sm"
              className="text-blue-03 font-inter-semibold"
            >
              #{booking.bookingNumber}
            </Typography>
          </View>
          <Chip
            variant="soft"
            color={getStatusColor(booking.status)}
            size="sm"
            className="rounded-sm"
          >
            <Typography className="font-inter-semibold text-caption-s">
              {getStatusLabel(booking.status)}
            </Typography>
          </Chip>
        </View>

        <View className="mb-3">
          <Typography
            type="body"
            className="text-gray-12 leading-relaxed"
            weight="semibold"
            numberOfLines={2}
          >
            {serviceNames}
          </Typography>

          <View className="mt-2 flex-row flex-wrap gap-4">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#7E869A" />
              <Typography type="body-sm" className="text-gray-07 ml-1">
                {formatDate(date)}
              </Typography>
            </View>
            {booking.scheduledStartTime && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#7E869A" />
                <Typography type="body-sm" className="text-gray-07 ml-1">
                  {formatTime(booking.scheduledStartTime)}
                </Typography>
              </View>
            )}
          </View>

          {booking.address && (
            <View className="mt-2 flex-row items-center">
              <Ionicons name="location-outline" size={16} color="#7E869A" />
              <Typography
                type="body-sm"
                className="text-gray-08 ml-1 flex-1"
                numberOfLines={1}
              >
                {booking.address.name} • {booking.address.addressLine1}
              </Typography>
            </View>
          )}
        </View>

        <View className="border-gray-02 flex-row items-center justify-between border-t pt-3">
          <Typography type="body" className="text-blue-03" weight="bold">
            ₹{booking.finalAmount ?? booking.totalAmount ?? "0"}
          </Typography>
          <View className="flex-row items-center">
            <Typography
              type="body-sm"
              className="text-blue-03 mr-1"
              weight="semibold"
            >
              View Details
            </Typography>
            <Ionicons name="chevron-forward" size={16} color="#2a9cff" />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )
}

function EmptyState({ type }: { type: "active" | "completed" | "cancelled" }) {
  const messages = {
    active: {
      title: "No active bookings",
      subtitle: "Your ongoing bookings will appear here",
      icon: "calendar-outline" as const,
    },
    completed: {
      title: "No completed bookings",
      subtitle: "Your completed services will appear here",
      icon: "checkmark-circle-outline" as const,
    },
    cancelled: {
      title: "No cancelled bookings",
      subtitle: "Cancelled bookings will appear here",
      icon: "close-circle-outline" as const,
    },
  }

  const { title, subtitle, icon } = messages[type]

  return (
    <View className="flex-1 items-center justify-center px-6 py-10">
      <View className="bg-gray-02 mb-4 h-20 w-20 items-center justify-center rounded-full">
        <Ionicons name={icon} size={40} color="#7E869A" />
      </View>
      <Typography
        type="h6"
        weight="semibold"
        className="text-gray-12 mb-2 text-center"
      >
        {title}
      </Typography>
      <Typography
        type="body-sm"
        className="text-gray-07 text-center leading-relaxed"
      >
        {subtitle}
      </Typography>
      {type === "active" && (
        <Button
          onPress={() => router.push("/(tabs)")}
          className="bg-blue-03 mt-6 rounded-sm px-8 py-3 transition-transform active:scale-[0.96]"
        >
          <Button.Label className="font-inter-bold text-body-s text-white">
            Browse Services
          </Button.Label>
        </Button>
      )}
    </View>
  )
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<
    "active" | "completed" | "cancelled"
  >("active")
  const { bookings, fetchBookings, isLoading, hasMore, reset } =
    useBookingsStore()
  const [refreshing, setRefreshing] = useState(false)
  const isPaginatingRef = useRef(false)

  const getStatusForTab = () => {
    switch (activeTab) {
      case "active":
        return ACTIVE_STATUSES
      case "completed":
        return COMPLETED_STATUSES
      case "cancelled":
        return CANCELLED_STATUSES
    }
  }

  useEffect(() => {
    reset()
    fetchBookings(getStatusForTab(), true)
  }, [activeTab])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchBookings(getStatusForTab(), true)
    } finally {
      setRefreshing(false)
    }
  }, [activeTab, fetchBookings])

  const loadMore = useCallback(async () => {
    if (isPaginatingRef.current || isLoading || !hasMore) return
    isPaginatingRef.current = true
    try {
      await fetchBookings(getStatusForTab())
    } finally {
      isPaginatingRef.current = false
    }
  }, [isLoading, hasMore, activeTab, fetchBookings])

  const handleBookingPress = (booking: Booking) => {
    router.push({
      pathname: "/(screens)/booking/[id]",
      params: { id: booking.id },
    })
  }

  const filteredBookings = bookings.filter((b) =>
    getStatusForTab().includes(b.status)
  )

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f7f7f8" }}
      edges={["top"]}
    >
      {/* Header */}
      <View className="border-gray-03 border-b bg-white p-4">
        <Typography type="h4" className="text-gray-12" weight="bold">
          My Bookings
        </Typography>
      </View>

      {/* HeroUI Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        variant="primary"
      >
        <Tabs.List className="border-gray-03 flex-row border-b bg-white p-1">
          <Tabs.Indicator
            className="bg-blue-03 rounded-sm"
            style={{ height: 2, bottom: 4 }}
          />
          {TABS.map((tab) => (
            <Tabs.Trigger key={tab.key} value={tab.key} className="flex-1 py-3">
              {({ isSelected }) => (
                <Tabs.Label
                  className={`font-inter-semibold text-body-sm text-center ${
                    isSelected ? "font-inter-bold text-white" : "text-gray-07"
                  }`}
                >
                  {tab.label}
                </Tabs.Label>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => handleBookingPress(item)}
          />
        )}
        contentContainerStyle={{
          padding: spacing[4],
          paddingBottom: 40,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2a9cff"]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center justify-center py-10">
              <Spinner />
            </View>
          ) : (
            <EmptyState type={activeTab} />
          )
        }
        ListFooterComponent={
          isLoading && filteredBookings.length > 0 ? (
            <View className="items-center justify-center py-4">
              <Spinner />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
