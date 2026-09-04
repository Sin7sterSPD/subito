import React, { useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Typography, Button, TextField, Input, Label, Avatar, Spinner } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useBookingsStore } from "../../src/store"
import { ratingsApi } from "../../src/services/api"
import { Ionicons } from "@expo/vector-icons"

export default function RatingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const { selectedBooking } = useBookingsStore()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStarPress = (star: number) => {
    setRating(star)
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await ratingsApi.submitRating({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
        partnerId: selectedBooking?.partnerId,
      })

      if (response.success) {
        Alert.alert("Thank you!", "Your feedback has been submitted", [
          { text: "OK", onPress: () => router.back() },
        ])
      } else {
        Alert.alert("Error", "Failed to submit rating. Please try again.")
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    router.back()
  }

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]

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
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="star" size={48} color={colors.orange[8]} />
            </View>
            <Typography type="h4" weight="bold" align="center" style={{ color: semantic.textPrimary }}>
              Rate your experience
            </Typography>
            <Typography
              type="body"
              color="muted"
              align="center"
              style={styles.subtitle}
            >
              Your feedback helps us improve our service
            </Typography>
          </View>

          {selectedBooking?.partner && (
            <View style={styles.partnerSection}>
              <Avatar className="w-16 h-16 rounded-sm mb-2">
                {selectedBooking.partner.profileImage ? (
                  <Avatar.Image source={{ uri: selectedBooking.partner.profileImage }} className="w-full h-full rounded-sm" />
                ) : null}
                <Avatar.Fallback />
              </Avatar>
              <Typography
                type="body"
                weight="semibold"
                style={[styles.partnerName, { color: semantic.textPrimary }]}
              >
                {selectedBooking.partner.name || "Service Partner"}
              </Typography>
            </View>
          )}

          <View style={styles.ratingSection}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  style={styles.starButton}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={44}
                    color={star <= rating ? colors.orange[8] : colors.gray[4]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Typography
                type="body"
                weight="semibold"
                style={[styles.ratingLabel, { color: "#2a9cff" }]}
              >
                {ratingLabels[rating]}
              </Typography>
            )}
          </View>

          <View className="mb-4">
            <TextField>
              <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Additional comments (optional)</Label>
              <Input
                placeholder="Tell us more about your experience..."
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                className="rounded-sm border border-gray-03 focus:border-blue-03 bg-white p-3 min-h-[100px] leading-relaxed text-body-s text-gray-12"
              />
            </TextField>
          </View>

          <View className="mb-5">
            <Typography
              type="body-sm"
              color="muted"
              className="mb-2 ml-1"
              weight="semibold"
            >
              Quick feedback
            </Typography>
            <View className="flex-row flex-wrap gap-2">
              {["On time", "Professional", "Good quality", "Friendly"].map(
                (tag) => (
                  <TouchableOpacity
                    key={tag}
                    className={`px-4 py-2 rounded-sm border ${
                      comment.includes(tag)
                        ? "bg-blue-01 border-blue-03"
                        : "bg-white border-gray-03"
                    }`}
                    onPress={() => {
                      if (comment.includes(tag)) {
                        setComment(comment.replace(tag, "").trim())
                      } else {
                        setComment((comment ? comment + ", " : "") + tag)
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Typography
                      type="body-sm"
                      className={
                        comment.includes(tag)
                          ? "text-blue-03 font-inter-semibold"
                          : "text-gray-07 font-inter-regular"
                      }
                    >
                      {tag}
                    </Typography>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </ScrollView>

        <View className="p-4 border-t border-gray-03 bg-white">
          <Button
            onPress={handleSubmit}
            isDisabled={isSubmitting || rating === 0}
            className="w-full bg-blue-03 rounded-sm py-3.5 transition-transform active:scale-[0.96]"
          >
            {isSubmitting ? (
              <Spinner size="sm" color="white" />
            ) : (
              <Button.Label className="text-white font-inter-bold text-body-s">Submit Rating</Button.Label>
            )}
          </Button>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.8}>
            <Typography type="body-sm" className="text-gray-07" weight="semibold">
              Skip for now
            </Typography>
          </TouchableOpacity>
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
  header: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: colors.orange[1],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  subtitle: {
    marginTop: spacing[2],
  },
  partnerSection: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  partnerName: {
    marginTop: spacing[2],
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  stars: {
    flexDirection: "row",
    gap: spacing[2],
  },
  starButton: {
    padding: spacing[1],
  },
  ratingLabel: {
    marginTop: spacing[3],
  },
  skipButton: {
    alignItems: "center",
    padding: spacing[3],
  },
})
