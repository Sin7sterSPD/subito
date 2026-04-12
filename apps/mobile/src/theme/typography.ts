import { TextStyle } from 'react-native';

export const fontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const typography = {
  display: {
    fontSize: 96,
    lineHeight: 100,
    letterSpacing: -3.8,
    fontWeight: fontWeights.bold,
  },
  h1: {
    fontSize: 72,
    lineHeight: 80,
    letterSpacing: -2.2,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1.7,
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
    fontWeight: fontWeights.bold,
  },
  h4: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.7,
    fontWeight: fontWeights.semibold,
  },
  h5: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontWeight: fontWeights.semibold,
  },
  h6: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
    fontWeight: fontWeights.semibold,
  },
  bodyLarge: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    fontWeight: fontWeights.regular,
  },
  bodyMedium: {
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
    fontWeight: fontWeights.regular,
  },
  bodySmall: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontWeight: fontWeights.regular,
  },
  captionLarge: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontWeight: fontWeights.regular,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
  captionSmall: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
} as const satisfies Record<string, TextStyle>;

// Mobile-optimized scale (slightly smaller for mobile screens)
export const mobileTypography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.4,
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
    fontWeight: fontWeights.semibold,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    fontWeight: fontWeights.semibold,
  },
  h5: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
    fontWeight: fontWeights.semibold,
  },
  h6: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: fontWeights.semibold,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
  tiny: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0,
    fontWeight: fontWeights.regular,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyKey = keyof typeof mobileTypography;
