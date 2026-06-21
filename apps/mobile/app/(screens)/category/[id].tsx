import React, { useEffect } from "react"
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { Image } from "expo-image"
import { Typography, Card, Chip, Spinner } from "heroui-native"
import { colors, semantic } from "@/src/theme/colors"
import { spacing, borderRadius } from "@/src/theme"
import { useListingsStore } from "@/src/store"
import { Listing } from "@/src/types/api"
import { Ionicons } from "@expo/vector-icons"

function ServiceCard({
  listing,
  onPress,
}: {
  listing: Listing
  onPress: () => void
}) {
  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice

  return (
    <Card style={styles.serviceCard} onPress={onPress} variant="default">
      <View style={styles.cardContent}>
        {listing.image ? (
          <Image
            source={{ uri: listing.image }}
            style={styles.serviceImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="sparkles" size={24} color={semantic.textMuted} />
          </View>
        )}
        <View style={styles.serviceInfo}>
          <Typography
            type="body"
            weight="semibold"
            numberOfLines={2}
            style={{ color: semantic.textPrimary }}
          >
            {listing.name}
          </Typography>
          {listing.shortDescription && (
            <Typography
              type="body-sm"
              numberOfLines={2}
              style={[styles.serviceDesc, { color: semantic.textMuted }]}
            >
              {listing.shortDescription}
            </Typography>
          )}
          <View style={styles.serviceFooter}>
            {startingPrice && (
              <Typography type="body" weight="bold" className="text-accent">
                From ₹{startingPrice}
              </Typography>
            )}
            {listing.duration && (
              <View style={styles.duration}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={semantic.textMuted}
                />
                <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                  {listing.duration} min
                </Typography>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
      </View>
    </Card>
  )
}

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>()
  const { categories, isLoading } = useListingsStore()

  const category = categories.find((c) => c.id === id)
  const listings = category?.listings || []

  const handleServicePress = (listing: Listing) => {
    router.push({
      pathname: "/(screens)/service/[id]",
      params: { id: listing.id },
    })
  }

  if (isLoading) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  return (
    <>
      <Stack.Screen options={{ title: name || "Category" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.backgroundSecondary }} edges={["bottom"]}>
        {category?.description && (
          <View style={styles.header}>
            <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
              {category.description}
            </Typography>
          </View>
        )}

        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard
              listing={item}
              onPress={() => handleServicePress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="sparkles-outline"
                size={48}
                color={semantic.textMuted}
              />
              <Typography
                type="h6"
                weight="semibold"
                style={[styles.emptyTitle, { color: semantic.textSecondary }]}
              >
                No services found
              </Typography>
              <Typography type="body-sm" align="center" style={{ color: semantic.textMuted }}>
                Check back later for new services
              </Typography>
            </View>
          }
        />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    padding: spacing[4],
    backgroundColor: semantic.background,
    borderBottomWidth: 1,
    borderBottomColor: semantic.border,
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  serviceCard: {
    marginBottom: spacing[3],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  serviceDesc: {
    marginTop: spacing[1],
  },
  serviceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[2],
  },
  duration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[10],
  },
  emptyTitle: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
})
