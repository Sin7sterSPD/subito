// main Index file — Revamped Home Layout

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  FlatList,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Card, Spinner, Avatar } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import {
  useAuthStore,
  useUserStore,
  useListingsStore,
  useLocationStore,
  useAppStore,
} from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import { Category, Listing, Bundle } from "../../src/types/api"
import { getListingMockMeta } from "../../src/store/mockData"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  interpolate,
  runOnJS,
} from "react-native-reanimated"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const HORIZONTAL_PADDING = 20

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

// ─── Category Images & Icons ────────────────────────────────────

const categoryImageMap: Record<string, number> = {
  cleaning: require("../../assets/home/main/floor-cleaning.jpg"),
  plumbing: require("../../assets/home/main/plumbing.jpg"),
  electrical: require("../../assets/home/main/ac-repair.jpg"),
  painting: require("../../assets/home/main/painting.jpg"),
  cooking: require("../../assets/home/main/cook-preview.jpg"),
  "ac service": require("../../assets/home/main/ac-repair.jpg"),
  "appliance repair": require("../../assets/home/main/ac-repair.jpg"),
}

const categoryIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: "grid",
  cleaning: "sparkles",
  plumbing: "construct",
  electrical: "flash",
  painting: "color-fill",
  cooking: "restaurant",
  "ac service": "snow",
  "appliance repair": "build",
}

function getCategoryImage(name: string) {
  return categoryImageMap[name.toLowerCase()] || require("../../assets/home/main/vaccum-floor.jpg")
}

function getCategoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  return categoryIconMap[name.toLowerCase()] || "sparkles"
}

// ─── Animated Pressable (scale 0.96 on press) ───────────────────

function AnimatedPressable({
  children,
  onPress,
  style,
  ...rest
}: {
  children: React.ReactNode
  onPress?: () => void
  style?: any
}) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 300 })
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 300 })
        }}
        onPress={onPress}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Stagger Animation Wrapper ──────────────────────────────────

function StaggerItem({
  children,
  index,
  direction = "up",
}: {
  children: React.ReactNode
  index: number
  direction?: "up" | "right"
}) {
  const entering = direction === "right"
    ? FadeInRight.delay(index * 80)
        .duration(400)
        .springify()
        .damping(18)
        .stiffness(200)
    : FadeInDown.delay(index * 100)
        .duration(400)
        .springify()
        .damping(18)
        .stiffness(200)

  return (
    <Animated.View entering={entering}>
      {children}
    </Animated.View>
  )
}

// ─── Header Components ──────────────────────────────────────────

function AddressSelector() {
  const { selectedAddress } = useUserStore()

  return (
    <TouchableOpacity
      className="flex-row items-center"
      onPress={() => router.push("/(screens)/addresses")}
      activeOpacity={0.8}
    >
      <View className="w-10 h-10 rounded-full bg-[#E3EAFD] items-center justify-center">
        <Ionicons name="location" size={20} color="#1D54E2" />
      </View>
      <View className="ml-2.5">
        <Text className="text-[11px] font-inter-regular text-gray-07">
          Deliver to
        </Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-[15px] font-jakarta-bold text-gray-12">
            {selectedAddress?.name || "Home"}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#1F2228" />
        </View>
      </View>
    </TouchableOpacity>
  )
}

