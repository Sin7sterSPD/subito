import React, { useEffect, useState } from "react"
import { View, StyleSheet, BackHandler, Switch } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Text, Button, Input } from "../../src/components/ui"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { usePaymentsStore } from "../../src/store"
import { sendEventAnalytics } from "../../src/analytics/events"
import { PAYMENT_EVENTS } from "../../src/analytics/payment-events"

function paramStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ""
  return v ?? ""
}

function luhnValid(num: string): boolean {
  const d = num.replace(/\D/g, "")
  if (d.length < 13 || d.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i]!, 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export default function AddCardScreen() {
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

  const isPaymentProviderOpen = usePaymentsStore((s) => s.isPaymentProviderOpen)

  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [nameOnCard, setNameOnCard] = useState("")
  const [saveCard, setSaveCard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      return isPaymentProviderOpen
    })
    return () => sub.remove()
  }, [isPaymentProviderOpen])

  const onPay = () => {
    setError(null)
    const digits = cardNumber.replace(/\s/g, "")
    if (!luhnValid(digits)) {
      setError("Invalid card number.")
      return
    }
    const m = expiry.replace(/\s/g, "").match(/^(\d{2})\/(\d{2,4})$/)
    if (!m) {
      setError("Use MM/YY for expiry.")
      return
    }
    const mm = m[1]!
    let yy = m[2]!
    if (yy.length === 4) yy = yy.slice(-2)
    const mmNum = Number(mm)
    if (!Number.isInteger(mmNum) || mmNum < 1 || mmNum > 12) {
      setError("Invalid expiry month.")
      return
    }
    const now = new Date()
    const fullYear = 2000 + Number(yy)
    const expiryDate = new Date(fullYear, mmNum, 0, 23, 59, 59, 999)
    if (Number.isNaN(expiryDate.getTime()) || expiryDate < now) {
      setError("Card has expired.")
      return
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setError("Invalid CVV.")
      return
    }
    if (!nameOnCard.trim()) {
      setError("Enter name on card.")
      return
    }

    sendEventAnalytics(PAYMENT_EVENTS.ADD_CARD_CLICKED, {
      cardNumberLength: digits.length,

      nameOnCard: !!nameOnCard.trim(),
      secureCard: saveCard,
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
        paymentModeId: "cardTxn",
        cardDetails: JSON.stringify({
          cardNumber: digits,
          cardExpMonth: mm,
          cardExpYear: yy,
          nameOnCard: nameOnCard.trim(),
          cardSecurityCode: cvv,
          saveToLocker: saveCard,
        }),
      },
    })
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
          Card details
        </Text>
        <Input
          label="Card number"
          placeholder="4242 4242 4242 4242"
          keyboardType="number-pad"
          value={cardNumber}
          onChangeText={setCardNumber}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Expiry"
              placeholder="MM/YY"
              value={expiry}
              onChangeText={setExpiry}
            />
          </View>
          <View style={styles.half}>
            <Input
              label="CVV"
              placeholder="•••"
              keyboardType="number-pad"
              secureTextEntry
              value={cvv}
              onChangeText={setCvv}
              maxLength={4}
            />
          </View>
        </View>
        <Input
          label="Name on card"
          placeholder="As on card"
          value={nameOnCard}
          onChangeText={setNameOnCard}
        />
        <View style={styles.saveRow}>
          <Text variant="bodySmall" color="textPrimary">
            Save card for later
          </Text>
          <Switch value={saveCard} onValueChange={setSaveCard} />
        </View>
        {error ? (
          <Text variant="bodyMedium" color="error" style={styles.err}>
            {error}
          </Text>
        ) : null}
        <Button variant="primary" fullWidth onPress={onPay} style={styles.btn}>
          Pay ₹{amount}
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
  row: {
    flexDirection: "row",
    gap: spacing[3],
  },
  half: {
    flex: 1,
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  err: {
    marginTop: spacing[2],
  },
  btn: {
    marginTop: spacing[4],
  },
})
