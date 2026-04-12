import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { semantic } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
}

export function Spinner({
  size = 'large',
  color = semantic.primary,
  message,
  fullScreen = false,
}: SpinnerProps) {
  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text variant="bodySmall" color="textSecondary" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.overlay}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  fullScreen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  message: {
    marginTop: spacing[3],
  },
});
