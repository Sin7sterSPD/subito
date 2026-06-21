import React, { useState } from "react"
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import {
  Button,
  Input,
  Avatar,
  TextField,
  Label,
  FieldError,
  Spinner,
} from "heroui-native"
import { useAuthStore, useAppStore, useUserStore } from "../../src/store"
import { uploadApi } from "../../src/services/api"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"

export default function OnboardingScreen() {
  const { fetchUser } = useAuthStore()
  const { setOnboardingComplete } = useAppStore()
  const { updateProfile } = useUserStore()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    email?: string
  }>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateEmail = (emailValue: string) => {
    if (!emailValue) return true
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailValue)
  }

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri)
    }
  }

  const handleSubmit = async () => {
    const newErrors: typeof errors = {}

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (email && !validateEmail(email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      let uploadedImageUrl: string | undefined

      if (profileImage && !profileImage.startsWith("http")) {
        const url = await uploadApi.uploadImage(profileImage)
        console.log("UPLOAD URL =", url)
        if (url) {
          uploadedImageUrl = url
        }
      }

      const success = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        profileImage: uploadedImageUrl,
      })

      if (success) {
        await fetchUser()
        setOnboardingComplete(true)
        router.replace("/(tabs)")
      } else {
        setErrors({ firstName: "Failed to update profile. Please try again." })
      }
    } catch {
      setErrors({ firstName: "Something went wrong. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    setOnboardingComplete(true)
    router.replace("/(tabs)")
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8">
            <Text className="text-h6 font-jakarta-bold text-gray-13">
              Complete your profile
            </Text>
            <Text className="text-body-s text-gray-08 font-inter-regular mt-2">
              Help us personalize your experience
            </Text>
          </View>

          <TouchableOpacity
            className="relative mb-8 self-center"
            onPress={handlePickImage}
          >
            {profileImage ? (
              <Avatar className="h-[100px] w-[100px] rounded-full">
                <Avatar.Image
                  source={{ uri: profileImage }}
                  className="h-full w-full rounded-full"
                />
              </Avatar>
            ) : (
              <View className="bg-gray-01 border-gray-03 h-[100px] w-[100px] items-center justify-center rounded-full border-2 border-dashed">
                <Ionicons name="camera" size={32} color="#9EA2AD" />
              </View>
            )}
            <View className="absolute right-0 bottom-0 h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-accent">
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <TextField isRequired isInvalid={!!errors.firstName}>
              <Label className="mb-1.5">First Name</Label>
              <Input
                placeholder="Enter your first name"
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text)
                  if (errors.firstName)
                    setErrors({ ...errors, firstName: undefined })
                }}
                autoCapitalize="words"
                className="h-12 rounded-sm focus:border-blue-03"
              />
              {errors.firstName && (
                <FieldError className="mt-1.5">{errors.firstName}</FieldError>
              )}
            </TextField>

            <View className="mt-4">
              <TextField isInvalid={!!errors.lastName}>
                <Label className="mb-1.5">Last Name</Label>
                <Input
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text)
                    if (errors.lastName)
                      setErrors({ ...errors, lastName: undefined })
                  }}
                  autoCapitalize="words"
                  className="h-12 rounded-sm focus:border-blue-03"
                />
                {errors.lastName && (
                  <FieldError className="mt-1.5">{errors.lastName}</FieldError>
                )}
              </TextField>
            </View>

            <View className="mt-4">
              <TextField isInvalid={!!errors.email}>
                <Label className="mb-1.5">Email</Label>
                <Input
                  placeholder="Enter your email (optional)"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="focus:border-blue-03 h-12 rounded-sm"
                />
                {errors.email && (
                  <FieldError className="mt-1.5">{errors.email}</FieldError>
                )}
              </TextField>
            </View>
          </View>

          <View className="mt-8">
            <Button
              onPress={handleSubmit}
              isDisabled={isLoading || !firstName.trim()}
              variant="primary"
              size="lg"
              className="bg-blue-03 h-12 w-full"
            >
              {isLoading ? (
                <Spinner size="sm" color="white" />
              ) : (
                <Button.Label>Continue</Button.Label>
              )}
            </Button>

            <TouchableOpacity onPress={handleSkip} className="items-center p-4">
              <Text className="text-body-s text-gray-06 font-inter-regular">
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
