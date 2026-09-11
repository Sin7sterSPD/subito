import React, { Fragment, useEffect, useState, useCallback, useRef } from "react"
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import {
  Typography,
  Card,
  Chip,
  Spinner,
  Button,
  Tabs,
  Separator,
} from "heroui-native"
import { semantic } from "../../src/theme/colors"
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

// Same cancellation reasons as the booking detail screen.
const CANCEL_REASONS = [
  "Change of plans",
  "Found alternative service",
  "Booked by mistake",
  "Partner taking too long",
  "Other",
]

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

// Mirrors the booking detail screen: only these states can be cancelled.
function canCancelBooking(status: BookingStatus): boolean {
  return ["PENDING_PAYMENT", "PENDING_MATCH", "MATCHED"].includes(status)
}

function isPartnerSide(status: BookingStatus): boolean {
  return status === "MATCHED" || status === "ARRIVING" || status === "STARTED"
}

function formatDate(dateString?: string): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  const weekday = date.toLocaleDateString("en-IN", { weekday: "short" })
  const rest = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  return `${weekday}, ${rest}`
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

type CardActionTone = "default" | "danger"

interface CardAction {
  key: string
  label: string
  icon: React.ComponentProps<typeof Ionicons>["name"]
  iconPosition?: "left" | "right"
  tone: CardActionTone
  onPress: () => void
}

