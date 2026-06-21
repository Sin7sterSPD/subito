import React, { useEffect } from "react"
import { View, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated"
import { Typography, Button } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useCartStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import { sendEventAnalytics } from "../../src/analytics/events"
import { PAYMENT_EVENTS } from "../../src/analytics/payment-events"

export default function PaymentSuccessScreen() {
  const { bookingId, bookingNumber, amount } = useLocalSearchParams<{
    bookingId?: string | string[]
    bookingNumber?: string | string[]
    amount?: string | string[]
  }>()
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId
  const resolvedBookingNumber = Array.isArray(bookingNumber)
    ? bookingNumber[0]
    : bookingNumber

  const resolvedAmount = Array.isArray(amount) ? amount[0] : amount
  const { clearCart } = useCartStore()
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    clearCart()

    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
    })

    opacity.value = withDelay(300, withSpring(1))

    sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_SUCCESS_PAGE_LANDED, {
      bookingId: resolvedBookingId ?? "",
      bookingNumber: resolvedBookingNumber ?? "",
      amount: resolvedAmount ? parseFloat(resolvedAmount) : 0,
      timestamp: new Date().toISOString(),
    })
  }, [
    clearCart,
    scale,
    opacity,
    resolvedBookingId,
    resolvedBookingNumber,
    resolvedAmount,
  ])

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const handleViewBooking = () => {
    if (!resolvedBookingId) {
      return
    }

    router.replace({
      pathname: "/(screens)/booking/[id]",
      params: {
        id: resolvedBookingId,
      },
    })
  }

  const handleGoHome = () => {
    router.replace("/(tabs)")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={64} color={colors.white} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContent, contentStyle]}>
          <Typography type="h3" weight="bold" align="center" style={{ color: semantic.textPrimary }}>
            Payment Successful!
          </Typography>
          <Typography
            type="body"
            color="muted"
            align="center"
            style={styles.description}
          >
            Your booking has been confirmed. Our partner will arrive at your
            scheduled time.
          </Typography>

          {resolvedBookingNumber && (
            <View style={styles.bookingInfo}>
              <Typography type="body-sm" color="muted">
                Booking Number
              </Typography>
              <Typography type="h5" className="text-accent" weight="bold">
                #{resolvedBookingNumber}
              </Typography>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              variant="primary"
              onPress={handleViewBooking}
              isDisabled={!resolvedBookingId}
              className="w-full"
            >
              <Button.Label>View Booking</Button.Label>
            </Button>
            <Button variant="ghost" onPress={handleGoHome} className="w-full">
              <Button.Label>Go to Home</Button.Label>
            </Button>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[6],
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: semantic.success,
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    alignItems: "center",
    width: "100%",
  },
  description: {
    marginTop: spacing[3],
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  bookingInfo: {
    backgroundColor: colors.blue[1],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: 16,
    alignItems: "center",
    marginBottom: spacing[8],
  },
  actions: {
    width: "100%",
    gap: spacing[3],
  },
})
