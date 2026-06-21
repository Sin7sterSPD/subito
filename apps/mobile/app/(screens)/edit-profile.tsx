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
import { colors, semantic } from "../../src/theme/colors"
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
          >
            <Avatar className="w-[100px] h-[100px] rounded-full">
              {profileImage ? (
                <Avatar.Image source={{ uri: profileImage }} className="w-full h-full rounded-full" />
              ) : null}
              <Avatar.Fallback />
            </Avatar>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>

          <View style={styles.form}>
            <TextField isRequired isInvalid={!!errors.firstName}>
              <Label>First Name</Label>
              <Input
                placeholder="Enter your first name"
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text)
                  if (errors.firstName)
                    setErrors({ ...errors, firstName: undefined })
                }}
                autoCapitalize="words"
              />
              {errors.firstName ? <FieldError>{errors.firstName}</FieldError> : null}
            </TextField>

            <View style={styles.inputSpacing}>
              <TextField>
                <Label>Last Name</Label>
                <Input
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField isInvalid={!!errors.email}>
                <Label>Email</Label>
                <Input
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email ? <FieldError>{errors.email}</FieldError> : null}
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField isDisabled>
                <Label>Phone</Label>
                <Input
                  value={`+91 ${user?.phone || ""}`}
                  editable={false}
                />
              </TextField>
              <TouchableOpacity
                onPress={() => router.push("/(screens)/change-phone")}
              >
                <Typography type="body-sm" className="text-accent" style={styles.hint}>
                  Change phone number
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="primary"
            onPress={handleSave}
            isDisabled={isLoading || !firstName.trim()}
            className="w-full"
          >
            {isLoading ? <Spinner size="sm" /> : <Button.Label>Save Changes</Button.Label>}
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
    borderRadius: 16,
    backgroundColor: semantic.primary,
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
  hint: {
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
})
