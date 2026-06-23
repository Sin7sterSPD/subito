import React, { useState } from "react"
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { Image } from "expo-image"
import { Typography, Card, Chip, Button, Separator, Avatar } from "heroui-native"
import { colors, semantic } from "@/src/theme/colors"
import { spacing, borderRadius } from "@/src/theme/spacing"
import { useListingsStore, useCartStore } from "@/src/store"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

const bundleImages: Record<string, number> = {
  "bundle-clean.png": require("../../../assets/home/main/bundle-clean.png"),
  "bundle-cook.png": require("../../../assets/home/main/bundle-cook.png"),
}

function getBundleImage(name: string, image?: string) {
  if (image && image.startsWith("http")) {
    return { uri: image }
  }
  if (image && bundleImages[image]) {
    return bundleImages[image]
  }
  const lowercaseName = name.toLowerCase()
  if (lowercaseName.includes("cook") || lowercaseName.includes("kitchen")) return require("../../../assets/home/main/bundle-cook.png")
  return require("../../../assets/home/main/bundle-clean.png")
}

// Reusable Sub-components
function BundleHero({ imageSource }: { imageSource: any }) {
  return (
    <View style={styles.heroContainer}>
      <Image
        source={imageSource}
        style={styles.heroImage}
        contentFit="cover"
      />
    </View>
  )
}

function StickyBookingBar({
  price,
  onBook,
  isLoading,
}: {
  price: string
  onBook: () => void
  isLoading: boolean
}) {
  return (
    <View style={styles.stickyFooter}>
      <View>
        <Typography className="text-caption-l text-gray-07 font-inter-regular">
          Total Price
        </Typography>
        <Typography className="text-gray-12 font-jakarta-bold text-2xl mt-0.5">
          ₹{price}
        </Typography>
      </View>
      <TouchableOpacity
        onPress={onBook}
        disabled={isLoading}
        activeOpacity={0.9}
        className="bg-blue-03 px-8 h-[48px] rounded-xl shadow-md justify-center items-center flex-row"
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" className="mr-2" />
        ) : null}
        <Typography className="text-white font-jakarta-bold text-body-s">
          {isLoading ? "Booking..." : "Book Now"}
        </Typography>
      </TouchableOpacity>
    </View>
  )
}

