import React from "react"
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { Typography, Card, Chip } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useListingsStore } from "../../src/store"
import { Bundle } from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")
const CARD_WIDTH = (width - spacing[4] * 3) / 2

function BundleCard({
  bundle,
  onPress,
}: {
  bundle: Bundle
  onPress: () => void
}) {
  const discount = bundle.discountPercentage

  return (
    <Card
      style={styles.bundleCard}
      onPress={onPress}
      variant="default"
    >
      {bundle.image && (
        <Image
          source={{ uri: bundle.image }}
          style={styles.bundleImage}
          contentFit="cover"
        />
      )}
      <View style={styles.bundleContent}>
        {discount && (
          <Chip size="sm" variant="soft" color="success" style={{ alignSelf: "flex-start", marginBottom: spacing[2] }}>
            {discount}% OFF
          </Chip>
        )}
        <Typography
          type="body-sm"
          weight="semibold"
          numberOfLines={2}
          style={[styles.bundleTitle, { color: semantic.textPrimary }]}
        >
          {bundle.name}
        </Typography>
        {bundle.description && (
          <Typography type="body-sm" color="muted" numberOfLines={2}>
            {bundle.description}
          </Typography>
        )}
        <View style={styles.bundlePricing}>
          <Typography type="body" className="text-accent" weight="bold">
            ₹{bundle.bundlePrice}
          </Typography>
          <Typography
            type="body-sm"
            color="muted"
            style={styles.originalPrice}
          >
            ₹{bundle.originalPrice}
          </Typography>
        </View>
        <View style={styles.itemsCount}>
          <Ionicons name="list-outline" size={14} color={semantic.textMuted} />
          <Typography type="body-sm" color="muted">
            {bundle.items.length} services
          </Typography>
        </View>
      </View>
    </Card>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="layers-outline" size={48} color={semantic.textMuted} />
      </View>
      <Typography type="h6" weight="semibold" style={[styles.emptyTitle, { color: semantic.textSecondary }]}>
        No bundles available
      </Typography>
      <Typography type="body-sm" color="muted" align="center">
        Check back later for exciting bundle offers
      </Typography>
    </View>
  )
}

export default function BundlesScreen() {
  const { bundles } = useListingsStore()

  const handleBundlePress = (bundle: Bundle) => {
    router.push({
      pathname: "/(screens)/bundle/[id]",
      params: { id: bundle.id },
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.backgroundSecondary }} edges={["bottom"]}>
      <FlatList
        data={bundles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BundleCard bundle={item} onPress={() => handleBundlePress(item)} />
        )}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  bundleCard: {
    width: CARD_WIDTH,
    padding: 0,
    overflow: "hidden",
  },
  bundleImage: {
    width: "100%",
    height: 100,
  },
  bundleContent: {
    padding: spacing[3],
  },
  bundleTitle: {
    marginBottom: spacing[1],
  },
  bundlePricing: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[2],
  },
  originalPrice: {
    marginLeft: spacing[2],
    textDecorationLine: "line-through",
  },
  itemsCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[2],
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
})
