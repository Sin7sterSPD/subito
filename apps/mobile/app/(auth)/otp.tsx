import React, { useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Text, Button, OTPInput } from "../../src/components/ui"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useAuthStore, useAppStore } from "../../src/store"
import { verifyOTP, sendOTP } from "../../src/config/firebase"
import { Ionicons } from "@expo/vector-icons"

export default function OTPScreen() {
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [serverRetryAfterSec, setServerRetryAfterSec] = useState<number | null>(
    null
  )
  const [retryAnchorMs, setRetryAnchorMs] = useState<number | null>(null)
  const [resendTimer, setResendTimer] = useState(0)

  const {
    verify,
    login,
    setVerification,
    clearVerification,
    firebaseVerificationId,
    backendChallengeId,
    mobileNumber,
    resendRetryAfterSec,
  } = useAuthStore()
  const { setOnboardingComplete } = useAppStore()

  useEffect(() => {
    if (!firebaseVerificationId || !backendChallengeId || !mobileNumber) {
      router.replace("/(auth)/login")
    }
  }, [backendChallengeId, firebaseVerificationId, mobileNumber])

  useEffect(() => {
    if (typeof resendRetryAfterSec === "number") {
      setServerRetryAfterSec(resendRetryAfterSec)
      setRetryAnchorMs(Date.now())
    }
  }, [resendRetryAfterSec])

  useEffect(() => {
    if (serverRetryAfterSec === null || retryAnchorMs === null) {
      setResendTimer(0)
      return
    }

    const updateTimer = () => {
      const elapsedSec = Math.floor((Date.now() - retryAnchorMs) / 1000)
      setResendTimer(Math.max(serverRetryAfterSec - elapsedSec, 0))
    }

    updateTimer()
    if (serverRetryAfterSec <= 0) {
      return
    }

    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [retryAnchorMs, serverRetryAfterSec])

  const handleOTPChange = (value: string) => {
    setOtp(value)
    if (error) setError("")

    if (value.length === 6) {
      handleVerify(value)
    }
  }

  const handleVerify = async (otpValue: string = otp) => {
    if (otpValue.length !== 6) {
      setError("Please enter the complete OTP")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      if (!firebaseVerificationId) {
        setError("Verification session expired. Please try again.")
        return
      }

      const firebaseResult = await verifyOTP(firebaseVerificationId, otpValue)

      if (!firebaseResult.success || !firebaseResult.idToken) {
        setError("Invalid OTP. Please try again.")
        setIsLoading(false)
        return
      }

      const result = await verify(firebaseResult.idToken)
      // console.log(
      //   "🔑 FULL AUTH STATE:",
      //   JSON.stringify(useAuthStore.getState())
      // )

      if (result.success) {
        if (result.isNewUser) {
          router.replace("/(auth)/onboarding")
        } else {
          setOnboardingComplete(true)
          router.replace("/(tabs)")
        }
      } else {
        setError(result.error || "Verification failed. Please try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    if (!mobileNumber) {
      setError("Verification session expired. Please try again.")
      return
    }

    setIsLoading(true)
    try {
      const result = await login(mobileNumber)
      if (!result.success) {
        if (typeof result.retryAfterSec === "number") {
          setServerRetryAfterSec(result.retryAfterSec)
          setRetryAnchorMs(Date.now())
        }
        setError(result.error || "Failed to resend OTP. Please try again.")
        return
      }

      const newVerificationId = await sendOTP(mobileNumber)
      if (!newVerificationId) {
        setError("Failed to resend OTP. Please try again.")
        clearVerification()
        return
      }

      const {
        backendChallengeId: nextChallengeId,
        mobileNumber: nextMobileNumber,
      } = useAuthStore.getState()
      if (!nextChallengeId || !nextMobileNumber) {
        setError("Failed to refresh verification state. Please try again.")
        return
      }

      setVerification({
        firebaseVerificationId: newVerificationId,
        backendChallengeId: nextChallengeId,
        mobileNumber: nextMobileNumber,
        retryAfterSec: result.retryAfterSec,
      })
      setServerRetryAfterSec(result.retryAfterSec ?? null)
      setRetryAnchorMs(Date.now())
      setOtp("")
      setError("")
    } catch {
      setError("Failed to resend OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={semantic.textPrimary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="h3" color="textPrimary" weight="700">
              Verify your number
            </Text>
            <Text
              variant="bodyMedium"
              color="textSecondary"
              style={styles.subtitle}
            >
              Enter the 6-digit code sent to
            </Text>
            <Text variant="bodyMedium" color="primary" weight="600">
              {mobileNumber}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <OTPInput
              value={otp}
              onChange={handleOTPChange}
              error={!!error}
              autoFocus
            />
            {error && (
              <Text variant="bodyMedium" color="error" style={styles.error}>
                {error}
              </Text>
            )}
          </View>

          <View style={styles.resendContainer}>
            {resendTimer > 0 ? (
              <Text variant="bodySmall" color="textMuted">
                Resend code in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                <Text variant="bodySmall" color="primary" weight="600">
                  Resend Code
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            onPress={() => handleVerify()}
            isLoading={isLoading}
            disabled={otp.length !== 6}
            fullWidth
            size="lg"
          >
            Verify
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    padding: spacing[4],
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    padding: spacing[6],
    paddingTop: spacing[4],
  },
  header: {
    marginBottom: spacing[8],
  },
  subtitle: {
    marginTop: spacing[2],
  },
  otpContainer: {
    marginBottom: spacing[6],
  },
  error: {
    textAlign: "center",
    marginTop: spacing[3],
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
})
