import React, { useEffect, useMemo, useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share,
} from "react-native"
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { Image } from "expo-image"
import {
  Typography,
  Card,
  Button,
  Spinner,
} from "heroui-native"
import { colors, semantic } from "../../../src/theme/colors"
import { spacing } from "../../../src/theme/spacing"
import { useListingsStore, useCartStore } from "../../../src/store"
import { Catalog, Listing, AddOn } from "../../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

const resolveImage = (img: string | undefined) => {
  if (!img) return require("../../../assets/home/main/vaccum-floor.jpg")

  const serviceImages: Record<string, number> = {
    "floor.png": require("../../../assets/home/main/floor-cleaning.jpg"),
    "bathroom.png": require("../../../assets/home/main/vaccum-floor.jpg"),
    "cupboard-cleaning.png": require("../../../assets/home/preview/cupboard-cleaning.png"),
    "utensils.png": require("../../../assets/home/main/cook-preview.jpg"),
    "roomclieaning.png": require("../../../assets/home/main/vaccum-floor.jpg"),
    "plumbing.jpg": require("../../../assets/home/main/plumbing.jpg"),
    "toilet-clean.jpg": require("../../../assets/home/main/vaccum-floor.jpg"),
    "ac-repair.jpg": require("../../../assets/home/main/ac-repair.jpg"),
    "painting.jpg": require("../../../assets/home/main/painting.jpg"),
    "bundle-clean.png": require("../../../assets/home/main/bundle-clean.png"),
    "bundle-cook.png": require("../../../assets/home/main/bundle-cook.png"),
  }

  const filename = img.substring(img.lastIndexOf("/") + 1)
  if (serviceImages[filename]) return serviceImages[filename]
  if (serviceImages[img]) return serviceImages[img]
  if (img.startsWith("http")) return { uri: img }

  const lowercaseImg = img.toLowerCase()
  if (lowercaseImg.includes("floor"))
    return require("../../../assets/home/main/floor-cleaning.jpg")
  if (lowercaseImg.includes("bathroom") || lowercaseImg.includes("toilet"))
    return require("../../../assets/home/main/vaccum-floor.jpg")
  if (lowercaseImg.includes("cupboard"))
    return require("../../../assets/home/preview/cupboard-cleaning.png")
  if (lowercaseImg.includes("utensils") || lowercaseImg.includes("cook"))
    return require("../../../assets/home/main/cook-preview.jpg")
  if (lowercaseImg.includes("plumbing"))
    return require("../../../assets/home/main/plumbing.jpg")
  if (
    lowercaseImg.includes("ac") ||
    lowercaseImg.includes("repair") ||
    lowercaseImg.includes("appliance")
  )
    return require("../../../assets/home/main/ac-repair.jpg")
  if (lowercaseImg.includes("paint"))
    return require("../../../assets/home/main/painting.jpg")

  return require("../../../assets/home/main/vaccum-floor.jpg")
}

// Distinct photographic thumbnails for add-on cards.
const resolveAddonImage = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes("balcony"))
    return require("../../../assets/home/main/floor-cleaning.jpg")
  if (n.includes("kitchen") || n.includes("sink"))
    return require("../../../assets/home/main/cook-preview.jpg")
  if (n.includes("window"))
    return require("../../../assets/home/main/vaccum-floor.jpg")
  return resolveImage(name)
}

