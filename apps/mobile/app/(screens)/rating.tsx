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
              <Avatar className="w-16 h-16 rounded-full mb-2">
                {selectedBooking.partner.profileImage ? (
                  <Avatar.Image source={{ uri: selectedBooking.partner.profileImage }} className="w-full h-full rounded-full" />
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
                style={[styles.ratingLabel, { color: semantic.primary }]}
              >
                {ratingLabels[rating]}
              </Typography>
            )}
          </View>

          <View style={styles.commentSection}>
            <TextField>
              <Label>Additional comments (optional)</Label>
              <Input
                placeholder="Tell us more about your experience..."
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
              />
            </TextField>
          </View>

          <View style={styles.quickFeedback}>
            <Typography
              type="body-sm"
              color="muted"
              style={styles.quickTitle}
            >
              Quick feedback
            </Typography>
            <View style={styles.quickOptions}>
              {["On time", "Professional", "Good quality", "Friendly"].map(
                (tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.quickOption,
                      comment.includes(tag) && styles.quickOptionActive,
                    ]}
                    onPress={() => {
                      if (comment.includes(tag)) {
                        setComment(comment.replace(tag, "").trim())
                      } else {
                        setComment((comment ? comment + ", " : "") + tag)
                      }
                    }}
                  >
                    <Typography
                      type="body"
                      style={{
                        color: comment.includes(tag) ? semantic.primary : semantic.textSecondary
                      }}
                    >
                      {tag}
                    </Typography>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="primary"
            onPress={handleSubmit}
            isDisabled={isSubmitting || rating === 0}
            className="w-full"
          >
            {isSubmitting ? <Spinner size="sm" /> : <Button.Label>Submit Rating</Button.Label>}
          </Button>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Typography type="body-sm" color="muted">
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
    borderRadius: 40,
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
  commentSection: {
    marginBottom: spacing[4],
  },
  quickFeedback: {
    marginBottom: spacing[4],
  },
  quickTitle: {
    marginBottom: spacing[2],
  },
  quickOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  quickOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 100,
    backgroundColor: semantic.backgroundSecondary,
  },
  quickOptionActive: {
    backgroundColor: colors.blue[1],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
  skipButton: {
    alignItems: "center",
    padding: spacing[3],
  },
})
