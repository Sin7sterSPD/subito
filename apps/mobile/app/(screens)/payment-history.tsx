import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Badge, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { paymentsApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

interface Payment {
  id: string;
  amount: string;
  status: string;
  type: string;
  createdAt: string;
}

function PaymentCard({ payment }: { payment: Payment }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusVariant = () => {
    switch (payment.status.toLowerCase()) {
      case 'success':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getIcon = () => {
    if (payment.type === 'refund') return 'arrow-undo';
    return payment.status.toLowerCase() === 'success' ? 'checkmark-circle' : 'close-circle';
  };

  const getIconColor = () => {
    if (payment.type === 'refund') return semantic.warning;
    return payment.status.toLowerCase() === 'success' ? semantic.success : semantic.error;
  };

  return (
    <Card style={styles.paymentCard} variant="outlined">
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
          <Ionicons name={getIcon()} size={20} color={getIconColor()} />
        </View>
        <View style={styles.paymentInfo}>
          <View style={styles.row}>
            <Text variant="bodyMedium" color="textPrimary" weight="600">
              {payment.type === 'refund' ? 'Refund' : 'Payment'}
            </Text>
            <Badge variant={getStatusVariant()} size="sm">
              {payment.status}
            </Badge>
          </View>
          <Text variant="captionMedium" color="textMuted" style={styles.date}>
            {formatDate(payment.createdAt)}
          </Text>
        </View>
        <Text
          variant="bodyMedium"
          color={payment.type === 'refund' ? 'success' : 'textPrimary'}
          weight="700"
        >
          {payment.type === 'refund' ? '+' : ''}₹{payment.amount}
        </Text>
      </View>
    </Card>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="card-outline" size={48} color={semantic.textMuted} />
      </View>
      <Text variant="h6" color="textSecondary" style={styles.emptyTitle}>
        No payment history
      </Text>
      <Text variant="bodySmall" color="textMuted" align="center">
        Your payment transactions will appear here
      </Text>
    </View>
  );
}

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      const response = await paymentsApi.getPaymentHistory();
      if (response.success && response.data) {
        const allPayments = [
          ...response.data.payments.map((p) => ({ ...p, type: 'payment' })),
          ...response.data.refunds.map((r) => ({ ...r, type: 'refund' })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPayments(allPayments);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  if (isLoading) {
    return <Spinner fullScreen message="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentCard payment={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[semantic.primary]} />
        }
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.backgroundSecondary,
  },
  list: {
    padding: spacing[4],
    flexGrow: 1,
  },
  paymentCard: {
    marginBottom: spacing[3],
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  date: {
    marginTop: spacing[1],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
});
