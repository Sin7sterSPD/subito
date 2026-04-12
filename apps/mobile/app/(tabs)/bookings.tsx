import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, Card, Badge, Spinner, Button } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useBookingsStore } from '../../src/store';
import { Booking, BookingStatus } from '../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

const ACTIVE_STATUSES: BookingStatus[] = ['PENDING_PAYMENT', 'PENDING_MATCH', 'MATCHED', 'ARRIVING', 'STARTED'];
const COMPLETED_STATUSES: BookingStatus[] = ['COMPLETED'];
const CANCELLED_STATUSES: BookingStatus[] = ['CANCELLED', 'REFUNDED'];

function getStatusColor(status: BookingStatus): 'primary' | 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'PENDING_PAYMENT':
    case 'PENDING_MATCH':
      return 'warning';
    case 'MATCHED':
    case 'ARRIVING':
      return 'primary';
    case 'STARTED':
      return 'primary';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'error';
    default:
      return 'neutral';
  }
}

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Payment Pending';
    case 'PENDING_MATCH':
      return 'Finding Partner';
    case 'MATCHED':
      return 'Partner Assigned';
    case 'ARRIVING':
      return 'Partner Arriving';
    case 'STARTED':
      return 'In Progress';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeString?: string): string {
  if (!timeString) return '';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const serviceNames = booking.items?.map((i) => i.name).join(', ') || 'Service';
  const date = booking.scheduledDate || booking.createdAt;

  return (
    <Card style={styles.bookingCard} onPress={onPress} variant="elevated" shadow="sm">
      <View style={styles.cardHeader}>
        <View style={styles.bookingNumber}>
          <Text variant="captionMedium" color="textMuted">
            #{booking.bookingNumber}
          </Text>
        </View>
        <Badge variant={getStatusColor(booking.status)} size="sm">
          {getStatusLabel(booking.status)}
        </Badge>
      </View>

      <View style={styles.cardBody}>
        <Text variant="bodyMedium" color="textPrimary" weight="600" numberOfLines={2}>
          {serviceNames}
        </Text>
        
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={semantic.textMuted} />
            <Text variant="captionLarge" color="textSecondary" style={styles.detailText}>
              {formatDate(date)}
            </Text>
          </View>
          {booking.scheduledStartTime && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={semantic.textMuted} />
              <Text variant="captionLarge" color="textSecondary" style={styles.detailText}>
                {formatTime(booking.scheduledStartTime)}
              </Text>
            </View>
          )}
        </View>

        {booking.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={semantic.textMuted} />
            <Text variant="captionMedium" color="textMuted" numberOfLines={1} style={styles.detailText}>
              {booking.address.name} • {booking.address.addressLine1}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text variant="bodyMedium" color="primary" weight="700">
          ₹{booking.finalAmount || booking.totalAmount}
        </Text>
        <View style={styles.viewDetails}>
          <Text variant="captionLarge" color="primary" weight="500">
            View Details
          </Text>
          <Ionicons name="chevron-forward" size={16} color={semantic.primary} />
        </View>
      </View>
    </Card>
  );
}

function EmptyState({ type }: { type: 'active' | 'completed' | 'cancelled' }) {
  const messages = {
    active: {
      title: 'No active bookings',
      subtitle: 'Your ongoing bookings will appear here',
      icon: 'calendar-outline' as const,
    },
    completed: {
      title: 'No completed bookings',
      subtitle: 'Your completed services will appear here',
      icon: 'checkmark-circle-outline' as const,
    },
    cancelled: {
      title: 'No cancelled bookings',
      subtitle: 'Cancelled bookings will appear here',
      icon: 'close-circle-outline' as const,
    },
  };

  const { title, subtitle, icon } = messages[type];

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={48} color={semantic.textMuted} />
      </View>
      <Text variant="h6" color="textSecondary" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text variant="bodySmall" color="textMuted" align="center">
        {subtitle}
      </Text>
      {type === 'active' && (
        <Button
          variant="primary"
          size="md"
          style={styles.browseButton}
          onPress={() => router.push('/(tabs)')}
        >
          Browse Services
        </Button>
      )}
    </View>
  );
}

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const { bookings, fetchBookings, isLoading, hasMore, reset } = useBookingsStore();
  const [refreshing, setRefreshing] = useState(false);

  const getStatusForTab = () => {
    switch (activeTab) {
      case 'active':
        return ACTIVE_STATUSES;
      case 'completed':
        return COMPLETED_STATUSES;
      case 'cancelled':
        return CANCELLED_STATUSES;
    }
  };

  useEffect(() => {
    reset();
    fetchBookings(getStatusForTab(), true);
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings(getStatusForTab(), true);
    setRefreshing(false);
  }, [activeTab, fetchBookings]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchBookings(getStatusForTab());
    }
  }, [isLoading, hasMore, activeTab, fetchBookings]);

  const handleBookingPress = (booking: Booking) => {
    router.push({
      pathname: '/(screens)/booking/[id]',
      params: { id: booking.id },
    });
  };

  const filteredBookings = bookings.filter((b) => getStatusForTab().includes(b.status));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h4" color="textPrimary" weight="700">
          My Bookings
        </Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              variant="bodySmall"
              color={activeTab === tab.key ? 'primary' : 'textMuted'}
              weight={activeTab === tab.key ? '600' : '400'}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard booking={item} onPress={() => handleBookingPress(item)} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[semantic.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <Spinner message="Loading bookings..." />
          ) : (
            <EmptyState type={activeTab} />
          )
        }
        ListFooterComponent={
          isLoading && filteredBookings.length > 0 ? (
            <View style={styles.loadingMore}>
              <Spinner size="small" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.background,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.blue[1],
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  bookingCard: {
    marginBottom: spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  bookingNumber: {
    backgroundColor: semantic.backgroundSecondary,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  cardBody: {
    marginBottom: spacing[3],
  },
  details: {
    flexDirection: 'row',
    marginTop: spacing[2],
    gap: spacing[4],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: spacing[1],
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: semantic.borderLight,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
  browseButton: {
    marginTop: spacing[6],
  },
  loadingMore: {
    paddingVertical: spacing[4],
  },
});
