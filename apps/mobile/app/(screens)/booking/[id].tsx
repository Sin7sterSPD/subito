import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Text, Card, Button, Badge, Spinner, Avatar, Divider, BottomSheet } from '../../../src/components/ui';
import { colors, semantic } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { useBookingsStore } from '../../../src/store';
import { Booking, BookingStatus } from '../../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

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

function formatDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const dateFormatted = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (timeStr) {
    const time = new Date(timeStr);
    const timeFormatted = time.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateFormatted} at ${timeFormatted}`;
  }
  return dateFormatted;
}

function StatusTimeline({ status }: { status: BookingStatus }) {
  const steps = [
    { key: 'booked', label: 'Booked', icon: 'checkmark-circle' as const },
    { key: 'assigned', label: 'Partner Assigned', icon: 'person' as const },
    { key: 'arriving', label: 'On the Way', icon: 'car' as const },
    { key: 'started', label: 'Started', icon: 'play' as const },
    { key: 'completed', label: 'Completed', icon: 'star' as const },
  ];

  const getActiveStep = () => {
    switch (status) {
      case 'PENDING_PAYMENT':
      case 'PENDING_MATCH':
        return 0;
      case 'MATCHED':
        return 1;
      case 'ARRIVING':
        return 2;
      case 'STARTED':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return -1;
    }
  };

  const activeStep = getActiveStep();
  if (status === 'CANCELLED' || status === 'REFUNDED') return null;

  return (
    <View style={styles.timeline}>
      {steps.map((step, idx) => {
        const isActive = idx <= activeStep;
        const isCurrent = idx === activeStep;
        return (
          <View key={step.key} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineIcon,
                isActive && styles.timelineIconActive,
                isCurrent && styles.timelineIconCurrent,
              ]}
            >
              <Ionicons
                name={step.icon}
                size={16}
                color={isActive ? colors.white : semantic.textMuted}
              />
            </View>
            {idx < steps.length - 1 && (
              <View
                style={[styles.timelineLine, isActive && styles.timelineLineActive]}
              />
            )}
            <Text
              variant="captionMedium"
              color={isActive ? 'primary' : 'textMuted'}
              style={styles.timelineLabel}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function PartnerCard({
  partner,
  booking,
  onCall,
  onTrack,
}: {
  partner: Booking['partner'];
  booking: Booking;
  onCall: () => void;
  onTrack: () => void;
}) {
  if (!partner) return null;

  const showTrack = ['ARRIVING', 'STARTED'].includes(booking.status);

  return (
    <Card style={styles.partnerCard} variant="outlined">
      <View style={styles.partnerHeader}>
        <Avatar source={partner.profileImage} name={partner.name} size="lg" />
        <View style={styles.partnerInfo}>
          <Text variant="bodyMedium" color="textPrimary" weight="600">
            {partner.name || 'Service Partner'}
          </Text>
          {partner.rating && (
            <View style={styles.partnerRating}>
              <Ionicons name="star" size={14} color={colors.orange[8]} />
              <Text variant="captionMedium" color="textSecondary">
                {partner.rating.toFixed(1)} • {partner.totalBookings || 0} services
              </Text>
            </View>
          )}
        </View>
      </View>

      {(booking.status === 'STARTED' && booking.startOtp) && (
        <View style={styles.otpSection}>
          <Text variant="captionMedium" color="textMuted">
            Start OTP
          </Text>
          <Text variant="h5" color="primary" weight="700">
            {booking.startOtp}
          </Text>
        </View>
      )}

      <View style={styles.partnerActions}>
        <TouchableOpacity style={styles.partnerAction} onPress={onCall}>
          <View style={styles.partnerActionIcon}>
            <Ionicons name="call" size={20} color={semantic.primary} />
          </View>
          <Text variant="captionLarge" color="primary" weight="500">
            Call
          </Text>
        </TouchableOpacity>
        {showTrack && (
          <TouchableOpacity style={styles.partnerAction} onPress={onTrack}>
            <View style={styles.partnerActionIcon}>
              <Ionicons name="location" size={20} color={semantic.primary} />
            </View>
            <Text variant="captionLarge" color="primary" weight="500">
              Track
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedBooking, fetchBookingById, cancelBooking, isLoading } = useBookingsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchBookingById(id);
    }
  }, [id, fetchBookingById]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookingById(id);
    setRefreshing(false);
  }, [id, fetchBookingById]);

  const handleCancel = async () => {
    if (!cancelReason) {
      Alert.alert('Error', 'Please select a reason for cancellation');
      return;
    }
    const success = await cancelBooking(id, cancelReason);
    if (success) {
      setShowCancelSheet(false);
      Alert.alert('Cancelled', 'Your booking has been cancelled');
    } else {
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    }
  };

  const handleCallPartner = () => {
    const phone = selectedBooking?.partner?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleTrackPartner = () => {
    router.push({
      pathname: '/(screens)/partner-tracking',
      params: { bookingId: id },
    });
  };

  const handleRating = () => {
    router.push({
      pathname: '/(screens)/rating',
      params: { bookingId: id },
    });
  };

  if (isLoading || !selectedBooking) {
    return <Spinner fullScreen message="Loading booking..." />;
  }

  const booking = selectedBooking;
  const canCancel = ['PENDING_PAYMENT', 'PENDING_MATCH', 'MATCHED'].includes(booking.status);
  const canRate = booking.status === 'COMPLETED';

  const cancelReasons = [
    'Change of plans',
    'Found alternative service',
    'Booked by mistake',
    'Partner taking too long',
    'Other',
  ];

  return (
    <>
      <Stack.Screen options={{ title: `#${booking.bookingNumber}` }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[semantic.primary]} />
          }
        >
          <View style={styles.statusSection}>
            <Badge variant={getStatusColor(booking.status)} size="md">
              {getStatusLabel(booking.status)}
            </Badge>
            <StatusTimeline status={booking.status} />
          </View>

          <View style={styles.content}>
            <Card style={styles.scheduleCard} variant="filled">
              <View style={styles.scheduleRow}>
                <Ionicons name="calendar" size={20} color={semantic.primary} />
                <Text variant="bodyMedium" color="textPrimary" weight="500" style={styles.scheduleText}>
                  {formatDateTime(booking.scheduledDate, booking.scheduledStartTime)}
                </Text>
              </View>
              {booking.address && (
                <View style={[styles.scheduleRow, { marginTop: spacing[2] }]}>
                  <Ionicons name="location" size={20} color={semantic.primary} />
                  <View style={styles.scheduleText}>
                    <Text variant="bodySmall" color="textPrimary" weight="500">
                      {booking.address.name}
                    </Text>
                    <Text variant="captionMedium" color="textMuted">
                      {booking.address.addressLine1}
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            {booking.partner && (
              <PartnerCard
                partner={booking.partner}
                booking={booking}
                onCall={handleCallPartner}
                onTrack={handleTrackPartner}
              />
            )}

            <View style={styles.section}>
              <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                Services
              </Text>
              <Card variant="outlined" padding={0}>
                {booking.items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text variant="bodySmall" color="textPrimary" weight="500">
                          {item.name}
                        </Text>
                        <Text variant="captionMedium" color="textMuted">
                          Qty: {item.quantity}
                        </Text>
                      </View>
                      <Text variant="bodySmall" color="textPrimary" weight="600">
                        ₹{item.totalPrice}
                      </Text>
                    </View>
                    {idx < booking.items.length - 1 && <Divider marginVertical={0} />}
                  </React.Fragment>
                ))}
              </Card>
            </View>

            <View style={styles.section}>
              <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                Payment Summary
              </Text>
              <Card variant="outlined">
                {booking.subtotal && (
                  <View style={styles.priceRow}>
                    <Text variant="bodySmall" color="textSecondary">
                      Subtotal
                    </Text>
                    <Text variant="bodySmall" color="textPrimary">
                      ₹{booking.subtotal}
                    </Text>
                  </View>
                )}
                {parseFloat(booking.discountAmount || '0') > 0 && (
                  <View style={styles.priceRow}>
                    <Text variant="bodySmall" color="success">
                      Discount
                    </Text>
                    <Text variant="bodySmall" color="success">
                      -₹{booking.discountAmount}
                    </Text>
                  </View>
                )}
                {booking.gstAmount && (
                  <View style={styles.priceRow}>
                    <Text variant="bodySmall" color="textSecondary">
                      GST
                    </Text>
                    <Text variant="bodySmall" color="textPrimary">
                      ₹{booking.gstAmount}
                    </Text>
                  </View>
                )}
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text variant="bodyMedium" color="textPrimary" weight="700">
                    Total
                  </Text>
                  <Text variant="bodyMedium" color="primary" weight="700">
                    ₹{booking.finalAmount || booking.totalAmount}
                  </Text>
                </View>
              </Card>
            </View>

            {booking.customerNotes && (
              <View style={styles.section}>
                <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                  Your Notes
                </Text>
                <Card variant="filled">
                  <Text variant="bodySmall" color="textSecondary">
                    {booking.customerNotes}
                  </Text>
                </Card>
              </View>
            )}

            <View style={styles.actions}>
              {canCancel && (
                <Button
                  variant="outline"
                  fullWidth
                  onPress={() => setShowCancelSheet(true)}
                >
                  Cancel Booking
                </Button>
              )}
              {canRate && (
                <Button variant="primary" fullWidth onPress={handleRating}>
                  Rate Service
                </Button>
              )}
            </View>

            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        <BottomSheet isVisible={showCancelSheet} onClose={() => setShowCancelSheet(false)}>
          <View style={styles.cancelSheet}>
            <Text variant="h5" color="textPrimary" weight="700" style={styles.cancelTitle}>
              Cancel Booking
            </Text>
            <Text variant="bodySmall" color="textSecondary" style={styles.cancelSubtitle}>
              Please select a reason for cancellation
            </Text>
            {cancelReasons.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.cancelOption,
                  cancelReason === reason && styles.cancelOptionActive,
                ]}
                onPress={() => setCancelReason(reason)}
              >
                <Text
                  variant="bodySmall"
                  color={cancelReason === reason ? 'primary' : 'textPrimary'}
                >
                  {reason}
                </Text>
                {cancelReason === reason && (
                  <Ionicons name="checkmark-circle" size={20} color={semantic.primary} />
                )}
              </TouchableOpacity>
            ))}
            <Button
              variant="danger"
              fullWidth
              onPress={handleCancel}
              disabled={!cancelReason}
              style={styles.cancelButton}
            >
              Confirm Cancellation
            </Button>
          </View>
        </BottomSheet>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: spacing[4],
    backgroundColor: semantic.backgroundSecondary,
  },
  timeline: {
    flexDirection: 'row',
    marginTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconActive: {
    backgroundColor: colors.blue[2],
  },
  timelineIconCurrent: {
    backgroundColor: semantic.primary,
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: semantic.border,
    zIndex: -1,
  },
  timelineLineActive: {
    backgroundColor: semantic.primary,
  },
  timelineLabel: {
    marginTop: spacing[1],
    textAlign: 'center',
  },
  content: {
    padding: spacing[4],
  },
  scheduleCard: {
    marginBottom: spacing[4],
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scheduleText: {
    marginLeft: spacing[3],
    flex: 1,
  },
  partnerCard: {
    marginBottom: spacing[4],
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  partnerInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  partnerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  otpSection: {
    backgroundColor: colors.blue[1],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  partnerActions: {
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'center',
  },
  partnerAction: {
    alignItems: 'center',
    gap: spacing[1],
  },
  partnerActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
  },
  serviceInfo: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  totalRow: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    marginBottom: 0,
  },
  actions: {
    marginTop: spacing[2],
    gap: spacing[3],
  },
  cancelSheet: {
    paddingHorizontal: spacing[4],
  },
  cancelTitle: {
    marginBottom: spacing[1],
  },
  cancelSubtitle: {
    marginBottom: spacing[4],
  },
  cancelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    backgroundColor: semantic.backgroundSecondary,
    marginBottom: spacing[2],
  },
  cancelOptionActive: {
    backgroundColor: colors.blue[1],
    borderWidth: 1,
    borderColor: semantic.primary,
  },
  cancelButton: {
    marginTop: spacing[4],
  },
  bottomPadding: {
    height: spacing[4],
  },
});
