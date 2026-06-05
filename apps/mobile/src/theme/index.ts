import { colors, semantic } from "./colors"
import { mobileTypography, fontWeights } from "./typography"
import { spacing, borderRadius, shadows } from "./spacing"

export const theme = {
  colors,
  semantic,
  typography: mobileTypography,
  fontWeights,
  spacing,
  borderRadius,
  shadows,
} as const

export type Theme = typeof theme

export * from "./colors"
export * from "./spacing"
export * from "./typography"