function BookingCard({
  booking,
  onViewDetails,
  onChanged,
}: {
  booking: Booking
  onViewDetails: (booking: Booking) => void
  onChanged: () => void
}) {
  const { cancelBooking } = useBookingsStore()
  // Guard so tapping an action button doesn't also trigger the card press.
  const suppressNav = useRef(false)

  const date = booking.scheduledDate || booking.createdAt
  const firstService = booking.items?.[0]?.name ?? "Service"
  const extraCount = Math.max((booking.items?.length ?? 1) - 1, 0)
  const serviceName =
    extraCount > 0 ? `${firstService} +${extraCount} more` : firstService
  const dateTime = booking.scheduledStartTime
    ? `${formatDate(date)} · ${formatTime(booking.scheduledStartTime)}`
    : formatDate(date)
  const addressLines = booking.address
    ? [
        booking.address.addressLine1,
        booking.address.addressLine2,
        booking.address.city,
      ]
        .filter(Boolean)
        .join(", ")
    : ""

  const openDetails = () => onViewDetails(booking)

  const confirmCancel = async (reason: string) => {
    const success = await cancelBooking(booking.id, reason)
    if (success) {
      Alert.alert("Cancelled", "Your booking has been cancelled.")
      onChanged()
    } else {
      Alert.alert("Error", "Failed to cancel booking. Please try again.")
    }
  }

  const handleCancelPress = () => {
    Alert.alert("Cancel booking?", "Please choose a reason for cancellation", [
      ...CANCEL_REASONS.map((reason) => ({
        text: reason,
        onPress: () => void confirmCancel(reason),
      })),
      { text: "Keep booking", style: "cancel" as const },
    ])
  }

  const handleCallPartner = async () => {
    const phone = booking.partner?.phone
    if (!phone) return
    const url = `tel:${phone}`
    try {
      const supported = await Linking.canOpenURL(url)
      if (!supported) {
        Alert.alert("Error", "Calling is not supported on this device.")
        return
      }
      await Linking.openURL(url)
    } catch {
      Alert.alert("Error", "Unable to start the call. Please try again.")
    }
  }

  const handleBookAgain = () => {
    router.push("/(tabs)")
  }

  const actions: CardAction[] = []
  const isFinished =
    COMPLETED_STATUSES.includes(booking.status) ||
    CANCELLED_STATUSES.includes(booking.status)

  if (isFinished) {
    actions.push({
      key: "again",
      label: "Book Again",
      icon: "refresh-outline",
      tone: "default",
      onPress: handleBookAgain,
    })
  } else if (isPartnerSide(booking.status)) {
    if (booking.partner?.phone) {
      actions.push({
        key: "contact",
        label: "Contact Partner",
        icon: "call-outline",
        tone: "default",
        onPress: () => void handleCallPartner(),
      })
    }
    if (canCancelBooking(booking.status)) {
      actions.push({
        key: "cancel",
        label: "Cancel",
        icon: "close-circle-outline",
        tone: "danger",
        onPress: handleCancelPress,
      })
    }
  } else {
    // Upcoming: reschedule lives on the booking detail screen.
    actions.push({
      key: "reschedule",
      label: "Reschedule",
      icon: "calendar-outline",
      tone: "default",
      onPress: openDetails,
    })
    if (canCancelBooking(booking.status)) {
      actions.push({
        key: "cancel",
        label: "Cancel",
        icon: "close-circle-outline",
        tone: "danger",
        onPress: handleCancelPress,
      })
    }
  }
  actions.push({
    key: "details",
    label: "View Details",
    icon: "chevron-forward",
    iconPosition: "right",
    tone: "default",
    onPress: openDetails,
  })

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${serviceName}, ${dateTime}`}
      onPress={() => {
        if (suppressNav.current) {
          suppressNav.current = false
          return
        }
        openDetails()
      }}
    >
      <Card
        className="border-gray-02 mb-2.5 overflow-hidden rounded-2xl border bg-white p-0"
        variant="default"
      >
        <View className="flex-row gap-3 p-3.5">
          <View className="bg-blue-01 h-16 w-16 items-center justify-center rounded-xl">
            <Ionicons name="sparkles-outline" size={26} color="#2a9cff" />
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <Typography
                weight="semibold"
                className="text-gray-12 flex-1 text-[15px] leading-snug"
                numberOfLines={2}
              >
                {serviceName}
              </Typography>
              <Chip
                variant="soft"
                color={getStatusColor(booking.status)}
                size="sm"
              >
                <Chip.Label className="font-inter-semibold text-caption-s">
                  {getStatusLabel(booking.status)}
                </Chip.Label>
              </Chip>
            </View>

            <Typography
              className="text-gray-07 mt-0.5 text-[13px]"
              numberOfLines={1}
            >
              {dateTime}
            </Typography>

            {booking.address && (
              <View className="mt-1.5 flex-row gap-1.5">
                <Ionicons
                  name="location-outline"
                  size={14}
                  color="#7E869A"
                  style={{ marginTop: 1 }}
                />
                <View className="min-w-0 flex-1">
                  <Typography
                    weight="semibold"
                    className="text-gray-12 text-[13px]"
                    numberOfLines={1}
                  >
                    {booking.address.name}
                  </Typography>
                  {!!addressLines && (
                    <Typography
                      className="text-gray-07 text-[12.5px] leading-snug"
                      numberOfLines={2}
                    >
                      {addressLines}
                    </Typography>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        <Separator />

        <View className="flex-row px-1.5">
          {actions.map((action, index) => (
            <Fragment key={action.key}>
              {index > 0 && <View className="bg-gray-02 my-2.5 w-px" />}
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 py-3"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => {
                  suppressNav.current = true
                  action.onPress()
                }}
              >
                {action.iconPosition !== "right" && (
                  <Ionicons
                    name={action.icon}
                    size={16}
                    color={
                      action.tone === "danger" ? semantic.error : "#7E869A"
                    }
                  />
                )}
                <Typography
                  weight="semibold"
                  className={`text-caption-m ${
                    action.tone === "danger" ? "text-danger" : "text-gray-08"
                  }`}
                  numberOfLines={1}
                >
                  {action.label}
                </Typography>
                {action.iconPosition === "right" && (
                  <Ionicons
                    name={action.icon}
                    size={16}
                    color="#7E869A"
                  />
                )}
              </TouchableOpacity>
            </Fragment>
          ))}
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
    <View className="flex-1 items-center justify-center px-6">
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
          className="bg-blue-03 mt-6 rounded-xl px-8 py-3 transition-transform active:scale-[0.96]"
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
      {/* Compact header */}
      <View className="px-4 pb-2 pt-1">
        <Typography weight="bold" className="text-gray-12 text-[20px]">
          My Bookings
        </Typography>
      </View>

      {/* Segmented filter control */}
      <View className="px-4 pb-1">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          variant="primary"
        >
          <Tabs.List className="bg-gray-01 border-gray-02 flex-row rounded-xl border p-1">
            <Tabs.Indicator className="bg-blue-03 rounded-lg" />
            {TABS.map((tab) => (
              <Tabs.Trigger
                key={tab.key}
                value={tab.key}
                className="flex-1 py-2.5"
              >
                {({ isSelected }) => (
                  <Tabs.Label
                    className={`text-caption-m text-center font-inter-semibold ${
                      isSelected ? "text-white" : "text-gray-07"
                    }`}
                  >
                    {tab.label}
                  </Tabs.Label>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onViewDetails={handleBookingPress}
            onChanged={onRefresh}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
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
