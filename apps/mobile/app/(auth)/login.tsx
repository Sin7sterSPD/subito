import React, { useState } from "react"
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import {
  Button,
  Input,
  TextField,
  Label,
  Spinner,
  InputGroup,
  Description,
} from "heroui-native"
import { useAuthStore } from "../../src/store"
import { sendOTP } from "../../src/config/firebase"
import { Ionicons } from "@expo/vector-icons"
import { getApiBaseUrl } from "@/src/config/env"

export default function LoginScreen() {
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, setVerification, clearVerification } = useAuthStore()

  const validatePhone = (number: string) => {
    const cleaned = number.replace(/\D/g, "")
    return cleaned.length === 10
  }

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 10)
    setPhone(cleaned)
    if (error) setError("")
  }

  const handleContinue = async () => {
    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit mobile number")
      return
    }

    setIsLoading(true)
    setError("")
    clearVerification()

    try {
      console.log("API URL =", getApiBaseUrl())
      console.log("Calling backend login...")
      const result = await login(phone)
      console.log(" Backend login...", result)
      if (!result.success) {
        setError(
          result.error || "Failed to start verification. Please try again."
        )
        return
      }

      const verificationId = await sendOTP(phone)
      console.log("Verification ID:", verificationId)
      if (!verificationId) {
        setError("Failed to send OTP. Please try again.")
        clearVerification()
        return
      }

      const { backendChallengeId, mobileNumber } = useAuthStore.getState()
      if (!backendChallengeId || !mobileNumber) {
        setError("Verification state was not created. Please try again.")
        return
      }

      setVerification({
        firebaseVerificationId: verificationId,
        backendChallengeId,
        mobileNumber,
        retryAfterSec: result.retryAfterSec,
      })
      router.push("/(auth)/otp")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View className="bg-blue-03 h-[380px] items-center justify-end">
            <Image
              source={require("../../assets/home/login-girl.png")}
              style={{ height: 320, width: 280 }}
              contentFit="contain"
            />
          </View>

          {/* Content Card */}
          <View className="-mt-8 flex-1 rounded-t-[32px] bg-white px-6 pt-8">
            <View className="items-center">
              <Text className="text-h6 text-gray-13 font-bold">
                Sign in to Subito
              </Text>

              <Text className="text-body-s text-gray-08 mt-2 text-center">
                Professional home services at your doorstep
              </Text>
            </View>

            {/* Phone Input */}
            <View className="mt-8">
              <TextField isInvalid={!!error}>
                <Label>Mobile Number</Label>

                <InputGroup>
                  <InputGroup.Prefix
                    isDecorative
                    className="flex-row items-center gap-1"
                  >
                    <Text className="text-body-m">🇮🇳</Text>

                    <Text className="text-body-s text-gray-13 font-medium">
                      +91
                    </Text>

                    <Ionicons name="chevron-down" size={14} color="#717684" />
                  </InputGroup.Prefix>

                  <InputGroup.Input
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder="9000000002"
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </InputGroup>

                {error ? (
                  <Text className="text-danger mt-2">{error}</Text>
                ) : (
                  <Description>
                    We&apos;ll send a verification code to this number
                  </Description>
                )}
              </TextField>
            </View>

            {/* Continue Button */}
            <Button
              onPress={handleContinue}
              isDisabled={isLoading || phone.length < 10}
              className="bg-blue-03 mt-8 py-3"
            >
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <Button.Label>Continue</Button.Label>
              )}
            </Button>

            {/* Terms */}
            <Text className="text-caption-l text-gray-07 mt-6 text-center">
              By continuing, you agree to our{" "}
              <Text className="font-semibold text-accent">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="font-semibold text-accent">Privacy Policy</Text>
            </Text>

            {/* Bottom spacing */}
            <View className="h-8" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
