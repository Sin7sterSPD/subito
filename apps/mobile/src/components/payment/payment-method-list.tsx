import React from "react"
import { View, StyleSheet } from "react-native"
import { Text } from "../ui"
import { spacing } from "../../theme/spacing"
import { PaymentMethodCard } from "./payment-method-card"

export type PaymentMethodRow = {
  key: string
  title: string
  subtitle?: string
  onPress: () => void
  leading?: React.ReactNode
}

export type PaymentSection = {
  title: string
  rows: PaymentMethodRow[]
}

type Props = {
  sections: PaymentSection[]
}

export function PaymentMethodsList({ sections }: Props) {
  return (
    <View>
      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <View key={section.title} style={styles.section}>
            <Text
              variant="bodyLarge"
              color="textMuted"
              weight="600"
              style={styles.sectionTitle}
            >
              {section.title}
            </Text>
            {section.rows.map((row) => (
              <PaymentMethodCard
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                onPress={row.onPress}
                leading={row.leading}
              />
            ))}
          </View>
        )
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    marginBottom: spacing[2],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
})
