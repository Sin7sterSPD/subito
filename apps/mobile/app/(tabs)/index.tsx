// Home — compact 2-col grid, single page background, brand-blue chips.
// Data + navigation logic preserved. UI-only rework.

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import {
  Spinner,
  Avatar,
  Card,
  Chip,
  Typography,
  PressableFeedback,
} from "heroui-native"
import {
  useAuthStore,
  useUserStore,
  useListingsStore,
  useLocationStore,
  useAppStore,
} from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import { Listing, Bundle } from "../../src/types/api"

// ─── Layout tokens ────────────────────────────────────────────────
// One page background everywhere (gray-01). Cards stay white on top.
// Compact dense grid: edge 16, gap 8, image 100, banner 192.

const SECTION_PADDING = 16
const GRID_GAP = 8
const PAGE_BG = "#F7F7F8"
const BRAND_BLUE = "#2a9cff"
const CARD_IMAGE_HEIGHT = 100
const BANNER_HEIGHT = 192

// ─── Image Lookups (unchanged) ────────────────────────────────────

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

// ─── Address Selector ─────────────────────────────────────────────

function AddressSelector() {
  const { selectedAddress } = useUserStore()

  return (
    <TouchableOpacity
      className="flex-row items-center"
      onPress={() => router.push("/(screens)/addresses")}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Deliver to ${selectedAddress?.name || "Home"}. Change address`}
      hitSlop={8}
      style={{ minHeight: 44 }}
    >
      <View className="bg-blue-01 h-9 w-9 items-center justify-center rounded-full">
        <Ionicons name="location" size={18} color={BRAND_BLUE} />
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

// ─── Section Header ───────────────────────────────────────────────

function SectionHeader({
  title,
  showSeeAll = false,
  seeAllText = "See all",
  onSeeAllPress,
  accessibilityLabel,
}: {
  title: string
  showSeeAll?: boolean
  seeAllText?: string
  onSeeAllPress?: () => void
  accessibilityLabel?: string
}) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{
        paddingHorizontal: SECTION_PADDING,
        marginBottom: 10,
        marginTop: 20,
      }}
    >
      <Typography
        type="body"
        weight="bold"
        className="text-gray-12 font-jakarta-bold text-[16px] leading-[22px]"
      >
        {title}
      </Typography>
      {showSeeAll && (
        <TouchableOpacity
          onPress={onSeeAllPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || `${seeAllText} — ${title}`}
          hitSlop={8}
          style={{ minHeight: 32, justifyContent: "center" }}
          className="flex-row items-center gap-1"
        >
          <Text className="font-inter-semibold text-caption-l text-blue-03">
            {seeAllText}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={BRAND_BLUE} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Marketing Banner ─────────────────────────────────────────────
// Taller hero (192) + clear gap below. Single press target; inner CTA
// is a visual View only.

function MarketingBanner({ onBookPress }: { onBookPress: () => void }) {
  return (
    <PressableFeedback
      onPress={onBookPress}
      accessibilityRole="button"
      accessibilityLabel="Get your home sparkling clean. Book a service"
      accessibilityHint="Opens search"
      style={{ marginHorizontal: SECTION_PADDING, marginTop: 16 }}
    >
      <LinearGradient
        colors={[BRAND_BLUE, "#70bdff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerGradient}
      >
        <View className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-white/10" />

        <View style={styles.bannerContent}>
          <Typography className="font-jakarta-bold text-white text-[22px] leading-[28px]">
            Get Your Home{"\n"}Sparkling Clean
          </Typography>
          <Typography className="font-inter-regular text-white/90 text-[13px] mt-1.5 leading-[18px]">
            Trusted professionals at your doorstep.
          </Typography>
          <View style={styles.bannerCta} accessibilityElementsHidden>
            <Text className="font-inter-semibold text-blue-03 text-caption-l">
              Book Service
            </Text>
            <Ionicons name="arrow-forward" size={14} color={BRAND_BLUE} />
          </View>
        </View>
        <Image
          source={require("../../assets/home/girl-clean.png")}
          contentFit="contain"
          accessibilityLabel="Cleaning professional illustration"
          style={styles.bannerImage}
        />
      </LinearGradient>
    </PressableFeedback>
  )
}

// ─── Category Pill — HeroUI Chip in brand blue ────────────────────
// Selected: solid app blue (#2a9cff / blue-03), white label.
// Unselected: white pill, dark label — floats on page gray, no border.

function CategoryChip({
  name,
  selected,
  onPress,
}: {
  name: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Chip
      size="md"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filter by ${name}${selected ? ", selected" : ""}`}
      className={
        selected
          ? "bg-blue-03 h-10 rounded-full border-0 px-4"
          : "h-10 rounded-full border-0 bg-white px-4"
      }
    >
      <Chip.Label
        className={
          selected
            ? "font-inter-semibold text-caption-l text-white"
            : "font-inter-medium text-caption-l text-gray-12"
        }
      >
        {name}
      </Chip.Label>
    </Chip>
  )
}

