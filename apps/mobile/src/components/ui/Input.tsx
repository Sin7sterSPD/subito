import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text } from './Text';
import { colors, semantic } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { mobileTypography } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      isPassword,
      style,
      editable = true,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getBorderColor = () => {
      if (error) return semantic.error;
      if (isFocused) return semantic.primary;
      return semantic.border;
    };

    return (
      <View style={styles.container}>
        {label && (
          <Text variant="captionLarge" color="textSecondary" style={styles.label}>
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            { borderColor: getBorderColor() },
            !editable && styles.disabled,
          ]}
        >
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || isPassword) && styles.inputWithRightIcon,
              style,
            ]}
            placeholderTextColor={semantic.textMuted}
            secureTextEntry={isPassword && !showPassword}
            editable={editable}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {isPassword && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={semantic.textMuted}
              />
            </TouchableOpacity>
          )}
          {rightIcon && !isPassword && (
            <View style={styles.rightIcon}>{rightIcon}</View>
          )}
        </View>
        {error && (
          <Text variant="captionMedium" color="error" style={styles.message}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text variant="captionMedium" color="textMuted" style={styles.message}>
            {hint}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: spacing[1],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...mobileTypography.bodyMedium,
    color: semantic.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing[1],
  },
  inputWithRightIcon: {
    paddingRight: spacing[1],
  },
  leftIcon: {
    paddingLeft: spacing[3],
  },
  rightIcon: {
    paddingRight: spacing[3],
  },
  disabled: {
    backgroundColor: semantic.backgroundSecondary,
    opacity: 0.7,
  },
  message: {
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});
