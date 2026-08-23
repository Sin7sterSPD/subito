import { useState } from "react"
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import {
  Button,
  TextField,
  Label,
  Spinner,
  InputGroup,
  Description,
} from "heroui-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuthStore } from "../../src/store"
import { sendOTP } from "../../src/config/firebase"

export default function PartnerLoginScreen() {
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
      const result = await login(phone)
      if (!result.success) {
        setError(result.error || "Failed to start verification. Please try again.")
        return
      }

      const verificationId = await sendOTP(phone)
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
          <View className="bg-blue-01 h-[300px] items-center justify-center">
            <View className="h-20 w-20 rounded-3xl bg-blue-09 items-center justify-center">
              <Ionicons name="briefcase" size={36} color="#ffffff" />
            </View>
            <Text className="text-h6 text-gray-13 font-jakarta-bold mt-6">
              Subito Partner
            </Text>
            <Text className="text-body-s text-gray-07 font-inter-regular mt-1">
              Manage your jobs, your way
            </Text>
          </View>

          {/* Content Card */}
          <View className="-mt-8 flex-1 rounded-t-[32px] bg-white px-6 pt-8">
            <View className="items-center">
              <Text className="text-h6 text-gray-13 font-jakarta-bold">
                Sign in to continue
              </Text>
              <Text className="text-body-s text-gray-08 font-inter-regular mt-2 text-center">
                Enter your registered partner mobile number
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
                    <Text className="text-body-s text-gray-13 font-inter-medium">
                      +91
                    </Text>
                  </InputGroup.Prefix>

                  <InputGroup.Input
                    value={phone}
                    onChangeText={handlePhoneChange}
                    placeholder="9000000006"
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </InputGroup>

                {error ? (
                  <Text className="text-danger font-inter-medium mt-2">
                    {error}
                  </Text>
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

            <View className="flex-1" />

            <Text className="text-caption-l text-gray-07 font-inter-regular mt-6 text-center">
              Partner access only. Don&apos;t have a partner account? Contact
              your Subito operations team to get onboarded.
            </Text>

            <View className="h-8" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
