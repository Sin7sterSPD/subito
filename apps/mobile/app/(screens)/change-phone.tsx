import React, { useState } from "react"
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Typography, Button, TextField, Input, Label, FieldError, Spinner } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { authApi } from "../../src/services/api/auth"
import { sendOTP } from "../../src/config/firebase"

export default function ChangePhoneScreen() {
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const validate = (n: string) => n.replace(/\D/g, "").length === 10

  const onContinue = async () => {
    if (!validate(phone)) {
      setError("Enter a valid 10-digit mobile number")
      return
    }
    const cleaned = phone.replace(/\D/g, "").slice(0, 10)
    setLoading(true)
    setError("")
    try {
      const req = await authApi.requestPhoneChange(cleaned)
      if (!req.success || !req.data) {
        setError(req.error?.message || "Could not start phone change")
        return
      }
      const verificationId = await sendOTP(req.data.newPhone)
      if (!verificationId) {
        setError("Failed to send OTP to the new number")
        return
      }
      router.push({
        pathname: "/(screens)/change-phone-otp",
        params: {
          changeToken: req.data.changeToken,
          newPhone: req.data.newPhone,
          verificationId,
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Typography type="h3" weight="bold" style={styles.title}>
            New phone number
          </Typography>
          <Typography type="body" color="muted" style={styles.sub}>
            We will send an OTP to verify the new number. All other devices will
            be signed out after the change.
          </Typography>
          
          <TextField isInvalid={!!error} style={{ marginBottom: spacing[6] }}>
            <Label>Mobile number</Label>
            <Input
              value={phone}
              onChangeText={(t: string) => {
                setPhone(t.replace(/\D/g, "").slice(0, 10))
                if (error) setError("")
              }}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="10-digit number"
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </TextField>

          <Button
            variant="primary"
            onPress={() => void onContinue()}
            isDisabled={loading}
            className="w-full mt-4"
          >
            {loading ? <Spinner size="sm" /> : <Button.Label>Continue</Button.Label>}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[3] },
  title: { marginBottom: spacing[2] },
  sub: { marginBottom: spacing[4] },
})