const getWhatsIncluded = (listingName: string): string[] => {
  const name = listingName.toLowerCase()
  if (name.includes("floor")) {
    return [
      "Floor scrubbing",
      "Floor polishing",
      "Corner cleaning",
      "Dust removal",
      "Professional equipment",
    ]
  }
  if (name.includes("bathroom") || name.includes("toilet")) {
    return [
      "Tile descaling & cleaning",
      "Sanitation of toilet bowl",
      "Mirror polishing",
      "Taps & chrome descaling",
      "Eco-friendly disinfectants",
    ]
  }
  if (name.includes("cupboard") || name.includes("organis")) {
    return [
      "Dusting of shelves",
      "Cabinet sanitizing & wiping",
      "Neat wardrobe organizing",
      "Linen arranging & folding",
      "Drawer scenting & lining",
    ]
  }
  if (name.includes("utensil") || name.includes("sink")) {
    return [
      "Utensil scrubbing & washing",
      "Sink descaling & sanitizing",
      "Dishes drying & organizing",
      "Countertop wiping",
      "Grease spot removal",
    ]
  }
  if (
    name.includes("ac") ||
    name.includes("repair") ||
    name.includes("filter")
  ) {
    return [
      "Split/Window AC jet service",
      "Air filter screen washing",
      "Coolant pressure testing",
      "Drain tray cleaning",
      "Airflow diagnostic check",
    ]
  }
  if (name.includes("plumbing") || name.includes("tap")) {
    return [
      "Leakage source diagnostics",
      "Tap spindle replacement",
      "Fixture thread sealing",
      "Water pressure checks",
      "Post-service area cleanup",
    ]
  }
  if (name.includes("paint")) {
    return [
      "Wall prep & sandpapering",
      "Dual-coat premium paint",
      "Masking tape application",
      "Furniture plastic wrapping",
      "Complete post-paint cleanup",
    ]
  }
  return [
    "Deep area cleaning",
    "Eco-friendly sanitization",
    "Professional equipment",
    "Post-service inspection",
    "Verified skilled expert",
  ]
}

// Deterministic pseudo-rating so related cards vary like the reference.
const relatedRating = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (4.5 + (h % 4) / 10).toFixed(1)
}

const TRUST_BADGES = [
  {
    icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
    color: "#26BD6C",
    label: "Verified Professionals",
  },
  {
    icon: "leaf" as keyof typeof Ionicons.glyphMap,
    color: "#26BD6C",
    label: "Safe Cleaning Products",
  },
  {
    icon: "time" as keyof typeof Ionicons.glyphMap,
    color: "#2a9cff",
    label: "On-time Service",
  },
]

// ─── Gallery with counter badge ───────────────────────────────────

function ServiceGallery({ images }: { images: any[] }) {
  const [active, setActive] = useState(0)

  return (
    <View style={styles.heroContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActive(
            Math.round(e.nativeEvent.contentOffset.x / width)
          )
        }}
      >
        {images.map((src, i) => (
          <Image
            key={i}
            source={src}
            style={{ width, height: 260 }}
            contentFit="cover"
          />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View style={styles.counterBadge}>
          <Typography className="font-inter-semibold text-white text-[11px] tabular-nums">
            {active + 1}/{images.length}
          </Typography>
        </View>
      )}
    </View>
  )
}

// ─── What's Included — lightweight bordered list ──────────────────

function IncludedList({ items }: { items: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 6)
  const rows: string[][] = []
  for (let i = 0; i < visible.length; i += 2) {
    rows.push(visible.slice(i, i + 2))
  }

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Typography className="font-jakarta-bold text-gray-12 text-[17px]">
          What&apos;s Included
        </Typography>
        {items.length > 6 && (
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            activeOpacity={0.7}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Show fewer items" : "View all items"}
            className="flex-row items-center gap-0.5"
          >
            <Typography className="font-inter-semibold text-blue-03 text-[13px]">
              {expanded ? "Show less" : "View all"}
            </Typography>
            <Ionicons
              name="arrow-forward"
              size={14}
              color="#2a9cff"
            />
          </TouchableOpacity>
        )}
      </View>
      <View className="rounded-2xl border border-gray-02 bg-white p-3">
        {rows.map((row, ri) => (
          <View
            key={ri}
            className={`flex-row items-start gap-2 ${ri > 0 ? "mt-2.5" : ""}`}
          >
            {row.map((item) => (
              <View key={item} className="flex-1 flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={18} color="#26BD6C" />
                <Typography className="font-inter-regular text-gray-09 flex-1 text-[12px] leading-[16px]">
                  {item}
                </Typography>
              </View>
            ))}
            {row.length === 1 && <View className="flex-1" />}
          </View>
        ))}
      </View>
    </View>
  )
}

interface Package {
  id: string
  title: string
  desc: string
  price: number
}

