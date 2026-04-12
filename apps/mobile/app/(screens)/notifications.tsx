import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'promo' | 'system';
  time: string;
  isRead: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Booking Confirmed',
    message: 'Your home cleaning service has been confirmed for tomorrow at 10:00 AM',
    type: 'booking',
    time: '2 hours ago',
    isRead: false,
  },
  {
    id: '2',
    title: 'Payment Successful',
    message: 'Your payment of ₹499 was successful. Order #SUB12345',
    type: 'payment',
    time: '1 day ago',
    isRead: true,
  },
  {
    id: '3',
    title: '20% Off on Deep Cleaning',
    message: 'Use code CLEAN20 to get 20% off on your next deep cleaning service',
    type: 'promo',
    time: '3 days ago',
    isRead: true,
  },
];

function NotificationItem({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'booking':
        return 'calendar';
      case 'payment':
        return 'card';
      case 'promo':
        return 'gift';
      default:
        return 'notifications';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'booking':
        return semantic.primary;
      case 'payment':
        return semantic.success;
      case 'promo':
        return colors.orange[8];
      default:
        return semantic.textMuted;
    }
  };

  return (
    <Card
      style={[styles.notificationCard, !notification.isRead && styles.unread]}
      variant="outlined"
    >
      <View style={styles.notificationContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
          <Ionicons name={getIcon()} size={20} color={getIconColor()} />
        </View>
        <View style={styles.textContent}>
          <View style={styles.titleRow}>
            <Text variant="bodySmall" color="textPrimary" weight="600" style={styles.title}>
              {notification.title}
            </Text>
            {!notification.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text variant="captionMedium" color="textSecondary" style={styles.message}>
            {notification.message}
          </Text>
          <Text variant="captionMedium" color="textMuted" style={styles.time}>
            {notification.time}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="notifications-outline" size={48} color={semantic.textMuted} />
      </View>
      <Text variant="h6" color="textSecondary" style={styles.emptyTitle}>
        No notifications yet
      </Text>
      <Text variant="bodySmall" color="textMuted" align="center">
        You'll see your booking updates and offers here
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={mockNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
  notificationCard: {
    marginBottom: spacing[3],
  },
  unread: {
    backgroundColor: colors.blue[1],
  },
  notificationContent: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.primary,
    marginLeft: spacing[2],
  },
  message: {
    marginTop: spacing[1],
  },
  time: {
    marginTop: spacing[2],
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
