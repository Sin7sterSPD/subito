import React, { useState } from "react"
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Text, Button, OTPInput } from "../../src/components/ui"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { authApi } from "../../src/services/api/auth"
import { verifyOTP, signOut } from "../../src/config/firebase"
import { useAuthStore } from "../../src/store"
import { apiClient } from "../../src/services/api-client"

export default function ChangePhoneOtpScreen() {
  const params = useLocalSearchParams<{
    changeToken: string
    newPhone: string
    verificationId: string
  }>()
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const verifyAndFinish = async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    setError("")
    try {
      const fb = await verifyOTP(params.verificationId, code)
      if (!fb.success || !fb.idToken) {
        setError("Invalid OTP")
        return
      }
      const res = await authApi.verifyPhoneChange({
        changeToken: params.changeToken,
        idtoken: fb.idToken,
        newPhone: params.newPhone,
      })
      if (!res.success || !res.data) {
        setError(res.error?.message || "Verification failed")
        return
      }
      const { setTokens, setUser } = useAuthStore.getState()
      await setTokens(res.data.jwt_token, res.data.refreshToken)
      setUser(res.data.userData)
      apiClient.setAuthToken(res.data.jwt_token)
      await signOut()
      router.replace("/(tabs)")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.inner}>
          <Text variant="h3">Verify new number</Text>
          <Text variant="bodyMedium" color="textMuted" style={styles.sub}>
            Enter the code sent to +91 {params.newPhone}
          </Text>
          <OTPInput
            value={otp}
            onChange={(v: string) => {
              setOtp(v)
              if (error) setError("")
              if (v.length === 6) void verifyAndFinish(v)
            }}
          />
          {error ? (
            <Text variant="bodySmall" color="error">
              {error}
            </Text>
          ) : null}
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onPress={() => void verifyAndFinish(otp)}
            isLoading={loading}
            disabled={otp.length !== 6}
          >
            Confirm
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  inner: { flex: 1, padding: spacing[4], gap: spacing[3] },
  sub: { marginBottom: spacing[2] },
})
