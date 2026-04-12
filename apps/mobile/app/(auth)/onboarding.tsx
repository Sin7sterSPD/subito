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
import { Text, Button, Input, Avatar } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useAuthStore, useAppStore, useUserStore } from '../../src/store';
import { usersApi, uploadApi } from '../../src/services/api';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const { user, fetchUser } = useAuthStore();
  const { setOnboardingComplete } = useAppStore();
  const { updateProfile } = useUserStore();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (emailValue: string) => {
    if (!emailValue) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (email && !validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      let uploadedImageUrl: string | undefined;

      if (profileImage && !profileImage.startsWith('http')) {
        const url = await uploadApi.uploadImage(profileImage);
        if (url) {
          uploadedImageUrl = url;
        }
      }

      const success = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        profileImage: uploadedImageUrl,
      });

      if (success) {
        await fetchUser();
        setOnboardingComplete(true);
        router.replace('/(tabs)');
      } else {
        setErrors({ firstName: 'Failed to update profile. Please try again.' });
      }
    } catch {
      setErrors({ firstName: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)');
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
            <Text variant="h3" color="textPrimary" weight="700">
              Complete your profile
            </Text>
            <Text variant="bodyMedium" color="textSecondary" style={styles.subtitle}>
              Help us personalize your experience
            </Text>
          </View>

          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {profileImage ? (
              <Avatar source={profileImage} size="xl" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="camera" size={32} color={semantic.textMuted} />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>

          <View style={styles.form}>
            <Input
              label="First Name *"
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (errors.firstName) setErrors({ ...errors, firstName: undefined });
              }}
              error={errors.firstName}
              autoCapitalize="words"
            />

            <View style={styles.inputSpacing}>
              <Input
                label="Last Name"
                placeholder="Enter your last name"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                }}
                error={errors.lastName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputSpacing}>
              <Input
                label="Email"
                placeholder="Enter your email (optional)"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              onPress={handleSubmit}
              isLoading={isLoading}
              disabled={!firstName.trim()}
              fullWidth
              size="lg"
            >
              Continue
            </Button>

            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text variant="bodyMedium" color="textMuted">
                Skip for now
              </Text>
            </TouchableOpacity>
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
    padding: spacing[6],
    paddingTop: spacing[8],
  },
  header: {
    marginBottom: spacing[8],
  },
  subtitle: {
    marginTop: spacing[2],
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: spacing[8],
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: semantic.border,
    borderStyle: 'dashed',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  form: {
    flex: 1,
  },
  inputSpacing: {
    marginTop: spacing[4],
  },
  actions: {
    marginTop: spacing[8],
  },
  skipButton: {
    alignItems: 'center',
    padding: spacing[4],
  },
});