function PackageSelector({
  packages,
  selectedId,
  onSelect,
}: {
  packages: Package[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <View>
      <Typography className="font-jakarta-bold text-gray-12 mb-2 text-[17px]">
        Choose Service Package
      </Typography>
      <View className="flex-row items-stretch gap-2">
        {packages.map((pkg) => {
          const isSelected = selectedId === pkg.id
          return (
            <TouchableOpacity
              key={pkg.id}
              onPress={() => onSelect(pkg.id)}
              activeOpacity={0.8}
              style={styles.packageCard}
              className={`flex-1 rounded-2xl border p-3 ${
                isSelected
                  ? "bg-blue-01 border-blue-03"
                  : "border-gray-02 bg-white"
              }`}
            >
              {isSelected && (
                <View style={styles.packageCheck}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              )}
              <Typography
                className={`font-jakarta-semibold text-[13px] ${isSelected ? "text-blue-03" : "text-gray-12"}`}
              >
                {pkg.title}
              </Typography>
              <Typography className="font-inter-regular text-gray-07 mt-0.5 text-[11px]">
                {pkg.desc}
              </Typography>
              <Typography
                className={`font-jakarta-bold text-[15px] mt-2 tabular-nums ${isSelected ? "text-blue-03" : "text-gray-12"}`}
              >
                ₹{pkg.price}
              </Typography>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

interface AddOnItemType {
  id: string
  name: string
  price: number
  icon: string
}

function AddonCard({
  item,
  isAdded,
  onToggle,
}: {
  item: AddOnItemType
  isAdded: boolean
  onToggle: () => void
}) {
  return (
    <Card
      variant="default"
      className={`mr-2.5 w-[152px] overflow-hidden rounded-2xl border bg-white ${isAdded ? "border-blue-03" : "border-gray-02"}`}
    >
      <Image
        source={resolveAddonImage(item.name)}
        style={styles.addonImage}
        contentFit="cover"
      />
      <View className="p-2.5">
        <Typography
          numberOfLines={2}
          style={styles.addonTitle}
          className="font-inter-semibold text-gray-12 text-[13px] leading-[18px]"
        >
          {item.name}
        </Typography>
        <Typography className="font-jakarta-bold text-blue-03 mt-1 text-[13px] tabular-nums">
          +₹{item.price}
        </Typography>

        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.8}
          className={`mt-2 w-full items-center justify-center rounded-lg py-2 ${
            isAdded ? "bg-blue-03" : "bg-gray-01 border-gray-02 border"
          }`}
        >
          <Typography
            className={`font-inter-semibold text-[12px] ${isAdded ? "text-white" : "text-gray-12"}`}
          >
            {isAdded ? "Added ✓" : "Add"}
          </Typography>
        </TouchableOpacity>
      </View>
    </Card>
  )
}

// ─── Related service card — plus button is a sibling overlay so the
// card press and the quick-add press never double-fire. ───────────

function RelatedCard({
  listing,
  onOpen,
  onQuickAdd,
  isAdding,
}: {
  listing: Listing
  onOpen: () => void
  onQuickAdd: () => void
  isAdding: boolean
}) {
  const price = listing.catalogs?.[0]?.price || listing.basePrice || "399"

  return (
    <View className="mr-2.5 w-[184px] rounded-2xl border border-gray-02 bg-white">
      <TouchableOpacity onPress={onOpen} activeOpacity={0.9}>
        <Image
          source={resolveImage(
            (listing as any).images?.[0] || listing.image || listing.name
          )}
          style={styles.relatedImage}
          contentFit="cover"
        />
        <View className="p-2.5 pr-10">
          <Typography
            numberOfLines={2}
            style={styles.relatedTitle}
            className="font-jakarta-bold text-gray-12 text-[13px] leading-[18px]"
          >
            {listing.name}
          </Typography>
          <Typography
            numberOfLines={2}
            style={styles.relatedDesc}
            className="font-inter-regular text-gray-07 mt-0.5 text-[11px] leading-[15px]"
          >
            {listing.shortDescription || "Professional service"}
          </Typography>
          <View className="mt-1.5 flex-row items-center gap-1.5">
            <Typography className="font-jakarta-bold text-gray-12 text-[15px] tabular-nums">
              ₹{price}
            </Typography>
            <Ionicons name="star" size={11} color="#F48E2F" />
            <Typography className="font-inter-medium text-gray-07 text-[11px] tabular-nums">
              {relatedRating(listing.id)}
            </Typography>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onQuickAdd}
        disabled={isAdding}
        activeOpacity={0.8}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Quick add ${listing.name} to cart`}
        style={styles.relatedAddBtn}
        className="bg-blue-01 h-7 w-7 items-center justify-center rounded-full"
      >
        {isAdding ? (
          <ActivityIndicator size="small" color="#2a9cff" />
        ) : (
          <Ionicons name="add" size={16} color="#2a9cff" />
        )}
      </TouchableOpacity>
    </View>
  )
}

function StickyBookingBar({
  price,
  onBook,
  isLoading,
}: {
  price: number
  onBook: () => void
  isLoading: boolean
}) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.stickyFooter,
        { paddingBottom: Math.max(insets.bottom, spacing[4]) },
      ]}
    >
      <View>
        <Typography className="text-caption-l text-gray-07 font-inter-regular">
          Total Price
        </Typography>
        <Typography className="text-blue-03 font-jakarta-bold mt-0.5 text-[20px] tabular-nums">
          ₹{price}
        </Typography>
      </View>
      <TouchableOpacity
        onPress={onBook}
        disabled={isLoading}
        activeOpacity={0.9}
        className="bg-blue-03 ml-4 h-12 flex-1 flex-row items-center justify-center rounded-xl"
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" className="mr-2" />
        ) : null}
        <Typography className="font-jakarta-bold text-white text-[15px]">
          {isLoading ? "Adding..." : "Add to Cart"}
        </Typography>
      </TouchableOpacity>
    </View>
  )
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { selectedListing, fetchServiceById, isLoading, categories } =
    useListingsStore()
  const { addItem } = useCartStore()

  const [isBooking, setIsBooking] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<
    "standard" | "premium" | "complete"
  >("standard")
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [addingRelatedId, setAddingRelatedId] = useState<string | null>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (id) {
      fetchServiceById(id)
    }
  }, [id, fetchServiceById])

  useEffect(() => {
    setSelectedPackage("standard")
    setSelectedAddOns([])
    setIsFav(false)
  }, [id])

  const relatedServices = useMemo(() => {
    const out: Listing[] = []
    const seen = new Set<string>()
    if (selectedListing) seen.add(selectedListing.id)
    for (const cat of categories) {
      for (const l of cat.listings || []) {
        if (!seen.has(l.id)) {
          seen.add(l.id)
          out.push(l)
          if (out.length >= 6) break
        }
      }
      if (out.length >= 6) break
    }
    return out
  }, [categories, selectedListing?.id])

  if (isLoading) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  if (!selectedListing || selectedListing.id !== id) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        edges={["bottom"]}
      >
        <View style={styles.center}>
          <Typography type="h6" style={{ color: semantic.textSecondary }}>
            Service not found
          </Typography>
        </View>
      </SafeAreaView>
    )
  }

  const listing = selectedListing

  // Calculate Package Prices
  const baseVal = parseInt(listing.basePrice || "899", 10)
  const stdPrice = baseVal
  const premiumPrice = Math.round((baseVal * 1.67) / 100) * 100 - 1
  const completePrice = Math.round((baseVal * 2.78) / 100) * 100 - 1

  const packages = [
    {
      id: "standard",
      title: "Standard",
      desc: "Up to 2 BHK",
      price: stdPrice,
    },
    {
      id: "premium",
      title: "Premium",
      desc: "Up to 3 BHK",
      price: premiumPrice,
    },
    {
      id: "complete",
      title: "Complete",
      desc: "Full Home",
      price: completePrice,
    },
  ]

  const getPackagePrice = (pkgId: string) => {
    if (pkgId === "premium") return premiumPrice
    if (pkgId === "complete") return completePrice
    return stdPrice
  }

  const selectedPrice = getPackagePrice(selectedPackage)
  const originalPrice = selectedPrice + 200
  const savingsAmount = 200

  const gallery =
    listing.images && listing.images.length > 0
      ? listing.images.map((img: string) =>
          img.startsWith("http") ? { uri: img } : resolveImage(img)
        )
      : [resolveImage(listing.image)]

  // Combine DB addons and mock enhancements
  const dbAddOns = listing.addOns || []
  const defaultAddOns = [
    {
      id: "addon-window",
      name: "Window Glass Cleaning",
      price: 299,
      icon: "water",
    },
    {
      id: "addon-kitchen",
      name: "Kitchen Sink Sanitization",
      price: 149,
      icon: "sparkles",
    },
    {
      id: "addon-balcony",
      name: "Balcony Deep Sweep",
      price: 199,
      icon: "leaf",
    },
  ]
  const addOnItems = [
    ...dbAddOns.map((addon) => ({
      id: addon.id,
      name: addon.name,
      price: parseInt(addon.price || "199", 10),
      icon: "sparkles",
    })),
    ...defaultAddOns,
  ]
    .filter(
      (item, index, self) =>
        self.findIndex((t) => t.name === item.name || t.id === item.id) ===
        index
    )
    .slice(0, 3)

  // Calculate Total Price
  const addOnPriceSum = selectedAddOns.reduce((sum, addonId) => {
    const addon = addOnItems.find((a) => a.id === addonId)
    return sum + (addon ? addon.price : 0)
  }, 0)
  const totalPrice = selectedPrice + addOnPriceSum

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    )
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${listing.name} — ₹${selectedPrice} on Subito`,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleQuickAdd = async (rel: Listing) => {
    const catalog = rel.catalogs?.[0]
    if (!catalog) {
      router.push({
        pathname: "/(screens)/service/[id]",
        params: { id: rel.id },
      })
      return
    }
    setAddingRelatedId(rel.id)
    try {
      await addItem(catalog.id, 1, {
        propertyConfig: {
          mockName: rel.name,
          mockDesc: rel.shortDescription || "Professional service",
          mockPrice: parseInt(rel.basePrice || "399", 10),
        },
      })
      router.push("/(tabs)/cart")
    } catch (e) {
      console.error(e)
    } finally {
      setAddingRelatedId(null)
    }
  }

  const handleBookNow = async () => {
    setIsBooking(true)
    try {
      const mainCatalog = listing.catalogs[0]
      if (mainCatalog) {
        await addItem(mainCatalog.id, 1, {
          propertyConfig: {
            packageType: selectedPackage,
            packagePrice: selectedPrice,
            mockName: `${listing.name} (${selectedPackage.charAt(0).toUpperCase() + selectedPackage.slice(1)})`,
            mockDesc:
              listing.shortDescription ||
              listing.description ||
              "Premium service package",
            mockPrice: selectedPrice,
          },
        })
      }
      for (const addonId of selectedAddOns) {
        const addonItem = addOnItems.find((a) => a.id === addonId)
        if (addonItem) {
          await addItem(addonId, 1, {
            propertyConfig: {
              mockName: addonItem.name,
              mockDesc: "Enhancement service addon",
              mockPrice: addonItem.price,
            },
          })
        }
      }
      router.push("/(tabs)/cart")
    } catch (e) {
      console.error(e)
    } finally {
      setIsBooking(false)
    }
  }

  const whatsIncludedData = getWhatsIncluded(listing.name)

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "white" }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* Hero gallery */}
            <ServiceGallery images={gallery} />

            {/* Continuous detail body — not boxed cards */}
            <View className="gap-4 px-4 pt-3">
              {/* Service information */}
              <View>
                <Typography className="font-jakarta-bold text-gray-12 text-[22px] leading-[28px]">
                  {listing.name}
                </Typography>
                <View className="mt-1.5 flex-row items-center gap-2">
                  <Typography className="text-blue-03 font-jakarta-bold text-[24px] tabular-nums">
                    ₹{selectedPrice}
                  </Typography>
                  <Typography className="text-gray-06 font-inter-regular text-[15px] line-through tabular-nums">
                    ₹{originalPrice}
                  </Typography>
                  <View className="bg-green-01 rounded-md px-1.5 py-0.5">
                    <Typography className="font-inter-semibold text-green-08 text-[11px]">
                      Save ₹{savingsAmount}
                    </Typography>
                  </View>
                </View>
                <View className="mt-1.5 flex-row items-center gap-1.5">
                  <Ionicons name="star" size={14} color="#F48E2F" />
                  <Typography className="font-jakarta-bold text-gray-12 text-[13px] tabular-nums">
                    4.8
                  </Typography>
                  <Typography className="font-inter-regular text-gray-07 text-[12px]">
                    (200+ reviews)
                  </Typography>
                </View>
                <Typography className="text-gray-08 font-inter-regular mt-1.5 text-[13px] leading-[19px]">
                  {listing.description || listing.shortDescription}
                </Typography>
              </View>

              {/* Trust badges — lightweight 3-col mini cards */}
              <View className="flex-row items-stretch gap-2">
                {TRUST_BADGES.map((badge) => (
                  <View
                    key={badge.label}
                    style={styles.trustBadge}
                    className="flex-1 flex-row items-center gap-1.5 rounded-2xl border border-gray-02 bg-white p-2.5"
                  >
                    <Ionicons
                      name={badge.icon}
                      size={20}
                      color={badge.color}
                    />
                    <Typography className="font-inter-semibold text-gray-12 flex-1 text-[11px] leading-[14px]">
                      {badge.label}
                    </Typography>
                  </View>
                ))}
              </View>

              {/* Service packages */}
              <PackageSelector
                packages={packages}
                selectedId={selectedPackage}
                onSelect={(id) => setSelectedPackage(id as any)}
              />

              {/* What's Included */}
              <IncludedList items={whatsIncludedData} />

              {/* Add-ons */}
              <View>
                <Typography className="font-jakarta-bold text-gray-12 text-[17px]">
                  Enhance Your Service
                </Typography>
                <Typography className="font-inter-regular text-gray-07 mt-0.5 text-[12px]">
                  Add more services to get a cleaner, healthier home.
                </Typography>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-2 flex-row"
                >
                  {addOnItems.map((item) => (
                    <AddonCard
                      key={item.id}
                      item={item}
                      isAdded={selectedAddOns.includes(item.id)}
                      onToggle={() => handleToggleAddon(item.id)}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Related services — the one justified horizontal carousel */}
              {relatedServices.length > 0 && (
                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Typography className="font-jakarta-bold text-gray-12 text-[17px]">
                      You May Also Like
                    </Typography>
                    <TouchableOpacity
                      onPress={() => router.push("/(screens)/search")}
                      activeOpacity={0.7}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="See all services"
                      className="flex-row items-center gap-0.5"
                    >
                      <Typography className="font-inter-semibold text-blue-03 text-[13px]">
                        See all
                      </Typography>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color="#2a9cff"
                      />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row"
                  >
                    {relatedServices.map((rel) => (
                      <RelatedCard
                        key={rel.id}
                        listing={rel}
                        onOpen={() =>
                          router.push({
                            pathname: "/(screens)/service/[id]",
                            params: { id: rel.id },
                          })
                        }
                        onQuickAdd={() => handleQuickAdd(rel)}
                        isAdding={addingRelatedId === rel.id}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Floating header over the gallery */}
          <View style={[styles.overlayHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.overlayBtn}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setIsFav((v) => !v)}
                activeOpacity={0.8}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  isFav ? "Remove from favourites" : "Add to favourites"
                }
                accessibilityState={{ selected: isFav }}
                style={styles.overlayBtn}
              >
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.8}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share this service"
                style={styles.overlayBtn}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sticky bottom action */}
          <StickyBookingBar
            price={totalPrice}
            onBook={handleBookNow}
            isLoading={isBooking}
          />
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 140, // clear the sticky bar on all devices
    backgroundColor: "white",
  },
  overlayHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  overlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContainer: {
    width: "100%",
    height: 260,
    overflow: "hidden",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[2],
    backgroundColor: colors.gray[1],
  },
  counterBadge: {
    position: "absolute",
    right: 16,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  relatedImage: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  relatedTitle: {
    minHeight: 36, // reserve 2 lines so cards stay equal
  },
  relatedDesc: {
    minHeight: 30, // reserve 2 lines so cards stay equal
  },
  trustBadge: {
    minHeight: 60, // equal heights, text wraps instead of clipping
  },
  packageCard: {
    minHeight: 108, // equal heights across all three options
  },
  packageCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2a9cff",
    alignItems: "center",
    justifyContent: "center",
  },
  addonImage: {
    width: "100%",
    height: 84,
  },
  addonTitle: {
    minHeight: 36, // reserve 2 lines — never truncate the name
  },
  relatedAddBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
  },
  center: {
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
})
