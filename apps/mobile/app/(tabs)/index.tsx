// main Index file — Premium Marketplace Home

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Spinner, Avatar } from "heroui-native"
import {
  useAuthStore,
  useUserStore,
  useListingsStore,
  useLocationStore,
  useAppStore,
} from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import { Listing, Bundle } from "../../src/types/api"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const SECTION_PADDING = 24

// ─── Image Lookups ──────────────────────────────────────────────

const serviceImages: Record<string, number> = {
  "floor.png": require("../../assets/home/main/floor-cleaning.jpg"),
  "bathroom.png": require("../../assets/home/main/vaccum-floor.jpg"),
  "cupboard-cleaning.png": require("../../assets/home/preview/cupboard-cleaning.png"),
  "utensils.png": require("../../assets/home/main/cook-preview.jpg"),
  "roomclieaning.png": require("../../assets/home/main/vaccum-floor.jpg"),
  "plumbing.jpg": require("../../assets/home/main/plumbing.jpg"),
  "toilet-clean.jpg": require("../../assets/home/main/vaccum-floor.jpg"),
  "ac-repair.jpg": require("../../assets/home/main/ac-repair.jpg"),
  "painting.jpg": require("../../assets/home/main/painting.jpg"),
  "floor cleaning": require("../../assets/home/main/floor-cleaning.jpg"),
  "bathroom cleaning": require("../../assets/home/main/vaccum-floor.jpg"),
  cupboard: require("../../assets/home/preview/cupboard-cleaning.png"),
  utensils: require("../../assets/home/main/cook-preview.jpg"),
  "room cleaning": require("../../assets/home/main/vaccum-floor.jpg"),
  "toilet cleaning": require("../../assets/home/main/vaccum-floor.jpg"),
  "windows cleaning": require("../../assets/home/main/vaccum-floor.jpg"),
  "clothes iron": require("../../assets/home/main/vaccum-floor.jpg"),
  "dish washer": require("../../assets/home/main/cook-preview.jpg"),
  "after party cleaning": require("../../assets/home/main/bundle-clean.png"),
  plumbing: require("../../assets/home/main/plumbing.jpg"),
  painting: require("../../assets/home/main/painting.jpg"),
  repair: require("../../assets/home/main/ac-repair.jpg"),
  ac: require("../../assets/home/main/ac-repair.jpg"),
  default: require("../../assets/home/main/vaccum-floor.jpg"),
}

function getServiceImage(name: string, image?: string) {
  if (image) {
    const filename = image.substring(image.lastIndexOf("/") + 1)
    if (serviceImages[filename]) return serviceImages[filename]
    if (serviceImages[image]) return serviceImages[image]
    if (image.startsWith("http")) return { uri: image }
  }
  const lowercaseName = name.toLowerCase()
  for (const key of Object.keys(serviceImages)) {
    if (lowercaseName.includes(key)) return serviceImages[key]
  }
  return serviceImages.default
}

const bundleImages: Record<string, number> = {
  "bundle-clean.png": require("../../assets/home/main/bundle-clean.png"),
  "bundle-cook.png": require("../../assets/home/main/bundle-cook.png"),
}

function getBundleImage(name: string, image?: string) {
  if (image && image.startsWith("http")) return { uri: image }
  if (image && bundleImages[image]) return bundleImages[image]
  const lowercaseName = name.toLowerCase()
  if (lowercaseName.includes("cook") || lowercaseName.includes("kitchen")) {
    return require("../../assets/home/main/bundle-cook.png")
  }
  return require("../../assets/home/main/bundle-clean.png")
}

// Category chip images
const categoryChipImages: Record<string, number> = {
  cleaning: require("../../assets/home/main/floor-cleaning.jpg"),
  plumbing: require("../../assets/home/main/plumbing.jpg"),
  electrical: require("../../assets/home/main/ac-repair.jpg"),
  painting: require("../../assets/home/main/painting.jpg"),
  cooking: require("../../assets/home/main/cook-preview.jpg"),
  "ac service": require("../../assets/home/main/ac-repair.jpg"),
  "appliance repair": require("../../assets/home/main/ac-repair.jpg"),
}

