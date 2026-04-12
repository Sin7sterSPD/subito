import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, Card, Button, Spinner, Badge, BottomSheet, Input } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useCartStore, useUserStore, useAppStore } from '../../src/store';
import { CartItem, BookingType } from '../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

function CartItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  return (
    <Card style={styles.itemCard} variant="outlined">
      <View style={styles.itemContent}>
        <View style={styles.itemInfo}>
          <Text variant="bodyMedium" color="textPrimary" weight="600" numberOfLines={2}>
            {item.catalog?.name || 'Service'}
          </Text>
          {item.catalog?.description && (
            <Text variant="captionMedium" color="textMuted" numberOfLines={1} style={styles.itemDesc}>
              {item.catalog.description}
            </Text>
          )}
          <Text variant="bodySmall" color="primary" weight="700" style={styles.itemPrice}>
            ₹{item.totalPrice}
          </Text>
        </View>

        <View style={styles.itemActions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={item.quantity > 1 ? onDecrement : onRemove}
            >
              <Ionicons
                name={item.quantity > 1 ? 'remove' : 'trash-outline'}
                size={18}
                color={item.quantity > 1 ? semantic.primary : semantic.error}
              />
            </TouchableOpacity>
            <Text variant="bodySmall" weight="600" style={styles.quantityText}>
              {item.quantity}
            </Text>
            <TouchableOpacity style={styles.quantityButton} onPress={onIncrement}>
              <Ionicons name="add" size={18} color={semantic.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  );
}

function BookingTypeSelector({
  selected,
  onChange,
}: {
  selected: BookingType;
  onChange: (type: BookingType) => void;
}) {
  const types: { key: BookingType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'INSTANT', label: 'Instant', icon: 'flash' },
    { key: 'SCHEDULED', label: 'Schedule', icon: 'calendar' },
    { key: 'RECURRING', label: 'Recurring', icon: 'repeat' },
  ];

  return (
    <View style={styles.bookingTypes}>
      {types.map((type) => (
        <TouchableOpacity
          key={type.key}
          style={[styles.bookingTypeButton, selected === type.key && styles.bookingTypeActive]}
          onPress={() => onChange(type.key)}
        >
          <Ionicons
            name={type.icon}
            size={20}
            color={selected === type.key ? semantic.primary : semantic.textMuted}
          />
          <Text
            variant="captionLarge"
            color={selected === type.key ? 'primary' : 'textMuted'}
            weight={selected === type.key ? '600' : '400'}
          >
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PricingSummary({
  subtotal,
  discount,
  gst,
  surge,
  total,
  couponCode,
}: {
  subtotal: string;
  discount: string;
  gst: string;
  surge: string;
  total: string;
  couponCode?: string;
}) {
  return (
    <Card style={styles.pricingCard} variant="filled">
      <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.pricingTitle}>
        Price Details
      </Text>
      <View style={styles.pricingRow}>
        <Text variant="bodySmall" color="textSecondary">
          Subtotal
        </Text>
        <Text variant="bodySmall" color="textPrimary">
          ₹{subtotal}
        </Text>
      </View>
      {parseFloat(discount) > 0 && (
        <View style={styles.pricingRow}>
          <View style={styles.discountLabel}>
            <Text variant="bodySmall" color="success">
              Discount
            </Text>
            {couponCode && (
              <Badge variant="success" size="sm">
                {couponCode}
              </Badge>
            )}
          </View>
          <Text variant="bodySmall" color="success">
            -₹{discount}
          </Text>
        </View>
      )}
      {parseFloat(surge) > 0 && (
        <View style={styles.pricingRow}>
          <Text variant="bodySmall" color="warning">
            Surge
          </Text>
          <Text variant="bodySmall" color="warning">
            +₹{surge}
          </Text>
        </View>
      )}
      <View style={styles.pricingRow}>
        <Text variant="bodySmall" color="textSecondary">
          GST
        </Text>
        <Text variant="bodySmall" color="textPrimary">
          ₹{gst}
        </Text>
      </View>
      <View style={[styles.pricingRow, styles.totalRow]}>
        <Text variant="bodyMedium" color="textPrimary" weight="700">
          Total
        </Text>
        <Text variant="bodyMedium" color="primary" weight="700">
          ₹{total}
        </Text>
      </View>
    </Card>
  );
}

function EmptyCart() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cart-outline" size={64} color={semantic.textMuted} />
      </View>
      <Text variant="h5" color="textSecondary" style={styles.emptyTitle}>
        Your cart is empty
      </Text>
      <Text variant="bodySmall" color="textMuted" align="center" style={styles.emptySubtitle}>
        Add services to your cart to get started
      </Text>
      <Button variant="primary" size="lg" onPress={() => router.push('/(tabs)')}>
        Browse Services
      </Button>
    </View>
  );
}

export default function CartScreen() {
  const { cart, isLoading, fetchCart, updateItem, removeItem, updateCart, applyCoupon, removeCoupon } =
    useCartStore();
  const { selectedAddress } = useUserStore();
  const { availableCoupons, fetchCoupons } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showCouponSheet, setShowCouponSheet] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    fetchCart();
    fetchCoupons();
  }, [fetchCart, fetchCoupons]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCart();
    setRefreshing(false);
  }, [fetchCart]);

  const handleIncrement = async (item: CartItem) => {
    await updateItem(item.id, 'INCREMENT');
  };

  const handleDecrement = async (item: CartItem) => {
    await updateItem(item.id, 'DECREMENT');
  };

  const handleRemove = async (item: CartItem) => {
    await removeItem(item.id);
  };

  const handleBookingTypeChange = async (type: BookingType) => {
    await updateCart({ bookingType: type });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    const result = await applyCoupon(couponCode.trim());
    if (result.success) {
      setShowCouponSheet(false);
      setCouponCode('');
    } else {
      setCouponError(result.error || 'Failed to apply coupon');
    }
  };

  const handleRemoveCoupon = async () => {
    await removeCoupon();
  };

  const handleCheckout = () => {
    if (!selectedAddress) {
      router.push('/(screens)/addresses');
      return;
    }
    router.push('/(screens)/checkout');
  };

  if (isLoading && !cart) {
    return <Spinner fullScreen message="Loading cart..." />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text variant="h4" color="textPrimary" weight="700">
            Cart
          </Text>
        </View>
        <EmptyCart />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h4" color="textPrimary" weight="700">
          Cart
        </Text>
        <Text variant="captionLarge" color="textMuted">
          {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[semantic.primary]} />
        }
      >
        <View style={styles.section}>
          <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Booking Type
          </Text>
          <BookingTypeSelector selected={cart.bookingType} onChange={handleBookingTypeChange} />
        </View>

        <View style={styles.section}>
          <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Services
          </Text>
          {cart.items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onIncrement={() => handleIncrement(item)}
              onDecrement={() => handleDecrement(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addressSelector}
            onPress={() => router.push('/(screens)/addresses')}
          >
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={20} color={semantic.primary} />
            </View>
            <View style={styles.addressContent}>
              {selectedAddress ? (
                <>
                  <Text variant="bodySmall" color="textPrimary" weight="600">
                    {selectedAddress.name}
                  </Text>
                  <Text variant="captionMedium" color="textMuted" numberOfLines={1}>
                    {selectedAddress.addressLine1}
                  </Text>
                </>
              ) : (
                <Text variant="bodySmall" color="primary" weight="600">
                  Add Delivery Address
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {cart.coupon ? (
            <View style={styles.appliedCoupon}>
              <View style={styles.couponInfo}>
                <Ionicons name="ticket" size={20} color={semantic.success} />
                <View style={styles.couponText}>
                  <Text variant="bodySmall" color="success" weight="600">
                    {cart.coupon.code} applied
                  </Text>
                  <Text variant="captionMedium" color="textMuted">
                    You save ₹{cart.discountAmount}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text variant="captionLarge" color="error" weight="500">
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.couponButton} onPress={() => setShowCouponSheet(true)}>
              <Ionicons name="ticket-outline" size={20} color={semantic.primary} />
              <Text variant="bodySmall" color="primary" weight="600" style={styles.couponButtonText}>
                Apply Coupon
              </Text>
              <Ionicons name="chevron-forward" size={20} color={semantic.primary} />
            </TouchableOpacity>
          )}
        </View>

        <PricingSummary
          subtotal={cart.totalPrice}
          discount={cart.discountAmount}
          gst={cart.gst}
          surge={cart.surgePrice}
          total={cart.finalTotalAmount}
          couponCode={cart.coupon?.code}
        />

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
        <Button variant="primary" size="lg" onPress={handleCheckout} style={styles.checkoutButton}>
          Proceed to Checkout
        </Button>
      </View>

      <BottomSheet isVisible={showCouponSheet} onClose={() => setShowCouponSheet(false)}>
        <View style={styles.couponSheet}>
          <Text variant="h5" color="textPrimary" weight="700" style={styles.couponSheetTitle}>
            Apply Coupon
          </Text>

          <View style={styles.couponInput}>
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChangeText={(text) => {
                setCouponCode(text.toUpperCase());
                setCouponError('');
              }}
              error={couponError}
              autoCapitalize="characters"
            />
            <Button variant="primary" onPress={handleApplyCoupon} disabled={!couponCode.trim()}>
              Apply
            </Button>
          </View>

          {availableCoupons.length > 0 && (
            <View style={styles.availableCoupons}>
              <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.availableTitle}>
                Available Coupons
              </Text>
              {availableCoupons.map((coupon) => (
                <TouchableOpacity
                  key={coupon.id}
                  style={styles.couponItem}
                  onPress={() => {
                    setCouponCode(coupon.code);
                    setCouponError('');
                  }}
                >
                  <View style={styles.couponItemContent}>
                    <Text variant="bodySmall" color="primary" weight="700">
                      {coupon.code}
                    </Text>
                    <Text variant="captionMedium" color="textMuted">
                      {coupon.description || `Get ${coupon.discountValue}${coupon.discountType === 'PERCENTAGE' ? '%' : ''} off`}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={semantic.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  scroll: {
    flex: 1,
  },
  section: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  bookingTypes: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  bookingTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: semantic.backgroundSecondary,
  },
  bookingTypeActive: {
    backgroundColor: colors.blue[1],
  },
  itemCard: {
    marginBottom: spacing[3],
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemDesc: {
    marginTop: spacing[1],
  },
  itemPrice: {
    marginTop: spacing[2],
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  quantityButton: {
    padding: spacing[2],
  },
  quantityText: {
    paddingHorizontal: spacing[3],
  },
  addressSelector: {
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
  appliedCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.green[1],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  couponInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponText: {
    marginLeft: spacing[2],
  },
  couponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue[1],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
  },
  couponButtonText: {
    flex: 1,
    marginLeft: spacing[2],
  },
  pricingCard: {
    margin: spacing[4],
  },
  pricingTitle: {
    marginBottom: spacing[3],
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  discountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    marginBottom: spacing[6],
  },
  couponSheet: {
    paddingHorizontal: spacing[4],
  },
  couponSheetTitle: {
    marginBottom: spacing[4],
  },
  couponInput: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  availableCoupons: {
    marginTop: spacing[6],
  },
  availableTitle: {
    marginBottom: spacing[3],
  },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  couponItemContent: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
});
