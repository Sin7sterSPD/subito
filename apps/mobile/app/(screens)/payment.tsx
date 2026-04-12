import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Text, Button, Spinner, Card } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { usePaymentsStore, useCartStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentScreen() {
  const { orderId, bookingId, amount } = useLocalSearchParams<{
    orderId: string;
    bookingId: string;
    amount: string;
  }>();

  const initiatePayment = usePaymentsStore((s) => s.initiatePayment);
  const processOrder = usePaymentsStore((s) => s.processOrder);
  const waitForPaymentTerminal = usePaymentsStore((s) => s.waitForPaymentTerminal);
  const isLoading = usePaymentsStore((s) => s.isLoading);
  const clearCart = useCartStore((s) => s.clearCart);

  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [attemptKey, setAttemptKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!orderId || !amount) {
        if (!cancelled) {
          setPaymentStatus('failed');
          setError('Missing order information.');
        }
        return;
      }

      if (!cancelled) {
        setPaymentStatus('processing');
        setError(null);
      }

      try {
        const result = await initiatePayment(orderId, parseFloat(amount));
        if (cancelled) return;

        if (!result.clientAuthToken) {
          setPaymentStatus('failed');
          setError('Failed to initiate payment. Please try again.');
          return;
        }

        // TODO: Launch Juspay HyperSDK; on completion call processOrder + poll (or webhook + poll only).
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (cancelled) return;

        await processOrder(orderId, 'SUCCESS', `TXN_${Date.now()}`);
        if (cancelled) return;

        setPaymentStatus('processing');

        const { ok, payload, timedOut } = await waitForPaymentTerminal(orderId, {
          intervalMs: 2500,
          timeoutMs: 120_000,
        });
        if (cancelled) return;

        if (ok && payload?.bookingId) {
          setPaymentStatus('success');
          clearCart();
          setTimeout(() => {
            router.replace({
              pathname: '/(screens)/payment-success',
              params: {
                bookingId: payload.bookingId!,
                bookingNumber: payload.bookingNumber || bookingId || orderId,
              },
            } as unknown as Href);
          }, 800);
          return;
        }

        if (payload?.status === 'FAILED') {
          setPaymentStatus('failed');
          setError('Payment was not successful. Please try again or contact support.');
          return;
        }

        if (timedOut) {
          setPaymentStatus('failed');
          setError(
            'We could not confirm payment in time. If money was debited, check Payment history or contact support.'
          );
          return;
        }

        setPaymentStatus('failed');
        setError('Payment verification failed. Please contact support.');
      } catch {
        if (!cancelled) {
          setPaymentStatus('failed');
          setError('Something went wrong. Please try again.');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    orderId,
    amount,
    bookingId,
    attemptKey,
    initiatePayment,
    processOrder,
    waitForPaymentTerminal,
    clearCart,
  ]);

  const handleRetry = () => {
    setError(null);
    setPaymentStatus('pending');
    setAttemptKey((k) => k + 1);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Payment', 'Are you sure you want to cancel this payment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {paymentStatus === 'pending' || paymentStatus === 'processing' ? (
          <View style={styles.processing}>
            <Spinner size="large" />
            <Text variant="h5" color="textPrimary" weight="600" style={styles.processingTitle}>
              {paymentStatus === 'processing' ? 'Confirming payment…' : 'Processing Payment'}
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              Please wait while we confirm your payment of ₹{amount}
            </Text>
            <Text variant="caption" color="textMuted" align="center" style={styles.warning}>
              Please don’t press back or close the app
            </Text>
          </View>
        ) : paymentStatus === 'failed' ? (
          <View style={styles.failed}>
            <View style={styles.failedIcon}>
              <Ionicons name="close" size={48} color={colors.white} />
            </View>
            <Text variant="h5" color="textPrimary" weight="600" style={styles.failedTitle}>
              Payment Failed
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              {error || 'Your payment could not be processed.'}
            </Text>
            <View style={styles.failedActions}>
              <Button variant="primary" fullWidth onPress={handleRetry} disabled={isLoading}>
                Try Again
              </Button>
              <Button variant="ghost" fullWidth onPress={handleCancel}>
                Cancel
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={colors.white} />
            </View>
            <Text variant="h5" color="textPrimary" weight="600" style={styles.successTitle}>
              Payment Successful!
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              Redirecting to your booking…
            </Text>
          </View>
        )}

        <Card style={styles.orderSummary} variant="filled">
          <View style={styles.summaryRow}>
            <Text variant="bodySmall" color="textMuted">
              Order ID
            </Text>
            <Text variant="bodySmall" color="textPrimary" weight="500">
              {orderId}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodySmall" color="textMuted">
              Amount
            </Text>
            <Text variant="bodySmall" color="primary" weight="700">
              ₹{amount}
            </Text>
          </View>
        </Card>
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
    padding: spacing[6],
    justifyContent: 'center',
  },
  processing: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  processingTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  warning: {
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.orange[1],
    borderRadius: 8,
  },
  failed: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  failedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  failedActions: {
    width: '100%',
    marginTop: spacing[6],
    gap: spacing[3],
  },
  success: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    marginTop: spacing[6],
    marginBottom: spacing[2],
  },
  orderSummary: {
    marginTop: 'auto',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
});
