import React, { useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import {
  Typography,
  Card,
  Button,
  Spinner,
  Chip,
  TextField,
  Input,
  Label,
  Separator,
} from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing, borderRadius } from "../../src/theme/spacing"
import {
  useCartStore,
  useUserStore,
  useBookingsStore,
} from "../../src/store"
import { BookingSlot } from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

function SlotSelector({
  slots,
  availableDates,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
}: {
  slots: Record<string, BookingSlot[]>
  availableDates: string[]
  selectedDate: string | null
  selectedSlot: BookingSlot | null
  onDateChange: (date: string) => void
  onSlotChange: (slot: BookingSlot) => void
}) {
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const dateSlots = selectedDate ? slots[selectedDate] || [] : []

  return (
    <View>
      <Typography
        type="body"
        weight="semibold"
        style={[styles.slotTitle, { color: semantic.textPrimary }]}
      >
        Select Date
      </Typography>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateScroll}
      >
        {availableDates.map((date) => (
          <Chip
            key={date}
            onPress={() => onDateChange(date)}
            variant={selectedDate === date ? "solid" : "soft"}
            color={selectedDate === date ? "primary" : "default"}
            style={{ marginRight: spacing[2] }}
          >
            {formatDateLabel(date)}
          </Chip>
        ))}
      </ScrollView>

      {selectedDate && dateSlots.length > 0 && (
        <>
          <Typography
            type="body"
            weight="semibold"
            style={[styles.slotTitle, { color: semantic.textPrimary }]}
          >
            Select Time
          </Typography>
          <View style={styles.slotsGrid}>
            {dateSlots.map((slot, idx) => (
              <View key={idx} style={{ position: "relative" }}>
                <Chip
                  onPress={() => !slot.isFull && onSlotChange(slot)}
                  disabled={slot.isFull}
                  variant={selectedSlot?.startTime === slot.startTime ? "solid" : "soft"}
                  color={selectedSlot?.startTime === slot.startTime ? "primary" : "default"}
                  style={[
                    slot.isFull && { opacity: 0.45 },
                  ]}
                >
                  {formatTime(slot.startTime)}
                </Chip>
                {slot.isExperiencingSurge && (
                  <View style={styles.surgeBadge}>
                    <Ionicons
                      name="trending-up"
                      size={10}
                      color={colors.orange[9]}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}

export default function CheckoutScreen() {
  const {
    cart,
    updateCart,
    checkoutV2,
    isLoading: cartLoading,
  } = useCartStore()
  const { selectedAddress } = useUserStore()
  const {
    slots,
    availableDates,
    fetchSlots,
    isLoading: slotsLoading,
  } = useBookingsStore()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (selectedAddress) {
      setSelectedSlot(null)
      setSelectedDate(null)
      fetchSlots(
        selectedAddress.latitude,
        selectedAddress.longitude,
        cart?.bookingType
      )
    }
  }, [selectedAddress, cart?.bookingType, fetchSlots])

  useEffect(() => {
    if (
      availableDates.length > 0 &&
      (!selectedDate || !availableDates.includes(selectedDate))
    ) {
      setSelectedDate(availableDates[0])
    }
  }, [availableDates, selectedDate])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleSlotChange = async (slot: BookingSlot) => {
    setSelectedSlot(slot)
    await updateCart({
      timeSlot: { time: [{ start: slot.startTime }] },
    })
  }

  const handleCheckout = async () => {
    if (!selectedAddress) {
      Alert.alert("Error", "Please select a delivery address")
      router.push("/(screens)/addresses")
      return
    }

    if (cart?.bookingType !== "INSTANT" && !selectedSlot) {
      Alert.alert("Error", "Please select a time slot")
      return
    }

    setIsProcessing(true)

    try {
      await updateCart({ deliveryAddressId: selectedAddress.id })

      const result = await checkoutV2()

      if (result.bookingId && result.orderId) {
        router.push({
          pathname: "/(screens)/payment",
          params: {
            orderId: result.orderId,
            bookingId: result.bookingId,
            amount: cart?.finalTotalAmount || "0",
          },
        })
      } else {
        Alert.alert(
          "Error",
          result.error || "Checkout failed. Please try again."
        )
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!cart) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  const isInstant = cart.bookingType === "INSTANT"

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Typography
            type="body"
            weight="semibold"
            style={[styles.sectionTitle, { color: semantic.textPrimary }]}
          >
            Delivery Address
          </Typography>
          <TouchableOpacity
            style={styles.addressCard}
            onPress={() => router.push("/(screens)/addresses")}
          >
            {selectedAddress ? (
              <>
                <View style={styles.addressIcon}>
                  <Ionicons
                    name="location"
                    size={20}
                    color={semantic.accent}
                  />
                </View>
                <View style={styles.addressContent}>
                  <Typography type="body-sm" weight="semibold" style={{ color: semantic.textPrimary }}>
                    {selectedAddress.name}
                  </Typography>
                  <Typography
                    type="body-sm"
                    numberOfLines={2}
                    style={{ color: semantic.textMuted }}
                  >
                    {selectedAddress.addressLine1}, {selectedAddress.city}
                  </Typography>
                </View>
                <Typography type="body" weight="medium" className="text-accent">
                  Change
                </Typography>
              </>
            ) : (
              <>
                <View style={styles.addressIcon}>
                  <Ionicons name="add" size={20} color={semantic.accent} />
                </View>
                <Typography
                  type="body-sm"
                  weight="semibold"
                  className="text-accent"
                  style={styles.addressContent}
                >
                  Add Delivery Address
                </Typography>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!isInstant && (
          <View style={styles.section}>
            {slotsLoading ? (
              <Spinner style={{ paddingVertical: spacing[4] }} />
            ) : (
              <SlotSelector
                slots={slots}
                availableDates={availableDates}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onDateChange={handleDateChange}
                onSlotChange={handleSlotChange}
              />
            )}
            {selectedSlot?.isExperiencingSurge && (
              <Card style={styles.surgeWarning} variant="secondary">
                <View style={styles.surgeContent}>
                  <Ionicons
                    name="trending-up"
                    size={20}
                    color={colors.orange[9]}
                  />
                  <Typography
                    type="body"
                    style={[styles.surgeText, { color: colors.orange[11] }]}
                  >
                    High demand! Surge pricing of ₹{selectedSlot.surgePrice} applies
                  </Typography>
                </View>
              </Card>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Typography
            type="body"
            weight="semibold"
            style={[styles.sectionTitle, { color: semantic.textPrimary }]}
          >
            Order Summary
          </Typography>
          <Card variant="default">
            {cart.items.map((item, idx) => (
              <React.Fragment key={item.id}>
                <View style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <Typography type="body-sm" style={{ color: semantic.textPrimary }}>
                      {item.catalog?.name || "Service"}
                    </Typography>
                    <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                      Qty: {item.quantity}
                    </Typography>
                  </View>
                  <Typography type="body-sm" weight="medium" style={{ color: semantic.textPrimary }}>
                    ₹{item.totalPrice}
                  </Typography>
                </View>
                {idx < cart.items.length - 1 && (
                  <Separator style={{ marginVertical: spacing[2] }} />
                )}
              </React.Fragment>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <TextField>
            <Label>Notes for partner (optional)</Label>
            <Input
              placeholder="Any special instructions..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: "top" }}
            />
          </TextField>
        </View>

        <View style={styles.section}>
          <Card variant="secondary">
            <View style={styles.priceRow}>
              <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                Subtotal
              </Typography>
              <Typography type="body-sm" style={{ color: semantic.textPrimary }}>
                ₹{cart.totalPrice}
              </Typography>
            </View>
            {parseFloat(cart.discountAmount) > 0 && (
              <View style={styles.priceRow}>
                <Typography type="body-sm" className="text-success">
                  Discount
                </Typography>
                <Typography type="body-sm" className="text-success">
                  -₹{cart.discountAmount}
                </Typography>
              </View>
            )}
            {parseFloat(cart.surgePrice) > 0 && (
              <View style={styles.priceRow}>
                <Typography type="body-sm" className="text-warning">
                  Surge
                </Typography>
                <Typography type="body-sm" className="text-warning">
                  +₹{cart.surgePrice}
                </Typography>
              </View>
            )}
            <View style={styles.priceRow}>
              <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                GST
              </Typography>
              <Typography type="body-sm" style={{ color: semantic.textPrimary }}>
                ₹{cart.gst}
              </Typography>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Typography type="body" weight="bold" style={{ color: semantic.textPrimary }}>
                Total
              </Typography>
              <Typography type="body" weight="bold" className="text-accent">
                ₹{cart.finalTotalAmount}
              </Typography>
            </View>
          </Card>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Typography type="body-sm" style={{ color: semantic.textMuted }}>
            Total
          </Typography>
          <Typography type="h5" weight="bold" className="text-accent">
            ₹{cart.finalTotalAmount}
          </Typography>
        </View>
        <Button
          variant="primary"
          onPress={handleCheckout}
          disabled={!selectedAddress || (!isInstant && !selectedSlot) || isProcessing || cartLoading}
          style={styles.checkoutButton}
        >
          {isProcessing ? "Processing..." : "Proceed to Pay"}
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  section: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: semantic.backgroundSecondary,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[1],
    alignItems: "center",
    justifyContent: "center",
  },
  addressContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  slotTitle: {
    marginBottom: spacing[3],
  },
  dateScroll: {
    marginBottom: spacing[4],
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  surgeBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.orange[1],
    borderRadius: 8,
    padding: 2,
    zIndex: 10,
  },
  surgeWarning: {
    marginTop: spacing[3],
    backgroundColor: colors.orange[1],
    borderColor: colors.orange[3],
    borderWidth: 1,
  },
  surgeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  surgeText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderItemInfo: {
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: semantic.background,
  },
  footerPrice: {
    marginRight: spacing[4],
  },
  checkoutButton: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
})
