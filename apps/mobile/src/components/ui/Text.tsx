import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { mobileTypography, TypographyKey } from '../../theme/typography';
import { semantic } from '../../theme/colors';

interface TextProps extends RNTextProps {
  variant?: TypographyKey;
  color?: keyof typeof semantic | string;
  weight?: '300' | '400' | '500' | '600' | '700' | '800' | '900';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export function Text({
  variant = 'bodyMedium',
  color = 'textPrimary',
  weight,
  align,
  style,
  children,
  ...props
}: TextProps) {
  const typographyStyle = mobileTypography[variant];
  const textColor = color in semantic ? semantic[color as keyof typeof semantic] : color;

  return (
    <RNText
      style={[
        typographyStyle,
        { color: textColor },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export const styles = StyleSheet.create({});
