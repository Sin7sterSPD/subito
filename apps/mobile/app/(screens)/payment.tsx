import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
  
  const { initiatePayment, processOrder, isLoading } = usePaymentsStore();
  const { clearCart } = useCartStore();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handlePaymentInitiation();
  }, []);

  const handlePaymentInitiation = async () => {
    setPaymentStatus('processing');
    
    try {
      const result = await initiatePayment(orderId, parseFloat(amount));
      
      if (result.clientAuthToken) {
        // In a real implementation, you would launch Juspay HyperSDK here
        // For now, we'll simulate a successful payment
        await simulatePayment();
      } else {
        setPaymentStatus('failed');
        setError('Failed to initiate payment. Please try again.');
      }
    } catch {
      setPaymentStatus('failed');
      setError('Something went wrong. Please try again.');
    }
  };

  const simulatePayment = async () => {
    // Simulate payment processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Process the order
    const result = await processOrder(orderId, 'SUCCESS', `TXN_${Date.now()}`);
    
    if (result.success) {
      setPaymentStatus('success');
      clearCart();
      
      // Navigate to success screen
      setTimeout(() => {
        router.replace({
          pathname: '/(screens)/payment-success',
          params: { bookingId, bookingNumber: orderId },
        });
      }, 1000);
    } else {
      setPaymentStatus('failed');
      setError('Payment verification failed. Please contact support.');
    }
  };

  const handleRetry = () => {
    setError(null);
    handlePaymentInitiation();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {paymentStatus === 'pending' || paymentStatus === 'processing' ? (
          <View style={styles.processing}>
            <Spinner size="large" />
            <Text variant="h5" color="textPrimary" weight="600" style={styles.processingTitle}>
              Processing Payment
            </Text>
            <Text variant="bodyMedium" color="textSecondary" align="center">
              Please wait while we process your payment of ₹{amount}
            </Text>
            <Text variant="captionMedium" color="textMuted" align="center" style={styles.warning}>
              Please don't press back or close the app
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
              <Button variant="primary" fullWidth onPress={handleRetry}>
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
              Redirecting to your booking...
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
