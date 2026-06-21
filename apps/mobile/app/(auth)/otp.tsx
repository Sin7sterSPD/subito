import React, { useEffect, useState } from "react"
import {
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Button, InputOTP, Spinner } from "heroui-native"
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
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity onPress={handleBack} className="self-start p-4">
          <Ionicons name="arrow-back" size={24} color="#14151A" />
        </TouchableOpacity>

        <View className="flex-1 p-6 pt-4">
          <View className="mb-8">
            <Text className="text-h3 text-gray-13 font-bold">
              Verify your number
            </Text>
            <Text className="text-body-m text-gray-08 mt-2">
              Enter the 6-digit code sent to
            </Text>
            <Text className="text-body-m font-semibold text-accent">
              {mobileNumber}
            </Text>
          </View>

          <View className="mb-6 items-center">
            <InputOTP
              value={otp}
              onChange={handleOTPChange}
              maxLength={6}
              isInvalid={!!error}
              textInputProps={{ autoFocus: true }}
            >
              <InputOTP.Group className="flex-row justify-center gap-2">
                <InputOTP.Slot index={0} />
                <InputOTP.Slot index={1} />
                <InputOTP.Slot index={2} />
                <InputOTP.Slot index={3} />
                <InputOTP.Slot index={4} />
                <InputOTP.Slot index={5} />
              </InputOTP.Group>
            </InputOTP>
            {error && (
              <Text className="text-body-m text-danger mt-3 text-center">
                {error}
              </Text>
            )}
          </View>

          <View className="mb-6 items-center">
            {resendTimer > 0 ? (
              <Text className="text-body-s text-gray-06">
                Resend code in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                <Text className="text-body-s font-semibold text-accent">
                  Resend Code
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            onPress={() => handleVerify()}
            isDisabled={isLoading || otp.length !== 6}
            variant="primary"
            size="lg"
            className="h-12 w-full"
          >
            {isLoading ? (
              <Spinner size="sm" color="white" />
            ) : (
              <Button.Label>Verify</Button.Label>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
