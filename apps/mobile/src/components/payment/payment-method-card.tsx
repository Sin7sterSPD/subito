import React from "react"
import { TouchableOpacity, StyleSheet, View } from "react-native"
import { Text } from "../ui"
import { colors, semantic } from "../../theme/colors"
import { spacing, borderRadius } from "../../theme/spacing"

export type PaymentMethodCardProps = {
  title: string
  subtitle?: string
  selected?: boolean
  onPress: () => void
  leading?: React.ReactNode
}

export function PaymentMethodCard({
  title,
  subtitle,
  selected,
  onPress,
  leading,
}: PaymentMethodCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.textWrap}>
        <Text variant="bodyMedium" color="textPrimary" weight="600">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMedium" color="textMuted" style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: semantic.borderLight,
    backgroundColor: colors.white,
    marginBottom: spacing[2],
  },
  cardSelected: {
    borderColor: semantic.primary,
    backgroundColor: colors.blue[1],
  },
  leading: {
    marginRight: spacing[3],
  },
  textWrap: {
    flex: 1,
  },
  sub: {
    marginTop: spacing[1],
  },
})
