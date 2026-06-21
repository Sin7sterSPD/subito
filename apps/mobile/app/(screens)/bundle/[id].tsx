import React from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { Image } from "expo-image"
import { Typography, Card, Chip, Button, Separator } from "heroui-native"
import { colors, semantic } from "@/src/theme/colors"
import { spacing, borderRadius } from "@/src/theme/spacing"
import { useListingsStore, useCartStore } from "@/src/store"
import { Ionicons } from "@expo/vector-icons"

export default function BundleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bundles } = useListingsStore()
  const { addItem, isLoading } = useCartStore()

  const bundle = bundles.find((b) => b.id === id)

  const handleAddToCart = async () => {
    if (!bundle) return
    for (const item of bundle.items) {
      const ok = await addItem(item.catalogId, item.quantity, {
        bundleId: bundle.id,
      })
      if (!ok) {
        return
      }
    }
    router.push("/(tabs)/cart")
  }

  if (!bundle) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }}>
        <View style={styles.notFound}>
          <Typography type="h6" style={{ color: semantic.textSecondary }}>
            Bundle not found
          </Typography>
        </View>
      </SafeAreaView>
    )
  }

  const savings =
    parseFloat(bundle.originalPrice) - parseFloat(bundle.bundlePrice)

  return (
    <>
      <Stack.Screen options={{ title: bundle.name }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }} edges={["bottom"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {bundle.image && (
            <Image
              source={{ uri: bundle.image }}
              style={styles.headerImage}
              contentFit="cover"
            />
          )}

          <View style={styles.content}>
            <View style={styles.header}>
              {bundle.discountPercentage && (
                <Chip color="success" variant="soft" style={{ alignSelf: "flex-start" }}>
                  {bundle.discountPercentage}% OFF
                </Chip>
              )}
              <Typography
                type="h4"
                weight="bold"
                style={[styles.title, { color: semantic.textPrimary }]}
              >
                {bundle.name}
              </Typography>
              {bundle.description && (
                <Typography type="body" style={{ color: semantic.textSecondary }}>
                  {bundle.description}
                </Typography>
              )}
            </View>

            <Card style={styles.pricingCard} variant="secondary">
              <View style={styles.pricingRow}>
                <Typography type="body" style={{ color: semantic.textSecondary }}>
                  Bundle Price
                </Typography>
                <View style={styles.priceValues}>
                  <Typography type="h5" weight="bold" className="text-accent">
                    ₹{bundle.bundlePrice}
                  </Typography>
                  <Typography
                    type="body-sm"
                    style={[styles.strikethrough, { color: semantic.textMuted }]}
                  >
                    ₹{bundle.originalPrice}
                  </Typography>
                </View>
              </View>
              <View style={styles.savingsRow}>
                <Ionicons name="pricetag" size={16} color={semantic.success} />
                <Typography type="body-sm" weight="semibold" className="text-success">
                  You save ₹{savings.toFixed(0)}
                </Typography>
              </View>
            </Card>

            <View style={styles.section}>
              <Typography
                type="body"
                weight="semibold"
                style={[styles.sectionTitle, { color: semantic.textPrimary }]}
              >
                Included Services ({bundle.items.length})
              </Typography>
              <Card variant="default" style={{ padding: 0 }}>
                {bundle.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Typography
                          type="body-sm"
                          weight="semibold"
                          style={{ color: semantic.textPrimary }}
                        >
                          {item.catalog?.name || "Service"}
                        </Typography>
                        {item.catalog?.description && (
                          <Typography
                            type="body-sm"
                            numberOfLines={1}
                            style={{ color: semantic.textMuted }}
                          >
                            {item.catalog.description}
                          </Typography>
                        )}
                      </View>
                      <View style={styles.serviceQty}>
                        <Typography type="body" style={{ color: semantic.textMuted }}>
                          x{item.quantity}
                        </Typography>
                      </View>
                    </View>
                    {idx < bundle.items.length - 1 && (
                      <Separator />
                    )}
                  </React.Fragment>
                ))}
              </Card>
            </View>

            <View style={styles.benefits}>
              <Typography
                type="body"
                weight="semibold"
                style={[styles.sectionTitle, { color: semantic.textPrimary }]}
              >
                Why Choose This Bundle?
              </Typography>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="wallet" size={18} color={semantic.success} />
                </View>
                <View style={styles.benefitText}>
                  <Typography type="body-sm" weight="semibold" style={{ color: semantic.textPrimary }}>
                    Save ₹{savings.toFixed(0)}
                  </Typography>
                  <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                    Compared to individual service prices
                  </Typography>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="time" size={18} color={semantic.accent} />
                </View>
                <View style={styles.benefitText}>
                  <Typography type="body-sm" weight="semibold" style={{ color: semantic.textPrimary }}>
                    Convenient Scheduling
                  </Typography>
                  <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                    All services in one appointment
                  </Typography>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="star" size={18} color={colors.orange[8]} />
                </View>
                <View style={styles.benefitText}>
                  <Typography type="body-sm" weight="semibold" style={{ color: semantic.textPrimary }}>
                    Premium Quality
                  </Typography>
                  <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                    Curated combination of services
                  </Typography>
                </View>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Typography type="body-sm" style={{ color: semantic.textMuted }}>
              Bundle Price
            </Typography>
            <Typography type="h5" weight="bold" className="text-accent">
              ₹{bundle.bundlePrice}
            </Typography>
          </View>
          <Button
            variant="primary"
            onPress={handleAddToCart}
            disabled={isLoading}
            style={styles.addButton}
          >
            Add to Cart
          </Button>
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  headerImage: {
    width: "100%",
    height: 200,
  },
  content: {
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  title: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  pricingCard: {
    marginBottom: spacing[6],
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  strikethrough: {
    textDecorationLine: "line-through",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
  },
  serviceInfo: {
    flex: 1,
  },
  serviceQty: {
    paddingLeft: spacing[3],
  },
  benefits: {
    marginBottom: spacing[4],
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing[3],
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: semantic.background,
  },
  footerPrice: {
    marginRight: spacing[4],
  },
  addButton: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
