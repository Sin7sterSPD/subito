import React from 'react';
import { View, ViewProps, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { borderRadius, shadows, spacing, ShadowKey } from '../../theme/spacing';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  shadow?: ShadowKey;
  padding?: number;
  onPress?: () => void;
  children: React.ReactNode;
}

export function Card({
  variant = 'elevated',
  shadow = 'md',
  padding = spacing[4],
  onPress,
  style,
  children,
  ...props
}: CardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          ...shadows[shadow],
          backgroundColor: colors.white,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.gray[3],
        };
      case 'filled':
        return {
          backgroundColor: colors.gray[1],
          borderWidth: 0,
        };
    }
  };

  const cardContent = (
    <View
      style={[styles.base, getVariantStyles(), { padding }, style]}
      {...props}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
});
