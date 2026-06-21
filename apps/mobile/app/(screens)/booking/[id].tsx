import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import {
  Typography,
  Card,
  Button,
  Chip,
  Spinner,
  Avatar,
  Separator,
  BottomSheet,
} from "heroui-native"
import { colors, semantic } from "../../../src/theme/colors"
import { spacing, borderRadius } from "../../../src/theme/spacing"
import { useBookingsStore } from "../../../src/store"
import { Booking, BookingStatus } from "../../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

function getStatusColor(
  status: BookingStatus
): "primary" | "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "PENDING_PAYMENT":
    case "PENDING_MATCH":
      return "warning"
    case "MATCHED":
    case "ARRIVING":
    case "STARTED":
      return "primary"
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

function formatDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""
  const dateFormatted = date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  if (timeStr) {
    let time = new Date(timeStr)
    if (Number.isNaN(time.getTime())) {
      time = new Date(`${dateStr}T${timeStr}`)
    }
    if (Number.isNaN(time.getTime())) {
      return dateFormatted
    }
    const timeFormatted = time.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
    return `${dateFormatted} at ${timeFormatted}`
  }
  return dateFormatted
}

function StatusTimeline({ status }: { status: BookingStatus }) {
  const steps = [
    { key: "booked", label: "Booked", icon: "checkmark-circle" as const },
    { key: "assigned", label: "Partner Assigned", icon: "person" as const },
    { key: "arriving", label: "On the Way", icon: "car" as const },
    { key: "started", label: "Started", icon: "play" as const },
    { key: "completed", label: "Completed", icon: "star" as const },
  ]

  const getActiveStep = () => {
    switch (status) {
      case "PENDING_PAYMENT":
      case "PENDING_MATCH":
        return 0
      case "MATCHED":
        return 1
      case "ARRIVING":
        return 2
      case "STARTED":
        return 3
      case "COMPLETED":
        return 4
      default:
        return -1
    }
  }

  const activeStep = getActiveStep()
  if (status === "CANCELLED" || status === "REFUNDED") return null

  return (
    <View style={styles.timeline}>
      {steps.map((step, idx) => {
        const isActive = idx <= activeStep
        const isCurrent = idx === activeStep
        return (
          <View key={step.key} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineIcon,
                isActive && styles.timelineIconActive,
                isCurrent && styles.timelineIconCurrent,
              ]}
            >
              <Ionicons
                name={step.icon}
                size={16}
                color={isActive ? colors.white : semantic.textMuted}
              />
            </View>
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.timelineLine,
                  isActive && styles.timelineLineActive,
                ]}
              />
            )}
            <Typography
              type="body-sm"
              weight={isActive ? "semibold" : "normal"}
              style={[
                styles.timelineLabel,
                { color: isActive ? semantic.backgroundSecondary : semantic.textMuted },
              ]}
            >
              {step.label}
            </Typography>
          </View>
        )
      })}
    </View>
  )
}

