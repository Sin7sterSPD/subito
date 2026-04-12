import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Button, Input, Avatar } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useBookingsStore } from '../../src/store';
import { ratingsApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function RatingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { selectedBooking } = useBookingsStore();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarPress = (star: number) => {
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await ratingsApi.submitRating({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
        partnerId: selectedBooking?.partnerId,
      });

      if (response.success) {
        Alert.alert('Thank you!', 'Your feedback has been submitted', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', 'Failed to submit rating. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.back();
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
            <Text variant="h4" color="textPrimary" weight="700" align="center">
              Rate your experience
            </Text>
            <Text
              variant="bodyMedium"
              color="textSecondary"
              align="center"
              style={styles.subtitle}
            >
              Your feedback helps us improve our service
            </Text>
          </View>

          {selectedBooking?.partner && (
            <View style={styles.partnerSection}>
              <Avatar
                source={selectedBooking.partner.profileImage}
                name={selectedBooking.partner.name}
                size="lg"
              />
              <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.partnerName}>
                {selectedBooking.partner.name || 'Service Partner'}
              </Text>
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
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= rating ? colors.orange[8] : colors.gray[4]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text variant="bodyMedium" color="primary" weight="600" style={styles.ratingLabel}>
                {ratingLabels[rating]}
              </Text>
            )}
          </View>

          <View style={styles.commentSection}>
            <Input
              label="Additional comments (optional)"
              placeholder="Tell us more about your experience..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.quickFeedback}>
            <Text variant="captionLarge" color="textMuted" style={styles.quickTitle}>
              Quick feedback
            </Text>
            <View style={styles.quickOptions}>
              {['On time', 'Professional', 'Good quality', 'Friendly'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.quickOption,
                    comment.includes(tag) && styles.quickOptionActive,
                  ]}
                  onPress={() => {
                    if (comment.includes(tag)) {
                      setComment(comment.replace(tag, '').trim());
                    } else {
                      setComment((comment ? comment + ', ' : '') + tag);
                    }
                  }}
                >
                  <Text
                    variant="captionLarge"
                    color={comment.includes(tag) ? 'primary' : 'textSecondary'}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            disabled={rating === 0}
          >
            Submit Rating
          </Button>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text variant="bodySmall" color="textMuted">
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orange[1],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  subtitle: {
    marginTop: spacing[2],
  },
  partnerSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  partnerName: {
    marginTop: spacing[2],
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  stars: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  quickOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
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
    alignItems: 'center',
    padding: spacing[3],
  },
});
