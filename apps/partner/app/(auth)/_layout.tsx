import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerTitle: "Partner" }}>
      <Stack.Screen name="login" options={{ title: "Sign in" }} />
      <Stack.Screen name="otp" options={{ title: "Verify OTP" }} />
    </Stack>
  );
}