export default function BundleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bundles } = useListingsStore()
  const { addItem } = useCartStore()
  const [isBooking, setIsBooking] = useState(false)

  const bundle = bundles.find((b) => b.id === id)

  const handleBookNow = async () => {
    if (!bundle) return
    setIsBooking(true)
    try {
      for (const item of bundle.items) {
        const ok = await addItem(item.catalogId, item.quantity, {
          bundleId: bundle.id,
        })
        if (!ok) {
          setIsBooking(false)
          return
        }
      }
      router.push("/(tabs)/cart")
    } catch (e) {
      console.error(e)
    } finally {
      setIsBooking(false)
    }
  }

  if (!bundle) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <View style={styles.notFound}>
          <Typography type="h6" style={{ color: semantic.textSecondary }}>
            Bundle not found
          </Typography>
        </View>
      </SafeAreaView>
    )
  }

  const savings = parseFloat(bundle.originalPrice) - parseFloat(bundle.bundlePrice)

  return (
    <>
      <Stack.Screen options={{ title: bundle.name }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["bottom"]}>
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* 1. Hero Image Section */}
            <BundleHero imageSource={getBundleImage(bundle.name, bundle.image)} />

            {/* Content Body */}
            <View className="px-4 gap-6 mt-4">
              {/* 2. Bundle Information Card */}
              <Card variant="default" className="bg-white border-0 shadow-sm p-5 rounded-2xl">
                <View className="flex-row justify-between items-start">
                  <Typography className="font-jakarta-bold text-[28px] text-gray-12 leading-tight flex-1 mr-2">
                    {bundle.name}
                  </Typography>
                  {bundle.discountPercentage && (
                    <Chip color="success" variant="soft" className="mt-1">
                      <Chip.Label className="text-caption-m font-inter-semibold">{bundle.discountPercentage}% OFF</Chip.Label>
                    </Chip>
                  )}
                </View>
                <View className="flex-row items-baseline mt-3">
                  <Typography className="text-blue-03 font-jakarta-bold text-2xl">
                    ₹{bundle.bundlePrice}
                  </Typography>
                  <Typography className="text-gray-06 line-through font-inter-regular text-body-s ml-2">
                    ₹{bundle.originalPrice}
                  </Typography>
                </View>
                <Typography className="text-green-08 font-inter-semibold text-caption-l mt-1">
                  Save ₹{savings.toFixed(0)}
                </Typography>
                {bundle.description && (
                  <Typography className="text-gray-08 font-inter-regular text-body-s mt-3 leading-relaxed">
                    {bundle.description}
                  </Typography>
                )}
              </Card>

              {/* 3. Trust Badges */}
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  <Chip size="sm" variant="soft" color="default" className="bg-gray-01 border border-gray-02">
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">✓ Verified Professionals</Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="soft" color="default" className="bg-gray-01 border border-gray-02">
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">✓ Bundle Savings Applied</Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="soft" color="default" className="bg-gray-01 border border-gray-02">
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">⭐ 4.9 Rating</Chip.Label>
                  </Chip>
                  <Chip size="sm" variant="soft" color="default" className="bg-gray-01 border border-gray-02">
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">✓ Instant Booking</Chip.Label>
                  </Chip>
                </ScrollView>
              </View>

              {/* 4. Included Services Section */}
              <View className="gap-3">
                <Typography className="font-jakarta-bold text-[20px] text-gray-12">
                  Included Services ({bundle.items.length})
                </Typography>
                <Card variant="default" className="bg-white border-0 shadow-sm p-0 rounded-2xl">
                  {bundle.items.map((item, idx) => (
                    <React.Fragment key={idx}>
                      <View className="flex-row items-center p-4">
                        <View className="flex-1">
                          <Typography className="font-inter-semibold text-body-s text-gray-12">
                            {item.catalog?.name || "Service"}
                          </Typography>
                          {item.catalog?.description && (
                            <Typography numberOfLines={1} className="font-inter-regular text-caption-m text-gray-07 mt-0.5">
                              {item.catalog.description}
                            </Typography>
                          )}
                        </View>
                        <View className="bg-gray-01 border border-gray-02 h-8 w-12 rounded-lg items-center justify-center ml-3">
                          <Typography className="font-inter-semibold text-caption-l text-gray-12">
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

              {/* 5. Why Choose This Bundle? (Benefits Section) */}
              <View className="gap-3">
                <Typography className="font-jakarta-bold text-[20px] text-gray-12">
                  Why Choose This Bundle?
                </Typography>
                <View className="gap-3">
                  <View className="flex-row items-start">
                    <View className="h-9 w-9 rounded-full bg-green-01 items-center justify-center mt-0.5">
                      <Ionicons name="wallet" size={18} color="#26BD6C" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Typography className="font-inter-semibold text-body-s text-gray-12">
                        Save ₹{savings.toFixed(0)}
                      </Typography>
                      <Typography className="font-inter-regular text-caption-m text-gray-07 mt-0.5">
                        Guaranteed discount compared to individual service rates.
                      </Typography>
                    </View>
                  </View>

                  <View className="flex-row items-start">
                    <View className="h-9 w-9 rounded-full bg-blue-01 items-center justify-center mt-0.5">
                      <Ionicons name="time" size={18} color="#2a9cff" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Typography className="font-inter-semibold text-body-s text-gray-12">
                        Convenient Scheduling
                      </Typography>
                      <Typography className="font-inter-regular text-caption-m text-gray-07 mt-0.5">
                        One appointment, one expert team, zero coordinating hassle.
                      </Typography>
                    </View>
                  </View>

                  <View className="flex-row items-start">
                    <View className="h-9 w-9 rounded-full bg-orange-01 items-center justify-center mt-0.5">
                      <Ionicons name="star" size={18} color="#F48E2F" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Typography className="font-inter-semibold text-body-s text-gray-12">
                        Premium Quality
                      </Typography>
                      <Typography className="font-inter-regular text-caption-m text-gray-07 mt-0.5">
                        Carefully combined checklist covers every essential service.
                      </Typography>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* 6. Sticky Bottom Booking Bar */}
          <StickyBookingBar
            price={bundle.bundlePrice}
            onBook={handleBookNow}
            isLoading={isBooking}
          />
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 120,
    backgroundColor: "white",
  },
  heroContainer: {
    width: "100%",
    height: 280,
    overflow: "hidden",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.gray[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[5], // covers bottom safe area padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
})