function SectionHeader({
  title,
  subtitle,
  showSeeAll = false,
  seeAllText = "See all",
  onSeeAllPress,
}: {
  title: string
  subtitle?: string
  showSeeAll?: boolean
  seeAllText?: string
  onSeeAllPress?: () => void
}) {
  return (
    <View className="mb-3 px-5 mt-6">
      <View className="flex-row items-center justify-between">
        <Text className="font-jakarta-bold text-[19px] text-gray-12">
          {title}
        </Text>
        {showSeeAll && (
          <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
            <Text className="font-inter-semibold text-[13px] text-[#1D54E2]">
              {seeAllText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {subtitle && (
        <Text className="font-inter-regular text-[12px] text-gray-07 mt-1">
          {subtitle}
        </Text>
      )}
    </View>
  )
}

// ─── Category Tile ──────────────────────────────────────────────

const CATEGORY_TILE_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 24) / 3
const CATEGORY_TILE_HEIGHT = 120

function CategoryTile({
  name,
  selected,
  onPress,
  index,
}: {
  name: string
  selected: boolean
  onPress: () => void
  index: number
}) {
  const icon = getCategoryIcon(name)
  const image = name.toLowerCase() !== "all" ? getCategoryImage(name) : null

  return (
    <StaggerItem index={index} direction="right">
      <AnimatedPressable onPress={onPress}>
        <View
          style={[
            styles.categoryTile,
            {
              width: CATEGORY_TILE_WIDTH,
              height: CATEGORY_TILE_HEIGHT,
              borderColor: selected ? "#1D54E2" : "transparent",
              borderWidth: selected ? 2 : 0,
            },
          ]}
        >
          {/* Image background */}
          {image ? (
            <View style={styles.categoryImageWrap}>
              <Image
                source={image}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
              {/* Subtle dark overlay for readability */}
              <View style={styles.categoryImageOverlay} />
            </View>
          ) : (
            <View style={[styles.categoryImageWrap, { backgroundColor: "#F0F4FE" }]} />
          )}

          {/* Icon circle — positioned over the image */}
          <View
            style={[
              styles.categoryIconCircle,
              {
                backgroundColor: selected ? "#1D54E2" : "rgba(255,255,255,0.95)",
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={selected ? "#FFFFFF" : "#1D54E2"}
            />
          </View>

          {/* Label */}
          <Text
            style={[
              styles.categoryLabel,
              { color: selected ? "#1D54E2" : colors.gray[12] },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
      </AnimatedPressable>
    </StaggerItem>
  )
}

// ─── Service Card (Image-first, 170×220) ────────────────────────

const SERVICE_CARD_WIDTH = 170
const SERVICE_CARD_HEIGHT = 220
const SERVICE_IMAGE_HEIGHT = SERVICE_CARD_HEIGHT * 0.7 // 70% image

function ServiceCard({
  listing,
  onPress,
  index,
}: {
  listing: Listing
  onPress: () => void
  index: number
}) {
  const imageSource = getServiceImage(listing.name, listing.image)
  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice

  return (
    <StaggerItem index={index} direction="right">
      <AnimatedPressable onPress={onPress}>
        <View style={[styles.serviceCard, { width: SERVICE_CARD_WIDTH, height: SERVICE_CARD_HEIGHT }]}>
          {/* Image Section — 70% */}
          <View style={{ height: SERVICE_IMAGE_HEIGHT, width: "100%", overflow: "hidden", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Image
              source={imageSource}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            {/* Subtle image outline per skill principle */}
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.08)",
              }}
            />
          </View>

          {/* Info Section — 30% */}
          <View style={styles.serviceCardInfo}>
            <Text
              style={styles.serviceCardTitle}
              numberOfLines={1}
            >
              {listing.name}
            </Text>

            <View style={styles.serviceCardFooter}>
              <Text style={styles.serviceCardPrice}>
                From ₹{startingPrice}
              </Text>
              <View style={styles.serviceCardBookBtn}>
                <Text style={styles.serviceCardBookText}>Book</Text>
                <Ionicons name="arrow-forward" size={12} color="#1D54E2" />
              </View>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </StaggerItem>
  )
}

// ─── Premium Bundle Card ────────────────────────────────────────

const BUNDLE_CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 12
const BUNDLE_CARD_HEIGHT = 200

function BundleCard({
  bundle,
  onPress,
  index,
}: {
  bundle: Bundle
  onPress: () => void
  index: number
}) {
  const discount = bundle.discountPercentage
  const servicesCount = bundle.items?.length || 0
  const isKitchen =
    bundle.name.toLowerCase().includes("cook") ||
    bundle.name.toLowerCase().includes("kitchen")

  const gradientColors = isKitchen
    ? (["transparent", "rgba(255,87,34,0.85)"] as const)
    : (["transparent", "rgba(29,84,226,0.85)"] as const)

  const accentColor = isKitchen ? "#FF5722" : "#1D54E2"

  return (
    <StaggerItem index={index} direction="up">
      <AnimatedPressable onPress={onPress}>
        <View style={[styles.bundleCard, { width: BUNDLE_CARD_WIDTH, height: BUNDLE_CARD_HEIGHT }]}>
          {/* Full-bleed background image */}
          <Image
            source={getBundleImage(bundle.name, bundle.image)}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />

          {/* Gradient overlay for text readability */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.75)"]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Discount badge */}
          {discount && (
            <View style={[styles.bundleDiscountBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.bundleDiscountText}>{discount}% OFF</Text>
            </View>
          )}

          {/* Services count pill */}
          <View style={styles.bundleServicesPill}>
            <Ionicons name="layers" size={12} color="#FFFFFF" />
            <Text style={styles.bundleServicesText}>
              {servicesCount} Services
            </Text>
          </View>

          {/* Bottom content */}
          <View style={styles.bundleContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bundleTitle} numberOfLines={1}>
                {bundle.name}
              </Text>
              {bundle.description && (
                <Text style={styles.bundleDescription} numberOfLines={1}>
                  {bundle.description}
                </Text>
              )}
            </View>

            <View style={styles.bundleFooter}>
              <View>
                <Text style={styles.bundlePriceLabel}>Starting from</Text>
                <Text style={styles.bundlePrice}>
                  ₹{bundle.bundlePrice}
                </Text>
              </View>
              <View style={[styles.bundleBookBtn, { backgroundColor: accentColor }]}>
                <Text style={styles.bundleBookText}>View Bundle</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </StaggerItem>
  )
}

// ─── Marketing Banner ───────────────────────────────────────────

function MarketingBanner({ onBookPress }: { onBookPress: () => void }) {
  return (
    <StaggerItem index={0} direction="up">
      <AnimatedPressable onPress={onBookPress}>
        <View className="relative mx-5 mt-4 overflow-visible">
          <LinearGradient
            colors={["#2a9cff", "#70bdff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 190,
              borderRadius: 28,
              overflow: "hidden",
            }}
            className="relative w-full"
          >
            {/* Background Circles */}
            <View className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-white/10" />
            <View className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/5" />
            <View className="absolute -bottom-10 left-20 h-32 w-32 rounded-full bg-white/5" />

            {/* Text Content */}
            <View className="z-20 flex-1 justify-center pr-[135px] pl-6">
              <Text className="font-jakarta-bold text-[24px] leading-7 text-white">
                Get Your Home{"\n"}Sparkling Clean
              </Text>

              <Text className="font-inter-regular text-caption-l mt-2 leading-4 text-white/95">
                Trusted professionals at your doorstep.
              </Text>

              <TouchableOpacity
                onPress={onBookPress}
                activeOpacity={0.8}
                className="mt-4.5 self-start rounded-2xl bg-white px-5 py-2.5 shadow-sm"
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
                width: 145,
                height: 205,
                zIndex: 30,
              }}
            />
          </LinearGradient>
        </View>
      </AnimatedPressable>
    </StaggerItem>
  )
}

// ─── Why Choose Us ──────────────────────────────────────────────

const WHY_CHOOSE_US = [
  {
    title: "Verified Experts",
    subtitle: "Background checked professionals",
    icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
    bg: "#F0F4FE",
    iconColor: "#1D54E2",
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

function WhyChooseUsCard({
  item,
  index,
}: {
  item: (typeof WHY_CHOOSE_US)[number]
  index: number
}) {
  const cardWidth = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 12) / 2

  return (
    <StaggerItem index={index} direction="up">
      <View
        style={[
          styles.whyChooseCard,
          { backgroundColor: item.bg, width: cardWidth },
        ]}
      >
        <View style={styles.whyChooseIconWrap}>
          <Ionicons name={item.icon} size={18} color={item.iconColor} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.whyChooseTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.whyChooseSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        </View>
      </View>
    </StaggerItem>
  )
}

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

  // Category names for the tile selector
  const categoryNames = useMemo(() => {
    const names = ["All"]
    for (const cat of categories) {
      if (!names.includes(cat.name)) names.push(cat.name)
    }
    // Ensure these appear even if not from API
    for (const extra of ["Cleaning", "Plumbing", "Electrical", "Painting", "Cooking", "AC Service"]) {
      if (!names.find((n) => n.toLowerCase() === extra.toLowerCase())) {
        names.push(extra)
      }
    }
    return names
  }, [categories])

  // Bundles to display
  const displayBundles = useMemo(() => {
    const homeClean = bundles.find(
      (b) => b.id === "bundle-home-cleaning" || b.slug === "home-cleaning-bundle"
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F7F8" }}
      edges={["top"]}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(300)}>
        <View className="bg-white px-5 pt-3 pb-2 flex-row items-center justify-between">
          <AddressSelector />
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white items-center justify-center"
              style={styles.headerIconBtn}
              onPress={() => router.push("/(screens)/notifications")}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color="#1F2228" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Avatar size="md" className="border-gray-100 rounded-full border">
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
        <View className="px-5 pb-4 pt-2 bg-white">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(screens)/search")}
            className="h-12 rounded-full px-4 flex-row items-center bg-white"
            style={styles.searchBar}
          >
            <Ionicons name="search" size={18} color="#7E869A" />
            <Text className="text-gray-05 font-inter-regular text-[14px] ml-2">
              Search for services...
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Scrollable Content ──────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1D54E2"]}
          />
        }
      >
        {/* ── Marketing Banner ─────────────────────────────── */}
        <MarketingBanner onBookPress={() => router.push("/(screens)/search")} />

        {/* ── Categories (horizontal scroll, image tiles) ─── */}
        <SectionHeader title="Categories" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HORIZONTAL_PADDING, gap: 12 }}
        >
          {categoryNames.map((name, index) => (
            <CategoryTile
              key={name}
              name={name}
              selected={selectedCategory === name}
              onPress={() => setSelectedCategory(name)}
              index={index}
            />
          ))}
        </ScrollView>

        {/* ── Popular Services (horizontal scroll, image-first) ── */}
        <SectionHeader
          title="Popular Services"
          subtitle="Book top-rated services near you"
          showSeeAll
          seeAllText="See all"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: HORIZONTAL_PADDING,
            gap: 14,
          }}
        >
          {filteredListings.length > 0 ? (
            filteredListings.map((listing, index) => (
              <ServiceCard
                key={listing.id}
                listing={listing}
                onPress={() => handleServicePress(listing)}
                index={index}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles-outline" size={40} color="#9ea2ad" />
              <Text style={styles.emptyStateText}>
                No services available
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Best Value Bundles (premium full-width cards) ─── */}
        {displayBundles.length > 0 && (
          <>
            <SectionHeader
              title="Best Value Bundles"
              subtitle="Save more with curated packages"
              showSeeAll
              seeAllText="All bundles"
            />
            <View style={{ paddingHorizontal: HORIZONTAL_PADDING, gap: 16 }}>
              {displayBundles.map((bundle, index) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onPress={() => handleBundlePress(bundle)}
                  index={index}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Why Choose Us (2×2 grid) ────────────────────── */}
        <SectionHeader title="Why Choose Us" />
        <View
          style={{
            paddingHorizontal: HORIZONTAL_PADDING,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {WHY_CHOOSE_US.map((item, idx) => (
            <WhyChooseUsCard key={idx} item={item} index={idx} />
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
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
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  // Search
  searchBar: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  // Category Tiles
  categoryTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    // Layered shadow (shadow-as-border principle)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryImageWrap: {
    width: "100%",
    height: 64,
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  categoryImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  // Concentric radius: outer = 16, padding ≈ 0, icon circle = 14
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -17,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryLabel: {
    fontFamily: "JakartaBold",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 4,
  },

  // Service Card
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    // Shadow-as-border (no solid border)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  serviceCardInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "space-between",
  },
  serviceCardTitle: {
    fontFamily: "JakartaBold",
    fontSize: 14,
    color: "#1F2228",
  },
  serviceCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceCardPrice: {
    fontFamily: "InterSemiBold",
    fontSize: 12,
    color: "#1D54E2",
    // Tabular nums for price stability
    fontVariant: ["tabular-nums"],
  },
  serviceCardBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  serviceCardBookText: {
    fontFamily: "InterSemiBold",
    fontSize: 12,
    color: "#1D54E2",
  },

  // Bundle Card
  bundleCard: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    // Shadow-as-border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bundleDiscountBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bundleDiscountText: {
    fontFamily: "InterBold",
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  bundleServicesPill: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bundleServicesText: {
    fontFamily: "InterSemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  bundleContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  bundleTitle: {
    fontFamily: "JakartaBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  bundleDescription: {
    fontFamily: "InterRegular",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  bundleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  bundlePriceLabel: {
    fontFamily: "InterRegular",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  bundlePrice: {
    fontFamily: "JakartaBold",
    fontSize: 20,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  bundleBookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bundleBookText: {
    fontFamily: "InterBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Why Choose Us
  whyChooseCard: {
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    // Shadow-as-border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  whyChooseIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    // Shadow for icon container
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  whyChooseTitle: {
    fontFamily: "JakartaBold",
    fontSize: 12,
    color: "#1F2228",
  },
  whyChooseSubtitle: {
    fontFamily: "InterRegular",
    fontSize: 10,
    color: "#7E869A",
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    // Shadow-as-border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateText: {
    fontFamily: "InterMedium",
    fontSize: 14,
    color: "#7E869A",
    marginTop: 12,
  },
})
