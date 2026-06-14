import React, { useEffect, useState } from "react"
import { View, StyleSheet, Alert, BackHandler } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, type Href } from "expo-router"
import { Text, Button, Spinner, Card } from "../../src/components/ui"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { usePaymentsStore, useCartStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import {
  hyperSDKController,
  buildHyperInitConfig,
  type HyperUpiDetails,
  type HyperCardDetails,
} from "../../src/lib/hypersdk-controller"
import { mapHyperPayloadToProcessOrder } from "../../src/lib/map-hyper-process-result"
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
    clientAuthToken: string
    merchantId: string
    clientId: string
    environment: string
    paymentModeId: "upiTxn" | "cardTxn"
    upiDetails?: string
    cardDetails?: string
  }>()

  const orderId = paramStr(params.orderId)
  const bookingId = paramStr(params.bookingId)
  const amount = paramStr(params.amount)
  const clientAuthToken = paramStr(params.clientAuthToken)
  const merchantId = paramStr(params.merchantId)
  const clientId = paramStr(params.clientId)
  const environment = paramStr(params.environment)
  const paymentModeId = (paramStr(params.paymentModeId) || "upiTxn") as
    | "upiTxn"
    | "cardTxn"

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
      if (!orderId || !amount || !clientAuthToken) {
        setPaymentStatus("failed")
        setError(
          "Missing payment session. Go back and choose a payment method again."
        )
        return
      }

      let upiDetails: HyperUpiDetails | undefined
      let cardDetails: HyperCardDetails | undefined

      try {
        if (params.upiDetails) {
          upiDetails = JSON.parse(
            paramStr(params.upiDetails)
          ) as HyperUpiDetails
        }
        if (params.cardDetails) {
          cardDetails = JSON.parse(
            paramStr(params.cardDetails)
          ) as HyperCardDetails
        }
      } catch {
        setPaymentStatus("failed")
        setError("Invalid payment details.")
        return
      }

      if (paymentModeId === "upiTxn" && !upiDetails) {
        setPaymentStatus("failed")
        setError("Missing UPI details.")
        return
      }
      if (paymentModeId === "cardTxn" && !cardDetails) {
        setPaymentStatus("failed")
        setError("Missing card details.")
        return
      }

      setPaymentStatus("processing")
      setError(null)
      setIsPaymentProviderOpen(true)

      try {
        if (!hyperSDKController.isAvailable()) {
          setPaymentStatus("failed")
          setError(
            "Payments require a dev build with Juspay HyperSDK. Expo Go is not supported."
          )
          setIsPaymentProviderOpen(false)
          return
        }

        const cfg = buildHyperInitConfig({
          orderId,
          clientAuthToken,
          merchantId: merchantId || undefined,
          clientId: clientId || undefined,
          environment: environment || undefined,
        })

        await hyperSDKController.init(cfg)

        sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INITIATED, {
          Instrument: paymentModeId === "upiTxn" ? "UPI" : "Card",
          UPIType:
            paymentModeId === "upiTxn" && upiDetails ? upiDetails.type : "",
        })

        setIsPaymentInitiated(true)

        let rawResult: Record<string, unknown>
        if (paymentModeId === "upiTxn" && upiDetails) {
          rawResult = await hyperSDKController.initiateUpiTransaction(
            orderId,
            clientAuthToken,
            upiDetails,
            { useActivity: false }
          )
        } else if (paymentModeId === "cardTxn" && cardDetails) {
          rawResult = await hyperSDKController.initiateCardTransaction(
            orderId,
            clientAuthToken,
            cardDetails,
            { useActivity: false }
          )
        } else {
          throw new Error("Unsupported payment mode")
        }

        if (cancelled) return

        setIsPaymentProviderOpen(false)

        const mapped = mapHyperPayloadToProcessOrder(rawResult)

        if (mapped.status === "FAILED") {
          sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_FAILED, {
            orderId,
            errorCode: String(
              rawResult.errorCode ?? rawResult.errorMessage ?? "unknown"
            ),
            instrument: paymentModeId,
          })
          setPaymentStatus("failed")
          setError("Payment was not completed. You can try again.")
          return
        }

        if (mapped.status === "SUCCESS" || mapped.status === "CHARGED") {
          setPaymentStatus("confirming")
          try {
            await processOrder(
              orderId,
              mapped.status === "CHARGED" ? "CHARGED" : "SUCCESS",
              mapped.txnId
            )
          } catch {
            /* rely on polling if gateway lags */
          }
        } else {
          setPaymentStatus("confirming")
        }

        const { ok, payload, timedOut } = await waitForPaymentTerminal(
          orderId,
          {
            intervalMs: 2500,
            timeoutMs: 120_000,
          }
        )
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
            "We could not confirm payment in time. If money was debited, check Payment history or contact support."
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
          instrument: paymentModeId,
        })
        setPaymentStatus("failed")
        setError(e instanceof Error ? e.message : "Something went wrong.")
      } finally {
        setIsPaymentProviderOpen(false)
        setIsPaymentInitiated(false)
        try {
          hyperSDKController.terminate()
        } catch {
          /* ignore */
        }
      }
    }

    void runPayment()
    return () => {
      cancelled = true
    }
  }, [
    attemptKey,
    orderId,
    amount,
    clientAuthToken,
    merchantId,
    clientId,
    environment,
    paymentModeId,
    params.upiDetails,
    params.cardDetails,
    processOrder,
    waitForPaymentTerminal,
    clearCart,
    bookingId,
    setIsPaymentInitiated,
    setIsPaymentProviderOpen,
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
      ? "Confirming payment…"
      : paymentStatus === "processing"
        ? "Processing payment…"
        : "Preparing…"

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
              Please wait while we process ₹{amount}
            </Text>
            <Text
              variant="caption"
              color="textMuted"
              align="center"
              style={styles.warning}
            >
              Please don’t press back or close the app
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
              Redirecting to your booking…
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
              ₹{amount}
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
