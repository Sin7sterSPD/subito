import React, { useEffect, useState } from "react"
import { View, StyleSheet, Alert, BackHandler } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, type Href } from "expo-router"
import { Text, Button, Spinner, Card } from "../../src/components/ui"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { usePaymentsStore, useCartStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import { openRazorpayCheckout } from "../../src/lib/razorpay"
import { sendEventAnalytics } from "../../src/analytics/events"
import { PAYMENT_EVENTS } from "../../src/analytics/payment-events"

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ""
  return v ?? ""
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    orderId: string
    bookingId: string
    amount: string
  }>()

  const orderId = paramStr(params.orderId)
  const bookingId = paramStr(params.bookingId)
  const amount = paramStr(params.amount)

  const initiatePayment = usePaymentsStore((s) => s.initiatePayment)
  const processOrder = usePaymentsStore((s) => s.processOrder)
  const waitForPaymentTerminal = usePaymentsStore(
    (s) => s.waitForPaymentTerminal
  )
  const isLoading = usePaymentsStore((s) => s.isLoading)
  const setIsPaymentProviderOpen = usePaymentsStore(
    (s) => s.setIsPaymentProviderOpen
  )
  const setIsPaymentInitiated = usePaymentsStore((s) => s.setIsPaymentInitiated)
  const isPaymentProviderOpen = usePaymentsStore((s) => s.isPaymentProviderOpen)
  const clearCart = useCartStore((s) => s.clearCart)

  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "confirming" | "success" | "failed"
  >("pending")
  const [error, setError] = useState<string | null>(null)
  const [attemptKey, setAttemptKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const runPayment = async () => {
      if (!orderId || !amount) {
        setPaymentStatus("failed")
        setError("Missing payment details. Please try checkout again.")
        return
      }

      setPaymentStatus("processing")
      setError(null)

      try {
        const initiated = await initiatePayment(orderId, Number.parseFloat(amount))
        if (!initiated) {
          throw new Error("Unable to create payment order")
        }

        setIsPaymentProviderOpen(true)
        setIsPaymentInitiated(true)

        sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INITIATED, {
          instrument: "RAZORPAY_CHECKOUT",
          orderId,
        })

        const result = await openRazorpayCheckout({
          key_id: initiated.keyId,
          amount: initiated.amount,
          currency: initiated.currency,
          order_id: initiated.razorpayOrderId,
          description: "Subito booking payment",
          theme: { color: "#111827" },
        })

        if (cancelled) return

        setPaymentStatus("confirming")
        setIsPaymentProviderOpen(false)

        try {
          await processOrder({
            orderId,
            status: "SUCCESS",
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
            razorpayOrderId: result.razorpay_order_id,
          })
        } catch {
          /* polling covers eventual consistency */
        }

        const { ok, payload, timedOut } = await waitForPaymentTerminal(orderId, {
          intervalMs: 2500,
          timeoutMs: 120_000,
        })
        if (cancelled) return

        if (ok && payload?.bookingId) {
          setPaymentStatus("success")
          clearCart()
          setTimeout(() => {
            router.replace({
              pathname: "/(screens)/payment-success",
              params: {
                bookingId: payload.bookingId!,
                bookingNumber: payload.bookingNumber || bookingId || orderId,
                amount,
              },
            } as unknown as Href)
          }, 600)
          return
        }

        if (payload?.status === "FAILED") {
          setPaymentStatus("failed")
          setError(
            "Payment was not successful. Please try again or contact support."
          )
          return
        }

        if (timedOut) {
          setPaymentStatus("failed")
          setError(
            "We could not confirm payment in time. If money was debited, check payment history or contact support."
          )
          return
        }

        setPaymentStatus("failed")
        setError("Payment verification failed. Please contact support.")
      } catch (e) {
        if (cancelled) return
        sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_FAILED, {
          orderId,
          errorCode: e instanceof Error ? e.message : "unknown",
          instrument: "RAZORPAY_CHECKOUT",
        })
        setPaymentStatus("failed")
        setError(e instanceof Error ? e.message : "Something went wrong.")
      } finally {
        setIsPaymentProviderOpen(false)
        setIsPaymentInitiated(false)
      }
    }

    void runPayment()
    return () => {
      cancelled = true
    }
  }, [
    amount,
    attemptKey,
    bookingId,
    clearCart,
    initiatePayment,
    orderId,
    processOrder,
    setIsPaymentInitiated,
    setIsPaymentProviderOpen,
    waitForPaymentTerminal,
  ])

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isPaymentProviderOpen) return true
      return false
    })
    return () => sub.remove()
  }, [isPaymentProviderOpen])

  const handleRetry = () => {
    setError(null)
    setPaymentStatus("pending")
    setAttemptKey((k) => k + 1)
  }

  const handleCancel = () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this payment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    )
  }

  const phaseLabel =
    paymentStatus === "confirming"
      ? "Confirming payment..."
      : paymentStatus === "processing"
        ? "Opening checkout..."
        : "Preparing..."

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {paymentStatus === "pending" ||
        paymentStatus === "processing" ||
        paymentStatus === "confirming" ? (
          <View style={styles.processing}>
            <Spinner size="large" />
            <Text
              variant="h5"
              color="textPrimary"
              weight="600"
              style={styles.processingTitle}
            >
              {phaseLabel}
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              Please wait while we process Rs {amount}
            </Text>
            <Text
              variant="caption"
              color="textMuted"
              align="center"
              style={styles.warning}
            >
              Please do not press back or close the app
            </Text>
          </View>
        ) : paymentStatus === "failed" ? (
          <View style={styles.failed}>
            <View style={styles.failedIcon}>
              <Ionicons name="close" size={48} color={colors.white} />
            </View>
            <Text
              variant="h5"
              color="textPrimary"
              weight="600"
              style={styles.failedTitle}
            >
              Payment Failed
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              {error || "Your payment could not be processed."}
            </Text>
            <View style={styles.failedActions}>
              <Button
                variant="primary"
                fullWidth
                onPress={handleRetry}
                disabled={isLoading}
              >
                Try Again
              </Button>
              <Button variant="ghost" fullWidth onPress={handleCancel}>
                Cancel
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={colors.white} />
            </View>
            <Text
              variant="h5"
              color="textPrimary"
              weight="600"
              style={styles.successTitle}
            >
              Payment Successful!
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              Redirecting to your booking...
            </Text>
          </View>
        )}

        <Card style={styles.orderSummary} variant="filled">
          <View style={styles.summaryRow}>
            <Text variant="bodySmall" color="textMuted">
              Order ID
            </Text>
            <Text variant="bodySmall" color="textPrimary" weight="500">
              {orderId}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodySmall" color="textMuted">
              Amount
            </Text>
            <Text variant="bodySmall" color="primary" weight="700">
              Rs {amount}
            </Text>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    padding: spacing[6],
    justifyContent: "center",
  },
  processing: {
    alignItems: "center",
    marginBottom: spacing[8],
  },
  processingTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  warning: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.orange[1],
    borderRadius: 8,
  },
  failed: {
    alignItems: "center",
    marginBottom: spacing[8],
  },
  failedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.error,
    alignItems: "center",
    justifyContent: "center",
  },
  failedTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  failedActions: {
    width: "100%",
    marginTop: spacing[6],
    gap: spacing[3],
  },
  success: {
    alignItems: "center",
    marginBottom: spacing[8],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.success,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  orderSummary: {
    marginTop: "auto",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing[2],
  },
})
