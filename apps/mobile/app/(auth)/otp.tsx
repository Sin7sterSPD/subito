import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Button, OTPInput } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useAuthStore, useAppStore } from '../../src/store';
import { verifyOTP, sendOTP } from '../../src/config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function OTPScreen() {
  const params = useLocalSearchParams<{
    phone: string;
    verificationId: string;
    isExisting: string;
  }>();
  
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [currentVerificationId, setCurrentVerificationId] = useState(params.verificationId);

  const { verify, setVerification } = useAuthStore();
  const { setOnboardingComplete } = useAppStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOTPChange = (value: string) => {
    setOtp(value);
    if (error) setError('');

    if (value.length === 6) {
      handleVerify(value);
    }
  };

  const handleVerify = async (otpValue: string = otp) => {
    if (otpValue.length !== 6) {
      setError('Please enter the complete OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const firebaseResult = await verifyOTP(currentVerificationId, otpValue);

      if (!firebaseResult.success || !firebaseResult.idToken) {
        setError('Invalid OTP. Please try again.');
        setIsLoading(false);
        return;
      }

      const result = await verify(firebaseResult.idToken);

      if (result.success) {
        if (result.isNewUser) {
          router.replace('/(auth)/onboarding');
        } else {
          setOnboardingComplete(true);
          router.replace('/(tabs)');
        }
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    try {
      const newVerificationId = await sendOTP(params.phone);
      if (newVerificationId) {
        setCurrentVerificationId(newVerificationId);
        setVerification(newVerificationId, params.phone);
        setResendTimer(30);
        setOtp('');
        setError('');
      } else {
        setError('Failed to resend OTP. Please try again.');
      }
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={semantic.textPrimary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text variant="h3" color="textPrimary" weight="700">
              Verify your number
            </Text>
            <Text variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
              Enter the 6-digit code sent to
            </Text>
            <Text variant="bodyMedium" color="primary" weight="600">
              +91 {params.phone}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <OTPInput
              value={otp}
              onChange={handleOTPChange}
              error={!!error}
              autoFocus
            />
            {error && (
              <Text variant="captionMedium" color="error" style={styles.error}>
                {error}
              </Text>
            )}
          </View>

          <View style={styles.resendContainer}>
            {resendTimer > 0 ? (
              <Text variant="bodySmall" color="textMuted">
                Resend code in {resendTimer}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                <Text variant="bodySmall" color="primary" weight="600">
                  Resend Code
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            onPress={() => handleVerify()}
            isLoading={isLoading}
            disabled={otp.length !== 6}
            fullWidth
            size="lg"
          >
            Verify
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  backButton: {
    padding: spacing[4],
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    padding: spacing[6],
    paddingTop: spacing[4],
  },
  header: {
    marginBottom: spacing[8],
  },
  subtitle: {
    marginTop: spacing[2],
  },
  otpContainer: {
    marginBottom: spacing[6],
  },
  error: {
    textAlign: 'center',
    marginTop: spacing[3],
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
});
