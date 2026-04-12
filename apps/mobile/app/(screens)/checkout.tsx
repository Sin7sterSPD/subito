import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, Card, Button, Spinner, Badge, Input, Divider } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useCartStore, useUserStore, useBookingsStore, usePaymentsStore } from '../../src/store';
import { BookingSlot } from '../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

function SlotSelector({
  slots,
  availableDates,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
}: {
  slots: Record<string, BookingSlot[]>;
  availableDates: string[];
  selectedDate: string | null;
  selectedSlot: BookingSlot | null;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: BookingSlot) => void;
}) {
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const dateSlots = selectedDate ? slots[selectedDate] || [] : [];

  return (
    <View>
      <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.slotTitle}>
        Select Date
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {availableDates.map((date) => (
          <TouchableOpacity
            key={date}
            style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
            onPress={() => onDateChange(date)}
          >
            <Text
              variant="captionLarge"
              color={selectedDate === date ? 'textInverse' : 'textPrimary'}
              weight={selectedDate === date ? '600' : '400'}
            >
              {formatDateLabel(date)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedDate && dateSlots.length > 0 && (
        <>
          <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.slotTitle}>
            Select Time
          </Text>
          <View style={styles.slotsGrid}>
            {dateSlots.map((slot, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.slotChip,
                  selectedSlot?.startTime === slot.startTime && styles.slotChipActive,
                  slot.isFull && styles.slotChipDisabled,
                ]}
                onPress={() => !slot.isFull && onSlotChange(slot)}
                disabled={slot.isFull}
              >
                <Text
                  variant="captionLarge"
                  color={
                    slot.isFull
                      ? 'textMuted'
                      : selectedSlot?.startTime === slot.startTime
                      ? 'textInverse'
                      : 'textPrimary'
                  }
                  weight={selectedSlot?.startTime === slot.startTime ? '600' : '400'}
                >
                  {formatTime(slot.startTime)}
                </Text>
                {slot.isExperiencingSurge && (
                  <View style={styles.surgeBadge}>
                    <Ionicons name="trending-up" size={10} color={colors.orange[9]} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default function CheckoutScreen() {
  const { cart, updateCart, checkoutV2, isLoading: cartLoading } = useCartStore();
  const { selectedAddress } = useUserStore();
  const { slots, availableDates, fetchSlots, isLoading: slotsLoading } = useBookingsStore();
  const { fetchPaymentOptions } = usePaymentsStore();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (selectedAddress) {
      fetchSlots(selectedAddress.latitude, selectedAddress.longitude, cart?.bookingType);
      fetchPaymentOptions();
    }
  }, [selectedAddress, cart?.bookingType, fetchSlots, fetchPaymentOptions]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotChange = async (slot: BookingSlot) => {
    setSelectedSlot(slot);
    await updateCart({
      timeSlot: { time: [{ start: slot.startTime }] },
    });
  };

  const handleCheckout = async () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      router.push('/(screens)/addresses');
      return;
    }

    if (cart?.bookingType !== 'INSTANT' && !selectedSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    setIsProcessing(true);

    try {
      await updateCart({ deliveryAddressId: selectedAddress.id });

      const result = await checkoutV2();

      if (result.bookingId && result.orderId) {
        router.push({
          pathname: '/(screens)/payment',
          params: {
            orderId: result.orderId,
            bookingId: result.bookingId,
            amount: cart?.finalTotalAmount || '0',
          },
        });
      } else {
        Alert.alert('Error', result.error || 'Checkout failed. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!cart) {
    return <Spinner fullScreen message="Loading..." />;
  }

  const isInstant = cart.bookingType === 'INSTANT';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Delivery Address
          </Text>
          <TouchableOpacity
            style={styles.addressCard}
            onPress={() => router.push('/(screens)/addresses')}
          >
            {selectedAddress ? (
              <>
                <View style={styles.addressIcon}>
                  <Ionicons name="location" size={20} color={semantic.primary} />
                </View>
                <View style={styles.addressContent}>
                  <Text variant="bodySmall" color="textPrimary" weight="600">
                    {selectedAddress.name}
                  </Text>
                  <Text variant="captionMedium" color="textMuted" numberOfLines={2}>
                    {selectedAddress.addressLine1}, {selectedAddress.city}
                  </Text>
                </View>
                <Text variant="captionLarge" color="primary" weight="500">
                  Change
                </Text>
              </>
            ) : (
              <>
                <View style={styles.addressIcon}>
                  <Ionicons name="add" size={20} color={semantic.primary} />
                </View>
                <Text variant="bodySmall" color="primary" weight="600" style={styles.addressContent}>
                  Add Delivery Address
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {!isInstant && (
          <View style={styles.section}>
            {slotsLoading ? (
              <Spinner message="Loading available slots..." />
            ) : (
              <SlotSelector
                slots={slots}
                availableDates={availableDates}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onDateChange={handleDateChange}
                onSlotChange={handleSlotChange}
              />
            )}
            {selectedSlot?.isExperiencingSurge && (
              <Card style={styles.surgeWarning} variant="filled">
                <View style={styles.surgeContent}>
                  <Ionicons name="trending-up" size={20} color={colors.orange[9]} />
                  <Text variant="captionLarge" color="textSecondary" style={styles.surgeText}>
                    High demand! Surge pricing of ₹{selectedSlot.surgePrice} applies
                  </Text>
                </View>
              </Card>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Order Summary
          </Text>
          <Card variant="outlined">
            {cart.items.map((item, idx) => (
              <React.Fragment key={item.id}>
                <View style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <Text variant="bodySmall" color="textPrimary">
                      {item.catalog?.name || 'Service'}
                    </Text>
                    <Text variant="captionMedium" color="textMuted">
                      Qty: {item.quantity}
                    </Text>
                  </View>
                  <Text variant="bodySmall" color="textPrimary" weight="500">
                    ₹{item.totalPrice}
                  </Text>
                </View>
                {idx < cart.items.length - 1 && <Divider marginVertical={spacing[2]} />}
              </React.Fragment>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Input
            label="Notes for partner (optional)"
            placeholder="Any special instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Card variant="filled">
            <View style={styles.priceRow}>
              <Text variant="bodySmall" color="textSecondary">
                Subtotal
              </Text>
              <Text variant="bodySmall" color="textPrimary">
                ₹{cart.totalPrice}
              </Text>
            </View>
            {parseFloat(cart.discountAmount) > 0 && (
              <View style={styles.priceRow}>
                <Text variant="bodySmall" color="success">
                  Discount
                </Text>
                <Text variant="bodySmall" color="success">
                  -₹{cart.discountAmount}
                </Text>
              </View>
            )}
            {parseFloat(cart.surgePrice) > 0 && (
              <View style={styles.priceRow}>
                <Text variant="bodySmall" color="warning">
                  Surge
                </Text>
                <Text variant="bodySmall" color="warning">
                  +₹{cart.surgePrice}
                </Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text variant="bodySmall" color="textSecondary">
                GST
              </Text>
              <Text variant="bodySmall" color="textPrimary">
                ₹{cart.gst}
              </Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text variant="bodyMedium" color="textPrimary" weight="700">
                Total
              </Text>
              <Text variant="bodyMedium" color="primary" weight="700">
                ₹{cart.finalTotalAmount}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text variant="captionMedium" color="textMuted">
            Total
          </Text>
          <Text variant="h5" color="primary" weight="700">
            ₹{cart.finalTotalAmount}
          </Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          onPress={handleCheckout}
          isLoading={isProcessing || cartLoading}
          disabled={!selectedAddress || (!isInstant && !selectedSlot)}
          style={styles.checkoutButton}
        >
          Proceed to Pay
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  section: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.backgroundSecondary,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  slotTitle: {
    marginBottom: spacing[3],
  },
  dateScroll: {
    marginBottom: spacing[4],
  },
  dateChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: semantic.backgroundSecondary,
    marginRight: spacing[2],
  },
  dateChipActive: {
    backgroundColor: semantic.primary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  slotChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: semantic.backgroundSecondary,
    position: 'relative',
  },
  slotChipActive: {
    backgroundColor: semantic.primary,
  },
  slotChipDisabled: {
    opacity: 0.5,
  },
  surgeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.orange[1],
    borderRadius: 8,
    padding: 2,
  },
  surgeWarning: {
    marginTop: spacing[3],
    backgroundColor: colors.orange[1],
  },
  surgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surgeText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemInfo: {
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: colors.white,
  },
  footerPrice: {
    marginRight: spacing[4],
  },
  checkoutButton: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
});
