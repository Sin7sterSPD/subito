import React, { useEffect, useState } from "react"
import { View, StyleSheet, Alert, BackHandler } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, type Href } from "expo-router"
import { Typography, Button, Spinner, Card } from "heroui-native"
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
          theme: { color: "#1D54E2" }, // standard Blue-09 brand color
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
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }}>
      <View style={styles.content}>
        {paymentStatus === "pending" ||
        paymentStatus === "processing" ||
        paymentStatus === "confirming" ? (
          <View style={styles.processing}>
            <Spinner size="lg" />
            <Typography
              type="h5"
              weight="semibold"
              style={[styles.processingTitle, { color: semantic.textPrimary }]}
            >
              {phaseLabel}
            </Typography>
            <Typography type="body" align="center" style={{ color: semantic.textSecondary }}>
              Please wait while we process Rs {amount}
            </Typography>
            <Typography
              type="body-sm"
              align="center"
              style={[styles.warning, { color: colors.orange[11] }]}
            >
              Please do not press back or close the app
            </Typography>
          </View>
        ) : paymentStatus === "failed" ? (
          <View style={styles.failed}>
            <View style={styles.failedIcon}>
              <Ionicons name="close" size={48} color={colors.white} />
            </View>
            <Typography
              type="h5"
              weight="semibold"
              style={[styles.failedTitle, { color: semantic.textPrimary }]}
            >
              Payment Failed
            </Typography>
            <Typography type="body" align="center" style={{ color: semantic.textSecondary }}>
              {error || "Your payment could not be processed."}
            </Typography>
            <View style={styles.failedActions}>
              <Button
                variant="primary"
                onPress={handleRetry}
                isDisabled={isLoading}
              >
                Try Again
              </Button>
              <Button variant="ghost" onPress={handleCancel}>
                Cancel
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={colors.white} />
            </View>
            <Typography
              type="h5"
              weight="semibold"
              style={[styles.successTitle, { color: semantic.textPrimary }]}
            >
              Payment Successful!
            </Typography>
            <Typography type="body" align="center" style={{ color: semantic.textSecondary }}>
              Redirecting to your booking...
            </Typography>
          </View>
        )}

        <Card style={styles.orderSummary} variant="secondary">
          <View style={styles.summaryRow}>
            <Typography type="body-sm" style={{ color: semantic.textMuted }}>
              Order ID
            </Typography>
            <Typography type="body-sm" weight="medium" style={{ color: semantic.textPrimary }}>
              {orderId}
            </Typography>
          </View>
          <View style={styles.summaryRow}>
            <Typography type="body-sm" style={{ color: semantic.textMuted }}>
              Amount
            </Typography>
            <Typography type="body-sm" weight="bold" className="text-accent">
              Rs {amount}
            </Typography>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
    overflow: "hidden",
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
