import React, { useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { Image } from "expo-image"
import {
  Typography,
  Card,
  Button,
  Chip,
  Spinner,
  Separator,
  Avatar,
} from "heroui-native"
import { colors, semantic } from "../../../src/theme/colors"
import { spacing, borderRadius } from "../../../src/theme/spacing"
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

const getWhatsNotIncluded = (listingName: string): string[] => {
  const name = listingName.toLowerCase()
  if (name.includes("floor")) {
    return [
      "Heavy furniture shifting",
      "Chemical stain removal",
      "Wall scraping & washing",
      "Carpet vacuuming / shampooing",
    ]
  }
  if (name.includes("bathroom") || name.includes("toilet")) {
    return [
      "Deep tile water stain guarantee",
      "Ceiling repair & painting",
      "Wall scrubbing outside bathroom",
      "Drain pipe line unclogging",
    ]
  }
  if (name.includes("cupboard") || name.includes("organis")) {
    return [
      "Heavy wardrobe shifting",
      "Inside cabinet painting",
      "Laundry / washing clothes",
      "Ironing & steaming services",
    ]
  }
  if (name.includes("utensil") || name.includes("sink")) {
    return [
      "Chimney filter deep clean",
      "Kitchen exhaust degreasing",
      "Buying dishwashing soap/liquid",
      "Out-of-kitchen waste disposal",
    ]
  }
  if (
    name.includes("ac") ||
    name.includes("repair") ||
    name.includes("filter")
  ) {
    return [
      "AC spare parts replacement",
      "Gas top-up (charged extra)",
      "Wall plastering & drilling",
      "Outdoor unit mounting bracket",
    ]
  }
  if (name.includes("plumbing") || name.includes("tap")) {
    return [
      "Main drainage line repairs",
      "Wall breakdown / masonry",
      "Buying expensive fixtures",
      "External sewage clearing",
    ]
  }
  if (name.includes("paint")) {
    return [
      "Severe wall damp treatment",
      "Packing household items",
      "Ceiling plaster repairs",
      "Exterior building wall painting",
    ]
  }
  return [
    "Heavy furniture shifting",
    "Severe stain guarantee",
    "External area cleaning",
    "Sourcing expensive raw materials",
  ]
}

const REVIEWS = [
  {
    id: "rev-1",
    name: "Rohan Sharma",
    rating: 5,
    date: "Yesterday",
    comment: "Excellent cleaning service. Very professional.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  },
  {
    id: "rev-2",
    name: "Priya Patel",
    rating: 4.8,
    date: "3 days ago",
    comment: "House looked brand new after cleaning.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  },
]

// Reusable Sub-components
function ServiceHero({ imageSource }: { imageSource: any }) {
  return (
    <View style={styles.heroContainer}>
      <Image source={imageSource} style={styles.heroImage} contentFit="cover" />
    </View>
  )
}

function IncludedList({ items }: { items: string[] }) {
  return (
    <View className="gap-3">
      <Typography className="font-jakarta-bold text-gray-12 text-[20px]">
        What&apos;s Included
      </Typography>
      <Card
        variant="default"
        className="gap-3 rounded-2xl border-0 bg-white p-4 shadow-sm"
      >
        {items.map((item, idx) => (
          <View key={idx} className="flex-row items-center gap-3">
            <Ionicons name="checkmark-circle" size={20} color="#26BD6C" />
            <Typography className="font-inter-regular text-body-s text-gray-09 flex-1">
              {item}
            </Typography>
          </View>
        ))}
      </Card>
    </View>
  )
}

function ExcludedList({ items }: { items: string[] }) {
  return (
    <View className="gap-3">
      <Typography className="font-jakarta-bold text-gray-12 text-[20px]">
        What&apos;s Not Included
      </Typography>
      <Card
        variant="default"
        className="gap-3 rounded-2xl border-0 bg-white p-4 shadow-sm"
      >
        {items.map((item, idx) => (
          <View key={idx} className="flex-row items-center gap-3">
            <Ionicons name="close-circle" size={20} color="#E6483D" />
            <Typography className="font-inter-regular text-body-s text-gray-09 flex-1">
              {item}
            </Typography>
          </View>
        ))}
      </Card>
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
    <View className="gap-3">
      <Typography className="font-jakarta-bold text-gray-12 text-[20px]">
        Choose Service Package
      </Typography>
      <View className="flex-row gap-3">
        {packages.map((pkg) => {
          const isSelected = selectedId === pkg.id
          return (
            <TouchableOpacity
              key={pkg.id}
              onPress={() => onSelect(pkg.id)}
              activeOpacity={0.8}
              className={`flex-1 rounded-xl border p-4 ${
                isSelected
                  ? "bg-blue-01 border-blue-03"
                  : "border-gray-03 bg-white"
              }`}
            >
              <Typography
                className={`font-jakarta-semibold text-body-s ${isSelected ? "text-blue-03" : "text-gray-12"}`}
              >
                {pkg.title}
              </Typography>
              <Typography className="font-inter-regular text-caption-m text-gray-07 mt-1">
                {pkg.desc}
              </Typography>
              <Typography
                className={`font-jakarta-bold text-body-m mt-3 ${isSelected ? "text-blue-03" : "text-gray-12"}`}
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
      className={`mr-3 w-[160px] rounded-xl border p-4 ${isAdded ? "bg-blue-01 border-blue-03" : "border-gray-03 bg-white"}`}
    >
      <View className="bg-gray-01 h-10 w-10 items-center justify-center rounded-lg">
        <Ionicons
          name={item.icon as any}
          size={24}
          color={isAdded ? "#2a9cff" : "#5E636E"}
        />
      </View>
      <Typography
        numberOfLines={2}
        className="font-inter-semibold text-caption-l text-gray-12 mt-3 h-[40px] leading-tight"
      >
        {item.name}
      </Typography>
      <Typography className="font-jakarta-bold text-body-s text-blue-03 mt-1">
        +₹{item.price}
      </Typography>

      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        className={`mt-3 w-full items-center justify-center rounded-lg py-2 ${
          isAdded ? "bg-blue-03" : "bg-gray-01 border-gray-03 border"
        }`}
      >
        <Typography
          className={`font-inter-semibold text-caption-m ${isAdded ? "text-white" : "text-gray-12"}`}
        >
          {isAdded ? "Added ✓" : "Add"}
        </Typography>
      </TouchableOpacity>
    </Card>
  )
}

interface ReviewType {
  id: string
  name: string
  rating: number
  date: string
  comment: string
  avatar: string
}

function ReviewCard({ review }: { review: ReviewType }) {
  return (
    <Card
      variant="default"
      className="mb-3 rounded-2xl border-0 bg-white p-4 shadow-sm"
    >
      <View className="flex-row items-center gap-3">
        <Avatar size="sm">
          <Avatar.Image source={{ uri: review.avatar }} />
          <Avatar.Fallback>
            {review.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Avatar.Fallback>
        </Avatar>
        <View className="flex-1">
          <Typography className="font-inter-semibold text-body-s text-gray-12">
            {review.name}
          </Typography>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="star" size={14} color="#F48E2F" />
            <Typography className="font-inter-medium text-caption-m text-gray-08">
              {review.rating} • {review.date}
            </Typography>
          </View>
        </View>
      </View>
      <Typography className="font-inter-regular text-body-s text-gray-09 mt-3 leading-relaxed">
        &quot;{review.comment}&quot;
      </Typography>
    </Card>
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
  return (
    <View style={styles.stickyFooter}>
      <View>
        <Typography className="text-caption-l text-gray-07 font-inter-regular">
          Total Price
        </Typography>
        <Typography className="text-gray-12 font-jakarta-bold mt-0.5 text-2xl">
          ₹{price}
        </Typography>
      </View>
      <TouchableOpacity
        onPress={onBook}
        disabled={isLoading}
        activeOpacity={0.9}
        className="bg-blue-03 h-[48px] flex-row items-center justify-center rounded-xl px-8 shadow-md"
      >
        {isLoading ? (
          <ActivityIndicator color="white" size="small" className="mr-2" />
        ) : null}
        <Typography className="font-jakarta-bold text-body-s text-white">
          {isLoading ? "Booking..." : "Book Now"}
        </Typography>
      </TouchableOpacity>
    </View>
  )
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { selectedListing, fetchServiceById, isLoading } = useListingsStore()
  const { addItem } = useCartStore()

  const [isBooking, setIsBooking] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<
    "standard" | "premium" | "complete"
  >("standard")
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

  useEffect(() => {
    if (id) {
      fetchServiceById(id)
    }
  }, [id, fetchServiceById])

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
  const whatsNotIncludedData = getWhatsNotIncluded(listing.name)

  return (
    <>
      <Stack.Screen options={{ title: listing.name }} />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "white" }}
        edges={["bottom"]}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* 1. Hero Image Section */}
            <ServiceHero
              imageSource={
                listing.images && listing.images.length > 0
                  ? listing.images[0].startsWith("http")
                    ? { uri: listing.images[0] }
                    : resolveImage(listing.images[0])
                  : resolveImage(listing.image)
              }
            />

            {/* Content Body */}
            <View className="mt-4 gap-6 px-4">
              {/* 2. Service Information Card */}
              <Card
                variant="default"
                className="rounded-2xl border-0 bg-white p-5 shadow-sm"
              >
                <Typography className="font-jakarta-bold text-gray-12 text-[28px] leading-tight">
                  {listing.name}
                </Typography>
                <View className="mt-3 flex-row items-baseline">
                  <Typography className="text-blue-03 font-jakarta-bold text-2xl">
                    ₹{selectedPrice}
                  </Typography>
                  <Typography className="text-gray-06 font-inter-regular text-body-s ml-2 line-through">
                    ₹{originalPrice}
                  </Typography>
                </View>
                <Typography className="text-green-08 font-inter-semibold text-caption-l mt-1">
                  Save ₹{savingsAmount}
                </Typography>
                <Typography className="text-gray-08 font-inter-regular text-body-s mt-3 leading-relaxed">
                  {listing.description || listing.shortDescription}
                </Typography>
              </Card>

              {/* 3. Trust Badges */}
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row gap-2"
                >
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className="bg-gray-01 border-gray-02 border"
                  >
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">
                      ✓ Verified Professionals
                    </Chip.Label>
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className="bg-gray-01 border-gray-02 border"
                  >
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">
                      ✓ Safe Cleaning Products
                    </Chip.Label>
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className="bg-gray-01 border-gray-02 border"
                  >
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">
                      ⭐ 4.8 Rating
                    </Chip.Label>
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className="bg-gray-01 border-gray-02 border"
                  >
                    <Chip.Label className="text-gray-08 font-inter-semibold text-caption-m">
                      ✓ Instant Booking
                    </Chip.Label>
                  </Chip>
                </ScrollView>
              </View>

              {/* 4. What's Included Section */}
              <IncludedList items={whatsIncludedData} />

              {/* 5. What's Not Included Section */}
              <ExcludedList items={whatsNotIncludedData} />

              {/* 6. Service Options Section */}
              <PackageSelector
                packages={packages}
                selectedId={selectedPackage}
                onSelect={(id) => setSelectedPackage(id as any)}
              />

              {/* 7. Add-ons Section */}
              <View className="gap-3">
                <Typography className="font-jakarta-bold text-gray-12 text-[20px]">
                  Enhance Your Service
                </Typography>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row"
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

              {/* 8. Customer Reviews Preview */}
              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Typography className="font-jakarta-bold text-gray-12 text-[20px]">
                    Customer Reviews
                  </Typography>
                  <Typography className="font-inter-semibold text-caption-l text-gray-08">
                    ⭐ 4.8 (2,394 reviews)
                  </Typography>
                </View>
                <View>
                  {REVIEWS.map((rev) => (
                    <ReviewCard key={rev.id} review={rev} />
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* 9. Sticky Bottom Booking Bar */}
          <StickyBookingBar
            price={totalPrice}
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
    paddingBottom: 120, // ensure content is scrollable above sticky bar
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
