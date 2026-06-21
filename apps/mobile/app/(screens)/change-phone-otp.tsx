import React, { useState } from "react"
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Typography, Button, InputOTP, Spinner } from "heroui-native"
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
  const changeToken =
    typeof params.changeToken === "string" ? params.changeToken : ""
  const newPhone = typeof params.newPhone === "string" ? params.newPhone : ""
  const verificationId =
    typeof params.verificationId === "string" ? params.verificationId : ""
  const hasRequiredParams = !!changeToken && !!newPhone && !!verificationId
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const verifyAndFinish = async (code: string) => {
    if (loading) return
    if (code.length !== 6) return
    if (!hasRequiredParams) {
      setError("Session expired. Please restart phone verification.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const fb = await verifyOTP(verificationId, code)
      if (!fb.success || !fb.idToken) {
        setError("Invalid OTP")
        return
      }
      const res = await authApi.verifyPhoneChange({
        changeToken,
        idtoken: fb.idToken,
        newPhone,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <Typography type="h3" weight="bold">Verify new number</Typography>
          <Typography type="body" color="muted" style={styles.sub}>
            {hasRequiredParams
              ? `Enter the code sent to +91 ${newPhone}`
              : "Session expired. Please restart phone verification."}
          </Typography>

          <View style={{ alignItems: "center", marginVertical: spacing[6] }}>
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(v: string) => {
                setOtp(v)
                if (error) setError("")
                if (v.length === 6) void verifyAndFinish(v)
              }}
            >
              <InputOTP.Group>
                <InputOTP.Slot index={0} />
                <InputOTP.Slot index={1} />
                <InputOTP.Slot index={2} />
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
                <InputOTP.Slot index={3} />
                <InputOTP.Slot index={4} />
                <InputOTP.Slot index={5} />
              </InputOTP.Group>
            </InputOTP>
          </View>

          {error ? (
            <Typography type="body-sm" className="text-danger mb-4" align="center">
              {error}
            </Typography>
          ) : null}

          <Button
            variant="primary"
            onPress={() => void verifyAndFinish(otp)}
            isDisabled={loading || otp.length !== 6 || !hasRequiredParams}
            className="w-full mt-4"
          >
            {loading ? <Spinner size="sm" /> : <Button.Label>Confirm</Button.Label>}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  inner: { flex: 1, padding: spacing[4], gap: spacing[3] },
  sub: { marginBottom: spacing[2] },
})
