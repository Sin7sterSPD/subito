// main Index file

import React, { useEffect, useState, useCallback, useMemo } from "react"
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  Dimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { Button, Card, Chip, SearchField, Spinner, Avatar } from "heroui-native"
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

const { width } = Dimensions.get("window")

const serviceImages: Record<string, number> = {
  "floor cleaning": require("../../assets/home/floor.png"),
  "bathroom cleaning": require("../../assets/home/bathroom.png"),
  cupboard: require("../../assets/home/cupboard-cleaning.png"),
  utensils: require("../../assets/home/utensils.png"),
  "room cleaning": require("../../assets/home/roomclieaning.png"),
  "toilet cleaning": require("../../assets/home/toiletcleaning.png"),
  "windows cleaning": require("../../assets/home/windowscleaning.png"),
  "clothes iron": require("../../assets/home/clothes-iron.png"),
  "dish washer": require("../../assets/home/dish waher.png"),
  "after party cleaning": require("../../assets/home/Afterpartycleaning.png"),
  default: require("../../assets/home/roomclieaning.png"),
}

function getServiceImage(name: string) {
  const lowercaseName = name.toLowerCase()
  for (const key of Object.keys(serviceImages)) {
    if (lowercaseName.includes(key)) {
      return serviceImages[key]
    }
  }
  return serviceImages.default
}

function AddressSelector() {
  const { selectedAddress } = useUserStore()

  return (
    <TouchableOpacity
      className="flex-1 flex-row items-center"
      onPress={() => router.push("/(screens)/addresses")}
    >
      <View className="bg-blue-01 items-center justify-center rounded-xl p-2">
        <Ionicons name="location-sharp" size={20} color="#2a9cff" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-caption-m font-inter-regular text-gray-07">
          Deliver to
        </Text>
        <View className="flex-row items-center gap-1">
          <Text
            className="text-body-s font-inter-semibold text-gray-12 max-w-[150px]"
            numberOfLines={1}
          >
            {selectedAddress?.name || "Add Address"}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#464a53" />
        </View>
      </View>
    </TouchableOpacity>
  )
}

function MarketingBanner({ onBookPress }: { onBookPress: () => void }) {
  return (
    <View className="relative mx-4 mt-4 overflow-visible">
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

      {/* Girl Image Overflowing */}
    </View>
  )
}

function ServiceCard({
  listing,
  onPress,
}: {
  listing: Listing
  onPress: () => void
}) {
  const imageSource =
    listing.image && listing.image.startsWith("http")
      ? { uri: listing.image }
      : getServiceImage(listing.name)

  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice
  const mockMeta = getListingMockMeta(listing.id)
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <Card
      variant="default"
      className="border-gray-02/60 mr-4 w-44 overflow-hidden rounded-3xl border bg-white shadow-sm"
    >
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        <View className="relative">
          <Image
            source={imageSource}
            className="h-28 w-full"
            contentFit="cover"
          />
          {/* Distance Badge */}
          <View className="absolute top-2 left-2 flex-row items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 backdrop-blur-sm">
            <Ionicons name="location-sharp" size={10} color="#2a9cff" />
            <Text className="font-inter-semibold text-gray-12 text-[9px]">
              {mockMeta.distance}
            </Text>
          </View>
          {/* Favorite Icon */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsFavorite(!isFavorite)}
            className="absolute top-2 right-2 items-center justify-center rounded-full bg-white/90 p-1.5 backdrop-blur-sm"
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={14}
              color={isFavorite ? "#e6483d" : "#7e869a"}
            />
          </TouchableOpacity>
        </View>

        <Card.Body className="gap-0.5 bg-white p-3">
          {/* Rating */}
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text className="font-inter-semibold text-gray-12 text-[11px]">
              {mockMeta.rating}
            </Text>
            <Text className="font-inter-regular text-gray-07 text-[10px]">
              ({mockMeta.reviewsCount})
            </Text>
          </View>

          {/* Title */}
          <Card.Title
            className="text-caption-l font-jakarta-bold text-gray-12 mt-1"
            numberOfLines={1}
          >
            {listing.name}
          </Card.Title>

          {/* Description */}
          {listing.shortDescription && (
            <Card.Description
              className="font-inter-regular text-gray-07 h-4 text-[11px]"
              numberOfLines={1}
            >
              {listing.shortDescription}
            </Card.Description>
          )}

          {/* Footer with Price and Book button */}
          <View className="border-gray-01 mt-2 flex-row items-center justify-between border-t pt-2">
            <Text className="text-body-s font-jakarta-bold text-blue-03">
              ₹{startingPrice}
            </Text>
            <View className="bg-blue-01 rounded-lg px-2.5 py-1">
              <Text className="font-inter-semibold text-blue-03 text-[10px]">
                Book
              </Text>
            </View>
          </View>
        </Card.Body>
      </TouchableOpacity>
    </Card>
  )
}