// ─── Service Card — compact, equal height ─────────────────────────
// Fixed 100px image + 1-line title + 2-line desc (reserved height) +
// footer pinned bottom via Body flex-1. White, no border, no shadow.

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
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.name}, starts at rupees ${startingPrice}`}
      accessibilityHint="Opens service details"
      animation={{ scale: { value: 0.97 } }}
      style={{ flex: 1 }}
    >
      <Card
        variant="default"
        className="overflow-hidden rounded-2xl border-0 bg-white"
        style={styles.serviceCard}
      >
        <Image
          source={imageSource}
          style={styles.serviceImage}
          contentFit="cover"
          accessibilityLabel={`${listing.name} image`}
        />
        <Card.Body className="px-2.5 pt-2.5 pb-0">
          <Card.Title
            className="font-jakarta-bold text-gray-12 text-[13px] leading-[18px]"
            numberOfLines={1}
          >
            {listing.name}
          </Card.Title>
          <Card.Description
            className="font-inter-regular text-gray-07 text-[11px] leading-[15px] mt-1"
            numberOfLines={2}
            style={styles.serviceDesc}
          >
            {listing.shortDescription ||
              "Professional service at your convenience"}
          </Card.Description>
        </Card.Body>
        <Card.Footer className="flex-row items-center justify-between px-2.5 pt-2 pb-2.5">
          <View>
            <Text className="font-inter-regular text-gray-07 text-[10px] leading-[13px]">
              Starts at
            </Text>
            <Text className="font-jakarta-bold text-gray-12 text-[14px] leading-[19px] tabular-nums">
              ₹{startingPrice}
            </Text>
          </View>
          <View
            accessibilityElementsHidden
            className="bg-blue-01 h-7 w-7 items-center justify-center rounded-full"
          >
            <Ionicons name="arrow-forward" size={14} color={BRAND_BLUE} />
          </View>
        </Card.Footer>
      </Card>
    </PressableFeedback>
  )
}

// ─── Bundle Card — white, no border/shadow ────────────────────────

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
  const accentColor = isKitchen ? "#FF5722" : BRAND_BLUE

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${bundle.name}, from rupees ${bundle.bundlePrice}`}
      style={{ width: "100%" }}
    >
      <View style={styles.bundleCard}>
        <View style={styles.bundleImageWrap}>
          <Image
            source={getBundleImage(bundle.name, bundle.image)}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            accessibilityElementsHidden
          />
          {discount ? (
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
          ) : null}
        </View>
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
                className="font-jakarta-bold text-gray-12 tabular-nums"
                style={styles.bundlePriceText}
              >
                From ₹{bundle.bundlePrice}
              </Text>
              <View style={styles.bundleAction}>
                <Text style={styles.bundleActionText}>View Bundle</Text>
                <Ionicons name="arrow-forward" size={12} color={BRAND_BLUE} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </PressableFeedback>
  )
}

// ─── Why Choose Us — white cards, pastel icon dots ───────────────

