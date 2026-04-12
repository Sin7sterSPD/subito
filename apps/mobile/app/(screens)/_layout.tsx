import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="service/[id]" options={{ title: 'Service Details' }} />
      <Stack.Screen name="category/[id]" options={{ title: 'Category' }} />
      <Stack.Screen name="bundle/[id]" options={{ title: 'Bundle Details' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Booking Details' }} />
      <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
      <Stack.Screen name="payment" options={{ title: 'Payment', headerShown: false }} />
      <Stack.Screen name="payment-success" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="addresses" options={{ title: 'Saved Addresses' }} />
      <Stack.Screen name="add-address" options={{ title: 'Add Address' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="referrals" options={{ title: 'Refer & Earn' }} />
      <Stack.Screen name="payment-history" options={{ title: 'Payment History' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="help" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="search" options={{ title: '', headerShown: false }} />
      <Stack.Screen name="bundles" options={{ title: 'All Bundles' }} />
      <Stack.Screen name="select-slot" options={{ title: 'Select Time Slot' }} />
      <Stack.Screen name="partner-tracking" options={{ title: 'Track Partner', headerShown: false }} />
      <Stack.Screen name="rating" options={{ title: 'Rate Service' }} />
    </Stack>
  );
}
