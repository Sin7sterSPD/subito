import React, { useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Typography, Button, TextField, Input, Label, FieldError, Avatar, Spinner } from "heroui-native"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useAuthStore, useUserStore } from "../../src/store"
import { uploadApi } from "../../src/services/api"
import * as ImagePicker from "expo-image-picker"
import { Ionicons } from "@expo/vector-icons"

export default function EditProfileScreen() {
  const { user, fetchUser } = useAuthStore()
  const { updateProfile, isLoading } = useUserStore()

  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [email, setEmail] = useState(user?.email || "")
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.profileImage || null
  )
  const [errors, setErrors] = useState<{
    firstName?: string
    email?: string
  }>({})

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

  const handleSave = async () => {
    const newErrors: typeof errors = {}

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (email && !validateEmail(email.trim())) {
      newErrors.email = "Please enter a valid email"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      let uploadedImageUrl: string | undefined

      if (
        profileImage &&
        profileImage !== user?.profileImage &&
        !profileImage.startsWith("http")
      ) {
        const url = await uploadApi.uploadImage(profileImage)
        if (url) {
          uploadedImageUrl = url
        }
      }

      const success = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        profileImage:
          uploadedImageUrl ||
          (profileImage === user?.profileImage ? undefined : undefined),
      })

      if (success) {
        await fetchUser()
        Alert.alert("Success", "Profile updated successfully")
        router.back()
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.")
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.")
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
            activeOpacity={0.9}
          >
            <Avatar className="w-[100px] h-[100px] rounded-sm">
              {profileImage ? (
                <Avatar.Image source={{ uri: profileImage }} className="w-full h-full rounded-sm" />
              ) : null}
              <Avatar.Fallback />
            </Avatar>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          <View style={styles.form}>
            <TextField isRequired isInvalid={!!errors.firstName}>
              <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">First Name</Label>
              <Input
                placeholder="Enter your first name"
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text)
                  if (errors.firstName)
                    setErrors({ ...errors, firstName: undefined })
                }}
                autoCapitalize="words"
                className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
              />
              {errors.firstName ? <FieldError className="mt-1.5">{errors.firstName}</FieldError> : null}
            </TextField>

            <View style={styles.inputSpacing}>
              <TextField>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Last Name</Label>
                <Input
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField isInvalid={!!errors.email}>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Email</Label>
                <Input
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
                {errors.email ? <FieldError className="mt-1.5">{errors.email}</FieldError> : null}
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField isDisabled>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-07">Phone</Label>
                <Input
                  value={`+91 ${user?.phone || ""}`}
                  editable={false}
                  className="h-12 rounded-sm border border-gray-02 bg-gray-01 px-3 text-body-s text-gray-07"
                />
              </TextField>
              <TouchableOpacity
                onPress={() => router.push("/(screens)/change-phone")}
                className="mt-2"
                activeOpacity={0.8}
              >
                <Typography type="body-sm" className="text-blue-03 font-inter-semibold">
                  Change phone number
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            onPress={handleSave}
            isDisabled={isLoading || !firstName.trim()}
            className="w-full bg-blue-03 rounded-sm py-3.5 transition-transform active:scale-[0.96]"
          >
            {isLoading ? (
              <Spinner size="sm" color="white" />
            ) : (
              <Button.Label className="text-white font-inter-bold text-body-s">Save Changes</Button.Label>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: spacing[4],
  },
  avatarContainer: {
    alignSelf: "center",
    marginVertical: spacing[6],
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: "#2a9cff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  form: {
    flex: 1,
  },
  inputSpacing: {
    marginTop: spacing[4],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: "#dee0e3",
    backgroundColor: colors.white,
  },
})
