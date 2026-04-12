import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Text, Button } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useCartStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentSuccessScreen() {
  const { bookingId, bookingNumber } = useLocalSearchParams<{
    bookingId: string;
    bookingNumber: string;
  }>();
  const { clearCart } = useCartStore();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    clearCart();
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    opacity.value = withDelay(300, withSpring(1));
  }, [clearCart, scale, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleViewBooking = () => {
    router.replace({
      pathname: '/(screens)/booking/[id]',
      params: { id: bookingId },
    });
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={64} color={colors.white} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContent, contentStyle]}>
          <Text variant="h3" color="textPrimary" weight="700" align="center">
            Payment Successful!
          </Text>
          <Text
            variant="bodyMedium"
            color="textSecondary"
            align="center"
            style={styles.description}
          >
            Your booking has been confirmed. Our partner will arrive at your scheduled time.
          </Text>

          {bookingNumber && (
            <View style={styles.bookingInfo}>
              <Text variant="captionMedium" color="textMuted">
                Booking Number
              </Text>
              <Text variant="h5" color="primary" weight="700">
                #{bookingNumber}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button variant="primary" fullWidth size="lg" onPress={handleViewBooking}>
              View Booking
            </Button>
            <Button variant="ghost" fullWidth size="lg" onPress={handleGoHome}>
              Go to Home
            </Button>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    alignItems: 'center',
    width: '100%',
  },
  description: {
    marginTop: spacing[3],
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  bookingInfo: {
    backgroundColor: colors.blue[1],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  actions: {
    width: '100%',
    gap: spacing[3],
  },
});