function PartnerCard({
  partner,
  booking,
  onCall,
  onTrack,
}: {
  partner: Booking["partner"]
  booking: Booking
  onCall: () => void
  onTrack: () => void
}) {
  if (!partner) return null

  const showTrack = ["ARRIVING", "STARTED"].includes(booking.status)

  return (
    <Card style={styles.partnerCard} variant="default">
      <View style={styles.partnerHeader}>
        <Avatar style={{ width: 48, height: 48, borderRadius: 24 }}>
          {partner.profileImage && (
            <Avatar.Image
              source={{ uri: partner.profileImage }}
              style={{ width: "100%", height: "100%", borderRadius: 24 }}
            />
          )}
          <Avatar.Fallback />
        </Avatar>
        <View style={styles.partnerInfo}>
          <Typography type="body" weight="semibold" style={{ color: semantic.textPrimary }}>
            {partner.name || "Service Partner"}
          </Typography>
          {partner.rating && (
            <View style={styles.partnerRating}>
              <Ionicons name="star" size={14} color={colors.orange[8]} />
              <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                {partner.rating.toFixed(1)} • {partner.totalBookings || 0} services
              </Typography>
            </View>
          )}
        </View>
      </View>

      {booking.status === "STARTED" && booking.startOtp && (
        <View style={styles.otpSection}>
          <Typography type="body-sm" style={{ color: semantic.textMuted }}>
            Start OTP
          </Typography>
          <Typography type="h5" weight="bold" className="text-accent">
            {booking.startOtp}
          </Typography>
        </View>
      )}

      <View style={styles.partnerActions}>
        <TouchableOpacity style={styles.partnerAction} onPress={onCall}>
          <View style={styles.partnerActionIcon}>
            <Ionicons name="call" size={20} color={semantic.backgroundSecondary} />
          </View>
          <Typography type="body-sm" weight="semibold" className="text-accent">
            Call
          </Typography>
        </TouchableOpacity>
        {showTrack && (
          <TouchableOpacity style={styles.partnerAction} onPress={onTrack}>
            <View style={styles.partnerActionIcon}>
              <Ionicons name="location" size={20} color={semantic.border} />
            </View>
            <Typography type="body-sm" weight="semibold" className="text-accent">
              Track
            </Typography>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  )
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { selectedBooking, fetchBookingById, cancelBooking, isLoading } =
    useBookingsStore()
  const [refreshing, setRefreshing] = useState(false)
  const [showCancelSheet, setShowCancelSheet] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const booking =
    selectedBooking && selectedBooking.id === id ? selectedBooking : null

  useEffect(() => {
    if (id) {
      fetchBookingById(id)
    }
  }, [id, fetchBookingById])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchBookingById(id)
    setRefreshing(false)
  }, [id, fetchBookingById])

  const handleCancel = async () => {
    if (!cancelReason) {
      Alert.alert("Error", "Please select a reason for cancellation")
      return
    }
    const success = await cancelBooking(id, cancelReason)
    if (success) {
      setShowCancelSheet(false)
      Alert.alert("Cancelled", "Your booking has been cancelled")
    } else {
      Alert.alert("Error", "Failed to cancel booking. Please try again.")
    }
  }

  const handleCallPartner = async () => {
    const phone = booking?.partner?.phone
    if (phone) {
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
  }

  const handleTrackPartner = () => {
    router.push({
      pathname: "/(screens)/partner-tracking",
      params: { bookingId: id },
    })
  }

  const handleRating = () => {
    router.push({
      pathname: "/(screens)/rating",
      params: { bookingId: id },
    })
  }

  if (isLoading || !booking) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }
  const canCancel = ["PENDING_PAYMENT", "PENDING_MATCH", "MATCHED"].includes(
    booking.status
  )
  const canRate = booking.status === "COMPLETED"

  const cancelReasons = [
    "Change of plans",
    "Found alternative service",
    "Booked by mistake",
    "Partner taking too long",
    "Other",
  ]

  return (
    <>
      <Stack.Screen options={{ title: `#${booking.bookingNumber}` }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }} edges={["bottom"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[semantic.primaryPressed]}
            />
          }
        >
          <View style={styles.statusSection}>
            <Chip color={getStatusColor(booking.status)} variant="solid">
              {getStatusLabel(booking.status)}
            </Chip>
            <StatusTimeline status={booking.status} />
          </View>

          <View style={styles.content}>
            <Card style={styles.scheduleCard} variant="secondary">
              <View style={styles.scheduleRow}>
                <Ionicons name="calendar" size={20} color={semantic.borderDark} />
                <Typography
                  type="body"
                  weight="medium"
                  style={[styles.scheduleText, { color: semantic.textPrimary }]}
                >
                  {formatDateTime(
                    booking.scheduledDate,
                    booking.scheduledStartTime
                  )}
                </Typography>
              </View>
              {booking.address && (
                <View style={[styles.scheduleRow, { marginTop: spacing[2] }]}>
                  <Ionicons
                    name="location"
                    size={20}
                    color={semantic.primaryHover}
                  />
                  <View style={styles.scheduleText}>
                    <Typography type="body-sm" weight="semibold" style={{ color: semantic.textPrimary }}>
                      {booking.address.name}
                    </Typography>
                    <Typography type="body" style={{ color: semantic.textMuted }}>
                      {booking.address.addressLine1}
                    </Typography>
                  </View>
                </View>
              )}
            </Card>

            {booking.partner && (
              <PartnerCard
                partner={booking.partner}
                booking={booking}
                onCall={handleCallPartner}
                onTrack={handleTrackPartner}
              />
            )}

            <View style={styles.section}>
              <Typography
                type="body"
                weight="semibold"
                style={[styles.sectionTitle, { color: semantic.textPrimary }]}
              >
                Services
              </Typography>
              <Card variant="default" style={{ padding: 0 }}>
                {booking.items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Typography
                          type="body-sm"
                          weight="semibold"
                          style={{ color: semantic.textPrimary }}
                        >
                          {item.name}
                        </Typography>
                        <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                          Qty: {item.quantity}
                        </Typography>
                      </View>
                      <Typography
                        type="body-sm"
                        weight="semibold"
                        style={{ color: semantic.textPrimary }}
                      >
                        ₹{item.totalPrice}
                      </Typography>
                    </View>
                    {idx < booking.items.length - 1 && (
                      <Separator />
                    )}
                  </React.Fragment>
                ))}
              </Card>
            </View>

            <View style={styles.section}>
              <Typography
                type="body"
                weight="semibold"
                style={[styles.sectionTitle, { color: semantic.textPrimary }]}
              >
                Payment Summary
              </Typography>
              <Card variant="default">
                {booking.subtotal && (
                  <View style={styles.priceRow}>
                    <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                      Subtotal
                    </Typography>
                    <Typography type="body-sm" style={{ color: semantic.textPrimary }}>
                      ₹{booking.subtotal}
                    </Typography>
                  </View>
                )}
                {parseFloat(booking.discountAmount || "0") > 0 && (
                  <View style={styles.priceRow}>
                    <Typography type="body-sm" className="text-success">
                      Discount
                    </Typography>
                    <Typography type="body-sm" className="text-success">
                      -₹{booking.discountAmount}
                    </Typography>
                  </View>
                )}
                {booking.gstAmount && (
                  <View style={styles.priceRow}>
                    <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                      GST
                    </Typography>
                    <Typography type="body-sm" style={{ color: semantic.textPrimary }}>
                      ₹{booking.gstAmount}
                    </Typography>
                  </View>
                )}
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Typography type="body" weight="bold" style={{ color: semantic.textPrimary }}>
                    Total
                  </Typography>
                  <Typography type="body" weight="bold" className="text-accent">
                    ₹{booking.finalAmount || booking.totalAmount}
                  </Typography>
                </View>
              </Card>
            </View>

            {booking.customerNotes && (
              <View style={styles.section}>
                <Typography
                  type="body"
                  weight="semibold"
                  style={[styles.sectionTitle, { color: semantic.textPrimary }]}
                >
                  Your Notes
                </Typography>
                <Card variant="secondary">
                  <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                    {booking.customerNotes}
                  </Typography>
                </Card>
              </View>
            )}

            <View style={styles.actions}>
              {canCancel && (
                <Button
                  variant="outline"
                  onPress={() => setShowCancelSheet(true)}
                >
                  Cancel Booking
                </Button>
              )}
              {canRate && (
                <Button variant="primary" onPress={handleRating}>
                  Rate Service
                </Button>
              )}
            </View>

            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        <BottomSheet
          isOpen={showCancelSheet}
          onOpenChange={setShowCancelSheet}
        >
          <BottomSheet.Portal>
            <BottomSheet.Overlay style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
            <BottomSheet.Content snapPoints={["55%"]}>
              <View style={styles.cancelSheet}>
                <BottomSheet.Title style={[styles.cancelTitle, { fontSize: 20, fontWeight: "bold", color: semantic.textPrimary }]}>
                  Cancel Booking
                </BottomSheet.Title>
                <BottomSheet.Description style={[styles.cancelSubtitle, { color: semantic.textSecondary, marginBottom: spacing[4] }]}>
                  Please select a reason for cancellation
                </BottomSheet.Description>
                {cancelReasons.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.cancelOption,
                      cancelReason === reason && styles.cancelOptionActive,
                    ]}
                    onPress={() => setCancelReason(reason)}
                  >
                    <Typography
                      type="body-sm"
                      style={{ color: cancelReason === reason ? semantic.accent : semantic.textPrimary }}
                    >
                      {reason}
                    </Typography>
                    {cancelReason === reason && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={semantic.accent}
                      />
                    )}
                  </TouchableOpacity>
                ))}
                <Button
                  variant="danger"
                  onPress={handleCancel}
                  disabled={!cancelReason}
                  style={styles.cancelButton}
                >
                  Confirm Cancellation
                </Button>
              </View>
            </BottomSheet.Content>
          </BottomSheet.Portal>
        </BottomSheet>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  statusSection: {
    alignItems: "center",
    paddingVertical: spacing[4],
    backgroundColor: semantic.backgroundSecondary,
  },
  timeline: {
    flexDirection: "row",
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  timelineStep: {
    flex: 1,
    alignItems: "center",
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineIconActive: {
    backgroundColor: colors.blue[2],
  },
  timelineIconCurrent: {
    backgroundColor: semantic.accent,
  },
  timelineLine: {
    position: "absolute",
    top: 16,
    left: "50%",
    right: "-50%",
    height: 2,
    backgroundColor: semantic.border,
    zIndex: -1,
  },
  timelineLineActive: {
    backgroundColor: semantic.accent,
  },
  timelineLabel: {
    marginTop: spacing[1],
    textAlign: "center",
  },
  content: {
    padding: spacing[4],
  },
  scheduleCard: {
    marginBottom: spacing[4],
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scheduleText: {
    marginLeft: spacing[3],
    flex: 1,
  },
  partnerCard: {
    marginBottom: spacing[4],
  },
  partnerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  partnerInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  partnerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  otpSection: {
    backgroundColor: colors.blue[1],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing[3],
  },
  partnerActions: {
    flexDirection: "row",
    gap: spacing[4],
    justifyContent: "center",
  },
  partnerAction: {
    alignItems: "center",
    gap: spacing[1],
  },
  partnerActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue[1],
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
  },
  serviceInfo: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing[2],
  },
  totalRow: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    marginBottom: 0,
  },
  actions: {
    marginTop: spacing[2],
    gap: spacing[3],
  },
  cancelSheet: {
    paddingHorizontal: spacing[4],
  },
  cancelTitle: {
    marginBottom: spacing[1],
  },
  cancelSubtitle: {
    marginBottom: spacing[4],
  },
  cancelOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: semantic.backgroundSecondary,
    marginBottom: spacing[2],
  },
  cancelOptionActive: {
    backgroundColor: colors.blue[1],
    borderWidth: 1,
    borderColor: semantic.accent,
  },
  cancelButton: {
    marginTop: spacing[4],
  },
  bottomPadding: {
    height: spacing[4],
  },
})