const WHY_CHOOSE_US = [
  {
    title: "Verified Experts",
    subtitle: "Background checked professionals",
    icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
    bg: "#F0F4FE",
    iconColor: BRAND_BLUE,
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

// ─── Main Home Screen ─────────────────────────────────────────────

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

  // Flatten all listings, deduplicated (unchanged)
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

  // Filtered listings by selected category (unchanged)
  const filteredListings = useMemo(() => {
    if (selectedCategory === "All") return allListings
    const cat = categories.find(
      (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
    )
    return cat ? cat.listings || [] : []
  }, [selectedCategory, categories, allListings])

  // Chunk grid into rows of 2 — guarantees both columns align + stretch
  // to identical height (flexWrap alone can't do this reliably in RN).
  const serviceRows = useMemo(() => {
    const rows: Listing[][] = []
    for (let i = 0; i < filteredListings.length; i += 2) {
      rows.push(filteredListings.slice(i, i + 2))
    }
    return rows
  }, [filteredListings])

  // Required pills first, then any extra backend categories (preserves data)
  const categoryNames = useMemo(() => {
    const required = ["All", "Cleaning", "Plumbing", "Electrical", "Painting"]
    const names = [...required]
    for (const cat of categories) {
      if (!names.find((n) => n.toLowerCase() === cat.name.toLowerCase())) {
        names.push(cat.name)
      }
    }
    return names
  }, [categories])

  // Bundles to display (unchanged)
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
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG, justifyContent: "center" }}>
        <Spinner />
      </View>
    )
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: PAGE_BG }}
      edges={["top"]}
    >
      {/* ── Header — same page background, no white block ── */}
      <View
        className="flex-row items-center justify-between"
        style={{
          backgroundColor: PAGE_BG,
          paddingHorizontal: SECTION_PADDING,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        <AddressSelector />
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            onPress={() => router.push("/(screens)/notifications")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={4}
          >
            <Ionicons name="notifications-outline" size={20} color="#1F2228" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={4}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Avatar size="md" className="rounded-full">
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

      {/* ── Search Bar — same page background, white field ── */}
      <View
        style={{
          backgroundColor: PAGE_BG,
          paddingHorizontal: SECTION_PADDING,
          paddingBottom: 4,
          paddingTop: 4,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(screens)/search")}
          accessibilityRole="search"
          accessibilityLabel="Search for services"
          accessibilityHint="Opens search screen"
          className="h-12 flex-row items-center rounded-xl border-0 bg-white"
          style={{ paddingHorizontal: 14 }}
        >
          <Ionicons name="search" size={18} color="#9EA2AD" />
          <Text className="text-gray-06 font-inter-regular text-caption-l ml-2.5">
            Search for services...
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── One consistent background for all scroll content ── */}
      <ScrollView
        style={{ flex: 1, backgroundColor: PAGE_BG }}
        contentContainerStyle={{ paddingBottom: 24, backgroundColor: PAGE_BG }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BRAND_BLUE]}
          />
        }
      >
        {/* ── Hero banner ── */}
        <MarketingBanner onBookPress={() => router.push("/(screens)/search")} />

        {/* ── Categories — clear 16px gap below banner ── */}
        <View style={{ marginTop: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SECTION_PADDING,
              paddingVertical: 2,
              gap: GRID_GAP,
              alignItems: "center",
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

        {/* ── Popular Services — compact 2-col rows, equal height ── */}
        <SectionHeader
          title="Popular Services"
          showSeeAll
          seeAllText="See all"
          onSeeAllPress={() => router.push("/(screens)/search")}
        />
        {filteredListings.length > 0 ? (
          <View
            style={{
              paddingHorizontal: SECTION_PADDING,
              gap: GRID_GAP,
            }}
          >
            {serviceRows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                className="flex-row items-stretch"
                style={{ gap: GRID_GAP }}
              >
                {row.map((listing) => (
                  <View key={listing.id} style={{ flex: 1 }}>
                    <ServiceCard
                      listing={listing}
                      onPress={() => handleServicePress(listing)}
                    />
                  </View>
                ))}
                {/* Keep single last card at half width, left aligned */}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}
          </View>
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

        {/* ── Best Value Bundles ── */}
        {displayBundles.length > 0 && (
          <>
            <SectionHeader
              title="Best Value Bundles"
              showSeeAll
              seeAllText="All bundles"
              onSeeAllPress={() => router.push("/(screens)/bundles")}
            />
            <View style={{ paddingHorizontal: SECTION_PADDING, gap: GRID_GAP }}>
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

        {/* ── Why Choose Us ── */}
        <SectionHeader title="Why Choose Us" />
        <View
          style={{
            paddingHorizontal: SECTION_PADDING,
            gap: GRID_GAP,
          }}
        >
          {(() => {
            const rows = []
            for (let i = 0; i < WHY_CHOOSE_US.length; i += 2) {
              rows.push(WHY_CHOOSE_US.slice(i, i + 2))
            }
            return rows.map((row, ri) => (
              <View
                key={ri}
                className="flex-row items-stretch"
                style={{ gap: GRID_GAP }}
              >
                {row.map((item, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center bg-white rounded-2xl border-0"
                    style={[styles.whyChooseCard, { flex: 1 }]}
                  >
                    <View
                      style={[
                        styles.whyChooseIconWrap,
                        { backgroundColor: item.bg },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={item.iconColor}
                      />
                    </View>
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text
                        className="font-jakarta-bold text-gray-12"
                        style={{ fontSize: 11, lineHeight: 15 }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        className="font-inter-regular text-gray-07"
                        style={{ fontSize: 10, lineHeight: 13, marginTop: 1 }}
                        numberOfLines={2}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>
                ))}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))
          })()}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles — no visible shadows, no structural borders ───────────

const styles = StyleSheet.create({
  // Banner
  bannerGradient: {
    height: BANNER_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
  },
  bannerContent: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    paddingRight: 140,
    zIndex: 20,
  },
  bannerCta: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bannerImage: {
    position: "absolute",
    bottom: 0,
    right: -6,
    width: 152,
    height: BANNER_HEIGHT + 4,
    zIndex: 30,
  },

  // Service card — white on page gray, no border, no shadow
  serviceCard: {
    flex: 1,
  },
  serviceImage: {
    width: "100%",
    height: CARD_IMAGE_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  serviceDesc: {
    minHeight: 30, // reserve exactly 2 lines so rows stay equal
  },

  // Bundle Card — white, no border/shadow
  bundleCard: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderRadius: 16,
    height: 128,
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
    lineHeight: 20,
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
    lineHeight: 20,
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
    color: BRAND_BLUE,
  },

  // Why Choose Us — white cards
  whyChooseCard: {
    padding: 10,
    borderRadius: 16,
  },
  whyChooseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
  },
})
