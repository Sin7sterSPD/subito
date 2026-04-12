import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { colors, semantic } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { mobileTypography } from '../../theme/typography';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  error = false,
  autoFocus = true,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(cleaned);
  };

  const digits = value.split('');

  return (
    <View>
      <Pressable onPress={handlePress} style={styles.container}>
        {Array.from({ length }).map((_, index) => {
          const digit = digits[index];
          const isCurrentIndex = index === digits.length;
          const isFilled = index < digits.length;

          return (
            <View
              key={index}
              style={[
                styles.cell,
                isFilled && styles.cellFilled,
                isFocused && isCurrentIndex && styles.cellFocused,
                error && styles.cellError,
              ]}
            >
              <TextInput
                style={styles.cellText}
                value={digit || ''}
                editable={false}
                pointerEvents="none"
              />
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
  },
  cell: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: semantic.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cellFilled: {
    borderColor: semantic.primary,
    backgroundColor: semantic.primaryLight,
  },
  cellFocused: {
    borderColor: semantic.primary,
    borderWidth: 2,
  },
  cellError: {
    borderColor: semantic.error,
  },
  cellText: {
    ...mobileTypography.h4,
    color: semantic.textPrimary,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
});
