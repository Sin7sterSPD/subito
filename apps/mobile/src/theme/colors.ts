export const colors = {
  // Gray Scale - Text, backgrounds, borders, neutral UI
  gray: {
    1: '#F7F7F8',
    2: '#E9EAEC',
    3: '#DEE0E3',
    4: '#C8CAD0',
    5: '#BABDC5',
    6: '#9EA2AD',
    7: '#7E869A',
    8: '#717684',
    9: '#5E636E',
    10: '#464A53',
    11: '#333333',
    12: '#1F2228',
    13: '#14151A',
  },

  // Blue - Primary Brand Color
  blue: {
    1: '#F0F4FE',
    2: '#E3EAFD',
    3: '#CCD9FA',
    4: '#B4C7F8',
    5: '#93AFF6',
    6: '#7196F4',
    7: '#5984F2',
    8: '#4778F5',
    9: '#1D54E2',
    10: '#1A4AC7',
    11: '#133A9A',
    12: '#07296A',
    13: '#03153A',
  },

  // Green - Success / Positive States
  green: {
    1: '#EDFDF4',
    2: '#D1FAE4',
    3: '#C3F8DC',
    4: '#9AF4C3',
    5: '#8CE8B6',
    6: '#6AE1A1',
    7: '#40D986',
    8: '#26BD6C',
    9: '#21A65E',
    10: '#1D9052',
    11: '#166E3F',
    12: '#0F4C2C',
    13: '#072213',
  },

  // Orange - Warning / Caution States
  orange: {
    1: '#FEF4EC',
    2: '#FDEAD8',
    3: '#FCDDC0',
    4: '#FAD0A9',
    5: '#F9C594',
    6: '#F8B577',
    7: '#F6A355',
    8: '#F48E2F',
    9: '#D9760C',
    10: '#D56C0B',
    11: '#AE590A',
    12: '#613105',
    13: '#301903',
  },

  // Red - Error / Danger States
  red: {
    1: '#FDF2F1',
    2: '#FCE5E4',
    3: '#F9D4D2',
    4: '#F7C3C0',
    5: '#F5B2AD',
    6: '#F08B85',
    7: '#EB6960',
    8: '#E6483D',
    9: '#D9281C',
    10: '#B32318',
    11: '#9A1C13',
    12: '#64120D',
    13: '#360A07',
  },

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Semantic color mapping
export const semantic = {
  // Primary - Blue
  primary: colors.blue[9],
  primaryLight: colors.blue[1],
  primaryHover: colors.blue[8],
  primaryPressed: colors.blue[10],

  // Success - Green
  success: colors.green[8],
  successLight: colors.green[1],
  successDark: colors.green[10],

  // Warning - Orange
  warning: colors.orange[8],
  warningLight: colors.orange[1],
  warningDark: colors.orange[10],

  // Error - Red
  error: colors.red[9],
  errorLight: colors.red[1],
  errorDark: colors.red[10],

  // Text colors
  textPrimary: colors.gray[11],
  textSecondary: colors.gray[8],
  textMuted: colors.gray[6],
  textDisabled: colors.gray[5],
  textInverse: colors.white,

  // Background colors
  background: colors.white,
  backgroundSecondary: colors.gray[1],
  backgroundTertiary: colors.gray[2],

  // Border colors
  border: colors.gray[3],
  borderLight: colors.gray[2],
  borderDark: colors.gray[4],

  // Surface colors
  surface: colors.white,
  surfaceSecondary: colors.gray[1],
  surfaceElevated: colors.white,
} as const;

export type ColorKey = keyof typeof colors;
export type SemanticColorKey = keyof typeof semantic;