// ─── Address Selector ───────────────────────────────────────────

function AddressSelector() {
  const { selectedAddress } = useUserStore()

  return (
    <TouchableOpacity
      className="flex-row items-center"
      onPress={() => router.push("/(screens)/addresses")}
      activeOpacity={0.7}
    >
      <View className="bg-blue-01 h-9 w-9 items-center justify-center rounded-full">
        <Ionicons name="location" size={18} color="#2a9cff" />
      </View>
      <View className="ml-2.5">
        <Text className="text-caption-s font-inter-regular text-gray-07">
          Deliver to
        </Text>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-caption-l font-jakarta-bold text-gray-12">
            {selectedAddress?.name || "Home"}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#1F2228" />
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Section Header ─────────────────────────────────────────────

function SectionHeader({
  title,
  showSeeAll = false,
  seeAllText = "See all",
  onSeeAllPress,
}: {
  title: string
  showSeeAll?: boolean
  seeAllText?: string
  onSeeAllPress?: () => void
}) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        paddingHorizontal: SECTION_PADDING,
        marginBottom: 14,
        marginTop: 28,
      }}
    >
      <Text className="font-jakarta-bold text-gray-12" style={{ fontSize: 20 }}>
        {title}
      </Text>
      {showSeeAll && (
        <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
          <Text className="font-inter-semibold text-caption-l text-blue-03">
            {seeAllText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Marketing Banner ───────────────────────────────────────────

function MarketingBanner({ onBookPress }: { onBookPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.95} onPress={onBookPress}>
      <View style={{ marginHorizontal: SECTION_PADDING, marginTop: 16 }}>
        <LinearGradient
          colors={["#2a9cff", "#70bdff"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 180,
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* Background Circles */}
          <View className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-white/10" />
          <View className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/5" />
          <View className="absolute -bottom-10 left-20 h-32 w-32 rounded-full bg-white/5" />

          {/* Text Content */}
          <View
            className="z-20 flex-1 justify-center pl-6"
            style={{ paddingRight: 140 }}
          >
            <Text
              className="font-jakarta-bold text-white"
              style={{ fontSize: 22, lineHeight: 28 }}
            >
              Get Your Home{"\n"}Sparkling Clean
            </Text>
            <Text className="font-inter-regular text-caption-l mt-1.5 text-white/90">
              Trusted professionals at your doorstep.
            </Text>
            <TouchableOpacity
              onPress={onBookPress}
              activeOpacity={0.8}
              className="mt-4 self-start rounded-2xl bg-white px-5 py-2.5"
              style={styles.bannerBtn}
            >
              <Text className="font-inter-semibold text-blue-03 text-caption-l">
                Book Service
              </Text>
            </TouchableOpacity>
          </View>
          <Image
            source={require("../../assets/home/girl-clean.png")}
            contentFit="contain"
            style={{
              position: "absolute",
              bottom: -10,
              right: -10,
              width: 140,
              height: 195,
              zIndex: 30,
            }}
          />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  )
}

// ─── Category Chip ──────────────────────────────────────────────

function CategoryChip({
  name,
  selected,
  onPress,
}: {
  name: string
  selected: boolean
  onPress: () => void
}) {
  const chipImage = categoryChipImages[name.toLowerCase()]

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={
        selected
          ? "bg-blue-03 flex-row items-center rounded-full"
          : "border-gray-02 flex-row items-center rounded-full border bg-white"
      }
      style={[
        styles.categoryChip,
        !chipImage && styles.categoryChipNoImage,
        !selected && styles.categoryChipShadow,
      ]}
    >
      {chipImage && (
        <Image
          source={chipImage}
          style={styles.categoryChipImage}
          contentFit="cover"
        />
      )}
      <Text
        className={
          selected
            ? "font-inter-semibold text-caption-l text-white"
            : "font-inter-medium text-caption-l text-gray-12"
        }
      >
        {name}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Service Card (Image-first, 220px wide) ─────────────────────

const SERVICE_CARD_WIDTH = 160

function ServiceCard({
  listing,
  onPress,
}: {
  listing: Listing
  onPress: () => void
}) {
  const imageSource = getServiceImage(listing.name, listing.image)
  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.serviceCard, { width: SERVICE_CARD_WIDTH }]}>
        {/* Image — top corners only rounded */}
        <View style={styles.serviceImageWrap}>
          <Image
            source={imageSource}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        </View>

        {/* Content */}
        <View style={styles.serviceCardBody}>
          <Text
            className="font-jakarta-semibold text-gray-12"
            style={styles.serviceCardTitle}
            numberOfLines={1}
          >
            {listing.name}
          </Text>

          <Text
            className="font-inter-regular text-gray-07"
            style={styles.serviceCardDesc}
            numberOfLines={2}
          >
            {listing.shortDescription ||
              "Professional service at your convenience"}
          </Text>

          <View style={styles.serviceCardBottom}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Starts at</Text>
              <Text
                className="font-jakarta-bold text-gray-12"
                style={styles.priceValue}
              >
                ₹{startingPrice}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.bookBtn}
            >
              <Text style={styles.bookBtnText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Bundle Card (Horizontal) ───────────────────────────────────

function BundleCard({
  bundle,
  onPress,
}: {
  bundle: Bundle
  onPress: () => void
}) {
  const servicesCount = bundle.items?.length || 0
  const discount = bundle.discountPercentage
  const isKitchen =
    bundle.name.toLowerCase().includes("cook") ||
    bundle.name.toLowerCase().includes("kitchen")
  const accentColor = isKitchen ? "#FF5722" : "#2a9cff"

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={styles.bundleCard}>
        {/* Collage image — 35% */}
        <View style={styles.bundleImageWrap}>
          <Image
            source={getBundleImage(bundle.name, bundle.image)}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          {discount && (
            <View
              className="absolute top-2 left-2 rounded px-1.5 py-0.5"
              style={{ backgroundColor: accentColor }}
            >
              <Text
                className="font-inter-bold text-white"
                style={{ fontSize: 9 }}
              >
                {discount}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Content — 65% */}
        <View style={styles.bundleContent}>
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <View>
              <Text
                className="font-jakarta-bold text-gray-12"
                style={styles.bundleTitle}
                numberOfLines={1}
              >
                {bundle.name}
              </Text>

              {bundle.description && (
                <Text
                  className="font-inter-regular text-gray-07"
                  style={styles.bundleDesc}
                  numberOfLines={2}
                >
                  {bundle.description}
                </Text>
              )}
            </View>

            <View style={styles.bundleMetaRow}>
              <Ionicons name="layers-outline" size={13} color="#7E869A" />
              <Text
                className="font-inter-medium text-gray-07"
                style={styles.bundleMetaText}
              >
                {servicesCount} Services
              </Text>
            </View>

            <View style={styles.bundleFooter}>
              <Text
                className="font-jakarta-bold text-gray-12"
                style={styles.bundlePriceText}
              >
                From ₹{bundle.bundlePrice}
              </Text>

              <View style={styles.bundleAction}>
                <Text style={styles.bundleActionText}>View Bundle</Text>
                <Ionicons name="arrow-forward" size={12} color="#2a9cff" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Why Choose Us ──────────────────────────────────────────────

const WHY_CHOOSE_US = [
  {
    title: "Verified Experts",
    subtitle: "Background checked professionals",
    icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
    bg: "#F0F4FE",
    iconColor: "#2a9cff",
  },
  {
    title: "On-time Service",
    subtitle: "Punctual & reliable service",
    icon: "time" as keyof typeof Ionicons.glyphMap,
    bg: "#EDFDF4",
    iconColor: "#26BD6C",
  },
  {
    title: "Secure Payments",
    subtitle: "Safe & hassle-free payments",
    icon: "wallet" as keyof typeof Ionicons.glyphMap,
    bg: "#FEF4EC",
    iconColor: "#f48e2f",
  },
  {
    title: "Satisfaction Guaranteed",
    subtitle: "100% quality assurance",
    icon: "ribbon" as keyof typeof Ionicons.glyphMap,
    bg: "#FDF2F1",
    iconColor: "#e6483d",
  },
]

// ─── Main Home Screen ───────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuthStore()
  const { selectedAddress, fetchAddresses } = useUserStore()
  const { categories, bundles, fetchListings, isLoading } = useListingsStore()
  const { currentLocation, getCurrentLocation, checkServiceability } =
    useLocationStore()
  const { fetchBestCoupon } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")

  const loadData = useCallback(async () => {
    let lat = selectedAddress?.latitude || currentLocation?.latitude
    let lng = selectedAddress?.longitude || currentLocation?.longitude

    if (!lat || !lng) {
      const location = await getCurrentLocation()
      if (location) {
        lat = location.latitude
        lng = location.longitude
      }
    }

    await Promise.all([
      fetchListings(lat, lng),
      fetchAddresses(lat, lng),
      lat && lng ? checkServiceability(lat, lng) : null,
      lat && lng ? fetchBestCoupon(lat, lng) : null,
    ])
  }, [
    selectedAddress,
    currentLocation,
    fetchListings,
    fetchAddresses,
    getCurrentLocation,
    checkServiceability,
    fetchBestCoupon,
  ])

  useEffect(() => {
    loadData()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const handleServicePress = (listing: Listing) => {
    router.push({
      pathname: "/(screens)/service/[id]",
      params: { id: listing.id },
    })
  }

  const handleBundlePress = (bundle: Bundle) => {
    router.push({
      pathname: "/(screens)/bundle/[id]",
      params: { id: bundle.id },
    })
  }

  // Flatten all listings, deduplicated
  const allListings = useMemo(() => {
    const list: Listing[] = []
    const seen = new Set<string>()
    for (const cat of categories) {
      if (cat.listings) {
        for (const listing of cat.listings) {
          if (!seen.has(listing.id)) {
            seen.add(listing.id)
            list.push(listing)
          }
        }
      }
    }
    return list
  }, [categories])

  // Filtered listings by selected category
  const filteredListings = useMemo(() => {
    if (selectedCategory === "All") return allListings
    const cat = categories.find(
      (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
    )
    return cat ? cat.listings || [] : []
  }, [selectedCategory, categories, allListings])

  // Category names for the chip selector
  const categoryNames = useMemo(() => {
    const names = ["All"]
    for (const cat of categories) {
      if (!names.includes(cat.name)) names.push(cat.name)
    }
    for (const extra of [
      "Cleaning",
      "Plumbing",
      "Electrical",
      "Painting",
      "Cooking",
      "AC Service",
    ]) {
      if (!names.find((n) => n.toLowerCase() === extra.toLowerCase())) {
        names.push(extra)
      }
    }
    return names
  }, [categories])

  // Bundles to display
  const displayBundles = useMemo(() => {
    const homeClean = bundles.find(
      (b) =>
        b.id === "bundle-home-cleaning" || b.slug === "home-cleaning-bundle"
    )
    const cooking = bundles.find(
      (b) => b.id === "bundle-cooking" || b.slug === "cooking-bundle"
    )
    const filtered = [homeClean, cooking].filter((b): b is Bundle => !!b)
    return filtered.length > 0 ? filtered : bundles.slice(0, 2)
  }, [bundles])

  if (isLoading && categories.length === 0) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  const whyCardWidth = (SCREEN_WIDTH - SECTION_PADDING * 2 - 12) / 2

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      edges={["top"]}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View
        className="flex-row items-center justify-between bg-white"
        style={{
          paddingHorizontal: SECTION_PADDING,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <AddressSelector />
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            style={styles.headerIconBtn}
            onPress={() => router.push("/(screens)/notifications")}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="#1F2228" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            <Avatar size="md" className="border-gray-02 rounded-full border">
              {user?.profileImage ? (
                <Avatar.Image source={{ uri: user.profileImage }} />
              ) : null}
              <Avatar.Fallback>
                {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
              </Avatar.Fallback>
            </Avatar>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar ────────────────────────────────────── */}
      <View
        className="bg-white"
        style={{
          paddingHorizontal: SECTION_PADDING,
          paddingBottom: 14,
          paddingTop: 6,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(screens)/search")}
          className="bg-gray-01 border-gray-02 h-11 flex-row items-center rounded-xl border"
          style={{ paddingHorizontal: 14 }}
        >
          <Ionicons name="search" size={18} color="#9EA2AD" />
          <Text className="text-gray-06 font-inter-regular text-caption-l ml-2.5">
            Search for services...
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable Content ──────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2a9cff"]}
          />
        }
      >
        {/* ── Marketing Banner ──────────────────────────────── */}
        <MarketingBanner onBookPress={() => router.push("/(screens)/search")} />

        {/* ── Categories (horizontal pill chips) ────────────── */}
        <View style={{ marginTop: 20, marginBottom: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SECTION_PADDING,
              gap: 10,
            }}
          >
            {categoryNames.map((name) => (
              <CategoryChip
                key={name}
                name={name}
                selected={selectedCategory === name}
                onPress={() => setSelectedCategory(name)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Popular Services ──────────────────────────────── */}
        <SectionHeader
          title="Popular Services"
          showSeeAll
          seeAllText="See all"
        />
        {filteredListings.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SECTION_PADDING,
              gap: 12,
            }}
          >
            {filteredListings.map((listing) => (
              <ServiceCard
                key={listing.id}
                listing={listing}
                onPress={() => handleServicePress(listing)}
              />
            ))}
          </ScrollView>
        ) : (
          <View
            style={[styles.emptyState, { marginHorizontal: SECTION_PADDING }]}
          >
            <Ionicons name="sparkles-outline" size={36} color="#9ea2ad" />
            <Text className="font-inter-medium text-caption-l text-gray-07 mt-3">
              No services available
            </Text>
          </View>
        )}

        {/* ── Best Value Bundles ─────────────────────────────── */}
        {displayBundles.length > 0 && (
          <>
            <SectionHeader
              title="Best Value Bundles"
              showSeeAll
              seeAllText="All bundles"
            />
            <View style={{ paddingHorizontal: SECTION_PADDING, gap: 12 }}>
              {displayBundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onPress={() => handleBundlePress(bundle)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Why Choose Us ─────────────────────────────────── */}
        <SectionHeader title="Why Choose Us" />
        <View
          style={{
            paddingHorizontal: SECTION_PADDING,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {WHY_CHOOSE_US.map((item, idx) => (
            <View
              key={idx}
              className="flex-row items-center"
              style={[
                styles.whyChooseCard,
                { backgroundColor: item.bg, width: whyCardWidth },
              ]}
            >
              <View style={styles.whyChooseIconWrap}>
                <Ionicons name={item.icon} size={17} color={item.iconColor} />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text
                  className="font-jakarta-bold text-gray-12"
                  style={{ fontSize: 12 }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  className="font-inter-regular text-gray-07"
                  style={{ fontSize: 10, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {item.subtitle}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  headerIconBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Banner button
  bannerBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Category Chips
  categoryChip: {
    height: 40,
    paddingLeft: 6,
    paddingRight: 14,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  categoryChipNoImage: {
    paddingLeft: 14,
  },
  categoryChipShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryChipImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  // Service Card
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F2F4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  serviceImageWrap: {
    height: 100,
    width: "100%",
    overflow: "hidden",
  },
  serviceCardBody: {
    padding: 10,
  },
  serviceCardTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1F2228",
  },
  serviceCardDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
    color: "#7E869A",
    marginTop: 2,
  },
  serviceCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: "column",
  },
  priceLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: "#7E869A",
  },
  priceValue: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1F2228",
  },
  bookBtn: {
    backgroundColor: "#EAF4FF",
    borderColor: "#2a9cff",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  bookBtnText: {
    color: "#2a9cff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // Bundle Card
  bundleCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F2F4",
    height: 135,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  bundleImageWrap: {
    width: "35%",
    height: "100%",
    overflow: "hidden",
  },
  bundleContent: {
    flex: 1,
    padding: 12,
  },
  bundleTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1F2228",
    marginBottom: 2,
  },
  bundleDesc: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Inter_400Regular",
    color: "#7E869A",
    marginBottom: 6,
  },
  bundleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  bundleMetaText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#7E869A",
  },
  bundleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  bundlePriceText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1F2228",
  },
  bundleAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bundleActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#2a9cff",
  },

  // Why Choose Us
  whyChooseCard: {
    padding: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  whyChooseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
})