function ServiceCardGrid({
  listing,
  onPress,
}: {
  listing: Listing
  onPress: () => void
}) {
  const imageSource =
    listing.image && listing.image.startsWith("http")
      ? { uri: listing.image }
      : getServiceImage(listing.name)

  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice
  const mockMeta = getListingMockMeta(listing.id)
  const [isFavorite, setIsFavorite] = useState(false)

  return (
    <Card
      variant="default"
      className="border-gray-02/60 w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
    >
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        <View className="relative">
          <Image
            source={imageSource}
            className="h-28 w-full"
            contentFit="cover"
          />
          {/* Distance Badge */}
          <View className="absolute top-2 left-2 flex-row items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 backdrop-blur-sm">
            <Ionicons name="location-sharp" size={10} color="#2a9cff" />
            <Text className="font-inter-semibold text-gray-12 text-[9px]">
              {mockMeta.distance}
            </Text>
          </View>
          {/* Favorite Icon */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsFavorite(!isFavorite)}
            className="absolute top-2 right-2 items-center justify-center rounded-full bg-white/90 p-1.5 backdrop-blur-sm"
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={14}
              color={isFavorite ? "#e6483d" : "#7e869a"}
            />
          </TouchableOpacity>
        </View>

        <Card.Body className="gap-0.5 bg-white p-3">
          {/* Rating */}
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text className="font-inter-semibold text-gray-12 text-[11px]">
              {mockMeta.rating}
            </Text>
            <Text className="font-inter-regular text-gray-07 text-[10px]">
              ({mockMeta.reviewsCount})
            </Text>
          </View>

          {/* Title */}
          <Card.Title
            className="text-caption-l font-jakarta-bold text-gray-12 mt-1"
            numberOfLines={1}
          >
            {listing.name}
          </Card.Title>

          {/* Description */}
          {listing.shortDescription && (
            <Card.Description
              className="font-inter-regular text-gray-07 h-4 text-[11px]"
              numberOfLines={1}
            >
              {listing.shortDescription}
            </Card.Description>
          )}

          {/* Footer with Price and Book button */}
          <View className="border-gray-01 mt-2 flex-row items-center justify-between border-t pt-2">
            <Text className="text-body-s font-jakarta-bold text-blue-03">
              ₹{startingPrice}
            </Text>
            <View className="bg-blue-01 rounded-lg px-2.5 py-1">
              <Text className="font-inter-semibold text-blue-03 text-[10px]">
                Book
              </Text>
            </View>
          </View>
        </Card.Body>
      </TouchableOpacity>
    </Card>
  )
}

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
      variant="default"
      className="border-gray-02/60 mr-4 w-72 overflow-hidden rounded-3xl border bg-white shadow-sm"
    >
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
        {bundle.image && (
          <Image
            source={{ uri: bundle.image }}
            className="h-32 w-full"
            contentFit="cover"
          />
        )}
        <Card.Body className="gap-1 bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-inter-semibold text-success bg-green-01 rounded-full px-2 py-0.5 text-[11px]">
              Popular Package
            </Text>
            {discount && (
              <Text className="font-inter-semibold text-blue-03 bg-blue-01 rounded-full px-2 py-0.5 text-[11px]">
                {discount}% OFF
              </Text>
            )}
          </View>

          <Card.Title
            className="text-body-s font-jakarta-bold text-gray-12 mt-1.5"
            numberOfLines={1}
          >
            {bundle.name}
          </Card.Title>

          {bundle.description && (
            <Card.Description
              className="font-inter-regular text-gray-07 h-8 text-[11px]"
              numberOfLines={2}
            >
              {bundle.description}
            </Card.Description>
          )}

          <View className="border-gray-01 mt-2 flex-row items-center gap-2 border-t pt-2">
            <Text className="text-body-m font-jakarta-bold text-blue-03">
              ₹{bundle.bundlePrice}
            </Text>
            <Text className="text-caption-l font-inter-regular text-gray-07 line-through">
              ₹{bundle.originalPrice}
            </Text>
          </View>
        </Card.Body>
      </TouchableOpacity>
    </Card>
  )
}

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

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: "/(screens)/category/[id]",
      params: { id: category.id, name: category.name },
    })
  }

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

  const filteredListings = useMemo(() => {
    if (selectedCategory === "All") return []
    const cat = categories.find(
      (c) => c.name.toLowerCase() === selectedCategory.toLowerCase()
    )
    return cat ? cat.listings || [] : []
  }, [selectedCategory, categories])

  if (isLoading && categories.length === 0) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  const categoriesList = [
    "All",
    "Cleaning",
    "Plumbing",
    "Electrical",
    "Painting",
    "Appliance Repair",
  ]

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F7F7F8" }}
      edges={["top"]}
    >
      {/* Header */}
      <View className="border-gray-02 flex-row items-center justify-between border-b bg-white px-4 py-2">
        <AddressSelector />
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="bg-gray-01 items-center justify-center rounded-xl p-2"
            onPress={() => router.push("/(screens)/notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color="#464a53" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
            <Avatar size="md" className="border-blue-02 rounded-full border">
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

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2a9cff"]}
          />
        }
      >
        {/* Greetings */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-h6 font-jakarta-bold text-gray-12">
            Hello, {user?.firstName || "there"} 👋
          </Text>
          <Text className="text-body-s font-inter-regular text-gray-07 mt-0.5">
            What service do you need today?
          </Text>
        </View>

        {/* Search Field */}
        <View className="px-4 py-2">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(screens)/search")}
          >
            <View pointerEvents="none">
              <SearchField value="" onChange={() => {}}>
                <SearchField.Group className="bg-gray-01 border-gray-02 h-12 items-center rounded-2xl border px-4">
                  <SearchField.SearchIcon
                    iconProps={{ color: "#2a9cff", size: 18 }}
                  />
                  <SearchField.Input
                    placeholder="Search for services..."
                    className="text-gray-12 font-inter-regular pl-9"
                  />
                </SearchField.Group>
              </SearchField>
            </View>
          </TouchableOpacity>
        </View>

        {/* Premium Marketing Banner */}
        <MarketingBanner onBookPress={() => setSelectedCategory("Cleaning")} />

        {/* Categories Section */}
        <View className="mt-2 py-2">
          <Text className="text-body-m font-jakarta-bold text-gray-12 mb-2 px-4">
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {categoriesList.map((catName) => {
              const isSelected = selectedCategory === catName
              return (
                <TouchableOpacity
                  key={catName}
                  onPress={() => setSelectedCategory(catName)}
                  activeOpacity={0.8}
                >
                  <Chip
                    variant={isSelected ? "primary" : "secondary"}
                    className={
                      isSelected
                        ? "bg-blue-03 border-0 px-3 py-1.5"
                        : "bg-gray-01 border-gray-02 border px-3 py-1.5"
                    }
                  >
                    <Chip.Label
                      className={
                        isSelected
                          ? "font-inter-semibold text-caption-l text-white"
                          : "text-gray-09 font-inter-medium text-caption-l"
                      }
                    >
                      {catName}
                    </Chip.Label>
                  </Chip>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Main Display Area */}
        {selectedCategory === "All" ? (
          <>
            {/* Promo / Bundles */}
            {bundles.length > 0 && (
              <View className="py-2">
                <View className="mb-2.5 flex-row items-center justify-between px-4">
                  <Text className="text-body-l font-jakarta-bold text-gray-12">
                    Popular Bundles
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/(screens)/bundles")}
                  >
                    <Text className="text-caption-l font-inter-semibold text-blue-03">
                      See All
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16 }}
                >
                  {bundles.map((bundle) => (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      onPress={() => handleBundlePress(bundle)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Service Lists per Category */}
            {categories.map((category) => {
              if (!category.listings || category.listings.length === 0)
                return null
              return (
                <View key={category.id} className="py-2.5">
                  <View className="mb-2.5 flex-row items-center justify-between px-4">
                    <Text className="text-body-l font-jakarta-bold text-gray-12">
                      {category.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleCategoryPress(category)}
                    >
                      <Text className="text-caption-l font-inter-semibold text-blue-03">
                        See All
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 16 }}
                  >
                    {category.listings.map((listing) => (
                      <ServiceCard
                        key={listing.id}
                        listing={listing}
                        onPress={() => handleServicePress(listing)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )
            })}
          </>
        ) : (
          /* Filtered Category View */
          <View className="px-4 py-2">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-body-l font-jakarta-bold text-gray-12">
                {selectedCategory} Services
              </Text>
              <Text className="text-caption-l font-inter-regular text-gray-07">
                {filteredListings.length} found
              </Text>
            </View>

            {filteredListings.length > 0 ? (
              <View className="flex-row flex-wrap justify-between">
                {filteredListings.map((listing) => (
                  <View
                    key={listing.id}
                    style={{ width: "48%" }}
                    className="mb-4"
                  >
                    <ServiceCardGrid
                      listing={listing}
                      onPress={() => handleServicePress(listing)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-16">
                <Ionicons name="sparkles-outline" size={44} color="#9ea2ad" />
                <Text className="text-body-m font-inter-medium text-gray-07 mt-3">
                  No services available in this category
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  )
}
