import React, { useEffect, useState } from "react"
import { View, StyleSheet, BackHandler } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Text, Button, Input } from "../../src/components/ui"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { usePaymentsStore } from "../../src/store"
import { sendEventAnalytics } from "../../src/analytics/events"
import { PAYMENT_EVENTS } from "../../src/analytics/payment-events"

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ""
  return v ?? ""
}

const UPI_RE = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/

export default function AddUpiScreen() {
  const params = useLocalSearchParams<{
    orderId: string
    bookingId: string
    amount: string
    clientAuthToken: string
    merchantId: string
    clientId: string
    environment: string
  }>()

  const orderId = paramStr(params.orderId)
  const bookingId = paramStr(params.bookingId)
  const amount = paramStr(params.amount)
  const clientAuthToken = paramStr(params.clientAuthToken)
  const merchantId = paramStr(params.merchantId)
  const clientId = paramStr(params.clientId)
  const environment = paramStr(params.environment)

  const verifyUpi = usePaymentsStore((s) => s.verifyUpi)
  const isPaymentProviderOpen = usePaymentsStore((s) => s.isPaymentProviderOpen)

  const [upiId, setUpiId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      return isPaymentProviderOpen
    })
    return () => sub.remove()
  }, [isPaymentProviderOpen])

  const onContinue = async () => {
    const trimmed = upiId.trim()
    setError(null)
    if (!UPI_RE.test(trimmed)) {
      setError("Enter a valid UPI ID (e.g. name@bank)")
      return
    }
    setSubmitting(true)
    try {
      const v = await verifyUpi(trimmed)
      if (!v.isVerified) {
        setError("Could not verify this UPI ID.")
        setSubmitting(false)
        return
      }
      const masked = trimmed.replace(/^(.{2}).*(@.*)$/, "$1***$2")
      sendEventAnalytics(PAYMENT_EVENTS.ADD_UPI_VERIFIED, {
        upiIdMasked: masked,
      })
      router.push({
        pathname: "/(screens)/payment",
        params: {
          orderId,
          bookingId,
          amount,
          clientAuthToken,
          merchantId,
          clientId,
          environment,
          paymentModeId: "upiTxn",
          upiDetails: JSON.stringify({
            type: "COLLECT",
            upiId: trimmed,
            customerName: v.customerName,
          }),
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.inner}>
        <Text
          variant="h5"
          color="textPrimary"
          weight="700"
          style={styles.title}
        >
          UPI ID
        </Text>
        <Input
          label="UPI address"
          placeholder="you@upi"
          value={upiId}
          onChangeText={setUpiId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? (
          <Text variant="bodyMedium" color="error" style={styles.err}>
            {error}
          </Text>
        ) : null}
        <Button
          variant="primary"
          fullWidth
          onPress={() => void onContinue()}
          isLoading={submitting}
          style={styles.btn}
        >
          Continue
        </Button>
        <Button variant="ghost" fullWidth onPress={() => router.back()}>
          Back
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  inner: {
    padding: spacing[4],
  },
  title: {
    marginBottom: spacing[4],
  },
  err: {
    marginTop: spacing[2],
  },
  btn: {
    marginTop: spacing[4],
  },
})
