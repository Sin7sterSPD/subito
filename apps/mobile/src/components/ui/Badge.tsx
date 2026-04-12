import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

const getVariantStyles = (variant: BadgeVariant) => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.blue[1],
        textColor: colors.blue[9],
      };
    case 'success':
      return {
        backgroundColor: colors.green[1],
        textColor: colors.green[9],
      };
    case 'warning':
      return {
        backgroundColor: colors.orange[1],
        textColor: colors.orange[9],
      };
    case 'error':
      return {
        backgroundColor: colors.red[1],
        textColor: colors.red[9],
      };
    case 'neutral':
      return {
        backgroundColor: colors.gray[2],
        textColor: colors.gray[9],
      };
  }
};

export function Badge({ variant = 'primary', size = 'md', children }: BadgeProps) {
  const variantStyles = getVariantStyles(variant);
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: variantStyles.backgroundColor },
        isSmall && styles.small,
      ]}
    >
      <Text
        variant={isSmall ? 'tiny' : 'captionMedium'}
        color={variantStyles.textColor}
        weight="600"
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
});
