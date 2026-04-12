import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../src/store";
import { sendOTP } from "../../src/config/firebase";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();

  const onContinue = async () => {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    const api = await login(digits);
    if (!api.success) {
      setError("Could not start login. Try again.");
      return;
    }

    const verificationId = await sendOTP(digits);
    if (!verificationId) {
      setError("Failed to send OTP. Check Firebase config.");
      return;
    }

    router.push({
      pathname: "/(auth)/otp",
      params: { verificationId, phone: digits },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.label}>Mobile number</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="9876543210"
        value={phone}
        onChangeText={setPhone}
        maxLength={10}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  label: { fontSize: 14, marginBottom: 8, color: "#444" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    marginBottom: 12,
  },
  error: { color: "#c00", marginBottom: 12 },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
