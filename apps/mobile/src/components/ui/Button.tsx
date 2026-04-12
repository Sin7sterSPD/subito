import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Text } from './Text';
import { colors, semantic } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const getVariantStyles = (variant: ButtonVariant, disabled?: boolean | null) => {
  const opacity = disabled ? 0.5 : 1;

  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: semantic.primary,
          borderWidth: 0,
          opacity,
        },
        text: colors.white,
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: semantic.primaryLight,
          borderWidth: 0,
          opacity,
        },
        text: semantic.primary,
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: semantic.primary,
          opacity,
        },
        text: semantic.primary,
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 0,
          opacity,
        },
        text: semantic.primary,
      };
    case 'danger':
      return {
        container: {
          backgroundColor: semantic.error,
          borderWidth: 0,
          opacity,
        },
        text: colors.white,
      };
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return {
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[3],
        fontSize: 14,
      };
    case 'md':
      return {
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        fontSize: 16,
      };
    case 'lg':
      return {
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[6],
        fontSize: 18,
      };
  }
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = getVariantStyles(variant, disabled || isLoading);
  const sizeStyles = getSizeStyles(size);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles.container,
        {
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variantStyles.text} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            variant={size === 'lg' ? 'bodyLarge' : size === 'sm' ? 'bodySmall' : 'bodyMedium'}
            color={variantStyles.text}
            weight="600"
          >
            {children}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  rightIcon: {
    marginLeft: spacing[2],
  },
});
