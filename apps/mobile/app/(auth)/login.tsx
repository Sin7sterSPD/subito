import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Button, Input } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useAuthStore } from '../../src/store';
import { sendOTP } from '../../src/config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, setVerification } = useAuthStore();

  const validatePhone = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  };

  const handleContinue = async () => {
    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const verificationId = await sendOTP(phone);
      
      if (verificationId) {
        const result = await login(phone);
        if (result.success) {
          setVerification(verificationId, phone);
          router.push({
            pathname: '/(auth)/otp',
            params: { phone, verificationId, isExisting: result.isExistingUser ? '1' : '0' },
          });
        } else {
          setVerification(verificationId, phone);
          router.push({
            pathname: '/(auth)/otp',
            params: { phone, verificationId, isExisting: '0' },
          });
        }
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/HomeBanner.png')}
              style={styles.banner}
              contentFit="cover"
            />
            <View style={styles.overlay}>
              <Text variant="h2" color={colors.white} weight="700">
                Welcome to
              </Text>
              <Text variant="h1" color={colors.white} weight="700">
                Subito
              </Text>
              <Text variant="bodyMedium" color={colors.white} style={styles.tagline}>
                Professional home services at your doorstep
              </Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <Text variant="h4" color="textPrimary" style={styles.title}>
              Enter your mobile number
            </Text>
            <Text variant="bodySmall" color="textSecondary" style={styles.subtitle}>
              We'll send you a verification code
            </Text>

            <View style={styles.inputWrapper}>
              <Input
                placeholder="Mobile Number"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                error={error}
                leftIcon={
                  <View style={styles.countryCode}>
                    <Text variant="bodyMedium" color="textPrimary" weight="500">
                      +91
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={semantic.textSecondary}
                    />
                  </View>
                }
                autoFocus
              />
            </View>

            <Button
              onPress={handleContinue}
              isLoading={isLoading}
              disabled={phone.length < 10}
              fullWidth
              size="lg"
            >
              Continue
            </Button>

            <Text
              variant="captionLarge"
              color="textMuted"
              align="center"
              style={styles.terms}
            >
              By continuing, you agree to our{' '}
              <Text variant="captionLarge" color="primary" weight="500">
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text variant="captionLarge" color="primary" weight="500">
                Privacy Policy
              </Text>
            </Text>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: 300,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: spacing[6],
  },
  tagline: {
    marginTop: spacing[2],
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    padding: spacing[6],
    paddingTop: spacing[8],
  },
  title: {
    marginBottom: spacing[1],
  },
  subtitle: {
    marginBottom: spacing[6],
  },
  inputWrapper: {
    marginBottom: spacing[6],
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingRight: spacing[2],
    borderRightWidth: 1,
    borderRightColor: semantic.border,
    marginRight: spacing[2],
  },
  terms: {
    marginTop: spacing[6],
    lineHeight: 20,
  },
});
