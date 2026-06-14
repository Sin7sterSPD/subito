import React, { useCallback, useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  BackHandler,
  ScrollView,
  Alert,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, useFocusEffect } from "expo-router"
import { Text, Spinner, Button } from "../../src/components/ui"
import {
  PaymentMethodsList,
  type PaymentSection,
} from "../../src/components/payment/payment-method-list"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { usePaymentsStore } from "../../src/store"
import {
  hyperSDKController,
  buildHyperInitConfig,
} from "../../src/lib/hypersdk-controller"
import { sendEventAnalytics } from "../../src/analytics/events"
import { PAYMENT_EVENTS } from "../../src/analytics/payment-events"
import { Ionicons } from "@expo/vector-icons"

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ""
  return v ?? ""
}

export default function PaymentMethodsScreen() {
  const {
    orderId: oid,
    bookingId: bid,
    amount: amt,
  } = useLocalSearchParams<{
    orderId: string
    bookingId: string
    amount: string
  }>()

  const orderId = paramStr(oid)
  const bookingId = paramStr(bid)
  const amount = paramStr(amt)

  const fetchPaymentOptions = usePaymentsStore((s) => s.fetchPaymentOptions)
  const initiatePayment = usePaymentsStore((s) => s.initiatePayment)
  const paymentOptions = usePaymentsStore((s) => s.paymentOptions)
  const isPaymentProviderOpen = usePaymentsStore((s) => s.isPaymentProviderOpen)
  const setIsPaymentProviderOpen = usePaymentsStore(
    (s) => s.setIsPaymentProviderOpen
  )

  const [clientAuthToken, setClientAuthToken] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState<string>("")
  const [clientId, setClientId] = useState<string>("")
  const [environment, setEnvironment] = useState<string>("sandbox")
  const [installedUpi, setInstalledUpi] = useState<
    { packageName: string; appName: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sdkPrimed, setSdkPrimed] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void fetchPaymentOptions(Platform.OS === "ios" ? "ios" : "android")
    }, [fetchPaymentOptions])
  )

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      if (!orderId || !amount) {
        setError("Missing order information.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const amtNum = parseFloat(amount)
        if (!Number.isFinite(amtNum) || amtNum <= 0) {
          setError("Invalid payment amount.")
          setLoading(false)
          return
        }
        const init = await initiatePayment(orderId, amtNum)
        if (cancelled) return

        if (!init?.clientAuthToken) {
          setError("Could not start payment. Please try again.")
          setLoading(false)
          return
        }

        setClientAuthToken(init.clientAuthToken)
        setMerchantId(init.merchantId)
        setClientId(init.clientId)
        setEnvironment(init.environment)

        const cfg = buildHyperInitConfig({
          orderId,
          clientAuthToken: init.clientAuthToken,
          merchantId: init.merchantId,
          clientId: init.clientId,
          environment: init.environment,
        })

        if (hyperSDKController.isAvailable()) {
          setIsPaymentProviderOpen(true)
          try {
            await hyperSDKController.init(cfg)
            const apps = await hyperSDKController.getInstalledUpiApps(
              orderId,
              init.clientAuthToken
            )
            if (!cancelled) {
              setInstalledUpi(apps)
            }
          } finally {
            try {
              hyperSDKController.terminate()
            } catch {
              /* ignore */
            }
            setIsPaymentProviderOpen(false)
          }
          setSdkPrimed(true)
        } else {
          setSdkPrimed(true)
        }
      } catch {
        if (!cancelled) {
          setError("Something went wrong loading payment options.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [orderId, amount, initiatePayment, setIsPaymentProviderOpen])

  useEffect(() => {
    if (!sdkPrimed || !amount) return
    sendEventAnalytics(PAYMENT_EVENTS.PAYMENTS_INSTRUMENT_PAGE_LANDED, {
      totalUPICount: installedUpi.length,
      upiApps: installedUpi.map((a) => a.appName),
      amount: parseFloat(amount) || 0,
    })
  }, [sdkPrimed, installedUpi, amount])

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isPaymentProviderOpen) return true
      sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_PAGE_BACK_CLICKED, {
        Screen: "PaymentsInstrument",
        Amount: parseFloat(amount) || 0,
        Instrument: "None",
      })
      return false
    })
    return () => sub.remove()
  }, [isPaymentProviderOpen, amount])

  const navigatePayment = (
    paymentModeId: "upiTxn" | "cardTxn",
    extra: { upiDetails?: object; cardDetails?: object }
  ) => {
    if (!clientAuthToken) {
      Alert.alert("Error", "Payment session not ready.")
      return
    }
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
        paymentModeId,
        ...(extra.upiDetails
          ? { upiDetails: JSON.stringify(extra.upiDetails) }
          : {}),
        ...(extra.cardDetails
          ? { cardDetails: JSON.stringify(extra.cardDetails) }
          : {}),
      },
    })
  }

  const sections: PaymentSection[] = []

  const upiRows: PaymentSection["rows"] = []

  for (const app of installedUpi) {
    upiRows.push({
      key: `intent:${app.packageName}`,
      title: app.appName,
      subtitle: "Pay with installed app",
      leading: (
        <Ionicons
          name="phone-portrait-outline"
          size={22}
          color={semantic.primary}
        />
      ),
      onPress: () => {
        sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INSTRUMENT_SELECTED, {
          Type: "UPI",
          Subtype: `INTENT:${app.appName}`,
        })
        navigatePayment("upiTxn", {
          upiDetails: { type: "INTENT", packageName: app.packageName },
        })
      },
    })
  }

  upiRows.push({
    key: "upi-collect",
    title: "Enter UPI ID",
    subtitle: "Pay with UPI address (VPA)",
    leading: <Ionicons name="at-outline" size={22} color={semantic.primary} />,
    onPress: () => {
      sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INSTRUMENT_SELECTED, {
        Type: "UPI",
        Subtype: "COLLECT",
      })
      router.push({
        pathname: "/(screens)/add-upi",
        params: {
          orderId,
          bookingId,
          amount,
          clientAuthToken: clientAuthToken ?? "",
          merchantId,
          clientId,
          environment,
        },
      })
    },
  })

  sections.push({ title: "UPI", rows: upiRows })

  const cardRows: PaymentSection["rows"] = paymentOptions?.cards?.length
    ? paymentOptions.cards.map((c) => ({
        key: c.id,
        title: c.name,
        subtitle: "Credit or debit card",
        leading: (
          <Ionicons name="card-outline" size={22} color={semantic.primary} />
        ),
        onPress: () => {
          sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INSTRUMENT_SELECTED, {
            Type: "Card",
            Subtype: c.name,
          })
          router.push({
            pathname: "/(screens)/add-card",
            params: {
              orderId,
              bookingId,
              amount,
              clientAuthToken: clientAuthToken ?? "",
              merchantId,
              clientId,
              environment,
            },
          })
        },
      }))
    : [
        {
          key: "card-default",
          title: "Credit / debit card",
          subtitle: "Visa, Mastercard, RuPay",
          leading: (
            <Ionicons name="card-outline" size={22} color={semantic.primary} />
          ),
          onPress: () => {
            sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INSTRUMENT_SELECTED, {
              Type: "Card",
              Subtype: "default",
            })
            router.push({
              pathname: "/(screens)/add-card",
              params: {
                orderId,
                bookingId,
                amount,
                clientAuthToken: clientAuthToken ?? "",
                merchantId,
                clientId,
                environment,
              },
            })
          },
        },
      ]

  sections.push({ title: "Cards", rows: cardRows })

  const nbRows: PaymentSection["rows"] =
    paymentOptions?.netbanking.map((c) => ({
      key: c.id,
      title: c.name,
      subtitle: "Net banking (coming soon)",
      leading: (
        <Ionicons name="business-outline" size={22} color={semantic.primary} />
      ),
      onPress: () => {
        sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INSTRUMENT_SELECTED, {
          Type: "Other",
          Subtype: "NETBANKING",
        })
        Alert.alert(
          "Coming soon",
          "Net banking will be available in a future update."
        )
      },
    })) ?? []

  if (nbRows.length > 0) {
    sections.push({ title: "Net banking", rows: nbRows })
  }

  const walletRows: PaymentSection["rows"] =
    paymentOptions?.wallets.map((c) => ({
      key: c.id,
      title: c.name,
      subtitle: "Wallet",
      leading: (
        <Ionicons name="wallet-outline" size={22} color={semantic.primary} />
      ),
      onPress: () => {
        sendEventAnalytics(PAYMENT_EVENTS.PAYMENT_INSTRUMENT_SELECTED, {
          Type: "Other",
          Subtype: `WALLET:${c.name}`,
        })
        Alert.alert(
          "Coming soon",
          "Wallet payments will be available in a future update."
        )
      },
    })) ?? []

  if (walletRows.length > 0) {
    sections.push({ title: "Wallets", rows: walletRows })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Spinner fullScreen message="Loading payment methods…" />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="bodyMedium" color="textSecondary" align="center">
            {error}
          </Text>
          <Button
            variant="primary"
            onPress={() => router.back()}
            style={styles.mt}
          >
            Go back
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="h5" color="textPrimary" weight="700" style={styles.head}>
          Pay ₹{amount}
        </Text>
        <PaymentMethodsList sections={sections} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    padding: spacing[4],
  },
  head: {
    marginBottom: spacing[4],
  },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: spacing[6],
  },
  mt: {
    marginTop: spacing[4],
  },
})
